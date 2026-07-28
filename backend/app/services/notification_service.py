import json
import urllib.request
from flask import current_app
from app.repositories.sql_repo import SQLRepository


class NotificationService:
    """
    Centralizes creation of administrator-facing notifications: teacher
    absences/lateness, and student alerts (grade drops, absences, lateness).

    Every notification carries a `dedup_key` so the exact same real-world
    event never generates two entries, even if the triggering check runs
    more than once (e.g. the calendar being refreshed).

    Architected so a future automation platform (Make.com, etc.) can relay
    every notification to email/WhatsApp/SMS: set MAKE_WEBHOOK_URL in the
    environment and every created notification is POSTed there automatically.
    """

    # --- Internal helpers ---
    @staticmethod
    def _create(title, message, level, notif_type, teacher_id=None, student_id=None, dedup_key=None):
        if dedup_key and SQLRepository.notification_exists_by_dedup(dedup_key):
            return None
        notif = SQLRepository.create_notification(
            title, message, level, notif_type,
            teacher_id=teacher_id, student_id=student_id, dedup_key=dedup_key
        )
        NotificationService._relay_to_make(notif)
        return notif

    @staticmethod
    def _relay_to_make(notif):
        """
        Best-effort webhook relay so notifications can later trigger
        email/WhatsApp/SMS automations via Make (or any similar platform).
        No-ops if MAKE_WEBHOOK_URL isn't configured, and never raises — a
        relay failure must never break the core notification feature.
        """
        webhook_url = current_app.config.get('MAKE_WEBHOOK_URL')
        if not webhook_url or not notif:
            return
        try:
            payload = json.dumps(notif.to_dict()).encode('utf-8')
            req = urllib.request.Request(
                webhook_url, data=payload, headers={'Content-Type': 'application/json'}
            )
            urllib.request.urlopen(req, timeout=3)
        except Exception:
            # Automation relay is best-effort only; never break the app over it.
            pass

    # --- Teacher notifications ---
    @staticmethod
    def notify_teacher_absent(teacher, subject_name, class_name, start_time_label, date_iso):
        dedup_key = f"teacher_absent:{teacher.id}:{subject_name}:{class_name}:{date_iso}:{start_time_label}"
        title = "Professeur absent"
        message = (
            f"Professeur {teacher.email} n'a pas pris son cours de {subject_name} "
            f"prévu à {start_time_label} pour la classe {class_name}."
        )
        return NotificationService._create(
            title, message, 'Critique', 'teacher_absence',
            teacher_id=teacher.id, dedup_key=dedup_key
        )

    @staticmethod
    def notify_teacher_late(teacher, subject_name, class_name, start_time_label, end_time_label, date_iso):
        dedup_key = f"teacher_late:{teacher.id}:{subject_name}:{class_name}:{date_iso}:{start_time_label}"
        title = "Retard professeur"
        message = (
            f"Le professeur {teacher.email} est en retard pour le cours de {subject_name} "
            f"de {start_time_label} à {end_time_label} pour la classe {class_name}."
        )
        return NotificationService._create(
            title, message, 'Avertissement', 'teacher_late',
            teacher_id=teacher.id, dedup_key=dedup_key
        )

    # --- Student notifications ---
    @staticmethod
    def check_grade_drop(student, subject_name, previous_mark, new_mark, term, academic_year):
        """
        Compares a newly recorded mark against the student's previous mark of
        the same type (Devoir vs Devoir, Examen vs Examen). Marks are stored
        on a 0-100 scale internally; the notification message converts to the
        familiar /20 scale.
        """
        if previous_mark is None or previous_mark <= 0 or new_mark >= previous_mark:
            return None

        drop_ratio = (previous_mark - new_mark) / previous_mark
        if drop_ratio < current_app.config['GRADE_DROP_WARNING_RATIO']:
            return None

        level = 'Critique' if drop_ratio >= current_app.config['GRADE_DROP_CRITICAL_RATIO'] else 'Avertissement'
        student_name = f"{student.first_name} {student.last_name}"
        prev_20 = round(previous_mark / 5, 1)
        new_20 = round(new_mark / 5, 1)
        dedup_key = f"grade_drop:{student.id}:{subject_name}:{term}:{academic_year}:{new_mark}"
        title = "Baisse de note importante"
        message = f"La moyenne de {student_name} en {subject_name} est passée de {prev_20}/20 à {new_20}/20."
        return NotificationService._create(
            title, message, level, 'student_grade_drop',
            student_id=student.id, dedup_key=dedup_key
        )

    @staticmethod
    def check_absence_threshold(student, absence_count, term, academic_year):
        threshold = current_app.config['STUDENT_ABSENCE_THRESHOLD']
        if absence_count < threshold:
            return None
        student_name = f"{student.first_name} {student.last_name}"
        dedup_key = f"absences:{student.id}:{term}:{academic_year}:{absence_count}"
        title = "Absences élevées"
        message = f"L'élève {student_name} cumule {absence_count} absences ce trimestre."
        return NotificationService._create(
            title, message, 'Avertissement', 'student_absences',
            student_id=student.id, dedup_key=dedup_key
        )

    @staticmethod
    def check_late_threshold(student, late_count, term, academic_year):
        threshold = current_app.config['STUDENT_LATE_THRESHOLD']
        if late_count < threshold:
            return None
        student_name = f"{student.first_name} {student.last_name}"
        dedup_key = f"lates:{student.id}:{term}:{academic_year}:{late_count}"
        title = "Retards répétés"
        message = f"L'élève {student_name} présente un nombre anormal de retards ({late_count} ce trimestre)."
        return NotificationService._create(
            title, message, 'Avertissement', 'student_late',
            student_id=student.id, dedup_key=dedup_key
        )
