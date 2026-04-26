from pymongo import MongoClient
import os
import ssl

SECRET_KEY = os.environ.get('SECRET_KEY', 'mysecret')
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/')

client = MongoClient(
    MONGO_URI,
    ssl=True,
    ssl_cert_reqs=ssl.CERT_NONE
)
db = client.finance_DB