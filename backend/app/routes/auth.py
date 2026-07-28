from flask import Blueprint, request, jsonify
from app.services.auth_service import AuthService
from app.repositories.sql_repo import SQLRepository
from app.utils.decorators import token_required, roles_accepted
from app.utils.security import sanitize_input, validate_email, validate_password_strength

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Handles user login, logging connection attempts and locking account if needed.
    """
    data = request.get_json() or {}
    email = sanitize_input(data.get('email', ''))
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'message': 'Email et mot de passe requis.'}), 400

    ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
    # If multiple proxies exist, take the first IP
    if ',' in ip_address:
        ip_address = ip_address.split(',')[0].strip()

    result, error = AuthService.login_user(email, password, ip_address)
    if error:
        return jsonify({'message': error}), 401

    return jsonify(result), 200

@auth_bp.route('/register', methods=['POST'])
@token_required
@roles_accepted('Administrateur')
def register():
    """
    Allows administrators to register new users (Admin or regular User).
    """
    data = request.get_json() or {}
    email = sanitize_input(data.get('email', ''))
    password = data.get('password', '')
    role = sanitize_input(data.get('role', 'Utilisateur'))

    if not email or not password or not role:
        return jsonify({'message': 'Tous les champs sont requis.'}), 400

    if role not in ['Administrateur', 'Utilisateur', 'Professeur']:
        return jsonify({'message': "Rôle invalide. Doit être 'Administrateur', 'Utilisateur' ou 'Professeur'."}), 400

    if not validate_email(email):
        return jsonify({'message': "L'adresse email est invalide."}), 400

    if not validate_password_strength(password):
        return jsonify({
            'message': 'Le mot de passe est trop faible. Il doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.'
        }), 400

    user, error = AuthService.register_user(email, password, role)
    if error:
        return jsonify({'message': error}), 400

    return jsonify({'message': 'Utilisateur créé avec succès.', 'user': user.to_dict()}), 201

@auth_bp.route('/logs', methods=['GET'])
@token_required
@roles_accepted('Administrateur')
def get_login_logs():
    """
    Retrieves login audit logs.
    """
    logs = SQLRepository.get_login_logs(limit=100)
    return jsonify([log.to_dict() for log in logs]), 200

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user_profile():
    """
    Returns profile information of current logged-in user.
    """
    return jsonify(request.current_user.to_dict()), 200