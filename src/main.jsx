import React from 'react';
import ReactDOM from 'react-dom/client';
import { OCConnect } from '@opencampus/ocid-connect-js';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import App from './App.jsx';
import './index.css';

// Dynamic redirectUri: always uses current domain (e.g. https://event-orbit-app.vercel.app/redirect on production, http://localhost:5173/redirect on local)
const redirectUri = typeof window !== 'undefined'
  ? `${window.location.origin}/redirect`
  : 'http://localhost:5173/redirect';

const opts = {
  clientId: (import.meta.env.VITE_OCID_CLIENT_ID && import.meta.env.VITE_OCID_CLIENT_ID !== 'sandbox-demo')
    ? import.meta.env.VITE_OCID_CLIENT_ID
    : 'f0aa0ffa-b5e0-4e0e-90b6-035ac67e7676',
  redirectUri: redirectUri,
};

const sandboxMode = import.meta.env.VITE_OCID_ENVIRONMENT === 'sandbox';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastContainer />
      <OCConnect opts={opts} sandboxMode={sandboxMode}>
        <App />
      </OCConnect>
    </ErrorBoundary>
  </React.StrictMode>
);
