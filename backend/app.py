import os
from flask import Flask
from flask_cors import CORS
from blueprints.auth.auth import auth_bp
from blueprints.users.users import users_bp
from blueprints.expenses.expenses import expenses_bp
from blueprints.categories.categories import categories_bp
from blueprints.alerts.alerts import alerts_bp
from blueprints.budgets.budgets import budgets_bp
from blueprints.admin.admin import admin_bp

app = Flask(__name__)
app.url_map.strict_slashes = False
CORS(app, resources={r"/*": {
    "origins": "http://localhost:4200",
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}}, supports_credentials=True)

app.register_blueprint(auth_bp)
app.register_blueprint(users_bp)
app.register_blueprint(expenses_bp)
app.register_blueprint(categories_bp)
app.register_blueprint(alerts_bp)
app.register_blueprint(budgets_bp)
app.register_blueprint(admin_bp)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=False, host="0.0.0.0", port=port)