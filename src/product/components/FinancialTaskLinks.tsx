import { Link } from 'react-router-dom';

const TASKS = [
  { to: '/unidades', title: 'Escolas', description: 'Carteira completa das 163 unidades e leitura resumida por escola.' },
  { to: '/repasses', title: 'Repasses', description: 'Custeio, capital, ajustes, pagamentos, ordens e evidência de crédito por parcela.' },
  { to: '/saldos', title: 'Contas e saldos', description: 'Banco, agência, conta, abertura, ocorrência, saldos e aplicações.' },
  { to: '/evolucao', title: 'Evolução mensal', description: 'Série das posições públicas de saldo e aplicações por referência.' },
  { to: '/movimentacoes', title: 'Movimentações', description: 'Lançamentos do extrato, documento, contraparte, crédito e débito.' },
  { to: '/cadastro', title: 'Cadastro e habilitação', description: 'UEx, CNPJ, alunos, localização, rede, mandato e atualização cadastral.' },
  { to: '/pendencias', title: 'Pendências e suspensões', description: 'Ocorrências por motivo, programa, conta e fonte de origem.' },
  { to: '/prestacao-contas', title: 'Prestação de contas', description: 'Situação por programa, suspensão de pagamento e valor previsto.' },
  { to: '/cobertura', title: 'Cobertura das fontes', description: 'O que foi obtido, o que veio sem registro e o que ficou indisponível.' },
] as const;

export function FinancialTaskLinks() {
  return (
    <nav className="financial-task-links" aria-label="Dimensões disponíveis da inteligência financeira">
      {TASKS.map((task) => (
        <Link className="financial-task-link" key={task.to} to={task.to}>
          <span><strong>{task.title}</strong><small>{task.description}</small></span>
          <span aria-hidden="true">→</span>
        </Link>
      ))}
    </nav>
  );
}
