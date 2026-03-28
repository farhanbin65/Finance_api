from flask import Blueprint, request, make_response, jsonify
from bson import ObjectId, json_util
import json
from decorators import jwt_required
import globals

users = globals.db.finance_data
users_bp = Blueprint("users_bp", __name__)


# -------------------- Home --------------------
@users_bp.route('/', methods=['GET'])
@jwt_required
def showUsers():
    return jsonify({"message": "Welcome to Finance DB"})


# -------------------- GET all users --------------------
@users_bp.route('/users', methods=['GET'])
def getAllUsers():
    data_to_return = []

    page_num = request.args.get('pn', default=1, type=int)
    page_size = request.args.get('ps', default=10, type=int)

    if page_num < 1:
        page_num = 1
    if page_size < 1:
        page_size = 10

    page_start = (page_num - 1) * page_size

    try:
        users_cursor = users.find().skip(page_start).limit(page_size)

        for user in users_cursor:
            user['_id'] = str(user['_id'])
            data_to_return.append(user)

        return make_response(json.loads(json_util.dumps(data_to_return)), 200)

    except ConnectionError:
        return make_response(jsonify({"error": "No mongodb connection"}), 500)
    except Exception as e:
        return make_response(jsonify({"error": "Internal server error", "details": str(e)}), 500)


# -------------------- GET one user --------------------
@users_bp.route('/users/<string:user_id>', methods=['GET'])
def getOneUser(user_id):
    try:
        user1 = users.find_one({"_id": ObjectId(user_id)})

        if user1 is not None:
            user1["_id"] = str(user1["_id"])
            user1["name"] = str(user1.get("name", ""))
            user1["email"] = str(user1.get("email", ""))
            user1["password_hash"] = str(user1.get("password_hash", ""))
            user1["created_at"] = str(user1.get("created_at", ""))

            user1["categories"] = user1.get("categories", [])
            user1["expenses"] = user1.get("expenses", [])
            user1["monthly_budgets"] = user1.get("monthly_budgets", [])
            user1["alerts"] = user1.get("alerts", [])

            return make_response(jsonify(user1), 200)
        else:
            return make_response(jsonify({"Error": "User not found"}), 404)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid user ID", "details": str(e)}), 400)


# -------------------- POST user --------------------
@users_bp.route('/users', methods=['POST'])
def addUser():
    data = request.form

    if data and "name" in data and "email" in data and "password_hash" in data and "created_at" in data:
        new_user = {
            "user_id": int(data.get("user_id", 0)),
            "name": data.get("name"),
            "email": data.get("email"),
            "password_hash": data.get("password_hash"),
            "created_at": data.get("created_at"),
            "categories": [],
            "expenses": [],
            "monthly_budgets": [],
            "alerts": []
        }

        try:
            results = users.insert_one(new_user)
            new_user_id = str(results.inserted_id)
            new_user_link = f"http://127.0.0.1:5001/users/{new_user_id}"

            return make_response(jsonify({"URL": new_user_link}), 201)

        except Exception as e:
            return make_response(jsonify({"Error": "Could not add user", "details": str(e)}), 500)

    else:
        return make_response(jsonify({"Error": "Missing data"}), 400)


# -------------------- PUT user --------------------
@users_bp.route('/users/<string:user_id>', methods=['PUT'])
def updateUser(user_id):
    data = request.form
    update_field = {}

    if data.get("name"):
        update_field["name"] = data.get("name")

    if data.get("email"):
        update_field["email"] = data.get("email")

    if data.get("password_hash"):
        update_field["password_hash"] = data.get("password_hash")

    if data.get("created_at"):
        update_field["created_at"] = data.get("created_at")

    if not update_field:
        return make_response(jsonify({"error": "No valid data passed"}), 400)

    try:
        results = users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_field}
        )

        if results.matched_count == 0:
            return make_response(jsonify({"error": "User not found"}), 404)

        updated_user_link = f"http://127.0.0.1:5001/users/{user_id}"
        return make_response(jsonify({"URL": updated_user_link}), 200)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid user ID", "details": str(e)}), 400)


# -------------------- DELETE user --------------------
@users_bp.route('/users/<string:user_id>', methods=['DELETE'])
def deleteUser(user_id):
    try:
        results = users.delete_one({"_id": ObjectId(user_id)})

        if results.deleted_count == 1:
            return make_response(jsonify({"Message": "User deleted"}), 200)
        else:
            return make_response(jsonify({"Error": "No User ID found"}), 404)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid user ID", "details": str(e)}), 400)