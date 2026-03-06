from flask import Flask
from blueprints.auth.auth import auth_bp
from blueprints.users.users import users_bp

app = Flask(__name__)

app.register_blueprint(auth_bp)
app.register_blueprint(users_bp)

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5001)