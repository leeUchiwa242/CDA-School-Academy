from flask import Blueprint, request, jsonify
from app.services.schedule_service import ScheduleService
from app.repositories.sql_repo import SQLRepository
from app.utils.decorators import token_required, roles_accepted
from app.utils.security import sanitize_input

schedule_bp = Blueprint('schedule', __name__)

@schedule_bp.route('/generate', methods=['POST'])
@token_required
@roles_accepted('Administrateur')
def generate_schedule():
    """
    Auto-generates the recurring weekly timetable grid (empty slots, no subject
    assigned yet) for a class, for the whole academic year. Safe to call again
    to extend an existing grid (already-existing slots are left untouched).
    """
    data = request.get_json() or {}
    try:
        class_id = int(data.get('class_id', 0))
        days_of_week = [int(d) for d in data.get('days_of_week', [])]
    except (ValueError, TypeError):
        return jsonify({'message': 'Données invalides.'}), 400

    academic_year = sanitize_input(data.get('academic_year', ''))
    start_time_str = sanitize_input(data.get('start_time', ''))
    end_time_str = sanitize_input(data.get('end_time', ''))
    slot_duration_minutes = data.get('slot_duration_minutes', 0)
    room = sanitize_input(data.get('room', '')) or None

    if not academic_year:
        return jsonify({'message': "L'année académique est requise."}), 400

    slots, error = ScheduleService.generate_grid(
        class_id, academic_year, days_of_week, start_time_str, end_time_str, slot_duration_minutes, room
    )
    if error:
        return jsonify({'message': error}), 400

    return jsonify({
        'message': f"Grille générée avec succès ({len(slots)} créneaux).",
        'slots': [s.to_dict() for s in slots]
    }), 201

@schedule_bp.route('/class/<int:class_id>', methods=['GET'])
@token_required
def get_class_schedule(class_id):
    """
    Returns the full weekly timetable for a class, for the given academic year.
    """
    school_class = SQLRepository.get_class_by_id(class_id)
    if not school_class:
        return jsonify({'message': 'Classe introuvable.'}), 404

    academic_year = sanitize_input(request.args.get('academic_year', ''))
    if not academic_year:
        return jsonify({'message': "L'année académique est requise."}), 400

    slots = ScheduleService.get_class_schedule(class_id, academic_year)
    return jsonify({
        'class': school_class.to_dict(),
        'slots': [s.to_dict() for s in slots]
    }), 200

@schedule_bp.route('/teacher/me', methods=['GET'])
@token_required
@roles_accepted('Professeur')
def get_my_schedule():
    """
    Returns the logged-in teacher's own weekly timetable across all their classes.
    """
    academic_year = sanitize_input(request.args.get('academic_year', ''))
    if not academic_year:
        return jsonify({'message': "L'année académique est requise."}), 400

    slots = ScheduleService.get_teacher_schedule(request.current_user.id, academic_year)
    return jsonify([s.to_dict() for s in slots]), 200

@schedule_bp.route('/slots', methods=['POST'])
@token_required
@roles_accepted('Administrateur')
def create_slot():
    """
    Creates a single timetable entry directly from the Configuration module:
    day + start/end time + subject + class. No teacher assigned yet — that
    is done separately from Professeurs > Attribution des cours. Rejects the
    entry if it conflicts with an existing course for the same class.
    """
    data = request.get_json() or {}
    try:
        class_id = int(data.get('class_id', 0))
        day_of_week = int(data.get('day_of_week', -1))
        subject_id = int(data.get('subject_id', 0))
    except (ValueError, TypeError):
        return jsonify({'message': 'Données invalides.'}), 400

    academic_year = sanitize_input(data.get('academic_year', ''))
    start_time_str = sanitize_input(data.get('start_time', ''))
    end_time_str = sanitize_input(data.get('end_time', ''))
    room = sanitize_input(data.get('room', '')) or None

    if not academic_year:
        return jsonify({'message': "L'année académique est requise."}), 400

    slot, error = ScheduleService.create_single_slot(
        class_id, day_of_week, academic_year, start_time_str, end_time_str, subject_id, room
    )
    if error:
        return jsonify({'message': error}), 400

    return jsonify({'message': 'Créneau créé avec succès.', 'slot': slot.to_dict()}), 201

@schedule_bp.route('/slots/<int:slot_id>/assign-teacher', methods=['PUT'])
@token_required
@roles_accepted('Administrateur')
def assign_teacher_to_slot(slot_id):
    """
    Attributes a teacher to an already-configured calendar slot. Linked
    automatically to the timetable to prevent double-booking: rejects the
    attribution if the teacher already has an overlapping course.
    """
    data = request.get_json() or {}
    try:
        teacher_id = int(data.get('teacher_id', 0))
    except (ValueError, TypeError):
        return jsonify({'message': 'Professeur invalide.'}), 400

    slot, error = ScheduleService.assign_teacher_to_slot(slot_id, teacher_id)
    if error:
        return jsonify({'message': error}), 400

    return jsonify({'message': 'Professeur attribué avec succès.', 'slot': slot.to_dict()}), 200

@schedule_bp.route('/slots/<int:slot_id>/unassign-teacher', methods=['PUT'])
@token_required
@roles_accepted('Administrateur')
def unassign_teacher_from_slot(slot_id):
    """
    Removes the teacher from a slot while keeping its day/time/subject/class
    definition — used to correct a wrong attribution.
    """
    slot, error = ScheduleService.unassign_teacher_from_slot(slot_id)
    if error:
        return jsonify({'message': error}), 404

    return jsonify({'message': 'Attribution retirée avec succès.', 'slot': slot.to_dict()}), 200

@schedule_bp.route('/slots/<int:slot_id>/assign', methods=['PUT'])
@token_required
@roles_accepted('Administrateur')
def assign_slot(slot_id):
    """
    Assigns a subject to a timetable slot. The teacher is auto-assigned based
    on the existing TeacherAssignment for that subject + class.
    """
    data = request.get_json() or {}
    try:
        subject_id = int(data.get('subject_id', 0))
    except (ValueError, TypeError):
        return jsonify({'message': 'Matière invalide.'}), 400

    slot, error = ScheduleService.assign_subject(slot_id, subject_id)
    if error:
        return jsonify({'message': error}), 400

    return jsonify({'message': 'Créneau assigné avec succès.', 'slot': slot.to_dict()}), 200

@schedule_bp.route('/slots/<int:slot_id>/clear', methods=['PUT'])
@token_required
@roles_accepted('Administrateur')
def clear_slot(slot_id):
    """
    Resets a slot to empty (removes its subject/teacher, keeps the day/time placeholder).
    """
    slot, error = ScheduleService.clear_slot(slot_id)
    if error:
        return jsonify({'message': error}), 404

    return jsonify({'message': 'Créneau vidé avec succès.', 'slot': slot.to_dict()}), 200

@schedule_bp.route('/slots/<int:slot_id>', methods=['DELETE'])
@token_required
@roles_accepted('Administrateur')
def delete_slot(slot_id):
    """
    Permanently removes a slot from the grid (e.g. to fix a wrongly generated grid).
    """
    success = ScheduleService.delete_slot(slot_id)
    if not success:
        return jsonify({'message': 'Créneau introuvable.'}), 404

    return jsonify({'message': 'Créneau supprimé avec succès.'}), 200