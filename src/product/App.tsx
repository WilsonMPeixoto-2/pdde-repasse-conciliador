import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppHeader } from './components/AppHeader';
import { RouteEffects } from './components/RouteEffects';
import { PortfolioProvider } from './PortfolioContext';
import { IndicatorPage } from './pages/IndicatorPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { SchoolPage } from './pages/SchoolPage';
import { SchoolsPage } from './pages/SchoolsPage';
import { VisualProviders } from './visual/VisualProviders';
import './design/layout.css';
import './design/refinements.css';
import './design/portfolio-executive.css';
import './design/portfolio-schools.css';
import './design/session.css';
import './design/live-refresh.css';

export function App() {
  return (
    <VisualProviders>
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
    </VisualProviders>
  );
}
