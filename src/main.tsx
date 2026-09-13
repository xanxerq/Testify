import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PdcProvider } from './context/PdcContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PdcProvider>
      <App />
    </PdcProvider>
  </StrictMode>,
);
