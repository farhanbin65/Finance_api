from flask import Blueprint, request, make_response, jsonify
from bson import ObjectId
import bcrypt
import jwt
import globals
import datetime

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

    # Check password — support both field names
    stored = user.get('password_hash') or user.get('password', '')
    input_pw = data.get('password', '')

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
        'user_id': str(user['_id']),
        'finance_id': finance_id,
        'name': user.get('name', user.get('username', '')),
        'admin': user.get('admin', False)
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
        "created_at": datetime.datetime.now().strftime('%Y-%m-%d')
    }
    auth_users.insert_one(auth_doc)

    return make_response(jsonify({
        'message': 'Registered successfully',
        'finance_id': finance_id
    }), 201)


@auth_bp.route('/logout', methods=['POST'])
def logout():
    token = request.cookies.get('token')
    if token:
        blacklist.insert_one({"token": token})
    resp = make_response(jsonify({'message': 'Logged out'}), 200)
    resp.delete_cookie('token', samesite='Strict')
    return resp