import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// The public game previously registered this URL, so keep updates at the same scope.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{
      // Saving and gameplay also work when service workers are unavailable.
    });
  });
}
