from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False)  # 'Administrateur', 'Utilisateur' ou 'Professeur'
    phone_number = db.Column(db.String(50), nullable=True)
    address = db.Column(db.Text, nullable=True)
    photo_url = db.Column(db.String(500), nullable=True)
    failed_login_attempts = db.Column(db.Integer, default=0, nullable=False)
    lockout_until = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'role': self.role,
            'phone_number': self.phone_number,
            'address': self.address,
            'photo_url': self.photo_url,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class LoginLog(db.Model):
    __tablename__ = 'login_logs'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False)
    ip_address = db.Column(db.String(45), nullable=False)
    success = db.Column(db.Boolean, nullable=False)
    timestamp = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'ip_address': self.ip_address,
            'success': self.success,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

class SchoolClass(db.Model):
    __tablename__ = 'classes'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)  # 'Seconde', 'Première', 'Terminale'

    # Relationships
    students = db.relationship('Student', backref='school_class', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'student_count': len(self.students)
        }

class Student(db.Model):
    __tablename__ = 'students'

    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(20), nullable=False)  # 'Masculin', 'Féminin', 'Autre'
    country = db.Column(db.String(100), nullable=False)
    address = db.Column(db.Text, nullable=False)
    phone_number = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    photo_url = db.Column(db.String(500), nullable=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id', ondelete='RESTRICT'), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    grades = db.relationship('Grade', backref='student', cascade='all, delete-orphan', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'gender': self.gender,
            'country': self.country,
            'address': self.address,
            'phone_number': self.phone_number,
            'email': self.email,
            'photo_url': self.photo_url,
            'class_id': self.class_id,
            'class_name': self.school_class.name if self.school_class else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Subject(db.Model):
    __tablename__ = 'subjects'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name
        }

class ConversionScale(db.Model):
    __tablename__ = 'conversion_scale'

    id = db.Column(db.Integer, primary_key=True)
    min_score = db.Column(db.Float, nullable=False)
    max_score = db.Column(db.Float, nullable=False)
    letter_grade = db.Column(db.String(10), nullable=False)
    status_label = db.Column(db.String(100), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'min_score': self.min_score,
            'max_score': self.max_score,
            'letter_grade': self.letter_grade,
            'status_label': self.status_label
        }

class Grade(db.Model):
    __tablename__ = 'grades'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id', ondelete='RESTRICT'), nullable=False)
    grade_type = db.Column(db.String(20), nullable=False)  # 'Devoir' ou 'Examen'
    mark = db.Column(db.Float, nullable=False)  # 0 à 100
    term = db.Column(db.String(50), nullable=False)
    academic_year = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    subject = db.relationship('Subject', backref='grades')

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'subject_id': self.subject_id,
            'subject_name': self.subject.name if self.subject else None,
            'grade_type': self.grade_type,
            'mark': self.mark,
            'term': self.term,
            'academic_year': self.academic_year,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class TeacherAssignment(db.Model):
    __tablename__ = 'teacher_assignments'
    __table_args__ = (
        db.UniqueConstraint('teacher_id', 'subject_id', 'class_id', name='unique_teacher_subject_class'),
    )

    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    teacher = db.relationship('User', backref=db.backref('assignments', cascade='all, delete-orphan', lazy=True))
    subject = db.relationship('Subject', backref='teacher_assignments')
    school_class = db.relationship('SchoolClass', backref='teacher_assignments')

    def to_dict(self):
        return {
            'id': self.id,
            'teacher_id': self.teacher_id,
            'teacher_email': self.teacher.email if self.teacher else None,
            'subject_id': self.subject_id,
            'subject_name': self.subject.name if self.subject else None,
            'class_id': self.class_id,
            'class_name': self.school_class.name if self.school_class else None
        }


class AttendanceSession(db.Model):
    __tablename__ = 'attendance_sessions'
    __table_args__ = (
        db.UniqueConstraint('class_id', 'subject_id', 'date', name='unique_class_subject_date'),
    )

    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id', ondelete='CASCADE'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    term = db.Column(db.String(50), nullable=False)
    academic_year = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    teacher = db.relationship('User')
    school_class = db.relationship('SchoolClass')
    subject = db.relationship('Subject')
    records = db.relationship('AttendanceRecord', backref='session', cascade='all, delete-orphan', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'teacher_id': self.teacher_id,
            'class_id': self.class_id,
            'class_name': self.school_class.name if self.school_class else None,
            'subject_id': self.subject_id,
            'subject_name': self.subject.name if self.subject else None,
            'date': self.date.isoformat() if self.date else None,
            'term': self.term,
            'academic_year': self.academic_year,
            'records': [r.to_dict() for r in self.records]
        }


class AttendanceRecord(db.Model):
    __tablename__ = 'attendance_records'
    __table_args__ = (
        db.UniqueConstraint('session_id', 'student_id', name='unique_session_student'),
    )

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('attendance_sessions.id', ondelete='CASCADE'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.String(20), nullable=False)  # 'Présent' ou 'Absent'
    late = db.Column(db.Boolean, nullable=True)  # Facultatif : True / False / laissé vide (None)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    student = db.relationship('Student')

    def to_dict(self):
        return {
            'id': self.id,
            'session_id': self.session_id,
            'student_id': self.student_id,
            'status': self.status,
            'late': self.late,
            'date': self.session.date.isoformat() if self.session and self.session.date else None,
            'subject_name': self.session.subject.name if self.session and self.session.subject else None,
            'class_name': self.session.school_class.name if self.session and self.session.school_class else None
        }


class HomeworkRecord(db.Model):
    __tablename__ = 'homework_records'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False)
    term = db.Column(db.String(50), nullable=False)
    academic_year = db.Column(db.String(20), nullable=False)
    date = db.Column(db.Date, nullable=False)
    submitted = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    student = db.relationship('Student', backref=db.backref('homework_records', cascade='all, delete-orphan', lazy=True))
    subject = db.relationship('Subject', backref='homework_records')

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'subject_id': self.subject_id,
            'subject_name': self.subject.name if self.subject else None,
            'term': self.term,
            'academic_year': self.academic_year,
            'date': self.date.isoformat() if self.date else None,
            'submitted': self.submitted,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class StudentNote(db.Model):
    __tablename__ = 'student_notes'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    student = db.relationship('Student', backref=db.backref('notes', cascade='all, delete-orphan', lazy=True))
    author = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'author_email': self.author.email if self.author else None,
            'content': self.content,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ScheduleSlot(db.Model):
    """
    Represents one recurring weekly timetable slot for a class (e.g. "Lundi 08h00-10h00"),
    for a given academic year. The grid of slots is auto-generated first (day/time/room),
    then an administrator picks a subject for a slot; the teacher is then auto-assigned
    from the existing TeacherAssignment (subject <-> class <-> teacher) records.
    """
    __tablename__ = 'schedule_slots'
    __table_args__ = (
        db.UniqueConstraint('class_id', 'day_of_week', 'start_time', 'academic_year', name='unique_class_day_start_year'),
    )

    # 0=Lundi, 1=Mardi, 2=Mercredi, 3=Jeudi, 4=Vendredi, 5=Samedi, 6=Dimanche
    DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

    id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id', ondelete='CASCADE'), nullable=False)
    day_of_week = db.Column(db.Integer, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    room = db.Column(db.String(50), nullable=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id', ondelete='SET NULL'), nullable=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    academic_year = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    school_class = db.relationship('SchoolClass')
    subject = db.relationship('Subject')
    teacher = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'class_id': self.class_id,
            'class_name': self.school_class.name if self.school_class else None,
            'day_of_week': self.day_of_week,
            'day_label': ScheduleSlot.DAY_LABELS[self.day_of_week] if 0 <= self.day_of_week < len(ScheduleSlot.DAY_LABELS) else None,
            'start_time': self.start_time.strftime('%H:%M') if self.start_time else None,
            'end_time': self.end_time.strftime('%H:%M') if self.end_time else None,
            'room': self.room,
            'subject_id': self.subject_id,
            'subject_name': self.subject.name if self.subject else None,
            'teacher_id': self.teacher_id,
            'teacher_email': self.teacher.email if self.teacher else None,
            'academic_year': self.academic_year
        }


class TeacherAttendanceRecord(db.Model):
    """
    Tracks a teacher's presence for one occurrence (a specific date) of a
    recurring ScheduleSlot. A row is created lazily:
    - as soon as the teacher checks in (QR code scan, to be developed later;
      in the meantime `TeacherAttendanceService.check_in` can be called
      directly) -> status 'Présent' or 'Retard' ;
    - or once the tolerance window has elapsed with no check-in -> status
      'Absent', which also raises an administrator notification.
    """
    __tablename__ = 'teacher_attendance_records'
    __table_args__ = (
        db.UniqueConstraint('schedule_slot_id', 'date', name='unique_slot_date'),
    )

    id = db.Column(db.Integer, primary_key=True)
    schedule_slot_id = db.Column(db.Integer, db.ForeignKey('schedule_slots.id', ondelete='CASCADE'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='Absent')  # 'Présent', 'Absent', 'Retard'
    checked_in_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    schedule_slot = db.relationship('ScheduleSlot')
    teacher = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'schedule_slot_id': self.schedule_slot_id,
            'teacher_id': self.teacher_id,
            'teacher_email': self.teacher.email if self.teacher else None,
            'date': self.date.isoformat() if self.date else None,
            'status': self.status,
            'checked_in_at': self.checked_in_at.isoformat() if self.checked_in_at else None,
            'subject_name': self.schedule_slot.subject.name if self.schedule_slot and self.schedule_slot.subject else None,
            'class_name': self.schedule_slot.school_class.name if self.schedule_slot and self.schedule_slot.school_class else None,
            'start_time': self.schedule_slot.start_time.strftime('%H:%M') if self.schedule_slot and self.schedule_slot.start_time else None,
            'end_time': self.schedule_slot.end_time.strftime('%H:%M') if self.schedule_slot and self.schedule_slot.end_time else None,
        }


class Notification(db.Model):
    """
    An administrator-facing alert. Never shown to Professeur or Utilisateur
    accounts. `notif_type` drives filtering in the Notification Center:
    'teacher_absence', 'teacher_late', 'student_grade_drop',
    'student_absences', 'student_late'.
    `dedup_key` prevents the same real-world event from generating duplicate
    notifications (e.g. re-checking the calendar shouldn't re-alert for a
    teacher already reported absent for a given slot/date).
    """
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    level = db.Column(db.String(20), nullable=False, default='Information')  # 'Information', 'Avertissement', 'Critique'
    notif_type = db.Column(db.String(50), nullable=False, default='general')
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='SET NULL'), nullable=True)
    dedup_key = db.Column(db.String(255), nullable=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    teacher = db.relationship('User')
    student = db.relationship('Student')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'message': self.message,
            'level': self.level,
            'notif_type': self.notif_type,
            'is_read': self.is_read,
            'teacher_id': self.teacher_id,
            'teacher_email': self.teacher.email if self.teacher else None,
            'student_id': self.student_id,
            'student_name': f"{self.student.first_name} {self.student.last_name}" if self.student else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }