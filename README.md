# README – Prototype Setup Guide

## Hardware Platform
- Raspberry Pi 4 Model B
- Waveshare 7" capacitive touchscreen
- DHT22 temperature and humidity sensor
- KY-005 IR transmitter (with 2N2222 transistor)
- KY-022 IR receiver
- MicroSD card (16 GB or larger recommended)

## 1. System Preparation

### 1.1. Install Raspberry Pi OS (32-bit Lite or Desktop)
Download and flash using Raspberry Pi Imager:  
https://www.raspberrypi.com/software

### 1.2. After the first boot:
Login with the default credentials (user: pi, password: raspberry),  
then open the terminal and run system updates:

**System update command:**
- `sudo apt update && sudo apt upgrade -y`

### 1.3. Enable required interfaces:
Open Raspberry Pi configuration tool:

**Command:**
- `sudo raspi-config`

Navigate to:
- Interface Options → I2C → Enable  
- Interface Options → SPI → Enable  
- System Options → Display → Set resolution (if needed)

## 2. Waveshare Touchscreen Configuration

### 2.1. Connect the display:
- Micro-HDMI to HDMI0 (port closest to USB-C)  
- USB to any Raspberry Pi USB-A port (for power and touch)

### 2.2. Edit the configuration file:
Open the configuration file with:

**Command:**
- `sudo nano /boot/config.txt`

Append the following lines at the end:

```
hdmi_force_hotplug=1
hdmi_group=2
hdmi_mode=87
hdmi_cvt 1024 600 60 6 0 0 0
```

### 2.3. Reboot the system:
**Command:**
- `sudo reboot`

## 3. Installing Project Files

### 3.1. Copy project files:
Place all project files into a folder, e.g. `/home/pi/project/`

### 3.2. Install dependencies:
**Command:**
- `pip install -r requirements.txt`

If `requirements.txt` is missing, install manually:

**Manual install:**
- `pip install flask pigpio requests board adafruit-circuitpython-dht SpeechRecognition PyAudio`

### 3.3. Start the system:
**Commands:**
- `sudo pigpiod`  
- `python main.py`

## 4. Usage

When `main.py` is started, the system automatically launches all components.  
If not, open a browser and navigate to:  
**http://localhost:5000**

- Voice control, IR signals, and sensor data run automatically.
- UI settings (theme, language, brightness, etc.) are available in page 4 of the interface.

## Additional Notes

- If the screen does not display, check HDMI0 and USB connections.
- IR modules only work if `pigpiod` is running.
- For microphone issues, check with: `arecord -l`
