import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="page empty-state">
      <div>
        <strong>Página não encontrada.</strong>
        <p>O caminho informado não corresponde a uma área da plataforma.</p>
        <Link className="text-link" to="/">Voltar à visão geral</Link>
      </div>
    </main>
  );
}
