from flask import Blueprint, make_response, jsonify
import globals

admin_bp = Blueprint("admin_bp", __name__)

finance_data = globals.db.finance_data


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
