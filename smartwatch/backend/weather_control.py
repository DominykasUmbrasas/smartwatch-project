import requests
from datetime import datetime, timedelta
from collections import Counter

weathercode_groups = {
    "clear": [0, 1],
    "cloudy": [2, 3],
    "fog": [45, 48],
    "rain": [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82],
    "snow": [71, 73, 75, 77, 85, 86],
    "thunderstorm": [95, 96, 99],
}

group_short_codes = {
    "clear": 1,
    "cloudy": 2,
    "rain": 3,
    "snow": 4,
    "fog": 5,
    "thunderstorm": 6,
}

def get_short_code(old_code):
    for group_name, codes in weathercode_groups.items():
        if old_code in codes:
            return group_short_codes[group_name]
    return 0

def fetch_raw_hourly_weather(latitude=54.6872, longitude=25.2797):
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={latitude}&longitude={longitude}"
        f"&hourly=temperature_2m,windspeed_10m,precipitation_probability,weathercode,is_day"
        f"&timezone=Europe%2FVilnius"
    )

    response = requests.get(url)
    data = response.json()

    hourly = data["hourly"]

    times = hourly["time"]
    temperatures = hourly["temperature_2m"]
    windspeeds = hourly["windspeed_10m"]
    precipitation_probs = hourly["precipitation_probability"]
    weathercodes = hourly["weathercode"]
    is_day_flags = hourly["is_day"]

    short_weathercodes = [get_short_code(code) for code in weathercodes]

    return times, temperatures, windspeeds, precipitation_probs, short_weathercodes, is_day_flags

def filter_today_hourly_weather(times, temperatures, windspeeds, precipitation_probs, short_weathercodes):
    today = datetime.now().date().isoformat()
    tomorrow = (datetime.now().date() + timedelta(days=1)).isoformat()

    today_temperatures = []
    today_windspeeds = []
    today_precipitation_probs = []
    today_short_weathercodes = []

    for i in range(len(times)):
        time_str = times[i]
        date_part = time_str[:10]
        hour_part = int(time_str[11:13])

        if date_part == today and 0 <= hour_part <= 23:
            today_temperatures.append(temperatures[i])
            today_windspeeds.append(windspeeds[i])
            today_precipitation_probs.append(precipitation_probs[i])
            today_short_weathercodes.append(short_weathercodes[i])

        elif date_part == tomorrow and 0 <= hour_part <= 7:
            today_temperatures.append(temperatures[i])
            today_windspeeds.append(windspeeds[i])
            today_precipitation_probs.append(precipitation_probs[i])
            today_short_weathercodes.append(short_weathercodes[i])

    if len(today_temperatures) != 32:
        print(f"Failed to collect 32 hours. Received: {len(today_temperatures)}")

    return today_temperatures, today_windspeeds, today_precipitation_probs, today_short_weathercodes

def summarize_7_days_weather(times, temperatures, windspeeds, precipitation_probs, short_weathercodes, is_day_flags):
    day_keys = []
    daily_data = {}

    for i in range(len(times)):
        date_str = times[i][:10]
        is_day = is_day_flags[i]

        if date_str not in daily_data:
            daily_data[date_str] = {
                "day_temp": [], "night_temp": [],
                "day_wind": [], "night_wind": [],
                "day_precip": [], "night_precip": [],
                "codes": []
            }
            day_keys.append(date_str)

        if is_day == 1:
            daily_data[date_str]["day_temp"].append(temperatures[i])
            daily_data[date_str]["day_wind"].append(windspeeds[i])
            daily_data[date_str]["day_precip"].append(precipitation_probs[i])
        else:
            daily_data[date_str]["night_temp"].append(temperatures[i])
            daily_data[date_str]["night_wind"].append(windspeeds[i])
            daily_data[date_str]["night_precip"].append(precipitation_probs[i])

        daily_data[date_str]["codes"].append(short_weathercodes[i])

    day_keys = day_keys[:7]

    avg_day_temp = []
    avg_night_temp = []
    avg_day_wind = []
    avg_night_wind = []
    avg_day_precip = []
    avg_night_precip = []
    most_common_code = []

    for day in day_keys:
        data = daily_data[day]

        def avg(lst): return sum(lst) / len(lst) if lst else None

        avg_day_temp.append(avg(data["day_temp"]))
        avg_night_temp.append(avg(data["night_temp"]))
        avg_day_wind.append(avg(data["day_wind"]))
        avg_night_wind.append(avg(data["night_wind"]))
        avg_day_precip.append(avg(data["day_precip"]))
        avg_night_precip.append(avg(data["night_precip"]))

        if data["codes"]:
            code_counter = Counter(data["codes"])
            most_common = code_counter.most_common(1)[0][0]
            most_common_code.append(most_common)
        else:
            most_common_code.append(None)

    return (avg_day_temp, avg_night_temp,
            avg_day_wind, avg_night_wind,
            avg_day_precip, avg_night_precip,
            most_common_code)

# times, temperatures, windspeeds, precipitation_probs, short_weathercodes, is_day_flags = fetch_raw_hourly_weather()
# today_temperatures, today_windspeeds, today_precipitation_probs, today_short_weathercodes = filter_today_hourly_weather(times, temperatures, windspeeds, precipitation_probs, short_weathercodes)
# avg_day_temp, avg_night_temp, avg_day_wind, avg_night_wind, avg_day_precip, avg_night_precip, most_common_code = summarize_7_days_weather(times, temperatures, windspeeds, precipitation_probs, short_weathercodes, is_day_flags)
