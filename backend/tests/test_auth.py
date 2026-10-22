import pytest
import os
import sys

# Ensure backend root is on path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from models import db, User
from utils.security import generate_token, decode_token

@pytest.fixture
def test_client():
    test_db = os.path.abspath(os.path.join(os.path.dirname(__file__), 'test_auth_temp.db'))
    if os.path.exists(test_db):
        try:
            os.remove(test_db)
        except Exception:
            pass

    app = create_app(test_config={
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{test_db}',
        'JWT_SECRET_KEY': 'jwt-super-secret-key-atm-2026-production-grade-signing-key-92847192'
    })
    
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()
    
    if os.path.exists(test_db):
        try:
            os.remove(test_db)
        except Exception:
            pass

def test_user_registration_success(test_client):
    res = test_client.post('/api/auth/register', json={
        'full_name': 'Test Customer',
        'username': 'testcust1',
        'email': 'testcust1@example.com',
        'phone': '1234567890',
        'password': 'SecurePassword123!',
        'confirm_password': 'SecurePassword123!',
        'account_type': 'Savings'
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    assert 'token' in data['data']
    assert data['data']['user']['username'] == 'testcust1'
    assert 'customer_id' in data['data']['user']
    assert data['data']['user']['account_number'].startswith('****-****-****-')

def test_user_registration_weak_password(test_client):
    res = test_client.post('/api/auth/register', json={
        'full_name': 'Test Customer',
        'username': 'weakpass',
        'email': 'weakpass@example.com',
        'phone': '1234567890',
        'password': 'weak',
        'confirm_password': 'weak'
    })
    assert res.status_code == 400
    data = res.get_json()
    assert data['success'] is False
    assert 'at least 8 characters' in data['message']

def test_login_success_and_failure(test_client):
    # Register first
    test_client.post('/api/auth/register', json={
        'full_name': 'Login Customer',
        'username': 'logincust',
        'email': 'logincust@example.com',
        'phone': '1234567890',
        'password': 'ValidPass123!',
        'confirm_password': 'ValidPass123!'
    })

    # Successful login
    res_ok = test_client.post('/api/auth/login', json={
        'username': 'logincust',
        'password': 'ValidPass123!'
    })
    assert res_ok.status_code == 200
    assert res_ok.get_json()['success'] is True
    token = res_ok.get_json()['data']['token']

    # Login with wrong password
    res_bad = test_client.post('/api/auth/login', json={
        'username': 'logincust',
        'password': 'WrongPassword123!'
    })
    assert res_bad.status_code == 401
    assert res_bad.get_json()['success'] is False

    # Check /api/auth/me with bearer token
    res_me = test_client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert res_me.status_code == 200
    assert res_me.get_json()['data']['user']['username'] == 'logincust'

def test_admin_endpoint_forbidden_for_regular_customer(test_client):
    # Register customer
    reg_res = test_client.post('/api/auth/register', json={
        'full_name': 'Regular Customer',
        'username': 'regularcust',
        'email': 'reg@example.com',
        'phone': '1234567890',
        'password': 'ValidPass123!',
        'confirm_password': 'ValidPass123!'
    })
    token = reg_res.get_json()['data']['token']

    # Regular customer attempts to access /api/admin/users
    admin_res = test_client.get('/api/admin/users', headers={'Authorization': f'Bearer {token}'})
    assert admin_res.status_code == 403
    assert 'Administrative privileges required' in admin_res.get_json()['message']
