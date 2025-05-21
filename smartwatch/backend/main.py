from flask import Flask, render_template, jsonify, request
from clock import clock_api
from weather_api import weather_api
from voice_commands import start_voice_thread, pause_voice_recognition, resume_voice_recognition
from music_control import music_api
from DHT22 import dht_api
from KY005 import send_ir_code
from KY022 import receive_ir_signal
import threading
import time
import os
import logging

# ───────────── Flask Setup ─────────────
app = Flask(__name__, template_folder="../templates", static_folder="../static")
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# ───────────── IR Signal ─────────────
@app.route('/send-ir-signal', methods=['POST'])
def send_ir_signal():
    data = request.get_json()
    signal = data.get('signal')

    if not signal:
        return jsonify({'status': 'error', 'message': 'No signal provided'}), 400

    try:
        int_signal = int(signal, 16) if isinstance(signal, str) else int(signal)
        send_ir_code(int_signal)
        return jsonify({'status': 'success'})
    except Exception as e:
        print(f"[IR] Error sending signal: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/record-ir', methods=['GET'])
def record_ir():
    try:
        code = receive_ir_signal(timeout=60, min_signals=5)
        if code is None:
            return jsonify({'status': 'no_signal'})
        return jsonify({'status': 'success', 'signal': f'0x{code:08X}'})
    except Exception as e:
        print(f"[IR] Error receiving signal: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ───────────── Voice ─────────────
last_voice_action = None
last_animation_action = None
voice_status = {"active": True}

@app.route("/voice-action")
def voice_action():
    global last_voice_action

    action = request.args.get("action")

    if action is not None:
        if action == "null":
            last_voice_action = None
        else:
            last_voice_action = action
        return "OK"

    action_to_return = last_voice_action
    last_voice_action = None
    return jsonify({"action": action_to_return})

@app.route("/animation-action")
def animation_action():
    global last_animation_action

    action = request.args.get("action")

    if action is not None:
        if action == "null":
            last_animation_action = None
        else:
            last_animation_action = action
        return "OK"

    action_to_return = last_animation_action
    last_animation_action = None
    return jsonify({"action": action_to_return})

@app.route("/set-voice")
def set_voice():
    status = request.args.get("active")

    if status == "true":
        pause_voice_recognition()
    elif status == "false":
        resume_voice_recognition()
    else:
        print("[SET-VOICE] Unrecognized status:", status)
        return jsonify({"error": "Invalid value"}), 400

    return jsonify({"active": status == "false"})

# ───────────── Home page ─────────────
@app.route("/")
def home():
    return render_template("index.html")

# ───────────── Registered modules ─────────────
app.register_blueprint(clock_api)
app.register_blueprint(weather_api)
app.register_blueprint(music_api)
app.register_blueprint(dht_api)

# ───────────── Launch ─────────────
def start_kiosk():
    time.sleep(2)
    # os.system("start chrome --kiosk http://localhost:5000")       # PC
    os.system("chromium-browser --kiosk http://localhost:5000")     # Raspberry Pi

if __name__ == "__main__":
    start_voice_thread()
    threading.Thread(target=start_kiosk).start()
    app.run(host="0.0.0.0", port=5000)









