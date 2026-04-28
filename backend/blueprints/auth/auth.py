from flask import Blueprint, request, make_response, jsonify
from bson import ObjectId
import bcrypt
import jwt
import globals
import datetime
import requests as http_requests
from jose import jwt as jose_jwt
from jose.exceptions import JWTError

auth_bp = Blueprint("auth_bp", __name__)

blacklist = globals.db.blacklist
auth_users = globals.db.users          # auth only
finance_users = globals.db.finance_data  # finance data

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return make_response(jsonify({'message': 'No data provided'}), 400)

    # Support both email and username login
    user = None
    if 'email' in data:
        user = auth_users.find_one({"email": data['email']})
        if user is None:
            user = auth_users.find_one({"username": data['email']})
    elif 'username' in data:
        user = auth_users.find_one({"username": data['username']})

    if user is None:
        return make_response(jsonify({'message': 'Invalid credentials'}), 401)

    # Check if banned
    if blacklist.find_one({'type': 'banned_email', 'email': user.get('email', '')}):
        return make_response(jsonify({'message': 'This account has been suspended'}), 403)

    # Check password — support both field names
    stored = user.get('password_hash') or user.get('password', '')
    input_pw = data.get('password', '')

    if not stored:
        return make_response(jsonify({'message': 'This account uses Auth0. Please sign in with Auth0.'}), 401)

    if not bcrypt.checkpw(input_pw.encode('utf-8'), stored.encode('utf-8')):
        return make_response(jsonify({'message': 'Invalid credentials'}), 401)

    # finance_id links auth user to finance_data document
    finance_id = user.get('finance_id', '')

    token = jwt.encode({
        'user_id': str(user['_id']),
        'finance_id': finance_id,
        'name': user.get('name', user.get('username', '')),
        'admin': user.get('admin', False),
        'exp': datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=30)
    }, globals.SECRET_KEY, algorithm='HS256')

    resp = make_response(jsonify({
        'token': token,
        'user_id': str(user['_id']),
        'finance_id': finance_id,
        'name': user.get('name', user.get('username', '')),
        'admin': user.get('admin', False),
        'avatar_style': user.get('avatar_style', 'avataaars')
    }), 200)

    resp.set_cookie(
        'token',
        token,
        httponly=True,
        samesite='Strict',
        max_age=30 * 60
    )
    return resp


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return make_response(jsonify({'message': 'No data provided'}), 400)

    for field in ['name', 'email', 'password']:
        if field not in data:
            return make_response(jsonify({'message': f'Missing: {field}'}), 400)

    # Check email not already used
    if auth_users.find_one({"email": data['email']}):
        return make_response(jsonify({'message': 'Email already registered'}), 409)

    hashed = bcrypt.hashpw(
        data['password'].encode('utf-8'), bcrypt.gensalt()
    ).decode('utf-8')

    # Create finance_data document first
    all_finance = list(finance_users.find({}, {"user_id": 1}))
    next_id = max((u.get('user_id', 0) for u in all_finance), default=0) + 1

    default_categories = [
        {"category_id": 1, "user_id": next_id, "name": "Food", "type": "expense"},
        {"category_id": 2, "user_id": next_id, "name": "Transport", "type": "expense"},
        {"category_id": 3, "user_id": next_id, "name": "Shopping", "type": "expense"},
        {"category_id": 4, "user_id": next_id, "name": "Bills", "type": "expense"},
        {"category_id": 5, "user_id": next_id, "name": "Health", "type": "expense"},
        {"category_id": 6, "user_id": next_id, "name": "Entertainment", "type": "expense"},
        {"category_id": 7, "user_id": next_id, "name": "Salary", "type": "income"},
        {"category_id": 8, "user_id": next_id, "name": "Freelance", "type": "income"},
    ]

    finance_doc = {
        "user_id": next_id,
        "name": data['name'],
        "email": data['email'],
        "created_at": datetime.datetime.now().strftime('%Y-%m-%d'),
        "categories": default_categories,
        "expenses": [],
        "monthly_budgets": [],
        "alerts": []
    }
    finance_result = finance_users.insert_one(finance_doc)
    finance_id = str(finance_result.inserted_id)

    # Create auth user with link to finance_data
    auth_doc = {
        "name": data['name'],
        "email": data['email'],
        "password_hash": hashed,
        "finance_id": finance_id,
        "admin": False,
        "avatar_style": data.get('avatar_style', 'avataaars'),
        "created_at": datetime.datetime.now().strftime('%Y-%m-%d')
    }
    auth_users.insert_one(auth_doc)

    return make_response(jsonify({
        'message': 'Registered successfully',
        'finance_id': finance_id
    }), 201)


@auth_bp.route('/auth0/exchange', methods=['POST'])
def auth0_exchange():
    """Validate an Auth0 ID token and return our own HS256 JWT."""
    if not globals.AUTH0_DOMAIN or not globals.AUTH0_CLIENT_ID:
        return make_response(jsonify({'message': 'Auth0 not configured'}), 503)

    data = request.get_json()
    id_token = data.get('id_token') if data else None
    if not id_token:
        return make_response(jsonify({'message': 'id_token required'}), 400)

    # Fetch Auth0 public keys
    try:
        jwks = http_requests.get(
            f'https://{globals.AUTH0_DOMAIN}/.well-known/jwks.json', timeout=5
        ).json()
    except Exception:
        return make_response(jsonify({'message': 'Could not reach Auth0'}), 502)

    # Match the token's kid to a JWKS key
    try:
        unverified_header = jose_jwt.get_unverified_header(id_token)
    except JWTError:
        return make_response(jsonify({'message': 'Invalid token header'}), 401)

    rsa_key = next(
        (
            {'kty': k['kty'], 'kid': k['kid'], 'use': k['use'], 'n': k['n'], 'e': k['e']}
            for k in jwks.get('keys', [])
            if k['kid'] == unverified_header.get('kid')
        ),
        None
    )
    if not rsa_key:
        return make_response(jsonify({'message': 'Public key not found'}), 401)

    # Verify and decode the ID token
    try:
        payload = jose_jwt.decode(
            id_token,
            rsa_key,
            algorithms=['RS256'],
            audience=globals.AUTH0_CLIENT_ID,
            issuer=f'https://{globals.AUTH0_DOMAIN}/'
        )
    except JWTError as e:
        return make_response(jsonify({'message': 'Token verification failed', 'detail': str(e)}), 401)

    auth0_sub = payload.get('sub', '')
    email = payload.get('email', '')
    name = payload.get('name') or (email.split('@')[0] if email else 'User')

    # Find existing user by auth0_sub, then fall back to email
    user = auth_users.find_one({'auth0_sub': auth0_sub})
    if user is None and email:
        user = auth_users.find_one({'email': email})

    # Check if banned
    if user and blacklist.find_one({'type': 'banned_email', 'email': user.get('email', email)}):
        return make_response(jsonify({'message': 'This account has been suspended'}), 403)
    if not user and blacklist.find_one({'type': 'banned_email', 'email': email}):
        return make_response(jsonify({'message': 'This account has been suspended'}), 403)

    if user is None:
        # First-time Auth0 user — provision account
        all_finance = list(finance_users.find({}, {'user_id': 1}))
        next_id = max((u.get('user_id', 0) for u in all_finance), default=0) + 1

        default_categories = [
            {'category_id': 1, 'user_id': next_id, 'name': 'Food', 'type': 'expense'},
            {'category_id': 2, 'user_id': next_id, 'name': 'Transport', 'type': 'expense'},
            {'category_id': 3, 'user_id': next_id, 'name': 'Shopping', 'type': 'expense'},
            {'category_id': 4, 'user_id': next_id, 'name': 'Bills', 'type': 'expense'},
            {'category_id': 5, 'user_id': next_id, 'name': 'Health', 'type': 'expense'},
            {'category_id': 6, 'user_id': next_id, 'name': 'Entertainment', 'type': 'expense'},
            {'category_id': 7, 'user_id': next_id, 'name': 'Salary', 'type': 'income'},
            {'category_id': 8, 'user_id': next_id, 'name': 'Freelance', 'type': 'income'},
        ]
        finance_result = finance_users.insert_one({
            'user_id': next_id,
            'name': name,
            'email': email,
            'created_at': datetime.datetime.now().strftime('%Y-%m-%d'),
            'categories': default_categories,
            'expenses': [],
            'monthly_budgets': [],
            'alerts': []
        })
        finance_id = str(finance_result.inserted_id)
        auth_users.insert_one({
            'name': name,
            'email': email,
            'auth0_sub': auth0_sub,
            'finance_id': finance_id,
            'admin': False,
            'avatar_style': 'avataaars',
            'created_at': datetime.datetime.now().strftime('%Y-%m-%d')
        })
        user = auth_users.find_one({'auth0_sub': auth0_sub})
    elif 'auth0_sub' not in user:
        # Link existing email/password user to their Auth0 identity
        auth_users.update_one({'_id': user['_id']}, {'$set': {'auth0_sub': auth0_sub}})

    finance_id = user.get('finance_id', '')
    token = jwt.encode({
        'user_id': str(user['_id']),
        'finance_id': finance_id,
        'name': user.get('name', name),
        'admin': user.get('admin', False),
        'exp': datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=30)
    }, globals.SECRET_KEY, algorithm='HS256')

    resp = make_response(jsonify({
        'token': token,
        'user_id': str(user['_id']),
        'finance_id': finance_id,
        'name': user.get('name', name),
        'admin': user.get('admin', False),
        'avatar_style': user.get('avatar_style', 'avataaars')
    }), 200)
    resp.set_cookie('token', token, httponly=True, samesite='Strict', max_age=30 * 60)
    return resp


@auth_bp.route('/logout', methods=['POST'])
def logout():
    token = request.cookies.get('token')
    if token:
        blacklist.insert_one({"token": token})
    resp = make_response(jsonify({'message': 'Logged out'}), 200)
    resp.delete_cookie('token', samesite='Strict')
    return resp


@auth_bp.route('/profile/avatar', methods=['PUT'])
def update_avatar():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return make_response(jsonify({'message': 'Token required'}), 401)
    try:
        data_token = jwt.decode(token, globals.SECRET_KEY, algorithms=['HS256'])
        user_id = data_token.get('user_id')
    except:
        return make_response(jsonify({'message': 'Invalid token'}), 401)

    data = request.get_json()
    if not data or 'avatar_style' not in data:
        return make_response(jsonify({'message': 'avatar_style required'}), 400)

    auth_users.update_one(
        {'_id': ObjectId(user_id)},
        {'$set': {'avatar_style': data['avatar_style']}}
    )
    return make_response(jsonify({'message': 'Avatar updated'}), 200)


@auth_bp.route('/profile/name', methods=['PUT'])
def update_name():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return make_response(jsonify({'message': 'Token required'}), 401)
    try:
        data_token = jwt.decode(token, globals.SECRET_KEY, algorithms=['HS256'])
        user_id = data_token.get('user_id')
    except:
        return make_response(jsonify({'message': 'Invalid token'}), 401)

    data = request.get_json()
    if not data or 'name' not in data:
        return make_response(jsonify({'message': 'name required'}), 400)

    new_name = data['name'].strip()
    if not new_name:
        return make_response(jsonify({'message': 'Name cannot be empty'}), 400)

    auth_users.update_one({'_id': ObjectId(user_id)}, {'$set': {'name': new_name}})
    return make_response(jsonify({'message': 'Name updated', 'name': new_name}), 200)


@auth_bp.route('/profile/password', methods=['PUT'])
def update_password():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return make_response(jsonify({'message': 'Token required'}), 401)
    try:
        data_token = jwt.decode(token, globals.SECRET_KEY, algorithms=['HS256'])
        user_id = data_token.get('user_id')
    except:
        return make_response(jsonify({'message': 'Invalid token'}), 401)

    data = request.get_json()
    if not data or 'current_password' not in data or 'new_password' not in data:
        return make_response(jsonify({'message': 'current_password and new_password required'}), 400)

    user = auth_users.find_one({'_id': ObjectId(user_id)})
    if not user:
        return make_response(jsonify({'message': 'User not found'}), 404)

    stored = user.get('password_hash') or user.get('password', '')
    if not stored:
        return make_response(jsonify({'message': 'This account uses Auth0. Password cannot be changed here.'}), 400)

    if not bcrypt.checkpw(data['current_password'].encode('utf-8'), stored.encode('utf-8')):
        return make_response(jsonify({'message': 'Current password is incorrect'}), 401)

    if len(data['new_password']) < 6:
        return make_response(jsonify({'message': 'Password must be at least 6 characters'}), 400)

    new_hash = bcrypt.hashpw(data['new_password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    auth_users.update_one({'_id': ObjectId(user_id)}, {'$set': {'password_hash': new_hash}})
    return make_response(jsonify({'message': 'Password updated'}), 200)


@auth_bp.route('/profile', methods=['DELETE'])
def delete_account():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return make_response(jsonify({'message': 'Token required'}), 401)
    try:
        data_token = jwt.decode(token, globals.SECRET_KEY, algorithms=['HS256'])
        user_id = data_token.get('user_id')
        finance_id = data_token.get('finance_id')
    except:
        return make_response(jsonify({'message': 'Invalid token'}), 401)

    auth_users.delete_one({'_id': ObjectId(user_id)})
    if finance_id:
        try:
            finance_users.delete_one({'_id': ObjectId(finance_id)})
        except Exception:
            pass

    return make_response(jsonify({'message': 'Account deleted'}), 200)


@auth_bp.route('/profile', methods=['GET'])
def get_profile():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return make_response(jsonify({'message': 'Token required'}), 401)
    try:
        data_token = jwt.decode(token, globals.SECRET_KEY, algorithms=['HS256'])
        user_id = data_token.get('user_id')
    except:
        return make_response(jsonify({'message': 'Invalid token'}), 401)

    user = auth_users.find_one({'_id': ObjectId(user_id)})
    if not user:
        return make_response(jsonify({'message': 'User not found'}), 404)

    return make_response(jsonify({
        'name': user.get('name', ''),
        'email': user.get('email', ''),
        'avatar_style': user.get('avatar_style', 'avataaars'),
        'created_at': user.get('created_at', '')
    }), 200)