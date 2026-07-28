import re
from datetime import datetime
import html

# Strict validation regexes
EMAIL_REGEX = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
PHONE_REGEX = r'^\+?[0-9\s\-()]{8,20}$'

def sanitize_input(value):
    """
    Sanitizes string inputs to prevent XSS (escapes HTML tags).
    """
    if isinstance(value, str):
        return html.escape(value.strip())
    return value

def validate_email(email):
    """
    Validates email syntax strictly.
    """
    if not email or not isinstance(email, str):
        return False
    return bool(re.match(EMAIL_REGEX, email))

def validate_phone(phone):
    """
    Validates phone numbers.
    """
    if not phone or not isinstance(phone, str):
        return False
    return bool(re.match(PHONE_REGEX, phone))

def validate_date(date_str):
    """
    Validates dates in YYYY-MM-DD format.
    Returns datetime.date if valid, None otherwise.
    """
    if not date_str or not isinstance(date_str, str):
        return None
    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d').date()
        # Must be in the past
        if dt >= datetime.utcnow().date():
            return None
        return dt
    except ValueError:
        return None

def validate_student_data(data):
    """
    Validates raw student input data.
    Returns (cleaned_data, error_message).
    """
    errors = []
    
    first_name = sanitize_input(data.get('first_name'))
    last_name = sanitize_input(data.get('last_name'))
    gender = sanitize_input(data.get('gender'))
    country = sanitize_input(data.get('country'))
    address = sanitize_input(data.get('address'))
    phone_number = sanitize_input(data.get('phone_number'))
    email = sanitize_input(data.get('email'))
    photo_url = data.get('photo_url')  # Handled separately during file upload

    class_id_raw = data.get('class_id')
    class_id = None
    if class_id_raw is None or str(class_id_raw).strip() == '':
        errors.append("La classe est obligatoire.")
    else:
        try:
            class_id = int(class_id_raw)
            if class_id <= 0:
                raise ValueError()
        except (TypeError, ValueError):
            errors.append("La classe sélectionnée est invalide.")

    if not first_name:
        errors.append("Le prénom est obligatoire.")
    if not last_name:
        errors.append("Le nom est obligatoire.")
    if not gender or gender not in ['Masculin', 'Féminin', 'Autre']:
        errors.append("Le genre doit être 'Masculin', 'Féminin' ou 'Autre'.")
    if not country:
        errors.append("Le pays est obligatoire.")
    if not address:
        errors.append("L'adresse est obligatoire.")
        
    if not validate_phone(phone_number):
        errors.append("Le numéro de téléphone est invalide. (Format attendu: chiffres, espaces, -, +, 8-20 caractères).")
        
    if not validate_email(email):
        errors.append("L'adresse email est invalide.")
        
    date_of_birth = validate_date(data.get('date_of_birth'))
    if not date_of_birth:
        errors.append("La date de naissance est invalide ou doit se situer dans le passé (Format: AAAA-MM-JJ).")

    if errors:
        return None, " / ".join(errors)
        
    return {
        'first_name': first_name,
        'last_name': last_name,
        'date_of_birth': date_of_birth,
        'gender': gender,
        'country': country,
        'address': address,
        'phone_number': phone_number,
        'email': email,
        'photo_url': photo_url,
        'class_id': class_id
    }, None

def validate_password_strength(password):
    """
    Ensures password is robust:
    - Min 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    if len(password) < 8:
        return False
    if not re.search(r"[a-z]", password):
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"[0-9]", password):
        return False
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False
    return True
