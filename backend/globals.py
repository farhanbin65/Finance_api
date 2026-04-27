from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY = os.environ.get('SECRET_KEY', 'mysecret')
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/')

AUTH0_DOMAIN = os.environ.get('AUTH0_DOMAIN', '')
AUTH0_CLIENT_ID = os.environ.get('AUTH0_CLIENT_ID', '')

client = MongoClient(
    MONGO_URI,
    tlsAllowInvalidCertificates=True
)
db = client.finance_DB