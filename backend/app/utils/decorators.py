import jwt
from functools import wraps
from flask import request, jsonify, current_app
from app.repositories.sql_repo import SQLRepository

def token_required(f):
    """
    Decorator to protect API routes. Decodes JWT and attaches the user to the request context.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Read the Authorization header: format is "Bearer <JWT>"
        auth_header = request.headers.get('Authorization')
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]
                
        if not token:
            return jsonify({'message': 'Jeton de connexion manquant ou invalide.'}), 401
            
        try:
            # Decode token using standard HS256
            data = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            current_user = SQLRepository.get_user_by_id(data['user_id'])
            if not current_user:
                return jsonify({'message': 'Utilisateur non trouvé.'}), 401
                
            # Check for lockout status (just in case)
            from datetime import datetime, timezone
            if current_user.lockout_until:
                # Compare naive or tz-aware depending on SQLite vs PG.
                # To be safe, compare datetime.utcnow() with naive or convert both.
                lockout_naive = current_user.lockout_until.replace(tzinfo=None)
                if lockout_naive > datetime.utcnow():
                    return jsonify({'message': 'Compte verrouillé.'}), 403
                    
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Le jeton de connexion a expiré.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Jeton de connexion invalide.'}), 401
            
        # Attach user to request context (using a custom attribute on the request object)
        request.current_user = current_user
        return f(*args, **kwargs)
        
    return decorated

def roles_accepted(*roles):
    """
    Decorator to restrict access to specific roles (e.g. 'Administrateur').
    Needs to be placed AFTER @token_required.
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # Verify the current_user attached by token_required
            user = getattr(request, 'current_user', None)
            if not user or user.role not in roles:
                return jsonify({'message': "Accès refusé. Droits d'accès insuffisants."}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
