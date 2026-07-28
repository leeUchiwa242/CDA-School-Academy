from app.repositories.sql_repo import SQLRepository
from app.services.teacher_service import TeacherService

class AttendanceService:
    """
    Handles recording of attendance sessions (one per class + subject + date)
    and the individual student records within them (Présent/Absent + retard facultatif).
    """

    @staticmethod
    def save_attendance(user, class_id, subject_id, date, term, academic_year, records):
        """
        records: list of dicts like {'student_id': int, 'status': 'Présent'|'Absent', 'late': bool|None}
        """
        if not TeacherService.is_authorized(user, subject_id, class_id):
            return None, "Vous n'êtes pas autorisé à saisir la présence pour cette classe/matière."

        school_class = SQLRepository.get_class_by_id(class_id)
        if not school_class:
            return None, "Classe introuvable."

        subject = SQLRepository.get_subject_by_id(subject_id)
        if not subject:
            return None, "Matière introuvable."

        session = SQLRepository.get_or_create_attendance_session(
            class_id, subject_id, date, term, academic_year, teacher_id=user.id
        )

        for r in records:
            status = r.get('status')
            if status not in ['Présent', 'Absent']:
                continue
            late = r.get('late', None)
            SQLRepository.upsert_attendance_record(session.id, r.get('student_id'), status, late)

        # Best-effort automated alerting for at-risk students (absences /
        # lateness thresholds). Wrapped so a notification failure never
        # breaks attendance recording.
        try:
            from app.services.notification_service import NotificationService
            for r in records:
                student = SQLRepository.get_student_by_id(r.get('student_id'))
                if not student:
                    continue
                student_records = SQLRepository.get_attendance_records_for_student_term_year(
                    student.id, term, academic_year
                )
                absence_count = sum(1 for rec in student_records if rec.status == 'Absent')
                late_count = sum(1 for rec in student_records if rec.late)
                NotificationService.check_absence_threshold(student, absence_count, term, academic_year)
                NotificationService.check_late_threshold(student, late_count, term, academic_year)
        except Exception:
            pass

        return SQLRepository.get_attendance_session_by_id(session.id), None

    @staticmethod
    def get_attendance_rate(student_id):
        """
        Returns the percentage of sessions where the student was marked 'Présent'.
        """
        records = SQLRepository.get_attendance_records_for_student(student_id)
        if not records:
            return 0.0
        present_count = sum(1 for r in records if r.status == 'Présent')
        return round((present_count / len(records)) * 100, 1)

    @staticmethod
    def correct_record(user, record_id, status, late=None):
        """
        Lets an Administrateur fix a single attendance record after the fact
        (e.g. a teacher accidentally marked a student Absent instead of Présent).
        Only Administrateur can do this — it's a correction of the record of truth,
        not a normal teacher entry.
        """
        if user.role != 'Administrateur':
            return None, "Seul un administrateur peut corriger une présence déjà enregistrée."

        if status not in ['Présent', 'Absent']:
            return None, "Le statut doit être 'Présent' ou 'Absent'."

        record = SQLRepository.get_attendance_record_by_id(record_id)
        if not record:
            return None, "Enregistrement de présence introuvable."

        updated = SQLRepository.update_attendance_record(record_id, status, late)
        return updated, None