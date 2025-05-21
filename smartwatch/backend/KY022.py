import pigpio
import time
from collections import Counter

IR_RECEIVER_PIN = 15

def receive_ir_signal(timeout=10, min_signals=5):
    pi = pigpio.pi()
    if not pi.connected:
        raise RuntimeError("Could not connect to pigpio daemon")

    last_tick = 0
    capturing = False
    durations = []
    results = []

    def cbf(gpio, level, tick):
        nonlocal last_tick, capturing, durations

        if last_tick != 0:
            duration = pigpio.tickDiff(last_tick, tick)

            if not capturing and 8500 < duration < 9500 and level == 1:
                capturing = True
                durations = [(level, duration)]
                return

            if capturing:
                durations.append((level, duration))

                if level == 0 and duration > 50000:
                    capturing = False
                    code = decode_pulses_to_nec(durations)
                    if code is not None:
                        results.append(code)

        last_tick = tick

    def decode_pulses_to_nec(pulses):
        if len(pulses) < 66:
            return None
        bits = ""
        for i in range(2, len(pulses), 2):
            if i + 1 >= len(pulses):
                break
            mark_level, mark_length = pulses[i]
            space_level, space_length = pulses[i+1]
            if mark_level != 1 or space_level != 0:
                continue
            bits += "1" if space_length > 1000 else "0"
        if len(bits) < 32:
            return None
        try:
            return int(bits[:32], 2)
        except:
            return None

    cb = pi.callback(IR_RECEIVER_PIN, pigpio.EITHER_EDGE, cbf)

    start_time = time.time()
    try:
        while time.time() - start_time < timeout and len(results) < min_signals:
            time.sleep(0.1)
    finally:
        cb.cancel()
        pi.stop()

    if results:
        most_common = Counter(results).most_common(1)[0][0]
        return most_common
    else:
        return None