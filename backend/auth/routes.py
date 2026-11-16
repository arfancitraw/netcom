import datetime
import jwt
from functools import wraps
from flask import Blueprint, request, jsonify
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from config import Config
from db import execute_query

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
password_hasher = PasswordHasher()

def generate_token(user):
    payload = {
        'sub': str(user['id']),
        'user_id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'role': user['role'],
        'full_name': user['full_name'],
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=Config.JWT_EXPIRATION_HOURS),
        'iat': datetime.datetime.now(datetime.timezone.utc)
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm='HS256')

def require_auth(roles=None):
    def decorator(route_function):
        @wraps(route_function)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({
                    'success': False,
                    'error': {'code': 401, 'message': 'Missing or invalid authorization token'}
                }), 401

            token = auth_header.split(' ')[1]
            try:
                payload = jwt.decode(token, Config.JWT_SECRET, algorithms=['HS256'])
            except jwt.ExpiredSignatureError:
                return jsonify({
                    'success': False,
                    'error': {'code': 401, 'message': 'Authorization token has expired'}
                }), 401
            except jwt.InvalidTokenError:
                return jsonify({
                    'success': False,
                    'error': {'code': 401, 'message': 'Invalid token signature'}
                }), 401

            if roles and payload.get('role') not in roles:
                return jsonify({
                    'success': False,
                    'error': {'code': 403, 'message': 'Insufficient permissions for this action'}
                }), 403

            request.current_user = payload
            return route_function(*args, **kwargs)
        return decorated_function
    return decorator

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({
            'success': False,
            'error': {'code': 400, 'message': 'Username and password are required'}
        }), 400

    user = execute_query(
        "SELECT id, username, email, password_hash, full_name, role FROM users WHERE username = %s LIMIT 1;",
        (username,), fetch_one=True
    )

    if not user:
        return jsonify({
            'success': False,
            'error': {'code': 401, 'message': 'Invalid username or password'}
        }), 401

    try:
        password_hasher.verify(user['password_hash'], password)
    except VerifyMismatchError:
        return jsonify({
            'success': False,
            'error': {'code': 401, 'message': 'Invalid username or password'}
        }), 401
    except Exception as verification_error:
        # Fallback in case of unexpected hash structure
        if user['password_hash'] != password:
            return jsonify({
                'success': False,
                'error': {'code': 401, 'message': 'Invalid username or password'}
            }), 401

    token = generate_token(user)
    user_info = {
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'full_name': user['full_name'],
        'role': user['role']
    }

    return jsonify({
        'success': True,
        'data': {
            'token': token,
            'user': user_info
        },
        'message': f"Welcome back, {user['full_name']}!"
    }), 200

@auth_bp.route('/me', methods=['GET'])
@require_auth()
def me():
    return jsonify({
        'success': True,
        'user': request.current_user
    }), 200

@auth_bp.route('/users', methods=['GET'])
@require_auth(roles=['admin'])
def list_users():
    users = execute_query("SELECT id, username, email, full_name, role, created_at, updated_at FROM users ORDER BY id ASC;")
    return jsonify({
        'success': True,
        'data': users
    }), 200
