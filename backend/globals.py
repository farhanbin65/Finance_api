from pymongo import MongoClient
import os

SECRET_KEY = os.environ.get('SECRET_KEY', 'mysecret')
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/')

client = MongoClient(
    MONGO_URI,
    tlsAllowInvalidCertificates=True
)
db = client.finance_DB