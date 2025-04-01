import React, { useState, useEffect, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import './App.css';

// Create a singleton WebSocket instance outside the component
let globalWebSocket = null;
let isConnecting = false;

function App() {
  const [color, setColor] = useState("#ff0000");
  const [rgbColor, setRgbColor] = useState({ r: 255, g: 0, b: 0 });
  const [_, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState('');
  
  // Convert hex color to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };
  
  // Function to connect to the WebSocket server
  const connectToServer = useCallback(() => {
    // Replace with your Raspberry Pi's IP address
    const serverAddress = 'ws://localhost:8765';
    
    // If already connected or connecting, use existing socket
    if (globalWebSocket && (globalWebSocket.readyState === WebSocket.OPEN || 
                            globalWebSocket.readyState === WebSocket.CONNECTING)) {
      setSocket(globalWebSocket);
      if (globalWebSocket.readyState === WebSocket.OPEN) {
        setConnectionStatus('connected');
        setLastMessage('Reusing existing connection');
        // Send color with existing connection
        sendColorToServer(rgbColor, globalWebSocket);
      } else {
        setConnectionStatus('connecting');
      }
      return globalWebSocket;
    }
    
    // Prevent multiple connection attempts
    if (isConnecting) return null;
    isConnecting = true;
    
    setConnectionStatus('connecting');
    const ws = new WebSocket(serverAddress);
    globalWebSocket = ws;
    
    ws.onopen = () => {
      setConnectionStatus('connected');
      setSocket(ws);
      setLastMessage('Connected to server');
      isConnecting = false;
      
      // Send initial color
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(rgbColor));
      }
    };
    
    ws.onclose = () => {
      setConnectionStatus('disconnected');
      setLastMessage('Disconnected from server');
      setSocket(null);
      isConnecting = false;
      globalWebSocket = null;
      
      // Try to reconnect after 5 seconds
      setTimeout(connectToServer, 5000);
    };
    
    ws.onerror = (error) => {
      setConnectionStatus('error');
      setLastMessage(`WebSocket error: ${error.message}`);
      isConnecting = false;
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data.message);
      } catch (e) {
        setLastMessage(`Received: ${event.data}`);
      }
    };
    
    return ws;
  }, [rgbColor]);
  
  // Connect to the WebSocket server when the component mounts
  useEffect(() => {
    let ws = globalWebSocket;
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      ws = connectToServer();
    } else {
      setSocket(ws);
      setConnectionStatus('connected');
    }
    
    // Clean up function - don't close the socket on unmount during development
    return () => {
      // We intentionally don't close the WebSocket here to maintain it during hot reloads
    };
  }, [connectToServer]);
  
  // Send the color to the server
  const sendColorToServer = (rgb, ws = globalWebSocket) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(rgb));
    }
  };
  
  // Handle color change (including hover)
  const handleColorChange = (newColor) => {
    setColor(newColor);
    const rgb = hexToRgb(newColor);
    if (rgb) {
      setRgbColor(rgb);
      sendColorToServer(rgb);
    }
  };
  
  // Status indicator styles
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'green';
      case 'connecting': return 'orange';
      case 'error': return 'red';
      default: return 'red';
    }
  };
  
  return (
    <div className="App">
      <header className="App-header">
        <h1>NeoPixel LED Controller</h1>
        <div className="status-indicator">
          Status: <span style={{ color: getStatusColor() }}>{connectionStatus}</span>
        </div>
      </header>
      
      <main>
        <div className="color-picker-container">
          <HexColorPicker color={color} onChange={handleColorChange} />
        </div>
        
        <div className="color-preview" style={{ backgroundColor: color }}>
          <div className="color-values">
            <p>HEX: {color}</p>
            <p>RGB: ({rgbColor.r}, {rgbColor.g}, {rgbColor.b})</p>
          </div>
        </div>
        
        <div className="message-log">
          <p>Server: {lastMessage}</p>
        </div>
      </main>
    </div>
  );
}

export default App;
