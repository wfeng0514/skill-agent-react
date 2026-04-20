import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Agent from './pages/Agent';
import './index.css';
// import './styles/global.scss';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/agent" element={<Agent />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
);
