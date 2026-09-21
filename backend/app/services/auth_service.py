import bcrypt
import jwt
from datetime import datetime, timedelta
from flask import current_app
from app.repositories.sql_repo import SQLRepository

class AuthService:
    """
    AuthService handles user registration, authentication, token generation, 
    and protection against brute force attacks.
    """

    @staticmethod
    def hash_password(password):
        """
        Hashes password with bcrypt.
        """
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    @staticmethod
    def check_password(password, hashed_password):
        """
        Verifies password against stored hash.
        """
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

    @staticmethod
    def register_user(email, password, role):
        """
        Registers a new user after checking email uniqueness.
        """
        existing = SQLRepository.get_user_by_email(email)
        if existing:
            return None, "Cette adresse email est déjà enregistrée."
        
        hashed = AuthService.hash_password(password)
        user = SQLRepository.create_user(email, hashed, role)
        return user, None

    @staticmethod
    def login_user(email, password, ip_address):
        """
        Authenticates a user, checks brute force limits, locks accounts,
        and logs the attempt.
        """
        user = SQLRepository.get_user_by_email(email)
        
        # 1. Check account lockout if user exists
        if user:
            if user.lockout_until:
                # Naive vs aware timestamp safe check
                lockout_time = user.lockout_until.replace(tzinfo=None)
                if lockout_time > datetime.utcnow():
                    SQLRepository.log_login_attempt(email, ip_address, success=False)
                    time_left = int((lockout_time - datetime.utcnow()).total_seconds() / 60) + 1
                    return None, f"Compte temporairement verrouillé. Réessayez dans {time_left} minute(s)."
                else:
                    # Lockout expired, reset attempts
                    user.failed_login_attempts = 0
                    user.lockout_until = None
                    SQLRepository.update_user(user)

        # 2. Check password credentials
        if not user or not AuthService.check_password(password, user.password_hash):
            # Gestion du verrouillage temporaire en cas de brute-force
            SQLRepository.log_login_attempt(email, ip_address, success=False)
            
            if user:
                user.failed_login_attempts += 1
                if user.failed_login_attempts >= 5:
                    user.lockout_until = datetime.utcnow() + timedelta(minutes=15)
                    SQLRepository.update_user(user)
                    return None, "Mot de passe incorrect. Compte verrouillé pour 15 minutes suite à 5 tentatives infructueuses."
                else:
                    SQLRepository.update_user(user)
                    attempts_left = 5 - user.failed_login_attempts
                    return None, f"Mot de passe incorrect. Il vous reste {attempts_left} tentative(s) avant verrouillage."
            
            return None, "Identifiants invalides."

        # 3. Success login
        user.failed_login_attempts = 0
        user.lockout_until = None
        SQLRepository.update_user(user)
        SQLRepository.log_login_attempt(email, ip_address, success=True)

        # 4. Generate JWT
        payload = {
            'user_id': user.id,
            'email': user.email,
            'role': user.role,
            'exp': datetime.utcnow() + current_app.config['JWT_ACCESS_TOKEN_EXPIRES']
        }
        token = jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')
        
        return {
            'token': token,
            'user': user.to_dict()
        }, None
