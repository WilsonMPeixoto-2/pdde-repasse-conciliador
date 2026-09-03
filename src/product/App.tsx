import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppHeader } from './components/AppHeader';
import { RouteEffects } from './components/RouteEffects';
import { PortfolioProvider } from './PortfolioContext';
import { AccountingOverviewPage } from './pages/AccountingOverviewPage';
import { CoverageOverviewPage } from './pages/CoverageOverviewPage';
import { BalancesOverviewPage } from './pages/BalancesOverviewPage';
import { IndicatorPage } from './pages/IndicatorPage';
import { IssuesOverviewPage } from './pages/IssuesOverviewPage';
import { MonthlyEvolutionPage } from './pages/MonthlyEvolutionPage';
import { MovementsOverviewPage } from './pages/MovementsOverviewPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { RegistrationOverviewPage } from './pages/RegistrationOverviewPage';
import { RepasseOverviewPage } from './pages/RepasseOverviewPage';
import { SchoolPage } from './pages/SchoolPage';
import { SchoolsPage } from './pages/SchoolsPage';
import { VisualProviders } from './visual/VisualProviders';
import './design/layout.css';
import './design/refinements.css';
import './design/portfolio-executive.css';
import './design/portfolio-schools.css';
import './design/session.css';
import './design/live-refresh.css';
import './design/findability.css';
import './design/coherence-fixes.css';
import './design/school-operational.css';
import './design/movement-ledger.css';
import './design/information-universe.css';

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
              <Route path="/repasses" element={<RepasseOverviewPage />} />
              <Route path="/saldos" element={<BalancesOverviewPage />} />
              <Route path="/evolucao" element={<MonthlyEvolutionPage />} />
              <Route path="/movimentacoes" element={<MovementsOverviewPage />} />
              <Route path="/cadastro" element={<RegistrationOverviewPage />} />
              <Route path="/pendencias" element={<IssuesOverviewPage />} />
              <Route path="/prestacao-contas" element={<AccountingOverviewPage />} />
              <Route path="/cobertura" element={<CoverageOverviewPage />} />
              <Route path="/indicadores/:slug" element={<IndicatorPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </PortfolioProvider>
      </BrowserRouter>
    </VisualProviders>
  );
}
