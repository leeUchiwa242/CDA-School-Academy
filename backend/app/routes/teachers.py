from flask import Blueprint, request, jsonify, current_app
from app.services.teacher_service import TeacherService
from app.repositories.sql_repo import SQLRepository
from app.utils.decorators import token_required, roles_accepted
from app.utils.security import sanitize_input, validate_email, validate_password_strength

teachers_bp = Blueprint('teachers', __name__)

@teachers_bp.route('', methods=['GET'])
@token_required
@roles_accepted('Administrateur')
def get_teachers():
    """
    Returns all users with the 'Professeur' role.
    """
    from app.models import User
    teachers = User.query.filter_by(role='Professeur').all()
    return jsonify([t.to_dict() for t in teachers]), 200

@teachers_bp.route('', methods=['POST'])
@token_required
@roles_accepted('Administrateur')
def create_teacher():
    """
    Allows an administrator to create a new Professeur account, with optional
    phone number, address and photo (multipart/form-data, like students).
    """
    email = sanitize_input(request.form.get('email', ''))
    password = request.form.get('password', '')
    phone_number = sanitize_input(request.form.get('phone_number', '')) or None
    address = sanitize_input(request.form.get('address', '')) or None

    if not email or not password:
        return jsonify({'message': 'Email et mot de passe sont requis.'}), 400

    if not validate_email(email):
        return jsonify({'message': "L'adresse email est invalide."}), 400

    if not validate_password_strength(password):
        return jsonify({
            'message': 'Le mot de passe est trop faible. Il doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.'
        }), 400

    photo_file = request.files.get('photo')
    upload_folder = current_app.config['UPLOAD_FOLDER']

    teacher, error = TeacherService.create_teacher(email, password, phone_number, address, photo_file, upload_folder)
    if error:
        return jsonify({'message': error}), 400

    return jsonify({'message': 'Professeur créé avec succès.', 'teacher': teacher.to_dict()}), 201

@teachers_bp.route('/assignments', methods=['GET'])
@token_required
@roles_accepted('Administrateur')
def get_assignments():
    """
    Returns all teacher <-> subject <-> class assignments.
    """
    assignments = SQLRepository.get_all_teacher_assignments()
    return jsonify([a.to_dict() for a in assignments]), 200

@teachers_bp.route('/assignments', methods=['POST'])
@token_required
@roles_accepted('Administrateur')
def create_assignment():
    """
    Assigns a Professeur to teach a given subject to a given class.
    """
    data = request.get_json() or {}
    try:
        teacher_id = int(data.get('teacher_id', 0))
        subject_id = int(data.get('subject_id', 0))
        class_id = int(data.get('class_id', 0))
    except (ValueError, TypeError):
        return jsonify({'message': 'Identifiants invalides.'}), 400

    assignment, error = TeacherService.assign_teacher(teacher_id, subject_id, class_id)
    if error:
        return jsonify({'message': error}), 400

    return jsonify({'message': 'Assignation créée avec succès.', 'assignment': assignment.to_dict()}), 201

@teachers_bp.route('/assignments/<int:assignment_id>', methods=['DELETE'])
@token_required
@roles_accepted('Administrateur')
def delete_assignment(assignment_id):
    success = SQLRepository.delete_teacher_assignment(assignment_id)
    if not success:
        return jsonify({'message': 'Assignation introuvable.'}), 404
    return jsonify({'message': 'Assignation supprimée.'}), 200

@teachers_bp.route('/me/assignments', methods=['GET'])
@token_required
@roles_accepted('Professeur')
def get_my_assignments():
    """
    Returns the logged-in teacher's own subject/class assignments.
    """
    assignments = SQLRepository.get_assignments_by_teacher(request.current_user.id)
    return jsonify([a.to_dict() for a in assignments]), 200