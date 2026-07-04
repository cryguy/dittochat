import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted variable fonts (no runtime CDN dependency).
import '@fontsource-variable/instrument-sans/index.css';
import '@fontsource-variable/instrument-sans/standard-italic.css';
import '@fontsource-variable/newsreader/index.css';
import '@fontsource-variable/newsreader/standard-italic.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
