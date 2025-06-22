import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './store/store';
import App from './App';
import './styles/main.css';
import { setAuthToken } from './services/apiClient';
import AuthService from './services/authService';

const applyTheme = (theme: 'light' | 'dark') => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
};

const initialTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
applyTheme(initialTheme);

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

// Attempt to restore session on application load
const sessionData = AuthService.getSessionData();
if (sessionData?.token) {
  setAuthToken(sessionData.token);
}

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
