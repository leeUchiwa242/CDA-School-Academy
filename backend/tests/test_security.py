import pytest
from app.models import Student
from app.repositories.sql_repo import SQLRepository

def test_sql_injection_defense(client, user_token):
    """
    Explicit Security Test: Checks that sending common SQL injection payloads
    to the student search form does not leak unauthorized database content.
    """
    headers = {'Authorization': f'Bearer {user_token}'}
    
    # Payload trying to force OR 1=1 to dump all students or leak schemas
    injection_payload = "' OR '1'='1"
    
    # Execute query
    response = client.get(f'/api/students?query={injection_payload}', headers=headers)
    assert response.status_code == 200
    
    # Verification: Since no student has name containing the string "' OR '1'='1",
    # the returned list must be empty. If SQL injection succeeded, it would return all students.
    assert isinstance(response.json, list)
    assert len(response.json) == 0

def test_role_based_access_control(client, user_token, admin_token):
    """
    Explicit Security Test: Verifies that regular users are blocked from
    performing administrative actions like creating a student.
    """
    student_data = {
        'first_name': 'Test',
        'last_name': 'Hacker',
        'date_of_birth': '2000-01-01',
        'gender': 'Masculin',
        'country': 'France',
        'address': 'No Access Address',
        'phone_number': '+33611111111',
        'email': 'hacker@school.com',
        'class_id': '1'
    }

    # 1. Try to create student with standard User token (role: Utilisateur)
    headers_user = {'Authorization': f'Bearer {user_token}'}
    response_user = client.post('/api/students', data=student_data, headers=headers_user)
    
    # Assert blocked (403 Forbidden)
    assert response_user.status_code == 403
    assert 'refusé' in response_user.json['message']

    # 2. Try with Admin token (role: Administrateur)
    headers_admin = {'Authorization': f'Bearer {admin_token}'}
    response_admin = client.post('/api/students', data=student_data, headers=headers_admin)
    
    # Assert authorized (201 Created)
    assert response_admin.status_code == 201
    assert 'succès' in response_admin.json['message']
