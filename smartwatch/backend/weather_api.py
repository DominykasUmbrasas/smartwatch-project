from flask import Blueprint, jsonify
from weather_control import (
    fetch_raw_hourly_weather,
    filter_today_hourly_weather,
    summarize_7_days_weather,
)

weather_api = Blueprint("weather_api", __name__)

@weather_api.route("/api/weather", methods=["GET"])
def get_weather_data():
    times, temperatures, windspeeds, precipitation_probs, weathercodes, is_day_flags = fetch_raw_hourly_weather()

    today_temperatures, today_windspeeds, today_precipitation_probs, today_weathercodes = filter_today_hourly_weather(
        times, temperatures, windspeeds, precipitation_probs, weathercodes
    )

    avg_day_temp, avg_night_temp, avg_day_wind, avg_night_wind, avg_day_precip, avg_night_precip, most_common_code = summarize_7_days_weather(
        times, temperatures, windspeeds, precipitation_probs, weathercodes, is_day_flags
    )

    response_data = {
        "today": [
            {
                "hour": i,
                "temperature": today_temperatures[i],
                "windspeed": today_windspeeds[i],
                "precipitation_prob": today_precipitation_probs[i],
                "weathercode": today_weathercodes[i],
            } for i in range(len(today_temperatures))
        ],
        "summary_7days": [
            {
                "day_index": i,
                "avg_day_temp": round(avg_day_temp[i]) if avg_day_temp[i] is not None else None,
                "avg_night_temp": round(avg_night_temp[i]) if avg_night_temp[i] is not None else None,
                "avg_day_wind": round(avg_day_wind[i]) if avg_day_wind[i] is not None else None,
                "avg_night_wind": round(avg_night_wind[i]) if avg_night_wind[i] is not None else None,
                "avg_day_precip": round(avg_day_precip[i]) if avg_day_precip[i] is not None else None,
                "avg_night_precip": round(avg_night_precip[i]) if avg_night_precip[i] is not None else None,
                "common_code": most_common_code[i],
            } for i in range(len(avg_day_temp))
        ]
    }

    return jsonify(response_data)
