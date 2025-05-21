from datetime import datetime
from flask import Blueprint, jsonify

clock_api = Blueprint("clock_api", __name__)

@clock_api.route("/api/time")
def get_time():
    now = datetime.now()
    return jsonify({"time": now.strftime("%H:%M:%S")})

@clock_api.route("/api/date")
def get_date():
    now = datetime.now()
    return jsonify({
        "year": now.year,
        "month": now.month,
        "day": now.day,
        "weekday": now.isoweekday()
    })

