import { formatMoney } from '../format';
import type { RefreshComparison, RefreshComparisonCount, RefreshComparisonMetric } from '../refresh-comparison';

function monetaryDelta(metric: RefreshComparisonMetric): string {
  if (!metric.changed) return 'Sem alteração';
  if (metric.deltaCents === null) return 'Cobertura alterada';
  if (metric.deltaCents === 0) return 'Sem alteração';
  const sign = metric.deltaCents > 0 ? '+' : '−';
  return `${sign} ${formatMoney(Math.abs(metric.deltaCents))}`;
}

function countDelta(item: RefreshComparisonCount): string {
  if (!item.changed) return 'Sem alteração';
  const sign = item.delta > 0 ? '+' : '−';
  return `${sign}${Math.abs(item.delta)}`;
}

function headline(comparison: RefreshComparison): string {
  if (!comparison.hasAnyChange) {
    return 'As fontes consultadas não apresentaram alterações neste retrato.';
  }
  if (!comparison.hasFinancialChange) {
    return 'Os indicadores financeiros principais permaneceram iguais; houve mudança em informações complementares.';
  }
  return comparison.financialChangedSchoolCount > 0
    ? `A nova consulta encontrou alteração financeira em ${comparison.financialChangedSchoolCount} escola${comparison.financialChangedSchoolCount === 1 ? '' : 's'}.`
    : 'A nova consulta encontrou alteração nos indicadores financeiros consolidados.';
}

export function RefreshComparisonPanel({ comparison }: { comparison: RefreshComparison }) {
  const importantCounts = comparison.counts.filter((item) => (
    item.key === 'transfers'
    || item.key === 'accounting'
    || item.key === 'movements'
    || item.key === 'registrations'
    || item.key === 'accountOpenings'
    || item.key === 'suspensions'
  ));

  return (
    <section className="section refresh-comparison" aria-labelledby="refresh-comparison-title">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Nova consulta</div>
          <h2 id="refresh-comparison-title">O que mudou nesta consulta</h2>
        </div>
        <p>{headline(comparison)}</p>
      </div>

      <div className="refresh-comparison__metrics">
        {comparison.metrics.map((metric) => (
          <article className="refresh-comparison__metric" key={metric.key} data-changed={metric.changed || undefined}>
            <span>{metric.label}</span>
            <strong>{monetaryDelta(metric)}</strong>
            <small>
              Antes {formatMoney(metric.beforeCents)} · Agora {formatMoney(metric.afterCents)}
            </small>
          </article>
        ))}
      </div>

      <div className="refresh-comparison__reference" data-changed={comparison.referenceChanged || undefined}>
        <div>
          <span>Referência pública dos saldos</span>
          <strong>{comparison.referenceChanged ? 'Referência atualizada' : 'Sem nova referência publicada'}</strong>
        </div>
        <small>
          Antes: {comparison.referenceBefore} · Agora: {comparison.referenceAfter}
        </small>
      </div>

      <div className="refresh-comparison__counts">
        {importantCounts.map((item) => (
          <div className="refresh-comparison__count" key={item.key}>
            <span>{item.label}</span>
            <strong>{item.after}</strong>
            <small>{countDelta(item)} · antes {item.before}</small>
          </div>
        ))}
      </div>

      <div className="refresh-comparison__foot">
        <span>
          {comparison.financialChangedSchoolCount} escola(s) com mudança financeira · {' '}
          {comparison.supplementalChangedSchoolCount} com mudança complementar.
        </span>
        {comparison.unavailableSourceObservations > 0 ? (
          <div className="refresh-comparison__unavailable">
            <strong>
              {comparison.unavailableSourceObservations} ocorrência(s) de fonte indisponível em {' '}
              {comparison.unavailableSourceSchoolCount} escola(s). Ausência de fonte não foi tratada como zero nem como regularidade.
            </strong>
            {comparison.unavailableSources.map((item) => (
              <small key={item.dataset}>
                {item.dataset}: {item.schoolCount} escola(s)
              </small>
            ))}
          </div>
        ) : (
          <strong>Nenhuma fonte foi marcada como indisponível na consulta concluída.</strong>
        )}
      </div>
    </section>
  );
}
