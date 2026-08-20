import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatMoney } from '../format';
import type { HumanPortfolioSchool } from '../types';
import { derivePortfolioSchoolTriage } from '../visual/portfolio-school-triage';

function widthOf(value: number, maximum: number): string {
  if (maximum <= 0 || value <= 0) return '0%';
  return `${Math.min(100, (value / maximum) * 100)}%`;
}

function stageStyle(value: number, maximum: number): CSSProperties {
  return { width: widthOf(value, maximum) };
}

function statusDetail(school: HumanPortfolioSchool): string {
  if (school.paymentSuspended) return 'Prestação com suspensão informada';
  if (school.repasseAccountMissing) return 'Há repasse sem conta exibida';
  if (school.followUpCount > 0) {
    return `${school.followUpCount} ${school.followUpCount === 1 ? 'apontamento' : 'apontamentos'} de acompanhamento`;
  }
  if (school.accountsTotal === 0) return 'Nenhuma conta apresentada';
  if (school.accountsWithReferencePosition < school.accountsTotal) return 'Posição de saldo ainda incompleta';
  return 'Sem apontamentos no retrato atual';
}

function RepasseStages({ school }: { school: HumanPortfolioSchool }) {
  const maximum = Math.max(
    school.programmedCents,
    school.paymentInformedCents,
    school.creditLocatedCents,
    1,
  );

  return (
    <div
      className="portfolio-school__stages"
      role="img"
      aria-label={`Previsto ${formatMoney(school.programmedCents)}; pagamento informado ${formatMoney(school.paymentInformedCents)}; crédito localizado ${formatMoney(school.creditLocatedCents)}.`}
    >
      <div className="portfolio-school__stage">
        <span className="portfolio-school__stage-label">Previsto</span>
        <span className="portfolio-school__bar"><span className="portfolio-school__fill portfolio-school__fill--programmed" style={stageStyle(school.programmedCents, maximum)} /></span>
        <strong>{formatMoney(school.programmedCents)}</strong>
      </div>
      <div className="portfolio-school__stage">
        <span className="portfolio-school__stage-label">Pagamento informado</span>
        <span className="portfolio-school__bar"><span className="portfolio-school__fill portfolio-school__fill--paid" style={stageStyle(school.paymentInformedCents, maximum)} /></span>
        <strong>{formatMoney(school.paymentInformedCents)}</strong>
      </div>
      <div className="portfolio-school__stage">
        <span className="portfolio-school__stage-label">Crédito localizado</span>
        <span className="portfolio-school__bar"><span className="portfolio-school__fill portfolio-school__fill--credit" style={stageStyle(school.creditLocatedCents, maximum)} /></span>
        <strong>{formatMoney(school.creditLocatedCents)}</strong>
      </div>
    </div>
  );
}

function Coverage({ school }: { school: HumanPortfolioSchool }) {
  const triage = derivePortfolioSchoolTriage(school);
  const width = triage.coverageRatio === null ? 0 : Math.min(100, triage.coverageRatio * 100);

  return (
    <div className="portfolio-school__coverage">
      <div className="portfolio-school__coverage-line">
        <strong>{triage.coverageLabel}</strong>
        {school.referenceDate ? <span>{formatDate(school.referenceDate)}</span> : null}
      </div>
      {triage.coverageRatio !== null ? (
        <span className="portfolio-school__coverage-track" aria-hidden="true">
          <span style={{ width: `${width}%` }} />
        </span>
      ) : null}
    </div>
  );
}

export function PortfolioSchoolList({ schools }: { schools: readonly HumanPortfolioSchool[] }) {
  return (
    <div className="portfolio-school-list" role="list">
      <div className="portfolio-school-list__head" aria-hidden="true">
        <span>Unidade</span>
        <span>Fluxo do repasse</span>
        <span>Saldo conhecido</span>
        <span>Cobertura</span>
        <span>Situação</span>
      </div>
      {schools.map((school) => {
        const triage = derivePortfolioSchoolTriage(school);
        return (
          <div className="portfolio-school-list__item" key={school.inep} role="listitem">
            <Link
              className="portfolio-school"
              data-status={triage.status}
              to={`/unidades/${school.inep}`}
              aria-label={`${school.sme} · ${school.name}. ${triage.label}. Abrir prontuário financeiro.`}
            >
              <div className="portfolio-school__identity">
                <span className="portfolio-school__sme">{school.sme}</span>
                <strong>{school.name}</strong>
                <span>INEP {school.inep}</span>
              </div>

              <RepasseStages school={school} />

              <div className="portfolio-school__balance">
                <span className="portfolio-school__mobile-label">Saldo conhecido</span>
                <strong>{formatMoney(school.knownBalanceCents)}</strong>
                <span>{school.knownBalanceCents === null ? 'Sem valor observado na referência' : 'Valor observado na referência'}</span>
              </div>

              <Coverage school={school} />

              <div className="portfolio-school__status">
                <span className="portfolio-school__status-label">{triage.label}</span>
                <small>{statusDetail(school)}</small>
              </div>

              <span className="portfolio-school__arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
