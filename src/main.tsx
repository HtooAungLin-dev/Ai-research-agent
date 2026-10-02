import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// AI Studio runs in an iframe environment where HMR WebSocket is disabled.
// Ignore harmless Vite HMR WebSocket connection closed rejections.
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = typeof reason === 'string' ? reason : reason?.message || '';
  if (
    message.includes('WebSocket') ||
    message.includes('websocket') ||
    message.includes('vite') ||
    String(reason).includes('WebSocket')
  ) {
    event.preventDefault();
    event.stopPropagation();
  }
});

window.addEventListener('error', (event) => {
  const message = event.message || '';
  if (
    message.includes('WebSocket') ||
    message.includes('websocket') ||
    message.includes('vite')
  ) {
    event.preventDefault();
    event.stopPropagation();
  }
});

createRoot(document.getElementById('root')!).render(<App />);
