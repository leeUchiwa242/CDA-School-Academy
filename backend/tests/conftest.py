import pytest
import os
import tempfile
from app import create_app
from app.models import db, User
from app.services.auth_service import AuthService

from app.config import Config

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'test-secret-key'
    JWT_SECRET_KEY = 'test-jwt-secret'
    MONGO_URI = None
    UPLOAD_FOLDER = tempfile.mkdtemp()
    MONGO_DB_NAME = 'school_management_test'

@pytest.fixture
def app():
    """
    Creates an isolated Flask test app instance using in-memory SQLite.
    """
    # Pass TestConfig directly to create_app so database is in-memory
    # and default seeds are executed once on this database.
    app = create_app(TestConfig)

    with app.app_context():
        yield app
        
        # Clean up database
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def admin_token(client):
    """
    Returns a valid JWT token for the admin user.
    """
    response = client.post('/api/auth/login', json={
        'email': 'admin@school.com',
        'password': 'AdminPassword123!'
    })
    return response.json['token']

@pytest.fixture
def user_token(client):
    """
    Returns a valid JWT token for a regular user.
    """
    response = client.post('/api/auth/login', json={
        'email': 'user@school.com',
        'password': 'UserPassword123!'
    })
    return response.json['token']
