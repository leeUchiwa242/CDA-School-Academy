from flask import Blueprint, jsonify, request
from app.repositories.sql_repo import SQLRepository
from app.utils.decorators import token_required
from app.utils.security import sanitize_input

classes_bp = Blueprint('classes', __name__)

@classes_bp.route('', methods=['GET'])
@token_required
def get_classes():
    """
    Returns the list of classes (Seconde, Première, Terminale) with student counts.
    """
    classes = SQLRepository.get_all_classes()
    return jsonify([c.to_dict() for c in classes]), 200

@classes_bp.route('/<int:class_id>/students', methods=['GET'])
@token_required
def get_students_in_class(class_id):
    """
    Returns all students belonging to a given class.
    """
    school_class = SQLRepository.get_class_by_id(class_id)
    if not school_class:
        return jsonify({'message': 'Classe introuvable.'}), 404

    search_query = sanitize_input(request.args.get('query', ''))
    students = SQLRepository.get_all_students(search_query, class_id=class_id)
    return jsonify({
        'class': school_class.to_dict(),
        'students': [student.to_dict() for student in students]
    }), 200
