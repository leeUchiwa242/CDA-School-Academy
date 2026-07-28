import os
from werkzeug.utils import secure_filename
from app.repositories.sql_repo import SQLRepository

class StudentService:
    """
    StudentService handles CRUD logic for students and securely handles photo uploads.
    """

    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

    @staticmethod
    def allowed_file(filename):
        return '.' in filename and \
            filename.rsplit('.', 1)[1].lower() in StudentService.ALLOWED_EXTENSIONS

    @staticmethod
    def create_student(data, photo_file=None, upload_folder=None):
        """
        Creates a student, validating unique email and handling file upload.
        """
        # Validate unique email
        existing = SQLRepository.get_student_by_email(data['email'])
        if existing:
            return None, "Un étudiant possède déjà cette adresse email."

        # Validate that the selected class actually exists
        school_class = SQLRepository.get_class_by_id(data['class_id'])
        if not school_class:
            return None, "La classe sélectionnée n'existe pas."

        # Handle photo upload
        photo_url = None
        if photo_file and photo_file.filename != '':
            if not StudentService.allowed_file(photo_file.filename):
                return None, "Format de photo invalide. Formats acceptés : PNG, JPG, JPEG, GIF."

            # Securise le nom de fichier et écrit
            filename = secure_filename(photo_file.filename)
            # Ajouter un timestamp pour éviter les collisions
            from datetime import datetime
            timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
            filename = f"{timestamp}_{filename}"
            
            if not os.path.exists(upload_folder):
                os.makedirs(upload_folder)
            
            filepath = os.path.join(upload_folder, filename)
            photo_file.save(filepath)
            photo_url = f"/api/students/uploads/{filename}"

        student = SQLRepository.create_student(
            first_name=data['first_name'],
            last_name=data['last_name'],
            date_of_birth=data['date_of_birth'],
            gender=data['gender'],
            country=data['country'],
            address=data['address'],
            phone_number=data['phone_number'],
            email=data['email'],
            class_id=data['class_id'],
            photo_url=photo_url
        )
        return student, None

    @staticmethod
    def update_student(student_id, data, photo_file=None, upload_folder=None):
        """
        Updates an existing student details, handling photo replacement.
        """
        student = SQLRepository.get_student_by_id(student_id)
        if not student:
            return None, "Étudiant introuvable."

        # Validate unique email (excluding current student)
        existing = SQLRepository.get_student_by_email(data['email'])
        if existing and existing.id != student.id:
            return None, "Un autre étudiant possède déjà cette adresse email."

        # Validate that the selected class actually exists
        school_class = SQLRepository.get_class_by_id(data['class_id'])
        if not school_class:
            return None, "La classe sélectionnée n'existe pas."

        # Handle photo upload
        if photo_file and photo_file.filename != '':
            if not StudentService.allowed_file(photo_file.filename):
                return None, "Format de photo invalide. Formats acceptés : PNG, JPG, JPEG, GIF."
            
            filename = secure_filename(photo_file.filename)
            from datetime import datetime
            timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
            filename = f"{timestamp}_{filename}"
            
            if not os.path.exists(upload_folder):
                os.makedirs(upload_folder)
                
            filepath = os.path.join(upload_folder, filename)
            photo_file.save(filepath)
            
            # Clean up old file if exists
            if student.photo_url:
                old_filename = student.photo_url.split('/')[-1]
                old_filepath = os.path.join(upload_folder, old_filename)
                if os.path.exists(old_filepath):
                    try:
                        os.remove(old_filepath)
                    except Exception:
                        pass
            
            student.photo_url = f"/api/students/uploads/{filename}"

        # Update other fields
        student.first_name = data['first_name']
        student.last_name = data['last_name']
        student.date_of_birth = data['date_of_birth']
        student.gender = data['gender']
        student.country = data['country']
        student.address = data['address']
        student.phone_number = data['phone_number']
        student.email = data['email']
        student.class_id = data['class_id']

        updated_student = SQLRepository.update_student(student)
        return updated_student, None

    @staticmethod
    def delete_student(student_id, upload_folder=None):
        """
        Deletes a student and cleans up their uploaded photo.
        """
        student = SQLRepository.get_student_by_id(student_id)
        if not student:
            return False

        # Clean up photo file
        if student.photo_url and upload_folder:
            filename = student.photo_url.split('/')[-1]
            filepath = os.path.join(upload_folder, filename)
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except Exception:
                    pass

        return SQLRepository.delete_student(student_id)
