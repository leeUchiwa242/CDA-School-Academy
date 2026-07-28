import os
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from app.services.student_service import StudentService
from app.repositories.sql_repo import SQLRepository
from app.utils.decorators import token_required, roles_accepted
from app.utils.security import validate_student_data, sanitize_input

students_bp = Blueprint('students', __name__)

@students_bp.route('', methods=['GET'])
@token_required
@roles_accepted('Administrateur', 'Utilisateur')
def get_students():
    """
    Returns student directory, supporting searches. Restricted to Admin/Utilisateur:
    a Professeur should only see students of their assigned classes, via
    GET /api/classes/<id>/students instead.
    """
    search_query = sanitize_input(request.args.get('query', ''))
    class_id = request.args.get('class_id', type=int)
    students = SQLRepository.get_all_students(search_query, class_id=class_id)
    return jsonify([student.to_dict() for student in students]), 200

@students_bp.route('/<int:student_id>', methods=['GET'])
@token_required
def get_student(student_id):
    """
    Returns individual student.
    """
    student = SQLRepository.get_student_by_id(student_id)
    if not student:
        return jsonify({'message': 'Étudiant introuvable.'}), 404
    return jsonify(student.to_dict()), 200

@students_bp.route('/<int:student_id>/profile', methods=['GET'])
@token_required
@roles_accepted('Administrateur', 'Utilisateur')
def get_student_profile(student_id):
    """
    Returns a read-only, comprehensive profile for a student: their info, overall
    metrics (average/rank/letter), and their Devoir/Examen breakdown across every
    subject, for a given term/year. Used by the admin's student profile view.
    """
    from app.services.grade_service import GradeService

    student = SQLRepository.get_student_by_id(student_id)
    if not student:
        return jsonify({'message': 'Étudiant introuvable.'}), 404

    term = sanitize_input(request.args.get('term', ''))
    academic_year = sanitize_input(request.args.get('academic_year', ''))
    if not term or not academic_year:
        return jsonify({'message': 'La période et l\'année académique sont requises.'}), 400

    metrics = GradeService.calculate_student_metrics(student_id, term, academic_year)
    subjects = GradeService.get_full_subject_breakdown(student_id, term, academic_year)

    return jsonify({
        'student': student.to_dict(),
        'metrics': metrics,
        'subjects': subjects
    }), 200

@students_bp.route('/<int:student_id>/notes', methods=['GET'])
@token_required
@roles_accepted('Administrateur', 'Utilisateur')
def get_student_notes(student_id):
    """
    Returns the qualitative notes (bloc-notes) written about a student over time.
    """
    student = SQLRepository.get_student_by_id(student_id)
    if not student:
        return jsonify({'message': 'Étudiant introuvable.'}), 404

    notes = SQLRepository.get_notes_for_student(student_id)
    return jsonify([n.to_dict() for n in notes]), 200

@students_bp.route('/<int:student_id>/notes', methods=['POST'])
@token_required
@roles_accepted('Administrateur')
def create_student_note(student_id):
    """
    Adds a free-text qualitative note about a student (e.g. context that doesn't
    show up in grades: family situation, a breakthrough in a subject, etc.).
    """
    student = SQLRepository.get_student_by_id(student_id)
    if not student:
        return jsonify({'message': 'Étudiant introuvable.'}), 404

    data = request.get_json() or {}
    content = sanitize_input(data.get('content', ''))
    if not content:
        return jsonify({'message': 'Le contenu de la remarque est requis.'}), 400

    note = SQLRepository.create_student_note(student_id, request.current_user.id, content)
    return jsonify({'message': 'Remarque ajoutée avec succès.', 'note': note.to_dict()}), 201

@students_bp.route('', methods=['POST'])
@token_required
@roles_accepted('Administrateur')
def create_student():
    """
    Creates a new student. Handles multipart/form-data for image uploads.
    """
    # Parse form data
    form_data = {
        'first_name': request.form.get('first_name', ''),
        'last_name': request.form.get('last_name', ''),
        'date_of_birth': request.form.get('date_of_birth', ''),
        'gender': request.form.get('gender', ''),
        'country': request.form.get('country', ''),
        'address': request.form.get('address', ''),
        'phone_number': request.form.get('phone_number', ''),
        'email': request.form.get('email', ''),
        'class_id': request.form.get('class_id', '')
    }

    # Validate inputs
    valid_data, error = validate_student_data(form_data)
    if error:
        return jsonify({'message': error}), 400

    photo_file = request.files.get('photo')
    upload_folder = current_app.config['UPLOAD_FOLDER']

    student, error = StudentService.create_student(valid_data, photo_file, upload_folder)
    if error:
        return jsonify({'message': error}), 400

    return jsonify({'message': 'Étudiant créé avec succès.', 'student': student.to_dict()}), 201

@students_bp.route('/<int:student_id>', methods=['PUT'])
@token_required
@roles_accepted('Administrateur')
def update_student(student_id):
    """
    Updates an existing student details, including photo.
    """
    form_data = {
        'first_name': request.form.get('first_name', ''),
        'last_name': request.form.get('last_name', ''),
        'date_of_birth': request.form.get('date_of_birth', ''),
        'gender': request.form.get('gender', ''),
        'country': request.form.get('country', ''),
        'address': request.form.get('address', ''),
        'phone_number': request.form.get('phone_number', ''),
        'email': request.form.get('email', ''),
        'class_id': request.form.get('class_id', '')
    }

    valid_data, error = validate_student_data(form_data)
    if error:
        return jsonify({'message': error}), 400

    photo_file = request.files.get('photo')
    upload_folder = current_app.config['UPLOAD_FOLDER']

    student, error = StudentService.update_student(student_id, valid_data, photo_file, upload_folder)
    if error:
        return jsonify({'message': error}), 400

    return jsonify({'message': 'Étudiant mis à jour avec succès.', 'student': student.to_dict()}), 200

@students_bp.route('/<int:student_id>', methods=['DELETE'])
@token_required
@roles_accepted('Administrateur')
def delete_student(student_id):
    """
    Deletes student and associated photo.
    """
    upload_folder = current_app.config['UPLOAD_FOLDER']
    success = StudentService.delete_student(student_id, upload_folder)
    if not success:
        return jsonify({'message': 'Étudiant introuvable.'}), 404
        
    return jsonify({'message': 'Étudiant supprimé avec succès.'}), 200

@students_bp.route('/uploads/<filename>', methods=['GET'])
def get_uploaded_file(filename):
    """
    Serves uploaded student photos securely, validating directory limits to prevent
    Directory Traversal attacks.
    """
    upload_folder = current_app.config['UPLOAD_FOLDER']
    # send_from_directory securely cleans the path relative to upload_folder
    return send_from_directory(upload_folder, filename)