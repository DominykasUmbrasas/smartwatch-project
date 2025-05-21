import speech_recognition as sr
import threading
import time
import unicodedata
import requests


trigger_word = "laikr"                      # laikrodis, laikrodi...

paused = True

command_map = {
    # Laikmatis
    "palei laikm":  "start_timer",          #paleisti laikmati
    "susta laikm":  "pause_timer",          #sustabdyti laikmati
    "atnau laikm":  "stop_timer",           #atnaujinti laikmati

    # Muzika
    "palei muzik":  "play_music",           # paleisti muzika
    "susta muzik":  "pause_music",          # sustabdyti muzika
    "kita daina":   "next_track",           # kita daina
    "sekan daina":  "next_track",           # sekanti daina
    "ankst daina":  "prev_track",           # ankstesne daina

    # Mygtukai 1–9
    "mygtu 1":      "button_1",             # mygtukas vienas
    "mygtu viena":  "button_1",
    "mygtu 2":      "button_2",             # mygtukas du
    "mygtu du":     "button_2",
    "mygtu 3":      "button_3",             # mygtukas trys
    "mygtu trys":   "button_3",
    "mygtu 4":      "button_4",             # mygtukas keturi
    "mygtu ketur":  "button_4",
    "mygtu 5":      "button_5",             # mygtukas penki
    "mygtu penki":  "button_5",
    "mygtu 6":      "button_6",             # mygtukas sesi
    "mygtu sesis":  "button_6",
    "mygtu 7":      "button_7",             # mygtukas septyni
    "mygtu septy":  "button_7",
    "mygtu 8":      "button_8",             # mygtukas astuoni
    "mygtu astuo":  "button_8",
    "mygtu 9":      "button_9",             # mygtukas devyni
    "mygtu devyn":  "button_9",

    # Mygtukai a1–a5
    "mygtu a1":      "button_a1",            # mygtukas a vienas
    "mygtu avien":   "button_a1",  
    "mygtu a2":      "button_a2",            # mygtukas a du
    "mygtu advyl":   "button_a2",  
    "mygtu a3":      "button_a3",            # mygtukas a trys
    "mygtu atryl":   "button_a3",  
    "mygtu a4":      "button_a4",            # mygtukas a keturi
    "mygtu aketu":   "button_a4",  
    "mygtu a5":      "button_a5",            # mygtukas a penki
    "mygtu apenk":   "button_a5"
}

def normalize_lithuanian(text):
    nfkd_form = unicodedata.normalize('NFKD', text)
    only_ascii = ''.join([c for c in nfkd_form if not unicodedata.combining(c)])
    return only_ascii.lower()

def shorten_words(text, limit=5):
    words = text.split()
    shortened = [''.join(list(word)[:limit]) for word in words]
    return ' '.join(shortened)

def recognize_speech():
    global paused

    recognizer = sr.Recognizer()
    mic = sr.Microphone()

    with mic as source:
        recognizer.adjust_for_ambient_noise(source)
 
    while True:
        if paused:
            time.sleep(1)
            continue

        with mic as source:
            audio = recognizer.listen(source, phrase_time_limit=5)

        try:
            text = recognizer.recognize_google(audio, language="lt-LT")
            text = normalize_lithuanian(text)
            text = shorten_words(text)

            if trigger_word in text:
                listen_for_command(recognizer, mic)

        except sr.UnknownValueError:
            # Unknown command
            print("[Voice] Unknown command")
        except sr.RequestError as e:
            # API error
            print(f"[Voice] API error: {e}")

def listen_for_command(recognizer, mic):
    print("[AKTYVUS] Laukiu komandos...")
    requests.get("http://localhost:5000/animation-action?action=start_listen")
    with mic as source:
        audio = recognizer.listen(source, phrase_time_limit=5)

    try:
        command = recognizer.recognize_google(audio, language="lt-LT")
        command = normalize_lithuanian(command)
        command = shorten_words(command)

        if command in command_map:
            action = command_map[command]
            requests.get(f"http://localhost:5000/voice-action?action={action}")
            requests.get("http://localhost:5000/animation-action?action=command_success")
        else:
            # # Unknown command
            requests.get("http://localhost:5000/animation-action?action=command_fail")


    except sr.UnknownValueError:
        # Unknown command
        print("[Voice] Unknown command")
        requests.get("http://localhost:5000/animation-action?action=command_fail")
    except sr.RequestError as e:
        # API error
        print(f"[Voice] API error: {e}")
        requests.get("http://localhost:5000/animation-action?action=command_fail")

def start_voice_thread():
    thread = threading.Thread(target=recognize_speech, daemon=True)
    thread.start()

def pause_voice_recognition():
    global paused
    paused = True

def resume_voice_recognition():
    global paused
    paused = False

