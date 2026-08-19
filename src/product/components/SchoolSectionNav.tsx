export function SchoolSectionNav({
  hasMovements,
  hasAccounting,
}: {
  hasMovements: boolean;
  hasAccounting: boolean;
}) {
  return (
    <nav className="school-section-nav" aria-label="Seções do prontuário financeiro">
      <a href="#resumo">Resumo</a>
      <a href="#repasses">Repasses</a>
      <a href="#contas-saldos">Contas e saldos</a>
      {hasMovements ? <a href="#movimentacoes">Movimentações</a> : null}
      {hasAccounting ? <a href="#prestacao-contas">Prestação de contas</a> : null}
    </nav>
  );
}
