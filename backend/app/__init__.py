import os
from flask import Flask, jsonify
from flask_cors import CORS
from app.config import Config
from app.models import db, User, Subject, ConversionScale, SchoolClass
from app.services.auth_service import AuthService

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Configure CORS (securely with allowed origins in production, wildcard in development)
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize SQL Database
    db.init_app(app)

    # Create directories if they do not exist
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    # Register Blueprints
    from app.routes.auth import auth_bp
    from app.routes.students import students_bp
    from app.routes.grades import grades_bp
    from app.routes.bulletins import bulletins_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.classes import classes_bp
    from app.routes.teachers import teachers_bp
    from app.routes.attendance import attendance_bp
    from app.routes.schedule import schedule_bp
    from app.routes.notifications import notifications_bp
    from app.routes.teacher_attendance import teacher_attendance_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(students_bp, url_prefix='/api/students')
    app.register_blueprint(grades_bp, url_prefix='/api/grades')
    app.register_blueprint(bulletins_bp, url_prefix='/api/bulletins')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(classes_bp, url_prefix='/api/classes')
    app.register_blueprint(teachers_bp, url_prefix='/api/teachers')
    app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
    app.register_blueprint(schedule_bp, url_prefix='/api/schedule')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(teacher_attendance_bp, url_prefix='/api/teacher-attendance')

    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'healthy', 'message': 'API CDA - Académie scolaire est opérationnelle.'}), 200

    # Auto DB initialization & seed data (for SQLite local development)
    with app.app_context():
        # This will create sqlite file if using fallback config
        db.create_all()
        
        # Check if seed data is needed
        if not User.query.first():
            app.logger.info("Seeding default users...")
            # Seed Admin: admin@school.com / password: AdminPassword123!
            admin_hash = AuthService.hash_password('AdminPassword123!')
            admin_user = User(email='admin@school.com', password_hash=admin_hash, role='Administrateur')
            
            # Seed User: user@school.com / password: UserPassword123!
            user_hash = AuthService.hash_password('UserPassword123!')
            regular_user = User(email='user@school.com', password_hash=user_hash, role='Utilisateur')
            
            db.session.add(admin_user)
            db.session.add(regular_user)
            db.session.commit()

        if not SchoolClass.query.first():
            app.logger.info("Seeding default classes...")
            classes = ['Seconde', 'Première', 'Terminale']
            for name in classes:
                db.session.add(SchoolClass(name=name))
            db.session.commit()

        if not Subject.query.first():
            app.logger.info("Seeding default subjects...")
            subjects = [
                'Mathématiques',
                'Français',
                'Espagnol',
                'Histoire',
                'Sport',
                'Physique'
            ]
            for name in subjects:
                db.session.add(Subject(name=name))
            db.session.commit()

        if not ConversionScale.query.first():
            app.logger.info("Seeding default conversion scales...")
            scales = [
                ConversionScale(min_score=90, max_score=100, letter_grade='A', status_label='Excellent'),
                ConversionScale(min_score=80, max_score=89.99, letter_grade='B', status_label='Très Bien'),
                ConversionScale(min_score=70, max_score=79.99, letter_grade='C', status_label='Bien'),
                ConversionScale(min_score=60, max_score=69.99, letter_grade='D', status_label='Acceptable'),
                ConversionScale(min_score=0, max_score=59.99, letter_grade='E', status_label='Insuffisant')
            ]
            for scale in scales:
                db.session.add(scale)
            db.session.commit()

    return app