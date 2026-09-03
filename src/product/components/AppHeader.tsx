import { NavLink } from 'react-router-dom';

const DATA_TABS = [
  { to: '/', label: 'Visão geral', end: true },
  { to: '/unidades', label: 'Escolas' },
  { to: '/repasses', label: 'Repasses' },
  { to: '/pdde-basico', label: 'PDDE Básico' },
  { to: '/saldos', label: 'Contas e saldos' },
  { to: '/evolucao', label: 'Evolução mensal' },
  { to: '/movimentacoes', label: 'Movimentações' },
  { to: '/cadastro', label: 'Cadastro e habilitação' },
  { to: '/pendencias', label: 'Pendências e suspensões' },
  { to: '/prestacao-contas', label: 'Prestação de contas' },
  { to: '/cobertura', label: 'Cobertura das fontes' },
] as const;

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header__inner app-header__inner--data-tabs">
        <NavLink className="brand" to="/" aria-label="Inteligência Financeira PDDE, início">
          <span className="brand__eyebrow">4ª Coordenadoria Regional de Educação</span>
          <span className="brand__name brand__name--desktop">Inteligência Financeira PDDE</span>
          <span className="brand__name brand__name--mobile">Inteligência PDDE</span>
        </NavLink>
        <span className="year-pill">2026</span>
      </div>
      <nav className="main-nav main-nav--data-tabs" aria-label="Dimensões da inteligência financeira">
        <div className="main-nav__scroll">
          {DATA_TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={'end' in tab ? tab.end : undefined}>
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
}
