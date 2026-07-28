from datetime import datetime, timedelta
from app.repositories.sql_repo import SQLRepository

class ScheduleService:
    """
    Handles the annual (weekly-recurring) class timetable: auto-generating the
    empty grid of slots for a school year, then letting an administrator pick
    a subject for a slot, with the teacher auto-assigned from the existing
    TeacherAssignment (subject <-> class <-> teacher) records — no manual
    teacher lookup needed.
    """

    MAX_SLOTS_PER_GENERATION = 200  # safety guard against absurd configurations

    @staticmethod
    def _parse_time(value):
        try:
            return datetime.strptime(value, '%H:%M').time()
        except (ValueError, TypeError):
            return None

    @staticmethod
    def generate_grid(class_id, academic_year, days_of_week, start_time_str, end_time_str, slot_duration_minutes, room=None):
        """
        Auto-generates the recurring weekly grid of empty slots (no subject/teacher
        yet) for a class, across the given days and time range. Existing slots at
        the same position are left untouched (safe to call again to extend a grid).
        Returns (list_of_slots, error).
        """
        school_class = SQLRepository.get_class_by_id(class_id)
        if not school_class:
            return None, "Classe introuvable."

        if not days_of_week:
            return None, "Veuillez sélectionner au moins un jour."

        start_time = ScheduleService._parse_time(start_time_str)
        end_time = ScheduleService._parse_time(end_time_str)
        if not start_time or not end_time or start_time >= end_time:
            return None, "Plage horaire invalide (format attendu HH:MM, heure de début < heure de fin)."

        try:
            slot_duration_minutes = int(slot_duration_minutes)
            if slot_duration_minutes <= 0:
                raise ValueError()
        except (TypeError, ValueError):
            return None, "Durée de créneau invalide."

        # Build the list of time slices between start and end time
        time_slices = []
        cursor = datetime.combine(datetime.today(), start_time)
        end_dt = datetime.combine(datetime.today(), end_time)
        while cursor + timedelta(minutes=slot_duration_minutes) <= end_dt:
            slice_start = cursor.time()
            slice_end = (cursor + timedelta(minutes=slot_duration_minutes)).time()
            time_slices.append((slice_start, slice_end))
            cursor += timedelta(minutes=slot_duration_minutes)

        if not time_slices:
            return None, "Aucun créneau ne peut être généré avec cette configuration (durée trop longue pour la plage horaire)."

        if len(days_of_week) * len(time_slices) > ScheduleService.MAX_SLOTS_PER_GENERATION:
            return None, "Trop de créneaux à générer en une fois. Réduisez la plage horaire ou le nombre de jours."

        created_or_existing = []
        for day in days_of_week:
            for slice_start, slice_end in time_slices:
                existing = SQLRepository.get_schedule_slot_by_position(class_id, day, slice_start, academic_year)
                if existing:
                    created_or_existing.append(existing)
                    continue
                slot = SQLRepository.create_schedule_slot(
                    class_id=class_id, day_of_week=day, start_time=slice_start,
                    end_time=slice_end, academic_year=academic_year, room=room
                )
                created_or_existing.append(slot)

        return created_or_existing, None

    @staticmethod
    def assign_subject(slot_id, subject_id):
        """
        Assigns a subject to a slot and auto-fills the teacher based on the
        existing TeacherAssignment for that subject + class. Fails clearly if
        no teacher has been assigned to teach that subject to that class yet.
        """
        slot = SQLRepository.get_schedule_slot_by_id(slot_id)
        if not slot:
            return None, "Créneau introuvable."

        subject = SQLRepository.get_subject_by_id(subject_id)
        if not subject:
            return None, "Matière introuvable."

        assignments = [a for a in SQLRepository.get_all_teacher_assignments()
                       if a.subject_id == subject_id and a.class_id == slot.class_id]
        if not assignments:
            return None, (
                f"Aucun professeur n'est assigné à la matière « {subject.name} » pour cette classe. "
                "Créez d'abord l'assignation dans Professeurs > Assignations, puis réessayez."
            )

        slot.subject_id = subject_id
        slot.teacher_id = assignments[0].teacher_id
        slot = SQLRepository.update_schedule_slot(slot)
        return slot, None

    @staticmethod
    def create_single_slot(class_id, day_of_week, academic_year, start_time_str, end_time_str, subject_id, room=None):
        """
        Creates one timetable entry directly from the Configuration module:
        a day, a start/end time, a subject, and a class. No teacher yet —
        that is attributed separately from the Professeurs section (see
        assign_teacher_to_slot), which keeps the calendar and the teacher
        attribution as two distinct, auditable steps.

        Rejects the creation if the class already has an overlapping course
        on that day (schedule conflict).
        """
        school_class = SQLRepository.get_class_by_id(class_id)
        if not school_class:
            return None, "Classe introuvable."

        subject = SQLRepository.get_subject_by_id(subject_id)
        if not subject:
            return None, "Matière introuvable."

        try:
            day_of_week = int(day_of_week)
        except (TypeError, ValueError):
            return None, "Jour invalide."
        if day_of_week < 0 or day_of_week > 5:
            return None, "Le jour doit être compris entre Lundi et Samedi."

        start_time = ScheduleService._parse_time(start_time_str)
        end_time = ScheduleService._parse_time(end_time_str)
        if not start_time or not end_time or start_time >= end_time:
            return None, "Plage horaire invalide (format attendu HH:MM, heure de début < heure de fin)."

        conflicts = SQLRepository.get_class_slots_overlapping(class_id, day_of_week, academic_year, start_time, end_time)
        if conflicts:
            conflicting = conflicts[0]
            return None, (
                f"Conflit d'horaire : la classe {school_class.name} a déjà un cours "
                f"({conflicting.subject.name if conflicting.subject else 'sans matière'}) "
                f"de {conflicting.start_time.strftime('%H:%M')} à {conflicting.end_time.strftime('%H:%M')} ce jour-là."
            )

        slot = SQLRepository.create_schedule_slot(
            class_id=class_id, day_of_week=day_of_week, start_time=start_time,
            end_time=end_time, academic_year=academic_year, room=room, subject_id=subject_id
        )
        return slot, None

    @staticmethod
    def assign_teacher_to_slot(slot_id, teacher_id):
        """
        Attributes a teacher to an already-configured calendar slot (created
        from the Configuration module). Conflicts are checked against the
        teacher's own timetable (same day/time already taken elsewhere), so
        a teacher can never be double-booked. A matching TeacherAssignment
        (subject <-> class <-> teacher) is created automatically if it
        doesn't already exist, so existing grade/attendance authorization
        checks keep working unchanged.
        """
        slot = SQLRepository.get_schedule_slot_by_id(slot_id)
        if not slot:
            return None, "Créneau introuvable."

        if not slot.subject_id:
            return None, "Ce créneau n'a pas encore de matière définie. Configurez d'abord l'emploi du temps."

        teacher = SQLRepository.get_user_by_id(teacher_id)
        if not teacher or teacher.role != 'Professeur':
            return None, "Professeur introuvable."

        conflicts = SQLRepository.get_teacher_slots_overlapping(
            teacher_id, slot.day_of_week, slot.academic_year, slot.start_time, slot.end_time, exclude_slot_id=slot.id
        )
        if conflicts:
            conflicting = conflicts[0]
            return None, (
                f"Conflit d'horaire : ce professeur enseigne déjà "
                f"{conflicting.subject.name if conflicting.subject else 'un autre cours'} "
                f"({conflicting.school_class.name if conflicting.school_class else ''}) "
                f"de {conflicting.start_time.strftime('%H:%M')} à {conflicting.end_time.strftime('%H:%M')} ce jour-là."
            )

        slot.teacher_id = teacher_id
        slot = SQLRepository.update_schedule_slot(slot)

        # Keep the general subject<->class<->teacher assignment in sync so
        # existing grade/attendance authorization checks keep working.
        if not SQLRepository.is_teacher_assigned(teacher_id, slot.subject_id, slot.class_id):
            SQLRepository.create_teacher_assignment(teacher_id, slot.subject_id, slot.class_id)

        return slot, None

    @staticmethod
    def unassign_teacher_from_slot(slot_id):
        """
        Removes the teacher from a calendar slot while keeping its
        day/time/subject/class definition intact — used to correct a wrong
        attribution before re-assigning another teacher.
        """
        slot = SQLRepository.get_schedule_slot_by_id(slot_id)
        if not slot:
            return None, "Créneau introuvable."
        slot.teacher_id = None
        slot = SQLRepository.update_schedule_slot(slot)
        return slot, None

    @staticmethod
    def clear_slot(slot_id):
        """
        Resets a slot to empty (no subject/teacher), keeping the day/time placeholder.
        """
        slot = SQLRepository.get_schedule_slot_by_id(slot_id)
        if not slot:
            return None, "Créneau introuvable."
        slot.subject_id = None
        slot.teacher_id = None
        slot = SQLRepository.update_schedule_slot(slot)
        return slot, None

    @staticmethod
    def delete_slot(slot_id):
        return SQLRepository.delete_schedule_slot(slot_id)

    @staticmethod
    def get_class_schedule(class_id, academic_year):
        return SQLRepository.get_schedule_slots_for_class(class_id, academic_year)

    @staticmethod
    def get_teacher_schedule(teacher_id, academic_year):
        return SQLRepository.get_schedule_slots_for_teacher(teacher_id, academic_year)