import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    # Flask Security
    SECRET_KEY = os.environ.get('SECRET_KEY', 'super-secret-key-cda-2026')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-cda-2026')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=2)

    # Relational Database Connection (PostgreSQL by default, fallback to SQLite for local development)
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        f'sqlite:///{os.path.join(BASE_DIR, "school.db")}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # NoSQL Database Connection (MongoDB)
    MONGO_URI = os.environ.get('MONGO_URI', None)
    MONGO_DB_NAME = os.environ.get('MONGO_DB_NAME', 'school_management')

    # Upload configuration
    UPLOAD_FOLDER = os.environ.get(
        'UPLOAD_FOLDER',
        os.path.join(BASE_DIR, 'uploads')
    )
    MAX_CONTENT_LENGTH = 2 * 1024 * 1024  # 2MB limits for uploads (XSS / DoS mitigation)

    # Gemini API Key for AI orientation recommendations
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', None)

    # --- Alerting / Notification Center configuration ---
    # Tolerance before a teacher with no check-in is marked Absent for a slot
    TEACHER_LATE_TOLERANCE_MINUTES = int(os.environ.get('TEACHER_LATE_TOLERANCE_MINUTES', 60))
    # Thresholds triggering automatic student alerts
    STUDENT_ABSENCE_THRESHOLD = int(os.environ.get('STUDENT_ABSENCE_THRESHOLD', 10))
    STUDENT_LATE_THRESHOLD = int(os.environ.get('STUDENT_LATE_THRESHOLD', 5))
    GRADE_DROP_WARNING_RATIO = float(os.environ.get('GRADE_DROP_WARNING_RATIO', 0.60))   # 60% drop -> Avertissement
    GRADE_DROP_CRITICAL_RATIO = float(os.environ.get('GRADE_DROP_CRITICAL_RATIO', 0.80))  # 80% drop -> Critique
    # Optional webhook (e.g. a Make.com scenario) to relay notifications for
    # email/WhatsApp/SMS automation. Left unset by default; when configured,
    # NotificationService best-effort POSTs every new notification to it.
    MAKE_WEBHOOK_URL = os.environ.get('MAKE_WEBHOOK_URL', None)
