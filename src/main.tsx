import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App.tsx';

// TODO (Binôme A) : remplacer <App /> par <Providers /> une fois
// providers.tsx, router.tsx et auth.store.ts créés.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
