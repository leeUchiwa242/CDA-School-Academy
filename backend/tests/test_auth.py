import pytest
from app.models import User
from app.repositories.sql_repo import SQLRepository

def test_login_success(client):
    """
    Tests that a registered user can log in and receives a JWT token.
    """
    response = client.post('/api/auth/login', json={
        'email': 'admin@school.com',
        'password': 'AdminPassword123!'
    })
    assert response.status_code == 200
    assert 'token' in response.json
    assert response.json['user']['role'] == 'Administrateur'

def test_login_failure_and_lockout(client, app):
    """
    Tests brute-force protection:
    - Failed attempts are logged.
    - 5 failed attempts lock the account for 15 minutes.
    """
    # 1. Verify initial state
    with app.app_context():
        user = SQLRepository.get_user_by_email('user@school.com')
        assert user.failed_login_attempts == 0
        assert user.lockout_until is None

    # 2. Make 4 failed attempts
    for i in range(4):
        response = client.post('/api/auth/login', json={
            'email': 'user@school.com',
            'password': 'WrongPassword123'
        })
        assert response.status_code == 401
        assert 'incorrect' in response.json['message']

    # Check database status
    with app.app_context():
        user = SQLRepository.get_user_by_email('user@school.com')
        assert user.failed_login_attempts == 4
        assert user.lockout_until is None

    # 3. 5th failed attempt triggers lockout
    response = client.post('/api/auth/login', json={
        'email': 'user@school.com',
        'password': 'WrongPassword123'
    })
    assert response.status_code == 401
    assert 'verrouillé' in response.json['message']

    # Check locked state
    with app.app_context():
        user = SQLRepository.get_user_by_email('user@school.com')
        assert user.failed_login_attempts == 5
        assert user.lockout_until is not None

    # 4. Attempting to log in with CORRECT credentials now fails due to lockout
    response = client.post('/api/auth/login', json={
        'email': 'user@school.com',
        'password': 'UserPassword123!'
    })
    assert response.status_code == 401
    assert 'verrouillé' in response.json['message']

def test_get_profile_with_jwt(client, user_token):
    """
    Tests accessing a protected endpoint using the Authorization bearer token.
    """
    headers = {'Authorization': f'Bearer {user_token}'}
    response = client.get('/api/auth/me', headers=headers)
    assert response.status_code == 200
    assert response.json['email'] == 'user@school.com'
    assert response.json['role'] == 'Utilisateur'
