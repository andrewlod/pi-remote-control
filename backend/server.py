import asyncio
import json
import logging
from websockets.server import serve
import board
import neopixel

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# NeoPixel LED strip configuration
LED_COUNT = 30  # Number of LED pixels (adjust to your strip)
LED_PIN = board.D18  # GPIO pin connected to the pixels (adjust if needed)
LED_BRIGHTNESS = 0.5  # Set to 0 for darkest and 1 for brightest

# Initialize the LED strip
pixels = neopixel.NeoPixel(
    LED_PIN, 
    LED_COUNT, 
    brightness=LED_BRIGHTNESS, 
    auto_write=False
)

# Rate limiting variables
UPDATE_INTERVAL = 0.1  # Update LEDs at most every 0.1 seconds
pending_update = None
update_task = None

def sanitize_rgb(r, g, b):
    """Sanitize RGB values to ensure they're between 0-255"""
    r = max(0, min(255, int(r)))
    g = max(0, min(255, int(g)))
    b = max(0, min(255, int(b)))
    return (r, g, b)

async def update_leds_task():
    """Task to update LEDs at a rate-limited interval"""
    global pending_update
    
    while True:
        # Wait for the specified interval
        await asyncio.sleep(UPDATE_INTERVAL)
        
        # Check if there's a pending update
        if pending_update is not None:
            r, g, b = pending_update
            pixels.fill((r, g, b))
            pixels.show()
            logger.info(f"Rate-limited update: LEDs set to RGB: ({r}, {g}, {b})")
            pending_update = None

async def handle_websocket(websocket):
    """Handle incoming WebSocket connections and messages"""
    global pending_update, update_task
    
    client_id = id(websocket)
    logger.info(f"Client {client_id} connected")
    
    # Start the update task if it's not already running
    if update_task is None or update_task.done():
        update_task = asyncio.create_task(update_leds_task())
    
    try:
        async for message in websocket:
            try:
                # Parse the incoming JSON message
                data = json.loads(message)
                
                # Extract and sanitize RGB values
                if all(key in data for key in ["r", "g", "b"]):
                    r, g, b = sanitize_rgb(data["r"], data["g"], data["b"])
                    
                    # Store the pending update (this will replace any previous pending update)
                    pending_update = (r, g, b)
                    
                    # Send acknowledgment back to client
                    await websocket.send(json.dumps({
                        "status": "success", 
                        "message": f"LED update queued: RGB: ({r}, {g}, {b})"
                    }))
                else:
                    await websocket.send(json.dumps({
                        "status": "error", 
                        "message": "Missing RGB values"
                    }))
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received: {message}")
                await websocket.send(json.dumps({
                    "status": "error", 
                    "message": "Invalid JSON format"
                }))
            except Exception as e:
                logger.error(f"Error processing message: {str(e)}")
                await websocket.send(json.dumps({
                    "status": "error", 
                    "message": f"Error: {str(e)}"
                }))
    except Exception as e:
        logger.error(f"Connection error: {str(e)}")
    finally:
        logger.info(f"Client {client_id} disconnected")

async def main():
    # Start WebSocket server
    HOST = ["0.0.0.0", "::"]  # Listen on all network interfaces
    PORT = 8765
    
    logger.info(f"Starting WebSocket server on {HOST}:{PORT}")
    try:
        async with serve(handle_websocket, HOST, PORT):
            await asyncio.Future()  # Run forever
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
    finally:
        # Always ensure LEDs are turned off when the server shuts down
        logger.info("Turning off all LEDs")
        pixels.fill((0, 0, 0))
        pixels.show()
        
        # Cancel the update task if it's running
        global update_task
        if update_task and not update_task.done():
            update_task.cancel()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
    finally:
        # Ensure LEDs are turned off no matter how the program exits
        logger.info("Turning off LEDs")
        pixels.fill((0, 0, 0))
        pixels.show()
