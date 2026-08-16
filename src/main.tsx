import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './product/App';

const root = document.getElementById('app');
if (!root) throw new Error('Elemento raiz da aplicação não encontrado.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
