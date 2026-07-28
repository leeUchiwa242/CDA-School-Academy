import os
from flask import Blueprint, request, jsonify, send_file, current_app
from app.services.bulletin_service import BulletinService
from app.utils.pdf_gen import generate_bulletin_pdf
from app.utils.decorators import token_required
from app.utils.security import sanitize_input
from app.repositories.nosql_repo import NoSQLRepository

bulletins_bp = Blueprint('bulletins', __name__)

# Initialize NoSQL repository (re-bind dynamically inside request or configure in app start)
# To avoid route-init order issues, we can fetch the repo instance from current_app or instantiate locally.
# Let's instantiate it and initialize with current_app configurations.
nosql_repo = NoSQLRepository()

def get_bulletin_service():
    """
    Initializes and returns the BulletinService with current_app context.
    """
    # Ensure initialized with current app
    nosql_repo.init_app(current_app)
    return BulletinService(nosql_repo)

@bulletins_bp.route('/student/<int:student_id>', methods=['GET'])
@token_required
def get_student_bulletins(student_id):
    """
    Fetches all generated bulletins for a specific student.
    """
    service = get_bulletin_service()
    bulletins = service.get_bulletins_for_student(student_id)
    return jsonify(bulletins), 200

@bulletins_bp.route('/generate', methods=['POST'])
@token_required
def generate_bulletin():
    """
    Triggers bulletin calculations and saves result to MongoDB / NoSQL file fallback.
    Supports 'force_regenerate' boolean.
    """
    data = request.get_json() or {}
    try:
        student_id = int(data.get('student_id', 0))
    except (ValueError, TypeError):
        return jsonify({'message': "Identifiant d'étudiant invalide."}), 400

    term = sanitize_input(data.get('term', ''))
    academic_year = sanitize_input(data.get('academic_year', ''))
    force_regenerate = bool(data.get('force_regenerate', False))

    if not term or not academic_year:
        return jsonify({'message': 'La période et l\'année académique sont requises.'}), 400

    service = get_bulletin_service()
    bulletin, error = service.get_or_generate_bulletin(
        student_id, term, academic_year, force_regenerate
    )
    if error:
        return jsonify({'message': error}), 400

    return jsonify(bulletin), 200

@bulletins_bp.route('/<bulletin_uuid>/pdf', methods=['GET'])
@token_required
def download_bulletin_pdf(bulletin_uuid):
    """
    Retrieves the bulletin document, builds a ReportLab PDF, and serves it as a file.
    """
    service = get_bulletin_service()
    bulletin = service.get_bulletin_by_uuid(bulletin_uuid)
    if not bulletin:
        return jsonify({'message': 'Bulletin introuvable.'}), 404

    upload_folder = current_app.config['UPLOAD_FOLDER']
    
    # Store generated PDFs in a temp folder inside uploads
    pdf_filename = f"bulletin_{bulletin_uuid}.pdf"
    pdf_path = os.path.join(upload_folder, pdf_filename)

    try:
        generate_bulletin_pdf(bulletin, pdf_path, upload_folder)
        
        # Verify file exists
        if not os.path.exists(pdf_path):
            return jsonify({'message': 'Erreur lors de la génération du fichier PDF.'}), 500
            
        return send_file(
            pdf_path,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"bulletin_{bulletin['student_info']['last_name']}_{bulletin['term']}.pdf"
        )
    except Exception as e:
        current_app.logger.error(f"PDF download error: {e}")
        return jsonify({'message': f'Erreur lors du téléchargement : {str(e)}'}), 500
