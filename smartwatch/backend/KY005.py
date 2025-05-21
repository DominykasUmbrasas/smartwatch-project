import pigpio
import time

IR_TRANSMITTER_PIN = 18

pi = pigpio.pi()
if not pi.connected:
    exit()

def send_pwm_mark(duration_microseconds):
    pi.hardware_PWM(IR_TRANSMITTER_PIN, 38000, 500000)
    time.sleep(duration_microseconds / 1_000_000.0)

def send_pwm_space(duration_microseconds):
    pi.hardware_PWM(IR_TRANSMITTER_PIN, 0, 0)
    time.sleep(duration_microseconds / 1_000_000.0)

def send_nec(code, repeat=3, delay=0.05):
    for _ in range(repeat):
        send_pwm_mark(9000)
        send_pwm_space(4500)

        for i in range(32):
            send_pwm_mark(580)
            if (code >> (31 - i)) & 1:
                send_pwm_space(1650)
            else:
                send_pwm_space(580)

        send_pwm_mark(580)
        send_pwm_space(0)
        time.sleep(delay)

def send_ir_code(code):
    send_nec(code, repeat=3, delay=0.05)
    time.sleep(0.1)
    pi.hardware_PWM(IR_TRANSMITTER_PIN, 0, 0)
