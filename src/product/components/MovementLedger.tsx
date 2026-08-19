import { useMemo } from 'react';
import { formatDate, formatMoney } from '../format';
import type { HumanSchool } from '../types';
import { buildMovementLedger, type MovementLedgerEntry } from '../visual/movement-ledger';

type HumanMovement = HumanSchool['accounts'][number]['movements'][number];

function counterpartyLines(counterparty: HumanMovement['counterparty']): string[] {
  if (!counterparty) return [];
  const identity = [counterparty.name, counterparty.document ? `Doc. ${counterparty.document}` : null]
    .filter((value): value is string => Boolean(value));
  const banking = [
    counterparty.bank ? `Banco ${counterparty.bank}` : null,
    counterparty.agency ? `Ag. ${counterparty.agency}` : null,
    counterparty.account ? `Conta ${counterparty.account}` : null,
  ].filter((value): value is string => Boolean(value));
  return [identity.join(' · '), banking.join(' · ')].filter(Boolean);
}

function amountLabel(entry: MovementLedgerEntry) {
  if (entry.direction === 'credit' && entry.signedAmountCents !== null) {
    return (
      <span className="movement-ledger__amount movement-ledger__amount--credit">
        <small>Crédito</small>
        <strong>+ {formatMoney(entry.signedAmountCents)}</strong>
      </span>
    );
  }
  if (entry.direction === 'debit' && entry.signedAmountCents !== null) {
    return (
      <span className="movement-ledger__amount movement-ledger__amount--debit">
        <small>Débito</small>
        <strong>− {formatMoney(Math.abs(entry.signedAmountCents))}</strong>
      </span>
    );
  }
  if (entry.direction === 'ambiguous') {
    return (
      <span className="movement-ledger__amount movement-ledger__amount--ambiguous">
        <small>Crédito e débito na mesma linha</small>
        <strong>
          {formatMoney(entry.creditCents)} / {formatMoney(entry.debitCents)}
        </strong>
      </span>
    );
  }
  return (
    <span className="movement-ledger__amount movement-ledger__amount--none">
      <small>Valor</small>
      <strong>Não informado</strong>
    </span>
  );
}

export function MovementLedger(props: { movements: readonly HumanMovement[]; id?: string }) {
  const model = useMemo(() => buildMovementLedger(props.movements), [props.movements]);

  return (
    <section id={props.id} className="movement-ledger" aria-label="Movimentações financeiras da conta">
      <div className="movement-ledger__heading">
        <div>
          <span className="movement-ledger__eyebrow">Extrato disponível</span>
          <h3>Movimentações financeiras</h3>
          <p>{model.totals.count} {model.totals.count === 1 ? 'movimento apresentado' : 'movimentos apresentados'} nesta consulta.</p>
        </div>
      </div>

      <div className="movement-ledger__summary" aria-label="Resumo dos movimentos apresentados">
        <div>
          <span>Créditos observados</span>
          <strong>{formatMoney(model.totals.creditsCents)}</strong>
        </div>
        <div>
          <span>Débitos observados</span>
          <strong>{formatMoney(model.totals.debitsCents)}</strong>
        </div>
        <div>
          <span>Diferença no recorte</span>
          <strong>{model.totals.differenceCents >= 0 ? '+' : '−'} {formatMoney(Math.abs(model.totals.differenceCents))}</strong>
        </div>
      </div>

      <p className="movement-ledger__reading-note">
        Créditos e débitos descrevem movimentos da conta e não equivalem, por si só, a receita e despesa. Aplicações e resgates são mantidos como transferências entre disponibilidades e investimentos. A diferença acima não representa o saldo da conta.
      </p>

      <div className="movement-ledger__rows">
        {model.entries.map((entry, index) => {
          const movement = entry.movement;
          const counterparty = counterpartyLines(movement.counterparty);
          return (
            <article
              className="movement-ledger__row"
              data-kind={entry.kind}
              data-direction={entry.direction}
              key={`${movement.date}-${movement.document ?? movement.description}-${index}`}
            >
              <time className="movement-ledger__date" dateTime={movement.date}>{formatDate(movement.date)}</time>
              <span className="movement-ledger__marker" aria-hidden="true" />
              <div className="movement-ledger__body">
                <span className="movement-ledger__kind">{entry.label}</span>
                <strong className="movement-ledger__description">{movement.description}</strong>
                {counterparty.map((line) => <span className="movement-ledger__meta" key={line}>{line}</span>)}
                {movement.document ? <span className="movement-ledger__meta">Documento da movimentação: {movement.document}</span> : null}
              </div>
              {amountLabel(entry)}
            </article>
          );
        })}
      </div>
    </section>
  );
}
