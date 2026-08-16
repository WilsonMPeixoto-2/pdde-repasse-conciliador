import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppHeader } from './components/AppHeader';
import { RouteEffects } from './components/RouteEffects';
import { PortfolioProvider } from './PortfolioContext';
import { IndicatorPage } from './pages/IndicatorPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { SchoolPage } from './pages/SchoolPage';
import { SchoolsPage } from './pages/SchoolsPage';
import './design/layout.css';
import './design/refinements.css';

export function App() {
  return (
    <BrowserRouter>
      <PortfolioProvider>
        <RouteEffects />
        <div className="app-shell">
          <AppHeader />
          <Routes>
            <Route path="/" element={<PortfolioPage />} />
            <Route path="/unidades" element={<SchoolsPage />} />
            <Route path="/unidades/:inep" element={<SchoolPage />} />
            <Route path="/indicadores/:slug" element={<IndicatorPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </PortfolioProvider>
    </BrowserRouter>
  );
}
