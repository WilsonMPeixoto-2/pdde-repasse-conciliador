import { Link } from 'react-router-dom';

const TASKS = [
  {
    to: '/repasses',
    title: 'Ver repasses',
    description: 'Previsto, pagamento informado e crédito localizado por escola.',
  },
  {
    to: '/saldos',
    title: 'Ver saldos e contas',
    description: 'Saldo conhecido, referência e cobertura das contas.',
  },
  {
    to: '/unidades',
    title: 'Ver todas as escolas',
    description: 'Abra a carteira completa e compare as 163 unidades.',
  },
] as const;

export function FinancialTaskLinks() {
  return (
    <nav className="financial-task-links" aria-label="Atalhos para consultas financeiras">
      {TASKS.map((task) => (
        <Link className="financial-task-link" key={task.to} to={task.to}>
          <span>
            <strong>{task.title}</strong>
            <small>{task.description}</small>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      ))}
    </nav>
  );
}
