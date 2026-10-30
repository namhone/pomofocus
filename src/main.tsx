import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { RouterProvider } from './services/router.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RouterProvider>
        <App />
      </RouterProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
