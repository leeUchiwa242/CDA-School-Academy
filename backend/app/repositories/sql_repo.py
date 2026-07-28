from app.models import (
    db, User, LoginLog, Student, Subject, ConversionScale, Grade, SchoolClass,
    TeacherAssignment, AttendanceSession, AttendanceRecord, HomeworkRecord, StudentNote,
    ScheduleSlot, TeacherAttendanceRecord, Notification
)
from datetime import datetime

class SQLRepository:
    """
    SQLRepository encapsulates data access operations for PostgreSQL/SQLite.
    This hides database execution details from the business services.
    """

    # --- User operations ---
    @staticmethod
    def get_user_by_id(user_id):
        return db.session.get(User, user_id)

    @staticmethod
    def get_user_by_email(email):
        return User.query.filter_by(email=email).first()

    @staticmethod
    def create_user(email, password_hash, role, phone_number=None, address=None, photo_url=None):
        user = User(
            email=email, password_hash=password_hash, role=role,
            phone_number=phone_number, address=address, photo_url=photo_url
        )
        db.session.add(user)
        db.session.commit()
        return user

    @staticmethod
    def update_user(user):
        db.session.add(user)
        db.session.commit()
        return user

    # --- Login logs operations ---
    @staticmethod
    def log_login_attempt(email, ip_address, success):
        log = LoginLog(email=email, ip_address=ip_address, success=success)
        db.session.add(log)
        db.session.commit()
        return log

    @staticmethod
    def get_login_logs(limit=100):
        return LoginLog.query.order_by(LoginLog.timestamp.desc()).limit(limit).all()

    # --- Student operations ---
    @staticmethod
    def get_student_by_id(student_id):
        return db.session.get(Student, student_id)

    @staticmethod
    def get_student_by_email(email):
        return Student.query.filter_by(email=email).first()

    @staticmethod
    def get_all_students(search_query=None, class_id=None):
        query = Student.query
        if class_id:
            query = query.filter(Student.class_id == class_id)
        if search_query:
            # Case insensitive search on first name, last name, or email
            search_query = f"%{search_query}%"
            query = query.filter(
                (Student.first_name.ilike(search_query)) |
                (Student.last_name.ilike(search_query)) |
                (Student.email.ilike(search_query))
            )
        return query.order_by(Student.last_name, Student.first_name).all()

    @staticmethod
    def create_student(first_name, last_name, date_of_birth, gender, country, address, phone_number, email, class_id, photo_url=None):
        student = Student(
            first_name=first_name,
            last_name=last_name,
            date_of_birth=date_of_birth,
            gender=gender,
            country=country,
            address=address,
            phone_number=phone_number,
            email=email,
            class_id=class_id,
            photo_url=photo_url
        )
        db.session.add(student)
        db.session.commit()
        return student

    @staticmethod
    def update_student(student):
        db.session.add(student)
        db.session.commit()
        return student

    @staticmethod
    def delete_student(student_id):
        student = db.session.get(Student, student_id)
        if student:
            db.session.delete(student)
            db.session.commit()
            return True
        return False

    # --- Class operations ---
    @staticmethod
    def get_class_by_id(class_id):
        return db.session.get(SchoolClass, class_id)

    @staticmethod
    def get_class_by_name(name):
        return SchoolClass.query.filter_by(name=name).first()

    @staticmethod
    def get_all_classes():
        return SchoolClass.query.order_by(SchoolClass.id).all()

    # --- Subject operations ---
    @staticmethod
    def get_subject_by_id(subject_id):
        return db.session.get(Subject, subject_id)

    @staticmethod
    def get_subject_by_name(name):
        return Subject.query.filter_by(name=name).first()

    @staticmethod
    def get_all_subjects():
        return Subject.query.order_by(Subject.name).all()

    @staticmethod
    def create_subject(name):
        subject = Subject(name=name)
        db.session.add(subject)
        db.session.commit()
        return subject

    @staticmethod
    def delete_subject(subject_id):
        subject = db.session.get(Subject, subject_id)
        if subject:
            db.session.delete(subject)
            db.session.commit()
            return True
        return False

    # --- Conversion Scale operations ---
    @staticmethod
    def get_all_conversion_scales():
        return ConversionScale.query.order_by(ConversionScale.min_score.desc()).all()

    @staticmethod
    def get_conversion_scale_by_id(scale_id):
        return db.session.get(ConversionScale, scale_id)

    @staticmethod
    def create_conversion_scale(min_score, max_score, letter_grade, status_label):
        scale = ConversionScale(
            min_score=min_score,
            max_score=max_score,
            letter_grade=letter_grade,
            status_label=status_label
        )
        db.session.add(scale)
        db.session.commit()
        return scale

    @staticmethod
    def update_conversion_scale(scale):
        db.session.add(scale)
        db.session.commit()
        return scale

    @staticmethod
    def delete_conversion_scale(scale_id):
        scale = db.session.get(ConversionScale, scale_id)
        if scale:
            db.session.delete(scale)
            db.session.commit()
            return True
        return False

    # --- Grade operations ---
    @staticmethod
    def get_grade_by_id(grade_id):
        return db.session.get(Grade, grade_id)

    @staticmethod
    def get_grades_by_student(student_id):
        return Grade.query.filter_by(student_id=student_id).order_by(Grade.created_at).all()

    @staticmethod
    def get_grades_by_student_subject_term_year(student_id, subject_id, term, academic_year, grade_type=None):
        query = Grade.query.filter_by(
            student_id=student_id,
            subject_id=subject_id,
            term=term,
            academic_year=academic_year
        )
        if grade_type:
            query = query.filter_by(grade_type=grade_type)
        return query.order_by(Grade.created_at).all()

    @staticmethod
    def get_all_grades_for_term_year(term, academic_year):
        return Grade.query.filter_by(term=term, academic_year=academic_year).all()

    @staticmethod
    def get_all_grades():
        return Grade.query.all()

    @staticmethod
    def add_grade(student_id, subject_id, mark, term, academic_year, grade_type, created_at=None):
        """
        Adds a new grade entry (Devoir or Examen). Devoirs accumulate over time,
        so this always inserts a new row rather than overwriting an existing one.
        `created_at` can be provided to record the actual date the devoir/examen
        took place, instead of defaulting to "now".
        """
        grade = Grade(
            student_id=student_id,
            subject_id=subject_id,
            mark=mark,
            term=term,
            academic_year=academic_year,
            grade_type=grade_type
        )
        if created_at is not None:
            grade.created_at = created_at
        db.session.add(grade)
        db.session.commit()
        return grade

    @staticmethod
    def update_grade(grade_id, mark, created_at=None):
        """
        Updates a grade's mark and, optionally, its recorded date.
        """
        grade = db.session.get(Grade, grade_id)
        if grade:
            grade.mark = mark
            if created_at is not None:
                grade.created_at = created_at
            db.session.commit()
        return grade

    @staticmethod
    def delete_grade(grade_id):
        grade = db.session.get(Grade, grade_id)
        if grade:
            db.session.delete(grade)
            db.session.commit()
            return True
        return False

    # --- Teacher Assignment operations ---
    @staticmethod
    def get_all_teacher_assignments():
        return TeacherAssignment.query.all()

    @staticmethod
    def get_assignment_by_id(assignment_id):
        return db.session.get(TeacherAssignment, assignment_id)

    @staticmethod
    def get_assignments_by_teacher(teacher_id):
        return TeacherAssignment.query.filter_by(teacher_id=teacher_id).all()

    @staticmethod
    def get_assignment(teacher_id, subject_id, class_id):
        return TeacherAssignment.query.filter_by(
            teacher_id=teacher_id, subject_id=subject_id, class_id=class_id
        ).first()

    @staticmethod
    def is_teacher_assigned(teacher_id, subject_id, class_id):
        return TeacherAssignment.query.filter_by(
            teacher_id=teacher_id, subject_id=subject_id, class_id=class_id
        ).first() is not None

    @staticmethod
    def create_teacher_assignment(teacher_id, subject_id, class_id):
        assignment = TeacherAssignment(teacher_id=teacher_id, subject_id=subject_id, class_id=class_id)
        db.session.add(assignment)
        db.session.commit()
        return assignment

    @staticmethod
    def delete_teacher_assignment(assignment_id):
        assignment = db.session.get(TeacherAssignment, assignment_id)
        if assignment:
            db.session.delete(assignment)
            db.session.commit()
            return True
        return False

    # --- Attendance operations ---
    @staticmethod
    def get_or_create_attendance_session(class_id, subject_id, date, term, academic_year, teacher_id=None):
        session = AttendanceSession.query.filter_by(
            class_id=class_id, subject_id=subject_id, date=date
        ).first()
        if not session:
            session = AttendanceSession(
                class_id=class_id, subject_id=subject_id, date=date,
                term=term, academic_year=academic_year, teacher_id=teacher_id
            )
            db.session.add(session)
            db.session.commit()
        return session

    @staticmethod
    def get_attendance_session(class_id, subject_id, date):
        return AttendanceSession.query.filter_by(
            class_id=class_id, subject_id=subject_id, date=date
        ).first()

    @staticmethod
    def get_attendance_session_by_id(session_id):
        return db.session.get(AttendanceSession, session_id)

    @staticmethod
    def upsert_attendance_record(session_id, student_id, status, late=None):
        record = AttendanceRecord.query.filter_by(session_id=session_id, student_id=student_id).first()
        if record:
            record.status = status
            record.late = late
        else:
            record = AttendanceRecord(session_id=session_id, student_id=student_id, status=status, late=late)
            db.session.add(record)
        db.session.commit()
        return record

    @staticmethod
    def get_attendance_records_for_student(student_id):
        return (
            AttendanceRecord.query
            .filter_by(student_id=student_id)
            .join(AttendanceSession)
            .order_by(AttendanceSession.date)
            .all()
        )

    @staticmethod
    def get_attendance_record_by_id(record_id):
        return db.session.get(AttendanceRecord, record_id)

    @staticmethod
    def update_attendance_record(record_id, status, late=None):
        record = db.session.get(AttendanceRecord, record_id)
        if record:
            record.status = status
            record.late = late
            db.session.commit()
        return record

    # --- Homework Record operations ---
    @staticmethod
    def get_homework_records_for_student(student_id, term=None, academic_year=None):
        query = HomeworkRecord.query.filter_by(student_id=student_id)
        if term:
            query = query.filter_by(term=term)
        if academic_year:
            query = query.filter_by(academic_year=academic_year)
        return query.all()

    @staticmethod
    def create_homework_record(student_id, subject_id, term, academic_year, date, submitted):
        record = HomeworkRecord(
            student_id=student_id, subject_id=subject_id, term=term,
            academic_year=academic_year, date=date, submitted=submitted
        )
        db.session.add(record)
        db.session.commit()
        return record

    # --- Student Note operations ---
    @staticmethod
    def get_notes_for_student(student_id):
        return StudentNote.query.filter_by(student_id=student_id).order_by(StudentNote.created_at.desc()).all()

    @staticmethod
    def create_student_note(student_id, author_id, content):
        note = StudentNote(student_id=student_id, author_id=author_id, content=content)
        db.session.add(note)
        db.session.commit()
        return note

    # --- Schedule (Emploi du temps) operations ---
    @staticmethod
    def get_schedule_slot_by_id(slot_id):
        return db.session.get(ScheduleSlot, slot_id)

    @staticmethod
    def get_schedule_slot_by_position(class_id, day_of_week, start_time, academic_year):
        return ScheduleSlot.query.filter_by(
            class_id=class_id, day_of_week=day_of_week, start_time=start_time, academic_year=academic_year
        ).first()

    @staticmethod
    def get_schedule_slots_for_class(class_id, academic_year):
        return (
            ScheduleSlot.query
            .filter_by(class_id=class_id, academic_year=academic_year)
            .order_by(ScheduleSlot.day_of_week, ScheduleSlot.start_time)
            .all()
        )

    @staticmethod
    def get_schedule_slots_for_teacher(teacher_id, academic_year):
        return (
            ScheduleSlot.query
            .filter_by(teacher_id=teacher_id, academic_year=academic_year)
            .order_by(ScheduleSlot.day_of_week, ScheduleSlot.start_time)
            .all()
        )

    @staticmethod
    def create_schedule_slot(class_id, day_of_week, start_time, end_time, academic_year, room=None, subject_id=None):
        slot = ScheduleSlot(
            class_id=class_id, day_of_week=day_of_week, start_time=start_time,
            end_time=end_time, academic_year=academic_year, room=room, subject_id=subject_id
        )
        db.session.add(slot)
        db.session.commit()
        return slot

    @staticmethod
    def get_class_slots_overlapping(class_id, day_of_week, academic_year, start_time, end_time, exclude_slot_id=None):
        """
        Returns every slot for this class, on this day/year, whose time range
        overlaps [start_time, end_time) — used to reject conflicting schedule
        entries (e.g. two courses for the same class at the same time).
        """
        query = ScheduleSlot.query.filter(
            ScheduleSlot.class_id == class_id,
            ScheduleSlot.day_of_week == day_of_week,
            ScheduleSlot.academic_year == academic_year,
            ScheduleSlot.start_time < end_time,
            ScheduleSlot.end_time > start_time
        )
        if exclude_slot_id:
            query = query.filter(ScheduleSlot.id != exclude_slot_id)
        return query.all()

    @staticmethod
    def get_teacher_slots_overlapping(teacher_id, day_of_week, academic_year, start_time, end_time, exclude_slot_id=None):
        """
        Returns every slot this teacher is already assigned to, on this
        day/year, whose time range overlaps [start_time, end_time) — used to
        reject attributing a teacher to two overlapping courses.
        """
        query = ScheduleSlot.query.filter(
            ScheduleSlot.teacher_id == teacher_id,
            ScheduleSlot.day_of_week == day_of_week,
            ScheduleSlot.academic_year == academic_year,
            ScheduleSlot.start_time < end_time,
            ScheduleSlot.end_time > start_time
        )
        if exclude_slot_id:
            query = query.filter(ScheduleSlot.id != exclude_slot_id)
        return query.all()

    @staticmethod
    def update_schedule_slot(slot):
        db.session.add(slot)
        db.session.commit()
        return slot

    @staticmethod
    def delete_schedule_slot(slot_id):
        slot = db.session.get(ScheduleSlot, slot_id)
        if slot:
            db.session.delete(slot)
            db.session.commit()
            return True
        return False

    @staticmethod
    def get_active_schedule_slots_for_day(day_of_week, academic_year):
        """
        Returns every slot actually assigned to a teacher (subject filled in)
        for a given day-of-week (0=Lundi ... 6=Dimanche) and academic year —
        i.e. the classes actually taking place that day, across all classes.
        """
        return (
            ScheduleSlot.query
            .filter(
                ScheduleSlot.day_of_week == day_of_week,
                ScheduleSlot.academic_year == academic_year,
                ScheduleSlot.teacher_id.isnot(None)
            )
            .order_by(ScheduleSlot.start_time)
            .all()
        )

    @staticmethod
    def get_schedule_slots_for_teacher_and_day(teacher_id, day_of_week, academic_year):
        return (
            ScheduleSlot.query
            .filter_by(teacher_id=teacher_id, day_of_week=day_of_week, academic_year=academic_year)
            .order_by(ScheduleSlot.start_time)
            .all()
        )

    # --- Teacher Attendance Record operations ---
    @staticmethod
    def get_teacher_attendance_record(schedule_slot_id, date):
        return TeacherAttendanceRecord.query.filter_by(schedule_slot_id=schedule_slot_id, date=date).first()

    @staticmethod
    def get_teacher_attendance_record_by_id(record_id):
        return db.session.get(TeacherAttendanceRecord, record_id)

    @staticmethod
    def upsert_teacher_attendance(schedule_slot_id, teacher_id, date, status, checked_in_at=None):
        record = TeacherAttendanceRecord.query.filter_by(schedule_slot_id=schedule_slot_id, date=date).first()
        if record:
            record.status = status
            if checked_in_at is not None:
                record.checked_in_at = checked_in_at
        else:
            record = TeacherAttendanceRecord(
                schedule_slot_id=schedule_slot_id, teacher_id=teacher_id, date=date,
                status=status, checked_in_at=checked_in_at
            )
            db.session.add(record)
        db.session.commit()
        return record

    @staticmethod
    def get_teacher_attendance_records_for_teacher(teacher_id, limit=1000):
        return (
            TeacherAttendanceRecord.query
            .filter_by(teacher_id=teacher_id)
            .order_by(TeacherAttendanceRecord.date.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_teacher_attendance_records_for_date(date):
        return TeacherAttendanceRecord.query.filter_by(date=date).all()

    @staticmethod
    def get_attendance_records_for_student_term_year(student_id, term, academic_year):
        """
        Same as get_attendance_records_for_student, but scoped to a single
        term/academic year (used for threshold-based alerting).
        """
        return (
            AttendanceRecord.query
            .join(AttendanceSession)
            .filter(
                AttendanceRecord.student_id == student_id,
                AttendanceSession.term == term,
                AttendanceSession.academic_year == academic_year
            )
            .all()
        )

    # --- Notification operations ---
    @staticmethod
    def create_notification(title, message, level, notif_type, teacher_id=None, student_id=None, dedup_key=None):
        notif = Notification(
            title=title, message=message, level=level, notif_type=notif_type,
            teacher_id=teacher_id, student_id=student_id, dedup_key=dedup_key
        )
        db.session.add(notif)
        db.session.commit()
        return notif

    @staticmethod
    def notification_exists_by_dedup(dedup_key):
        if not dedup_key:
            return False
        return Notification.query.filter_by(dedup_key=dedup_key).first() is not None

    @staticmethod
    def get_notifications(is_read=None, level=None, notif_type=None, limit=200):
        query = Notification.query
        if is_read is not None:
            query = query.filter_by(is_read=is_read)
        if level:
            query = query.filter_by(level=level)
        if notif_type:
            query = query.filter_by(notif_type=notif_type)
        return query.order_by(Notification.created_at.desc()).limit(limit).all()

    @staticmethod
    def get_notification_by_id(notification_id):
        return db.session.get(Notification, notification_id)

    @staticmethod
    def get_unread_notification_count():
        return Notification.query.filter_by(is_read=False).count()

    @staticmethod
    def mark_notification_read(notification_id, is_read=True):
        notif = db.session.get(Notification, notification_id)
        if notif:
            notif.is_read = is_read
            db.session.commit()
        return notif

    @staticmethod
    def delete_notification(notification_id):
        notif = db.session.get(Notification, notification_id)
        if notif:
            db.session.delete(notif)
            db.session.commit()
            return True
        return False