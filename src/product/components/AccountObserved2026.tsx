import type { HumanAccount } from '../types';
import { formatDate, formatMoney } from '../format';

function collectionLabel(status: HumanAccount['coverage']['movementCollectionStatus']): string {
  switch (status) {
    case 'COMPLETE': return 'Coleta de movimentações completa';
    case 'PARTIAL': return 'Coleta de movimentações parcial';
    case 'FAILED': return 'Coleta de movimentações com falha';
    case 'NOT_AVAILABLE': return 'Movimentações não disponíveis nesta coleta';
  }
}

function contextualMessages(account: HumanAccount): string[] {
  const messages: string[] = [];
  const flags = new Set(account.contextFlags);

  if (flags.has('MOVEMENT_COLLECTION_PARTIAL')) {
    messages.push('Coleta de movimentações parcial. As ausências de eventos não são conclusivas para esta conta.');
    return messages;
  }
  if (flags.has('MOVEMENT_COLLECTION_FAILED')) {
    messages.push('A coleta de movimentações falhou para esta conta. Não é possível concluir ausência de eventos a partir deste recorte.');
    return messages;
  }

  if (account.coverage.movementCollectionStatus === 'COMPLETE'
    && account.activity.fndeCreditsCents > 0
    && (account.latestPosition?.checkingBalanceCents ?? 0) > 0) {
    messages.push('Crédito observado em 2026; a posição mais recente informa o valor em conta na data indicada.');
  }

  if (flags.has('NONZERO_POSITION_WITHOUT_2026_INFLOW')) {
    messages.push('Há saldo na posição mais recente sem entrada correspondente observada no extrato de 2026. A origem pode estar fora do recorte e requer consulta separada.');
  }

  if (flags.has('NONZERO_APPLICATION_WITHOUT_2026_APPLICATION_EVENT')) {
    messages.push('Há valor aplicado na posição mais recente, mas nenhum evento de aplicação foi observado no extrato de 2026. A origem pode estar fora do recorte e requer consulta separada.');
  }

  return messages;
}

export function AccountObserved2026({ account }: { account: HumanAccount }) {
  const messages = contextualMessages(account);

  return (
    <section className="account-observed-2026" aria-labelledby={`observed-${account.bank}-${account.agency}-${account.account}`}>
      <div className="account-observed-2026__heading">
        <div>
          <div className="eyebrow">Cobertura e atividade</div>
          <h3 id={`observed-${account.bank}-${account.agency}-${account.account}`}>O que foi observado em 2026</h3>
        </div>
        <span className="account-observed-2026__coverage">{collectionLabel(account.coverage.movementCollectionStatus)}</span>
      </div>

      <dl className="account-observed-2026__grid">
        <div><dt>Primeira posição observada</dt><dd>{account.coverage.firstPositionDate ? formatDate(account.coverage.firstPositionDate) : 'Não disponível'}</dd></div>
        <div><dt>Última posição observada</dt><dd>{account.coverage.latestPositionDate ? formatDate(account.coverage.latestPositionDate) : 'Não disponível'}</dd></div>
        <div><dt>Posições publicadas</dt><dd>{account.coverage.positionCount}</dd></div>
        <div><dt>Última movimentação</dt><dd>{account.coverage.latestMovementDate ? formatDate(account.coverage.latestMovementDate) : 'Nenhuma observada'}</dd></div>
        <div><dt>Créditos observados</dt><dd>{formatMoney(account.activity.creditsObservedCents)}</dd></div>
        <div><dt>Débitos observados</dt><dd>{formatMoney(account.activity.debitsObservedCents)}</dd></div>
        <div><dt>Aplicações</dt><dd>{formatMoney(account.activity.applicationsCents)}</dd></div>
        <div><dt>Resgates</dt><dd>{formatMoney(account.activity.redemptionsCents)}</dd></div>
        <div><dt>Pagamentos / transferências</dt><dd>{formatMoney(account.activity.paymentsAndTransfersCents)}</dd></div>
        <div><dt>Rendimentos financeiros</dt><dd>{formatMoney(account.activity.financialIncomeCents)}</dd></div>
      </dl>

      {messages.length > 0 ? (
        <div className="account-observed-2026__notes" aria-label="Contexto da leitura de 2026">
          {messages.map((message) => <p key={message}>{message}</p>)}
        </div>
      ) : null}
    </section>
  );
}
