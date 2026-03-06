from flask import Blueprint, request, make_response, jsonify
from bson import ObjectId
import globals

alerts_bp = Blueprint("alerts_bp", __name__)

users = globals.db.finance_data


# ---------------- GET all alerts ----------------
@alerts_bp.route('/users/<string:user_id>/alerts', methods=['GET'])
def getAllAlerts(user_id):

    try:
        user = users.find_one({"_id": ObjectId(user_id)})

        if user is None:
            return make_response(jsonify({"Error": "User not found"}), 404)

        alerts = user.get("alerts", [])

        return make_response(jsonify(alerts), 200)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid user ID", "details": str(e)}), 400)


# ---------------- GET one alert ----------------
@alerts_bp.route('/users/<string:user_id>/alerts/<int:alert_id>', methods=['GET'])
def getOneAlert(user_id, alert_id):

    try:
        user = users.find_one({"_id": ObjectId(user_id)})

        if user is None:
            return make_response(jsonify({"Error": "User not found"}), 404)

        for alert in user.get("alerts", []):
            if alert.get("alert_id") == alert_id:
                return make_response(jsonify(alert), 200)

        return make_response(jsonify({"Error": "Alert not found"}), 404)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid user ID", "details": str(e)}), 400)


# ---------------- POST alert ----------------
@alerts_bp.route('/users/<string:user_id>/alerts', methods=['POST'])
def addAlert(user_id):

    data = request.form

    if not data or "category_id" not in data or "threshold_percent" not in data:
        return make_response(jsonify({"Error": "Missing data"}), 400)

    try:
        user = users.find_one({"_id": ObjectId(user_id)})

        if user is None:
            return make_response(jsonify({"Error": "User not found"}), 404)

        alerts = user.get("alerts", [])

        if alerts:
            new_alert_id = max(a.get("alert_id", 0) for a in alerts) + 1
        else:
            new_alert_id = 1

        new_alert = {
            "alert_id": new_alert_id,
            "category_id": int(data.get("category_id")),
            "threshold_percent": int(data.get("threshold_percent")),
            "enabled": data.get("enabled", "true").lower() == "true",
            "user_id": user.get("user_id")
        }

        users.update_one(
            {"_id": ObjectId(user_id)},
            {"$push": {"alerts": new_alert}}
        )

        new_alert_link = f"http://127.0.0.1:5001/users/{user_id}/alerts/{new_alert_id}"

        return make_response(jsonify({"URL": new_alert_link}), 201)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid data", "details": str(e)}), 400)


# ---------------- PUT alert ----------------
@alerts_bp.route('/users/<string:user_id>/alerts/<int:alert_id>', methods=['PUT'])
def updateAlert(user_id, alert_id):

    data = request.form
    update_fields = {}

    if data.get("category_id"):
        update_fields["alerts.$.category_id"] = int(data.get("category_id"))

    if data.get("threshold_percent"):
        update_fields["alerts.$.threshold_percent"] = int(data.get("threshold_percent"))

    if data.get("enabled"):
        update_fields["alerts.$.enabled"] = data.get("enabled").lower() == "true"

    if not update_fields:
        return make_response(jsonify({"Error": "No valid data passed"}), 400)

    try:
        result = users.update_one(
            {
                "_id": ObjectId(user_id),
                "alerts.alert_id": alert_id
            },
            {
                "$set": update_fields
            }
        )

        if result.matched_count == 0:
            return make_response(jsonify({"Error": "User or Alert not found"}), 404)

        updated_link = f"http://127.0.0.1:5001/users/{user_id}/alerts/{alert_id}"

        return make_response(jsonify({"URL": updated_link}), 200)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid data", "details": str(e)}), 400)


# ---------------- DELETE alert ----------------
@alerts_bp.route('/users/<string:user_id>/alerts/<int:alert_id>', methods=['DELETE'])
def deleteAlert(user_id, alert_id):

    try:
        result = users.update_one(
            {"_id": ObjectId(user_id)},
            {"$pull": {"alerts": {"alert_id": alert_id}}}
        )

        if result.modified_count == 0:
            return make_response(jsonify({"Error": "Alert not found"}), 404)

        return make_response(jsonify({"Message": "Alert deleted"}), 200)

    except Exception as e:
        return make_response(jsonify({"Error": "Invalid user ID", "details": str(e)}), 400)