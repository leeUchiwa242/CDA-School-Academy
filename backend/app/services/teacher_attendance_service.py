from datetime import datetime, timedelta
from flask import current_app
from app.repositories.sql_repo import SQLRepository


class TeacherAttendanceService:
    """
    Tracks whether a teacher showed up for each of their scheduled classes.

    Presence is confirmed by a check-in — standing in for the QR-code scan
    authentication described in the spec (to be developed later): once QR
    scanning is wired up, it should simply call `check_in` on a successful
    scan. Absence is detected lazily rather than via a background job:
    `sync_day` scans a day's schedule slots and, for any slot whose start
    time + tolerance has elapsed with no check-in, materializes an 'Absent'
    record and raises a one-time administrator notification. It is safe
    (idempotent) to call on every page load — the calendar, the dashboard,
    and the notification center all trigger it.
    """

    @staticmethod
    def _tolerance_minutes():
        return current_app.config.get('TEACHER_LATE_TOLERANCE_MINUTES', 60)

    @staticmethod
    def _current_academic_year(today):
        """
        Derives a 'YYYY-YYYY' academic year label from the current date
        (Sept-Aug cycle). Only used as a fallback when the caller doesn't
        provide the UI-selected academic year explicitly.
        """
        if today.month >= 8:
            return f"{today.year}-{today.year + 1}"
        return f"{today.year - 1}-{today.year}"

    @staticmethod
    def check_in(teacher, at=None):
        """
        Called when a teacher authenticates at school (QR code scan, once
        developed). Finds the slot the teacher is currently due in for
        today and marks it 'Présent' (or 'Retard' if the tolerance window
        has already elapsed, but an administrator hasn't yet materialized
        the 'Absent' status).
        """
        now = at or datetime.now()
        today = now.date()
        day_of_week = today.weekday()
        academic_year = TeacherAttendanceService._current_academic_year(today)
        tolerance = TeacherAttendanceService._tolerance_minutes()

        slots = SQLRepository.get_schedule_slots_for_teacher_and_day(teacher.id, day_of_week, academic_year)
        if not slots:
            return None, "Aucun cours prévu aujourd'hui pour ce professeur."

        candidate = None
        for slot in slots:
            slot_start = datetime.combine(today, slot.start_time)
            slot_end = datetime.combine(today, slot.end_time)
            if slot_start <= now <= slot_end + timedelta(minutes=tolerance):
                candidate = slot
                break

        if not candidate:
            return None, "Aucun créneau en cours ne correspond à cette heure."

        slot_start = datetime.combine(today, candidate.start_time)
        minutes_late = (now - slot_start).total_seconds() / 60
        status = 'Retard' if minutes_late > tolerance else 'Présent'

        record = SQLRepository.upsert_teacher_attendance(candidate.id, teacher.id, today, status, checked_in_at=now)
        return record, None

    @staticmethod
    def sync_day(target_date, academic_year):
        """
        For every scheduled (subject + teacher assigned) slot on
        `target_date` whose tolerance window has elapsed with no check-in,
        materializes an 'Absent' record and raises a one-time administrator
        notification. Idempotent: safe to call on every page load.
        """
        from app.services.notification_service import NotificationService

        now = datetime.now()
        day_of_week = target_date.weekday()
        tolerance = TeacherAttendanceService._tolerance_minutes()

        slots = SQLRepository.get_active_schedule_slots_for_day(day_of_week, academic_year)
        for slot in slots:
            slot_start = datetime.combine(target_date, slot.start_time)
            deadline = slot_start + timedelta(minutes=tolerance)

            if now < deadline:
                continue  # Tolerance window hasn't elapsed yet — nothing to decide

            existing = SQLRepository.get_teacher_attendance_record(slot.id, target_date)
            if existing:
                continue  # Already checked-in, or already materialized as Absent

            SQLRepository.upsert_teacher_attendance(slot.id, slot.teacher_id, target_date, 'Absent')

            try:
                NotificationService.notify_teacher_absent(
                    slot.teacher,
                    slot.subject.name if slot.subject else '—',
                    slot.school_class.name if slot.school_class else '—',
                    slot.start_time.strftime('%Hh%M'),
                    target_date.isoformat()
                )
            except Exception:
                # A notification failure must never break the presence sync.
                pass

    @staticmethod
    def get_calendar_for_date(target_date, academic_year):
        """
        Returns every scheduled slot for `target_date` (across all classes),
        merged with its live presence status. Statuses:
        'Présent' | 'Retard' | 'Absent' | 'En attente' (tolerance not elapsed yet).
        """
        TeacherAttendanceService.sync_day(target_date, academic_year)

        day_of_week = target_date.weekday()
        slots = SQLRepository.get_active_schedule_slots_for_day(day_of_week, academic_year)
        result = []
        for slot in slots:
            record = SQLRepository.get_teacher_attendance_record(slot.id, target_date)
            entry = slot.to_dict()
            entry['date'] = target_date.isoformat()
            entry['attendance_status'] = record.status if record else 'En attente'
            entry['checked_in_at'] = record.checked_in_at.isoformat() if record and record.checked_in_at else None
            result.append(entry)
        return result

    @staticmethod
    def get_teacher_profile_stats(teacher_id):
        """
        Aggregates a teacher's presence rate, absence rate, late count, and
        a per-month breakdown from their TeacherAttendanceRecord history —
        used by the teacher detail page.
        """
        records = SQLRepository.get_teacher_attendance_records_for_teacher(teacher_id)
        total = len(records)
        present = sum(1 for r in records if r.status == 'Présent')
        late = sum(1 for r in records if r.status == 'Retard')
        absent = sum(1 for r in records if r.status == 'Absent')

        presence_rate = round(((present + late) / total) * 100, 1) if total else 0.0
        absence_rate = round((absent / total) * 100, 1) if total else 0.0

        monthly = {}
        for r in records:
            key = r.date.strftime('%Y-%m')
            monthly.setdefault(key, {'Présent': 0, 'Absent': 0, 'Retard': 0})
            monthly[key][r.status] = monthly[key].get(r.status, 0) + 1

        return {
            'total_sessions': total,
            'present_count': present,
            'absent_count': absent,
            'late_count': late,
            'presence_rate': presence_rate,
            'absence_rate': absence_rate,
            'monthly_stats': [{'month': k, **v} for k, v in sorted(monthly.items())],
            'history': [r.to_dict() for r in records[:100]]
        }

    @staticmethod
    def get_global_teacher_stats(academic_year):
        """
        Aggregates today's teacher presence KPIs for the admin dashboard.
        """
        today = datetime.now().date()
        TeacherAttendanceService.sync_day(today, academic_year)

        records_today = SQLRepository.get_teacher_attendance_records_for_date(today)
        present_today = sum(1 for r in records_today if r.status == 'Présent')
        late_today = sum(1 for r in records_today if r.status == 'Retard')
        absent_today = sum(1 for r in records_today if r.status == 'Absent')
        total_today = len(records_today)

        global_rate = round(((present_today + late_today) / total_today) * 100, 1) if total_today else 0.0

        return {
            'present_today': present_today,
            'absent_today': absent_today,
            'late_today': late_today,
            'global_presence_rate': global_rate
        }
