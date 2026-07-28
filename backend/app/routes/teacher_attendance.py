from flask import Blueprint, request, jsonify
from datetime import datetime
from app.services.teacher_attendance_service import TeacherAttendanceService
from app.repositories.sql_repo import SQLRepository
from app.utils.decorators import token_required, roles_accepted
from app.utils.security import sanitize_input

teacher_attendance_bp = Blueprint('teacher_attendance', __name__)


@teacher_attendance_bp.route('/slots/<int:slot_id>/mark', methods=['POST'])
@token_required
@roles_accepted('Administrateur')
def mark_attendance(slot_id):
    """
    Administrator-only: marks or corrects a teacher's presence status
    (Présent / Absent / Retard) for a given calendar slot and date. This is
    the only way presence is ever set — teachers never declare their own
    arrival or absence.
    """
    data = request.get_json() or {}
    date_str = sanitize_input(data.get('date', ''))
    status = sanitize_input(data.get('status', ''))

    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else datetime.now().date()
    except ValueError:
        return jsonify({'message': 'Date invalide (format attendu AAAA-MM-JJ).'}), 400

    record, error = TeacherAttendanceService.mark_attendance(slot_id, target_date, status)
    if error:
        return jsonify({'message': error}), 400

    return jsonify({'message': 'Présence enregistrée avec succès.', 'record': record.to_dict()}), 200


@teacher_attendance_bp.route('/calendar', methods=['GET'])
@token_required
@roles_accepted('Administrateur')
def calendar():
    """
    Returns every scheduled class for a given date (defaults to today),
    across all classes, with each teacher's live presence status.
    """
    date_str = sanitize_input(request.args.get('date', ''))
    academic_year = sanitize_input(request.args.get('academic_year', ''))
    if not academic_year:
        return jsonify({'message': "L'année académique est requise."}), 400

    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else datetime.now().date()
    except ValueError:
        return jsonify({'message': 'Date invalide (format attendu AAAA-MM-JJ).'}), 400

    entries = TeacherAttendanceService.get_calendar_for_date(target_date, academic_year)
    return jsonify({'date': target_date.isoformat(), 'slots': entries}), 200


@teacher_attendance_bp.route('/teacher/<int:teacher_id>/profile', methods=['GET'])
@token_required
@roles_accepted('Administrateur')
def teacher_profile(teacher_id):
    """
    Returns a teacher's full detail-page payload: identity, assignments
    (subject taught, classes attributed), and presence statistics
    (rates, monthly breakdown, history).
    """
    teacher = SQLRepository.get_user_by_id(teacher_id)
    if not teacher or teacher.role != 'Professeur':
        return jsonify({'message': 'Professeur introuvable.'}), 404

    stats = TeacherAttendanceService.get_teacher_profile_stats(teacher_id)
    assignments = SQLRepository.get_assignments_by_teacher(teacher_id)

    return jsonify({
        'teacher': teacher.to_dict(),
        'assignments': [a.to_dict() for a in assignments],
        'stats': stats
    }), 200