from flask import Blueprint, request, jsonify
from datetime import datetime
from app.services.attendance_service import AttendanceService
from app.repositories.sql_repo import SQLRepository
from app.utils.decorators import token_required, roles_accepted
from app.utils.security import sanitize_input

attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('', methods=['POST'])
@token_required
@roles_accepted('Administrateur', 'Professeur')
def save_attendance():
    """
    Saves (creates or updates) an attendance session for a class + subject + date,
    along with the Présent/Absent (+ retard facultatif) status of each student.
    """
    data = request.get_json() or {}
    try:
        class_id = int(data.get('class_id', 0))
        subject_id = int(data.get('subject_id', 0))
        date_str = sanitize_input(data.get('date', ''))
        term = sanitize_input(data.get('term', ''))
        academic_year = sanitize_input(data.get('academic_year', ''))
        records = data.get('records', [])
    except (ValueError, TypeError):
        return jsonify({'message': 'Données invalides.'}), 400

    try:
        date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Date invalide (format attendu AAAA-MM-JJ).'}), 400

    if not term or not academic_year or not isinstance(records, list):
        return jsonify({'message': 'Période, année académique et liste des élèves requises.'}), 400

    session, error = AttendanceService.save_attendance(
        request.current_user, class_id, subject_id, date, term, academic_year, records
    )
    if error:
        return jsonify({'message': error}), 403 if 'autorisé' in error else 400

    return jsonify({'message': 'Présence enregistrée avec succès.', 'session': session.to_dict()}), 200

@attendance_bp.route('', methods=['GET'])
@token_required
def get_attendance_session():
    """
    Retrieves an existing attendance session (with its records) for a class + subject + date,
    so the teacher can review/edit what was already recorded.
    """
    try:
        class_id = int(request.args.get('class_id', 0))
        subject_id = int(request.args.get('subject_id', 0))
        date_str = sanitize_input(request.args.get('date', ''))
        date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return jsonify({'message': 'Paramètres invalides.'}), 400

    session = SQLRepository.get_attendance_session(class_id, subject_id, date)
    if not session:
        return jsonify({'session': None}), 200

    return jsonify({'session': session.to_dict()}), 200

@attendance_bp.route('/student/<int:student_id>/rate', methods=['GET'])
@token_required
def get_student_attendance_rate(student_id):
    """
    Returns a student's overall attendance rate (% of sessions marked Présent).
    """
    rate = AttendanceService.get_attendance_rate(student_id)
    return jsonify({'student_id': student_id, 'attendance_rate': rate}), 200

@attendance_bp.route('/student/<int:student_id>/history', methods=['GET'])
@token_required
@roles_accepted('Administrateur', 'Utilisateur')
def get_student_attendance_history(student_id):
    """
    Returns a student's full attendance history (each session with date, subject, status, late),
    for the read-only student profile view.
    """
    records = SQLRepository.get_attendance_records_for_student(student_id)
    rate = AttendanceService.get_attendance_rate(student_id)
    return jsonify({
        'attendance_rate': rate,
        'records': [r.to_dict() for r in records]
    }), 200

@attendance_bp.route('/records/<int:record_id>', methods=['PUT'])
@token_required
@roles_accepted('Administrateur')
def correct_attendance_record(record_id):
    """
    Lets an administrator correct a single attendance record (e.g. a teacher
    mistakenly marked Présent instead of Absent, or vice-versa).
    """
    data = request.get_json() or {}
    status = sanitize_input(data.get('status', ''))
    late = data.get('late', None)

    record, error = AttendanceService.correct_record(request.current_user, record_id, status, late)
    if error:
        return jsonify({'message': error}), 403 if 'administrateur' in error else 404 if 'introuvable' in error else 400

    return jsonify({'message': 'Présence corrigée avec succès.', 'record': record.to_dict()}), 200