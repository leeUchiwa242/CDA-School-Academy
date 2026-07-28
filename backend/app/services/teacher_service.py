import os
from werkzeug.utils import secure_filename
from datetime import datetime
from app.repositories.sql_repo import SQLRepository
from app.services.auth_service import AuthService

class TeacherService:
    """
    Handles creation of teacher (Professeur) accounts and their subject/class assignments.
    """

    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

    @staticmethod
    def allowed_file(filename):
        return '.' in filename and \
            filename.rsplit('.', 1)[1].lower() in TeacherService.ALLOWED_EXTENSIONS

    @staticmethod
    def create_teacher(email, password, phone_number=None, address=None, photo_file=None, upload_folder=None):
        existing = SQLRepository.get_user_by_email(email)
        if existing:
            return None, "Cette adresse email est déjà enregistrée."

        photo_url = None
        if photo_file and photo_file.filename != '':
            if not TeacherService.allowed_file(photo_file.filename):
                return None, "Format de photo invalide. Formats acceptés : PNG, JPG, JPEG, GIF."

            filename = secure_filename(photo_file.filename)
            timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
            filename = f"{timestamp}_{filename}"

            if not os.path.exists(upload_folder):
                os.makedirs(upload_folder)

            filepath = os.path.join(upload_folder, filename)
            photo_file.save(filepath)
            photo_url = f"/api/students/uploads/{filename}"

        hashed = AuthService.hash_password(password)
        teacher = SQLRepository.create_user(
            email, hashed, 'Professeur',
            phone_number=phone_number, address=address, photo_url=photo_url
        )
        return teacher, None

    @staticmethod
    def assign_teacher(teacher_id, subject_id, class_id):
        teacher = SQLRepository.get_user_by_id(teacher_id)
        if not teacher or teacher.role != 'Professeur':
            return None, "Professeur introuvable."

        subject = SQLRepository.get_subject_by_id(subject_id)
        if not subject:
            return None, "Matière introuvable."

        school_class = SQLRepository.get_class_by_id(class_id)
        if not school_class:
            return None, "Classe introuvable."

        existing = SQLRepository.get_assignment(teacher_id, subject_id, class_id)
        if existing:
            return None, "Ce professeur est déjà assigné à cette matière pour cette classe."

        assignment = SQLRepository.create_teacher_assignment(teacher_id, subject_id, class_id)
        return assignment, None

    @staticmethod
    def is_authorized(user, subject_id, class_id):
        """
        Returns True if the user is allowed to manage grades/attendance
        for this subject + class combination.
        Admins are always authorized; teachers only if explicitly assigned.
        """
        if user.role == 'Administrateur':
            return True
        if user.role == 'Professeur':
            return SQLRepository.is_teacher_assigned(user.id, subject_id, class_id)
        return False