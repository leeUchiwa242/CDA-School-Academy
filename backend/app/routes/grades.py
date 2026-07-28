from flask import Blueprint, request, jsonify
from app.services.grade_service import GradeService
from app.repositories.sql_repo import SQLRepository
from app.utils.decorators import token_required, roles_accepted
from app.utils.security import sanitize_input

grades_bp = Blueprint('grades', __name__)

# --- Subjects Endpoints ---
@grades_bp.route('/subjects', methods=['GET'])
@token_required
def get_subjects():
    subjects = SQLRepository.get_all_subjects()
    return jsonify([s.to_dict() for s in subjects]), 200

@grades_bp.route('/subjects', methods=['POST'])
@token_required
@roles_accepted('Administrateur')
def create_subject():
    data = request.get_json() or {}
    name = sanitize_input(data.get('name', ''))
    if not name:
        return jsonify({'message': 'Le nom de la matière est requis.'}), 400

    existing = SQLRepository.get_subject_by_name(name)
    if existing:
        return jsonify({'message': 'Cette matière existe déjà.'}), 400

    subj = SQLRepository.create_subject(name)
    return jsonify({'message': 'Matière créée avec succès.', 'subject': subj.to_dict()}), 201

@grades_bp.route('/subjects/<int:subj_id>', methods=['DELETE'])
@token_required
@roles_accepted('Administrateur')
def delete_subject(subj_id):
    success = SQLRepository.delete_subject(subj_id)
    if not success:
        return jsonify({'message': 'Matière introuvable.'}), 404
    return jsonify({'message': 'Matière supprimée avec succès.'}), 200


# --- Conversion Scale Endpoints ---
@grades_bp.route('/scale', methods=['GET'])
@token_required
def get_scales():
    scales = SQLRepository.get_all_conversion_scales()
    return jsonify([s.to_dict() for s in scales]), 200

@grades_bp.route('/scale', methods=['POST'])
@token_required
@roles_accepted('Administrateur')
def create_scale():
    data = request.get_json() or {}
    try:
        min_score = float(data.get('min_score', 0))
        max_score = float(data.get('max_score', 0))
        letter_grade = sanitize_input(data.get('letter_grade', ''))
        status_label = sanitize_input(data.get('status_label', ''))
    except (ValueError, TypeError):
        return jsonify({'message': 'Les scores min et max doivent être numériques.'}), 400

    if not letter_grade or not status_label:
        return jsonify({'message': 'Tous les champs sont requis.'}), 400

    if min_score > max_score or min_score < 0 or max_score > 100:
        return jsonify({'message': 'Scores invalides (doivent se situer entre 0 et 100, et min <= max).'}), 400

    scale = SQLRepository.create_conversion_scale(min_score, max_score, letter_grade, status_label)
    return jsonify({'message': 'Règle de conversion créée.', 'scale': scale.to_dict()}), 201

@grades_bp.route('/scale/<int:scale_id>', methods=['DELETE'])
@token_required
@roles_accepted('Administrateur')
def delete_scale(scale_id):
    success = SQLRepository.delete_conversion_scale(scale_id)
    if not success:
        return jsonify({'message': 'Règle de conversion introuvable.'}), 404
    return jsonify({'message': 'Règle de conversion supprimée.'}), 200


# --- Grades Endpoints ---
@grades_bp.route('/student/<int:student_id>', methods=['GET'])
@token_required
def get_student_grades(student_id):
    grades = SQLRepository.get_grades_by_student(student_id)
    return jsonify([g.to_dict() for g in grades]), 200

@grades_bp.route('', methods=['POST'])
@token_required
@roles_accepted('Administrateur', 'Professeur')
def entry_grade():
    """
    Saves a Devoir or Examen grade. Only an Administrateur, or the Professeur
    assigned to the student's class for this subject, is authorized.
    """
    data = request.get_json() or {}
    try:
        student_id = int(data.get('student_id', 0))
        subject_id = int(data.get('subject_id', 0))
        mark = float(data.get('mark', -1))
        term = sanitize_input(data.get('term', ''))
        academic_year = sanitize_input(data.get('academic_year', ''))
        grade_type = sanitize_input(data.get('grade_type', ''))
        date_str = sanitize_input(data.get('date', '')) or None
    except (ValueError, TypeError):
        return jsonify({'message': 'Identifiants ou note invalides.'}), 400

    if not term or not academic_year:
        return jsonify({'message': 'La période et l\'année académique sont requises.'}), 400

    grade, error = GradeService.add_grade(
        request.current_user, student_id, subject_id, mark, term, academic_year, grade_type, date_str
    )
    if error:
        return jsonify({'message': error}), 400 if 'autorisé' not in error else 403

    return jsonify({'message': 'Note enregistrée avec succès.', 'grade': grade.to_dict()}), 201

@grades_bp.route('/<int:grade_id>', methods=['PUT'])
@token_required
@roles_accepted('Administrateur', 'Professeur')
def edit_grade(grade_id):
    """
    Edits an existing grade's mark and/or date. Only an Administrateur, or the
    Professeur assigned to this class/subject, is authorized.
    """
    data = request.get_json() or {}
    try:
        mark = float(data.get('mark', -1))
        date_str = sanitize_input(data.get('date', '')) or None
    except (ValueError, TypeError):
        return jsonify({'message': 'Note invalide.'}), 400

    grade, error = GradeService.update_grade(request.current_user, grade_id, mark, date_str)
    if error:
        return jsonify({'message': error}), 403 if 'autorisé' in error else 404 if 'introuvable' in error else 400

    return jsonify({'message': 'Note modifiée avec succès.', 'grade': grade.to_dict()}), 200

@grades_bp.route('/student/<int:student_id>/subject/<int:subject_id>/average', methods=['GET'])
@token_required
def get_subject_average(student_id, subject_id):
    """
    Returns a student's Devoir/Examen breakdown and weighted average for one subject.
    """
    term = sanitize_input(request.args.get('term', ''))
    academic_year = sanitize_input(request.args.get('academic_year', ''))
    if not term or not academic_year:
        return jsonify({'message': 'La période et l\'année académique sont requises.'}), 400

    grades = SQLRepository.get_grades_by_student_subject_term_year(student_id, subject_id, term, academic_year)
    devoirs = [g.to_dict() for g in grades if g.grade_type == 'Devoir']
    examens = [g.to_dict() for g in grades if g.grade_type == 'Examen']
    average = GradeService.get_subject_average(student_id, subject_id, term, academic_year)

    return jsonify({
        'devoirs': devoirs,
        'examens': examens,
        'average': average
    }), 200

@grades_bp.route('/<int:grade_id>', methods=['DELETE'])
@token_required
@roles_accepted('Administrateur', 'Professeur')
def delete_grade(grade_id):
    success, error = GradeService.delete_grade(request.current_user, grade_id)
    if not success:
        return jsonify({'message': error}), 403 if 'autorisé' in error else 404
    return jsonify({'message': 'Note supprimée.'}), 200