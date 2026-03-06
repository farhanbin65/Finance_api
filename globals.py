from pymongo import MongoClient

SECRET_KEY = 'mysecret'

client = MongoClient("mongodb://localhost:27017/")
db = client.finance_DB