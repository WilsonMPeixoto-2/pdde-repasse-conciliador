import type {
  HumanFinancialIndicator,
  HumanFinancialPortfolioView,
} from '../application/build-human-financial-view';
import { derivePddeBasicPortfolio } from '../../shared/pdde-basic-monitoring';

export interface HumanFinancialOverviewMetric {
  label: string;
  targetSheet: string;
  value: number | null;
  monetary: boolean;
  accent?: boolean;
}

export interface ConsolidatedFollowUpRow {
  situations: string[];
  sme: string;
  name: string;
  inep: string;
}

function reais(cents: number | null): number | null {
  return cents === null ? null : cents / 100;
}

export function buildOverviewMetrics(
  view: Pick<HumanFinancialPortfolioView, 'metrics' | 'schools'>,
): HumanFinancialOverviewMetric[] {
  const movementCount = view.schools.reduce((schoolTotal, school) => (
    schoolTotal + school.accounts.reduce((accountTotal, account) => (
      accountTotal + account.movements.length
    ), 0)
  ), 0);
  const pddeBasic = derivePddeBasicPortfolio(view.schools);

  return [
    {
      label: 'Escolas',
      targetSheet: 'Escolas',
      value: view.metrics.schoolCount,
      monetary: false,
    },
    {
      label: 'Contas acompanhadas',
      targetSheet: 'Contas e Saldos',
      value: view.metrics.accountsTotal,
      monetary: false,
    },
    {
      label: 'Movimentações em 2026',
      targetSheet: 'Movimentações',
      value: movementCount,
      monetary: false,
    },
    {
      label: 'Previsto',
      targetSheet: 'Repasses',
      value: reais(view.metrics.programmedCents),
      monetary: true,
    },
    {
      label: 'Pagamento informado',
      targetSheet: 'Repasses',
      value: reais(view.metrics.paymentInformedCents),
      monetary: true,
      accent: true,
    },
    {
      label: 'Crédito compatível localizado',
      targetSheet: 'Repasses',
      value: reais(view.metrics.creditLocatedCents),
      monetary: true,
    },
    {
      label: 'Saldo informado mais recente',
      targetSheet: 'Contas e Saldos',
      value: reais(view.metrics.reportedBalanceCents),
      monetary: true,
    },
    {
      label: '1ª parcela PDDE informada',
      targetSheet: 'PDDE Básico',
      value: pddeBasic.firstPaidCount,
      monetary: false,
    },
    {
      label: '2ª parcela PDDE informada',
      targetSheet: 'PDDE Básico',
      value: pddeBasic.secondPaidCount,
      monetary: false,
    },
  ];
}

export function consolidateIndicatorRows(
  indicators: readonly HumanFinancialIndicator[],
): ConsolidatedFollowUpRow[] {
  const rows = new Map<string, ConsolidatedFollowUpRow>();

  for (const indicator of indicators) {
    for (const unit of indicator.units) {
      const existing = rows.get(unit.inep);
      if (existing) {
        if (!existing.situations.includes(indicator.label)) {
          existing.situations.push(indicator.label);
        }
        continue;
      }
      rows.set(unit.inep, {
        situations: [indicator.label],
        sme: unit.sme,
        name: unit.name,
        inep: unit.inep,
      });
    }
  }

  return [...rows.values()].sort((left, right) => (
    left.sme.localeCompare(right.sme)
    || left.name.localeCompare(right.name, 'pt-BR')
    || left.inep.localeCompare(right.inep)
  ));
}

export function formatGeneratedAt(generatedAt: Date): string {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(generatedAt);
  const value = new Map(parts.map((part) => [part.type, part.value]));
  return `${value.get('day')}/${value.get('month')}/${value.get('year')} ${value.get('hour')}:${value.get('minute')}`;
}
