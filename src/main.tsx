import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// import App from './App';
import MastraUI from './Mastra-UI';
import './index.css';
// import './styles/global.scss';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* <App /> */}
    <MastraUI />
  </StrictMode>,
);
