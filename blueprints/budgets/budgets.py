from flask import Blueprint, request, make_response, jsonify
from bson import ObjectId
import globals

budgets_bp = Blueprint("budgets_bp", __name__)

users = globals.db.finance_data


# ---------------- GET all budgets ----------------
@budgets_bp.route('/users/<string:user_id>/budgets', methods=['GET'])
def getAllBudgets(user_id):

    try:
        user = users.find_one({"_id": ObjectId(user_id)})

        if user is None:
            return make_response(jsonify({"Error": "User not found"}), 404)

        budgets = user.get("monthly_budgets", [])

        return make_response(jsonify(budgets), 200)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid user ID", "details": str(e)}), 400)


# ---------------- GET one budget ----------------
@budgets_bp.route('/users/<string:user_id>/budgets/<int:budget_id>', methods=['GET'])
def getOneBudget(user_id, budget_id):

    try:
        user = users.find_one({"_id": ObjectId(user_id)})

        if user is None:
            return make_response(jsonify({"Error": "User not found"}), 404)

        for budget in user.get("monthly_budgets", []):
            if budget.get("budget_id") == budget_id:
                return make_response(jsonify(budget), 200)

        return make_response(jsonify({"Error": "Budget not found"}), 404)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid user ID", "details": str(e)}), 400)


# ---------------- POST budget ----------------
@budgets_bp.route('/users/<string:user_id>/budgets', methods=['POST'])
def addBudget(user_id):

    data = request.form

    if not data or "category_id" not in data or "budget_amount" not in data or "month" not in data:
        return make_response(jsonify({"Error": "Missing data"}), 400)

    try:
        user = users.find_one({"_id": ObjectId(user_id)})

        if user is None:
            return make_response(jsonify({"Error": "User not found"}), 404)

        budgets = user.get("monthly_budgets", [])

        if budgets:
            new_budget_id = max(b.get("budget_id", 0) for b in budgets) + 1
        else:
            new_budget_id = 1

        new_budget = {
            "budget_id": new_budget_id,
            "category_id": int(data.get("category_id")),
            "budget_amount": float(data.get("budget_amount")),
            "month": data.get("month"),
            "user_id": user.get("user_id")
        }

        users.update_one(
            {"_id": ObjectId(user_id)},
            {"$push": {"monthly_budgets": new_budget}}
        )

        new_budget_link = f"http://127.0.0.1:5001/users/{user_id}/budgets/{new_budget_id}"

        return make_response(jsonify({"URL": new_budget_link}), 201)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid data", "details": str(e)}), 400)


# ---------------- PUT budget ----------------
@budgets_bp.route('/users/<string:user_id>/budgets/<int:budget_id>', methods=['PUT'])
def updateBudget(user_id, budget_id):

    data = request.form
    update_fields = {}

    if data.get("category_id"):
        update_fields["monthly_budgets.$.category_id"] = int(data.get("category_id"))

    if data.get("budget_amount"):
        update_fields["monthly_budgets.$.budget_amount"] = float(data.get("budget_amount"))

    if data.get("month"):
        update_fields["monthly_budgets.$.month"] = data.get("month")

    if not update_fields:
        return make_response(jsonify({"Error": "No valid data passed"}), 400)

    try:
        result = users.update_one(
            {
                "_id": ObjectId(user_id),
                "monthly_budgets.budget_id": budget_id
            },
            {
                "$set": update_fields
            }
        )

        if result.matched_count == 0:
            return make_response(jsonify({"Error": "User or Budget not found"}), 404)

        updated_link = f"http://127.0.0.1:5001/users/{user_id}/budgets/{budget_id}"

        return make_response(jsonify({"URL": updated_link}), 200)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid data", "details": str(e)}), 400)


# ---------------- DELETE budget ----------------
@budgets_bp.route('/users/<string:user_id>/budgets/<int:budget_id>', methods=['DELETE'])
def deleteBudget(user_id, budget_id):

    try:
        result = users.update_one(
            {"_id": ObjectId(user_id)},
            {"$pull": {"monthly_budgets": {"budget_id": budget_id}}}
        )

        if result.modified_count == 0:
            return make_response(jsonify({"Error": "Budget not found"}), 404)

        return make_response(jsonify({"Message": "Budget deleted"}), 200)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid user ID", "details": str(e)}), 400)