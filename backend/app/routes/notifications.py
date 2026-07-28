from flask import Blueprint, request, jsonify
from app.repositories.sql_repo import SQLRepository
from app.utils.decorators import token_required, roles_accepted
from app.utils.security import sanitize_input

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('', methods=['GET'])
@token_required
@roles_accepted('Administrateur')
def list_notifications():
    """
    Lists notifications for the administrator, optionally filtered by read
    status (?is_read=true|false), priority level (?level=Information|
    Avertissement|Critique), or type (?type=teacher_absence|teacher_late|
    student_grade_drop|student_absences|student_late). Never exposed to
    Professeur or Utilisateur accounts.
    """
    is_read_param = request.args.get('is_read')
    is_read = None
    if is_read_param is not None:
        is_read = is_read_param.lower() in ('1', 'true', 'yes')

    level = sanitize_input(request.args.get('level', '')) or None
    notif_type = sanitize_input(request.args.get('type', '')) or None

    notifications = SQLRepository.get_notifications(is_read=is_read, level=level, notif_type=notif_type)
    return jsonify([n.to_dict() for n in notifications]), 200


@notifications_bp.route('/unread-count', methods=['GET'])
@token_required
@roles_accepted('Administrateur')
def unread_count():
    """
    Powers the bell icon's badge in the navigation bar.
    """
    return jsonify({'unread_count': SQLRepository.get_unread_notification_count()}), 200


@notifications_bp.route('/<int:notification_id>/read', methods=['PATCH'])
@token_required
@roles_accepted('Administrateur')
def mark_read(notification_id):
    data = request.get_json(silent=True) or {}
    is_read = data.get('is_read', True)

    notif = SQLRepository.mark_notification_read(notification_id, is_read=is_read)
    if not notif:
        return jsonify({'message': 'Notification introuvable.'}), 404

    return jsonify({'message': 'Notification mise à jour.', 'notification': notif.to_dict()}), 200


@notifications_bp.route('/<int:notification_id>', methods=['DELETE'])
@token_required
@roles_accepted('Administrateur')
def delete_notification(notification_id):
    success = SQLRepository.delete_notification(notification_id)
    if not success:
        return jsonify({'message': 'Notification introuvable.'}), 404

    return jsonify({'message': 'Notification supprimée.'}), 200
