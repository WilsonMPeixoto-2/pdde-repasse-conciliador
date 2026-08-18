import { Link } from 'react-router-dom';
import { formatMoneyCompact } from '../format';
import type { HumanPortfolio } from '../types';
import {
  derivePortfolioExecutiveSummary,
  type PortfolioStatusCounts,
} from '../visual/portfolio-executive-summary';
import type { PortfolioSchoolStatus } from '../visual/portfolio-school-triage';

const STATUS_LABELS: Array<{ key: PortfolioSchoolStatus; label: string }> = [
  { key: 'suspended', label: 'Pagamento suspenso' },
  { key: 'attention', label: 'Acompanhamento' },
  { key: 'no_accounts', label: 'Sem conta apresentada' },
  { key: 'partial', label: 'Cobertura parcial' },
  { key: 'ready', label: 'Leitura disponível' },
];

function unitLabel(value: number): string {
  return `${value} ${value === 1 ? 'unidade' : 'unidades'}`;
}

function statusRows(counts: PortfolioStatusCounts) {
  return STATUS_LABELS.map((item) => ({ ...item, count: counts[item.key] }));
}

export function PortfolioExecutiveOverview({ portfolio }: { portfolio: HumanPortfolio }) {
  const summary = derivePortfolioExecutiveSummary(portfolio);
  const largestStage = Math.max(
    1,
    ...summary.evidenceStages.map((stage) => stage.valueCents),
  );

  return (
    <section className="section portfolio-executive" aria-labelledby="portfolio-executive-title">
      <div className="section-heading portfolio-executive__heading">
        <div>
          <div className="eyebrow">Leitura executiva</div>
          <h2 id="portfolio-executive-title">Leitura executiva da carteira</h2>
        </div>
        <p>
          Um resumo para localizar rapidamente diferenças entre estágios financeiros,
          cobertura de dados e unidades que merecem consulta mais próxima.
        </p>
      </div>

      <div className="portfolio-executive__grid">
        <article className="portfolio-executive__panel" aria-labelledby="executive-flow-title">
          <div className="portfolio-executive__panel-heading">
            <div>
              <span className="portfolio-executive__kicker">Valores observados</span>
              <h3 id="executive-flow-title">Fluxo de evidência financeira</h3>
            </div>
          </div>

          <div className="portfolio-executive__stages">
            {summary.evidenceStages.map((stage) => {
              const width = stage.valueCents === 0
                ? 0
                : (stage.valueCents / largestStage) * 100;
              return (
                <div className="portfolio-executive__stage" data-stage={stage.key} key={stage.key}>
                  <div className="portfolio-executive__stage-copy">
                    <span>{stage.label}</span>
                    <strong>{formatMoneyCompact(stage.valueCents)}</strong>
                  </div>
                  <span className="portfolio-executive__track" aria-hidden="true">
                    <span style={{ width: `${width}%` }} />
                  </span>
                </div>
              );
            })}
          </div>

          <p className="portfolio-executive__note">
            Os comprimentos apenas comparam valores absolutos observados nesta consulta.
            Cada etapa continua sendo uma evidência distinta.
          </p>
        </article>

        <article className="portfolio-executive__panel" aria-labelledby="executive-coverage-title">
          <div className="portfolio-executive__panel-heading">
            <div>
              <span className="portfolio-executive__kicker">Cobertura e atenção</span>
              <h3 id="executive-coverage-title">Cobertura da carteira</h3>
            </div>
          </div>

          <div className="portfolio-executive__coverage-summary">
            <div>
              <strong>{summary.attentionCount}</strong>
              <span>{unitLabel(summary.attentionCount).replace(/^\d+\s/, '')} com atenção</span>
            </div>
            <div>
              <strong>{summary.coverageIncompleteCount}</strong>
              <span>com cobertura incompleta</span>
            </div>
          </div>
          <p className="portfolio-executive__coverage-sentence">
            {unitLabel(summary.attentionCount)} com atenção · {summary.coverageIncompleteCount} com cobertura incompleta
          </p>

          <div className="portfolio-executive__status-list" aria-label="Distribuição das unidades por situação">
            {statusRows(summary.statusCounts).map((item) => (
              <div className="portfolio-executive__status" data-status={item.key} key={item.key}>
                <span className="portfolio-executive__status-marker" aria-hidden="true" />
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>

          <Link className="text-link portfolio-executive__coverage-link" to="/unidades">
            Abrir carteira completa
          </Link>
        </article>
      </div>

      <div className="portfolio-executive__priorities" aria-labelledby="executive-priorities-title">
        <div className="portfolio-executive__priorities-heading">
          <div>
            <span className="portfolio-executive__kicker">Triagem</span>
            <h3 id="executive-priorities-title">Prioridades do momento</h3>
          </div>
          <Link className="text-link" to="/unidades">Ver todas as unidades</Link>
        </div>

        {summary.prioritySchools.length > 0 ? (
          <div className="portfolio-executive__priority-list">
            {summary.prioritySchools.map(({ school, triage }) => (
              <Link
                className="portfolio-executive__priority"
                data-status={triage.status}
                key={school.inep}
                to={`/unidades/${school.inep}`}
              >
                <span className="portfolio-executive__priority-status">{triage.label}</span>
                <span className="portfolio-executive__priority-school">
                  <strong>{school.sme} · {school.name}</strong>
                  <span>INEP {school.inep}</span>
                </span>
                <span className="portfolio-executive__priority-reason">
                  {triage.reasons[0] ?? 'Sem apontamento adicional nesta leitura.'}
                </span>
                <span className="portfolio-executive__priority-coverage">{triage.coverageLabel}</span>
                <span className="portfolio-executive__priority-arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="portfolio-executive__empty">Nenhuma unidade exige atenção no retrato atual.</p>
        )}
      </div>
    </section>
  );
}
