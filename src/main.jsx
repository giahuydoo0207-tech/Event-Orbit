import React from 'react';
import ReactDOM from 'react-dom/client';
import { OCConnect } from '@opencampus/ocid-connect-js';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import App from './App.jsx';
import './index.css';

const opts = {
  clientId: import.meta.env.VITE_OCID_CLIENT_ID || 'sandbox-demo',
  redirectUri: import.meta.env.VITE_OCID_REDIRECT_URI || 'http://localhost:5173/redirect',
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastContainer />
      <OCConnect opts={opts} sandboxMode={true}>
        <App />
      </OCConnect>
    </ErrorBoundary>
  </React.StrictMode>
);
