from flask import Flask
from blueprints.auth.auth import auth_bp
from blueprints.users.users import users_bp
from blueprints.expenses.expenses import expenses_bp
from blueprints.categories.categories import categories_bp
from blueprints.alerts.alerts import alerts_bp
from blueprints.budgets.budgets import budgets_bp

app = Flask(__name__)

app.register_blueprint(auth_bp)
app.register_blueprint(users_bp)
app.register_blueprint(expenses_bp)
app.register_blueprint(categories_bp)
app.register_blueprint(alerts_bp)
app.register_blueprint(budgets_bp)

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5001)