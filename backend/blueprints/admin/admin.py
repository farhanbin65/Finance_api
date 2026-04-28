from flask import Blueprint, make_response, jsonify, request
from bson import ObjectId
import globals
import datetime
import jwt
from decorators import jwt_required

admin_bp = Blueprint("admin_bp", __name__)

finance_data = globals.db.finance_data
auth_users = globals.db.users
blacklist = globals.db.blacklist


def admin_required(func):
    from functools import wraps
    @wraps(func)
    def wrapper(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return make_response(jsonify({'message': 'Token required'}), 401)
        try:
            data = jwt.decode(token, globals.SECRET_KEY, algorithms=['HS256'])
            if not data.get('admin'):
                return make_response(jsonify({'message': 'Admin access required'}), 403)
        except Exception:
            return make_response(jsonify({'message': 'Invalid token'}), 401)
        return func(*args, **kwargs)
    return wrapper


@admin_bp.route('/admin/stats', methods=['GET'])
def getAdminStats():
    try:
        all_users = list(finance_data.find({}))
        total_income = 0.0
        total_expenses = 0.0

        for user in all_users:
            categories = user.get('categories', [])
            expenses = user.get('expenses', [])
            income_ids = {c['category_id'] for c in categories if c.get('type') == 'income'}
            expense_ids = {c['category_id'] for c in categories if c.get('type') == 'expense'}

            for e in expenses:
                amt = e.get('amount', 0)
                cat_id = e.get('category_id')
                if cat_id in income_ids:
                    total_income += amt
                elif cat_id in expense_ids:
                    total_expenses += amt
                else:
                    # fall back to stored type for default/unmatched categories
                    if e.get('type') == 'income':
                        total_income += amt
                    else:
                        total_expenses += amt

        return make_response(jsonify({
            'total_income': total_income,
            'total_expenses': total_expenses,
            'balance': total_income - total_expenses,
            'total_users': len(all_users)
        }), 200)

    except Exception as e:
        return make_response(jsonify({'Error': str(e)}), 500)


@admin_bp.route('/admin/expenses', methods=['GET'])
def getAdminExpenses():
    try:
        all_users = list(finance_data.find({}))
        all_expenses = []

        for user in all_users:
            categories = user.get('categories', [])
            cat_map = {c['category_id']: c for c in categories}
            user_name = user.get('name', 'Unknown')
            finance_id = str(user['_id'])

            for e in user.get('expenses', []):
                cat = cat_map.get(e.get('category_id'), {})
                enriched = dict(e)
                enriched['category_name'] = cat.get('name', 'Unknown')
                enriched['category_type'] = cat.get('type', 'expense')
                enriched['user_name'] = user_name
                enriched['finance_id'] = finance_id
                all_expenses.append(enriched)

        all_expenses.sort(key=lambda x: x.get('date', ''), reverse=True)
        return make_response(jsonify(all_expenses), 200)

    except Exception as e:
        return make_response(jsonify({'Error': str(e)}), 500)


@admin_bp.route('/admin/budgets', methods=['GET'])
def getAdminBudgets():
    try:
        all_users = list(finance_data.find({}))
        all_budgets = []

        for user in all_users:
            user_name = user.get('name', 'Unknown')
            finance_id = str(user['_id'])
            expenses = user.get('expenses', [])

            for b in user.get('monthly_budgets', []):
                month = b.get('month', '')
                spent = sum(
                    e.get('amount', 0) for e in expenses
                    if e.get('type') in ('expense', None) and e.get('date', '').startswith(month)
                )
                enriched = dict(b)
                enriched['user_name'] = user_name
                enriched['finance_id'] = finance_id
                enriched['spent'] = spent
                all_budgets.append(enriched)

        all_budgets.sort(key=lambda x: x.get('month', ''), reverse=True)
        return make_response(jsonify(all_budgets), 200)

    except Exception as e:
        return make_response(jsonify({'Error': str(e)}), 500)


@admin_bp.route('/admin/users/<string:finance_id>', methods=['DELETE'])
@admin_required
def deleteAdminUser(finance_id):
    """Hard-delete a user from both finance_data and auth_users."""
    try:
        user_doc = finance_data.find_one({'_id': ObjectId(finance_id)})
        if not user_doc:
            return make_response(jsonify({'error': 'User not found'}), 404)

        email = user_doc.get('email')
        finance_data.delete_one({'_id': ObjectId(finance_id)})
        if email:
            auth_users.delete_one({'email': email})

        return make_response(jsonify({'message': 'User deleted'}), 200)
    except Exception as e:
        return make_response(jsonify({'error': str(e)}), 500)


@admin_bp.route('/admin/ban/<string:finance_id>', methods=['POST'])
@admin_required
def banAdminUser(finance_id):
    """Ban a user: add email to blacklist, then delete their data."""
    try:
        user_doc = finance_data.find_one({'_id': ObjectId(finance_id)})
        if not user_doc:
            return make_response(jsonify({'error': 'User not found'}), 404)

        email = user_doc.get('email')
        if email:
            blacklist.update_one(
                {'type': 'banned_email', 'email': email},
                {'$set': {
                    'type': 'banned_email',
                    'email': email,
                    'banned_at': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }},
                upsert=True
            )
            auth_users.delete_one({'email': email})

        finance_data.delete_one({'_id': ObjectId(finance_id)})
        return make_response(jsonify({'message': 'User banned'}), 200)
    except Exception as e:
        return make_response(jsonify({'error': str(e)}), 500)
