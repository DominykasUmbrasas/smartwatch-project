import time
import board
import adafruit_dht
from flask import Blueprint, jsonify

dht_api = Blueprint('dht_api', __name__)

dhtDevice = adafruit_dht.DHT22(board.D4)
time.sleep(5)

@dht_api.route('/api/dht', methods=['GET'])
def get_dht_data():
    try:
        temperature_c = dhtDevice.temperature
        humidity = dhtDevice.humidity

        if humidity is not None and temperature_c is not None:
            return jsonify({
                "temperature": round(temperature_c, 1),
                "humidity": round(humidity, 1)
            })
        else:
            return jsonify({"error": "Failed to read data"}), 500

    except RuntimeError as error:
        return jsonify({"error": error.args[0]}), 500
