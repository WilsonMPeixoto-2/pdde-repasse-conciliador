import { NavLink } from 'react-router-dom';

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <NavLink className="brand" to="/" aria-label="Inteligência Financeira PDDE, início">
          <span className="brand__eyebrow">4ª Coordenadoria Regional de Educação</span>
          <span className="brand__name brand__name--desktop">Inteligência Financeira PDDE</span>
          <span className="brand__name brand__name--mobile">Inteligência PDDE</span>
        </NavLink>
        <nav className="main-nav" aria-label="Navegação principal">
          <NavLink to="/" end>Início</NavLink>
          <NavLink to="/unidades">Escolas</NavLink>
          <NavLink to="/repasses">Repasses</NavLink>
          <NavLink to="/saldos">Saldos e contas</NavLink>
          <NavLink to="/pendencias">Pendências</NavLink>
          <NavLink to="/prestacao-contas">Prestação</NavLink>
          <span className="year-pill">2026</span>
        </nav>
      </div>
    </header>
  );
}
