import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { initAuth } from '@/store/authStore';
import './index.css';

// Start listening for auth state (anonymous browsing session or a restored
// Google sign-in) before first paint.
initAuth();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/wc26">
      <App />
    </BrowserRouter>
  </StrictMode>,
);
