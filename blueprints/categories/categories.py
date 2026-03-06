from flask import Blueprint, request, make_response, jsonify
from bson import ObjectId
import globals

categories_bp = Blueprint("categories_bp", __name__)

users = globals.db.finance_data


# ---------------- GET all categories ----------------
@categories_bp.route('/users/<string:user_id>/categories', methods=['GET'])
def getAllCategories(user_id):

    try:
        user = users.find_one({"_id": ObjectId(user_id)})

        if user is None:
            return make_response(jsonify({"Error": "User not found"}), 404)

        categories = user.get("categories", [])

        return make_response(jsonify(categories), 200)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid user ID", "details": str(e)}), 400)


# ---------------- GET one category ----------------
@categories_bp.route('/users/<string:user_id>/categories/<int:category_id>', methods=['GET'])
def getOneCategory(user_id, category_id):

    try:
        user = users.find_one({"_id": ObjectId(user_id)})

        if user is None:
            return make_response(jsonify({"Error": "User not found"}), 404)

        for category in user.get("categories", []):
            if category.get("category_id") == category_id:
                return make_response(jsonify(category), 200)

        return make_response(jsonify({"Error": "Category not found"}), 404)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid user ID", "details": str(e)}), 400)


# ---------------- POST category ----------------
@categories_bp.route('/users/<string:user_id>/categories', methods=['POST'])
def addCategory(user_id):

    data = request.form

    if not data or "name" not in data or "type" not in data:
        return make_response(jsonify({"Error": "Missing data"}), 400)

    try:
        user = users.find_one({"_id": ObjectId(user_id)})

        if user is None:
            return make_response(jsonify({"Error": "User not found"}), 404)

        categories = user.get("categories", [])

        if categories:
            new_category_id = max(cat.get("category_id", 0) for cat in categories) + 1
        else:
            new_category_id = 1

        new_category = {
            "category_id": new_category_id,
            "name": data.get("name"),
            "type": data.get("type"),
            "user_id": user.get("user_id")
        }

        users.update_one(
            {"_id": ObjectId(user_id)},
            {"$push": {"categories": new_category}}
        )

        new_category_link = f"http://127.0.0.1:5001/users/{user_id}/categories/{new_category_id}"

        return make_response(jsonify({"URL": new_category_link}), 201)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid data", "details": str(e)}), 400)


# ---------------- PUT category ----------------
@categories_bp.route('/users/<string:user_id>/categories/<int:category_id>', methods=['PUT'])
def updateCategory(user_id, category_id):

    data = request.form
    update_fields = {}

    if data.get("name"):
        update_fields["categories.$.name"] = data.get("name")

    if data.get("type"):
        update_fields["categories.$.type"] = data.get("type")

    if not update_fields:
        return make_response(jsonify({"Error": "No valid data passed"}), 400)

    try:
        result = users.update_one(
            {
                "_id": ObjectId(user_id),
                "categories.category_id": category_id
            },
            {
                "$set": update_fields
            }
        )

        if result.matched_count == 0:
            return make_response(jsonify({"Error": "User or Category not found"}), 404)

        updated_link = f"http://127.0.0.1:5001/users/{user_id}/categories/{category_id}"

        return make_response(jsonify({"URL": updated_link}), 200)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid data", "details": str(e)}), 400)


# ---------------- DELETE category ----------------
@categories_bp.route('/users/<string:user_id>/categories/<int:category_id>', methods=['DELETE'])
def deleteCategory(user_id, category_id):

    try:
        result = users.update_one(
            {"_id": ObjectId(user_id)},
            {"$pull": {"categories": {"category_id": category_id}}}
        )

        if result.modified_count == 0:
            return make_response(jsonify({"Error": "Category not found"}), 404)

        return make_response(jsonify({"Message": "Category deleted"}), 200)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid user ID", "details": str(e)}), 400)