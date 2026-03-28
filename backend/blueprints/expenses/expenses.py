from flask import Blueprint, request, make_response, jsonify
from bson import ObjectId
import globals

expenses_bp = Blueprint("expenses_bp", __name__)

users = globals.db.finance_data


# -------------------- GET all expenses for one user --------------------
@expenses_bp.route('/users/<string:user_id>/expenses', methods=['GET'])
def getAllExpenses(user_id):
    page_num = request.args.get('pn', default=1, type=int)
    page_size = request.args.get('ps', default=10, type=int)

    if page_num < 1:
        page_num = 1
    if page_size < 1:
        page_size = 10

    page_start = (page_num - 1) * page_size

    try:
        user = users.find_one({"_id": ObjectId(user_id)})

        if user is None:
            return make_response(jsonify({"Error": "User not found"}), 404)

        expenses_list = user.get("expenses", [])
        paginated_expenses = expenses_list[page_start:page_start + page_size]

        return make_response(jsonify(paginated_expenses), 200)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid user ID", "details": str(e)}), 400)


# -------------------- GET one expense --------------------
# example: http://127.0.0.1:5001/user/<user_id>/expenses/1
@expenses_bp.route('/users/<string:user_id>/expenses/<int:expense_id>', methods=['GET'])
def getOneExpense(user_id, expense_id):
    try:
        user = users.find_one({"_id": ObjectId(user_id)})

        if user is None:
            return make_response(jsonify({"Error": "User not found"}), 404)

        expenses_list = user.get("expenses", [])

        for expense in expenses_list:
            if expense.get("expense_id") == expense_id:
                return make_response(jsonify(expense), 200)

        return make_response(jsonify({"Error": "Expense not found"}), 404)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid user ID", "details": str(e)}), 400)


# -------------------- POST expense --------------------
# body: form-data or x-www-form-urlencoded
@expenses_bp.route('/users/<string:user_id>/expenses', methods=['POST'])
def addExpense(user_id):
    data = request.form

    if not data:
        return make_response(jsonify({"Error": "Missing data"}), 400)

    required_fields = ["category_id", "amount", "date", "payment_method"]
    for field in required_fields:
        if field not in data:
            return make_response(jsonify({"Error": f"Missing field: {field}"}), 400)

    try:
        user = users.find_one({"_id": ObjectId(user_id)})

        if user is None:
            return make_response(jsonify({"Error": "User not found"}), 404)

        expenses_list = user.get("expenses", [])

        if expenses_list:
            new_expense_id = max(exp.get("expense_id", 0) for exp in expenses_list) + 1
        else:
            new_expense_id = 1

        new_expense = {
            "expense_id": new_expense_id,
            "user_id": user.get("user_id"),
            "category_id": int(data.get("category_id")),
            "amount": float(data.get("amount")),
            "date": data.get("date"),
            "merchant": data.get("merchant", ""),
            "note": data.get("note", ""),
            "payment_method": data.get("payment_method")
        }

        results = users.update_one(
            {"_id": ObjectId(user_id)},
            {"$push": {"expenses": new_expense}}
        )

        if results.modified_count == 1:
            new_expense_link = f"http://127.0.0.1:5001/users/{user_id}/expenses/{new_expense_id}"
            return make_response(jsonify({"URL": new_expense_link}), 201)
        else:
            return make_response(jsonify({"Error": "Expense not added"}), 500)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid data", "details": str(e)}), 400)


# -------------------- PUT expense --------------------
# body: form-data or x-www-form-urlencoded
@expenses_bp.route('/users/<string:user_id>/expenses/<int:expense_id>', methods=['PUT'])
def updateExpense(user_id, expense_id):
    data = request.form
    update_fields = {}

    if data.get("category_id"):
        update_fields["expenses.$.category_id"] = int(data.get("category_id"))
    if data.get("amount"):
        update_fields["expenses.$.amount"] = float(data.get("amount"))
    if data.get("date"):
        update_fields["expenses.$.date"] = data.get("date")
    if data.get("merchant") is not None:
        update_fields["expenses.$.merchant"] = data.get("merchant")
    if data.get("note") is not None:
        update_fields["expenses.$.note"] = data.get("note")
    if data.get("payment_method"):
        update_fields["expenses.$.payment_method"] = data.get("payment_method")

    if not update_fields:
        return make_response(jsonify({"Error": "No valid data passed"}), 400)

    try:
        results = users.update_one(
            {
                "_id": ObjectId(user_id),
                "expenses.expense_id": expense_id
            },
            {
                "$set": update_fields
            }
        )

        if results.matched_count == 0:
            return make_response(jsonify({"Error": "User or Expense not found"}), 404)

        updated_expense_link = f"http://127.0.0.1:5001/users/{user_id}/expenses/{expense_id}"
        return make_response(jsonify({"URL": updated_expense_link}), 200)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid data", "details": str(e)}), 400)


# -------------------- DELETE expense --------------------
@expenses_bp.route('/users/<string:user_id>/expenses/<int:expense_id>', methods=['DELETE'])
def deleteExpense(user_id, expense_id):
    try:
        results = users.update_one(
            {"_id": ObjectId(user_id)},
            {"$pull": {"expenses": {"expense_id": expense_id}}}
        )

        if results.matched_count == 0:
            return make_response(jsonify({"Error": "User not found"}), 404)

        if results.modified_count == 0:
            return make_response(jsonify({"Error": "Expense not found"}), 404)

        return make_response(jsonify({"Message": "Expense deleted"}), 200)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid user ID", "details": str(e)}), 400)