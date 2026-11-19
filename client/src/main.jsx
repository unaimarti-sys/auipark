import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './controllers/AuthContext.jsx';
import './styles/tokens.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/panels.css';

// Si la app se abre a través del proxy de Apache (https://servidor/app/), las rutas cuelgan de /app
const basename = window.location.pathname.startsWith('/app') ? '/app' : undefined;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
