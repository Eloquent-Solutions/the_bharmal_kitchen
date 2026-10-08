/**
 * Application Entry Point
 * The Bharmals Kitchen — Restaurant Management System
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/index.css';

// A tab left open during a deployment can request a chunk from the previous build.
// Reload once to load the current HTML and chunk URLs; let a second failure reach
// the route error page instead of creating a reload loop.
window.addEventListener('vite:preloadError', (event) => {
  const retryKey = 'tbk:chunk-reload-at';
  const now = Date.now();

  try {
    const lastRetry = Number(window.sessionStorage.getItem(retryKey)) || 0;
    if (now - lastRetry < 60_000) return;
    window.sessionStorage.setItem(retryKey, String(now));
  } catch {
    return;
  }

  event.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
