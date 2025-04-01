# Raspberry Pi Remote Control - Setup Guide

This guide will help you set up both the backend server on your Raspberry Pi and the React frontend application.

## Backend Setup (Raspberry Pi)

### 1. Install Required Libraries

First, ensure your Raspberry Pi has Python 3 installed, then install the required libraries:

```bash
sudo pip3 install websockets rpi_ws281x adafruit-circuitpython-neopixel
```

### 2. Hardware Connection

Connect your WS2812B LED strip to the Raspberry Pi:
- Connect the data input pin of the LED strip to GPIO 18 (default in the code)
- Connect GND to a GND pin on the Raspberry Pi
- Connect 5V power supply to the LED strip (Note: For longer strips, use an external 5V power supply)

### 3. Create and Run the Backend Script

1. Create a file called `led_server.py` and paste the backend code
2. Make it executable:
   ```bash
   chmod +x led_server.py
   ```
3. Run the server:
   ```bash
   sudo python3 led_server.py
   ```

Note: `sudo` is required for NeoPixel library to access the GPIO pins.

### 4. Set Up as a Service (Optional but Recommended)

To make the server start automatically when the Raspberry Pi boots:

1. Create a systemd service file:
   ```bash
   sudo nano /etc/systemd/system/led-controller.service
   ```

2. Add the following content:
   ```
   [Unit]
   Description=NeoPixel LED Controller WebSocket Server
   After=network.target

   [Service]
   ExecStart=/usr/bin/python3 /full/path/to/led_server.py
   WorkingDirectory=/full/path/to/directory
   StandardOutput=inherit
   StandardError=inherit
   Restart=always
   User=root

   [Install]
   WantedBy=multi-user.target
   ```

3. Enable and start the service:
   ```bash
   sudo systemctl enable led-controller.service
   sudo systemctl start led-controller.service
   ```

## Frontend Setup

### 1. Create a New React App

```bash
npx create-react-app neopixel-controller
cd neopixel-controller
```

### 2. Install Required Dependencies

```bash
npm install react-colorful
```

### 3. Replace or Update Files

1. Replace the contents of `src/App.js` with the frontend code
2. Replace or update `src/App.css` with the CSS code
3. Update `package.json` if needed

### 4. Configure Connection

In `src/App.js`, find the following line and replace it with your Raspberry Pi's IP address:

```javascript
const serverAddress = 'ws://raspberrypi.local:8765';
```

For example:
```javascript
const serverAddress = 'ws://192.168.1.100:8765';
```

### 5. Run the Development Server

```bash
npm start
```

This will start the development server on http://localhost:3000

### 6. Build for Production (Optional)

When you're ready to deploy:

```bash
npm run build
```

This creates a `build` directory with optimized files. You can serve these files using a web server of your choice, or directly from the Raspberry Pi.

## Troubleshooting

### WebSocket Connection Issues

- Ensure the Raspberry Pi and the device running the frontend are on the same network
- Check that port 8765 is not blocked by a firewall
- Verify the correct IP address is being used in the frontend

### LED Strip Issues

- Make sure the data direction is correct (arrows on the strip should point away from the Raspberry Pi)
- Check that the GPIO pin number in the code matches your wiring
- For longer strips, ensure adequate power supply

### Permission Issues

- The NeoPixel library requires root privileges to access GPIO pins, which is why `sudo` is required when running the script