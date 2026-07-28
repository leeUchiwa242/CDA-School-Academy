from flask import Blueprint, request, jsonify
from app.services.grade_service import GradeService
from app.services.teacher_attendance_service import TeacherAttendanceService
from app.utils.decorators import token_required, roles_accepted
from app.utils.security import sanitize_input

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
@token_required
@roles_accepted('Administrateur', 'Utilisateur')
def get_stats():
    """
    Returns general dashboard KPIs based on term and academic year,
    optionally scoped to a single class. Also includes, additively:
    - `teacher_stats`: today's teacher presence/absence/lateness KPIs.
    - `student_alerts`: at-risk students (absences, lateness, grade drops).
    Both blocks are best-effort and never break the original KPI response.
    """
    term = sanitize_input(request.args.get('term', ''))
    academic_year = sanitize_input(request.args.get('academic_year', ''))
    class_id = request.args.get('class_id', type=int)

    if not term or not academic_year:
        return jsonify({'message': 'Période et année académique requises.'}), 400

    stats = GradeService.get_class_statistics(term, academic_year, class_id=class_id)

    try:
        stats['teacher_stats'] = TeacherAttendanceService.get_global_teacher_stats(academic_year)
    except Exception:
        stats['teacher_stats'] = {'present_today': 0, 'absent_today': 0, 'late_today': 0, 'global_presence_rate': 0.0}

    try:
        stats['student_alerts'] = GradeService.get_student_alert_summary(term, academic_year, class_id=class_id)
    except Exception:
        stats['student_alerts'] = {'top_absences': [], 'top_lates': [], 'grade_drops': []}

    return jsonify(stats), 200