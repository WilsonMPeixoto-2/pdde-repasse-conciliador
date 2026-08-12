import type { PddeInfoNormalizationResult } from '../adapters/pddeinfo-normalizer';
import type { SigefMovementCsvResult } from '../adapters/sigef-movements-csv';
import type { SigefReleaseHtmlResult } from '../adapters/sigef-releases-html';
import { canonicalCnpj, canonicalProgramCode } from '../core/normalization';
import {
  reconcilePortfolio,
  type PortfolioReconciliationResult,
} from '../core/portfolio-reconciliation';

export interface ReconciliationPipelineInput {
  pddeInfo: PddeInfoNormalizationResult;
  releaseExports: SigefReleaseHtmlResult[];
  movements: SigefMovementCsvResult;
}

function releaseExportKey(item: SigefReleaseHtmlResult): string {
  return [
    canonicalCnpj(item.entity.cnpj),
    item.query.fiscalYear,
    canonicalProgramCode(item.query.programCode),
  ].join(':');
}

function assertUniqueIds(ids: string[], label: string): void {
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Há ${label} com identificador duplicado.`);
  }
}

function validatePipelineInput(input: ReconciliationPipelineInput): void {
  if (!input?.pddeInfo || !Array.isArray(input.releaseExports) || !input.movements) {
    throw new Error('Entradas da conciliação ausentes ou inválidas.');
  }
  if (input.pddeInfo.source.source !== 'PDDEINFO') {
    throw new Error('A normalização principal não possui fonte PDDEInfo.');
  }
  if (input.movements.source.source !== 'SIGEF_MOVIMENTACOES') {
    throw new Error('A movimentação não possui fonte SIGEF Movimentações.');
  }

  const fiscalYears = new Set(input.pddeInfo.payments.map((payment) => payment.fiscalYear));
  if (fiscalYears.size > 1) {
    throw new Error('Uma execução deve conter um único exercício financeiro.');
  }
  const fiscalYear = fiscalYears.values().next().value as number | undefined;
  const exportKeys = new Set<string>();
  for (const item of input.releaseExports) {
    if (item.source.source !== 'SIGEF_LIBERACOES') {
      throw new Error(`A exportação ${releaseExportKey(item)} não possui fonte SIGEF Liberações.`);
    }
    if (fiscalYear !== undefined && item.query.fiscalYear !== fiscalYear) {
      throw new Error(
        `A exportação ${releaseExportKey(item)} pertence a exercício diferente da carteira.`,
      );
    }
    const key = releaseExportKey(item);
    if (exportKeys.has(key)) {
      throw new Error(`Exportação de Liberações duplicada para ${key}.`);
    }
    exportKeys.add(key);
    for (const release of item.releases) {
      if (canonicalCnpj(release.schoolCnpj) !== canonicalCnpj(item.entity.cnpj)
        || release.fiscalYear !== item.query.fiscalYear
        || canonicalProgramCode(release.programCode)
          !== canonicalProgramCode(item.query.programCode)) {
        throw new Error(`A liberação ${release.id} diverge dos filtros da exportação ${key}.`);
      }
    }
  }

  assertUniqueIds(input.pddeInfo.payments.map((payment) => payment.id), 'pagamentos PDDEInfo');
  assertUniqueIds(
    input.releaseExports.flatMap((item) => item.releases.map((release) => release.id)),
    'liberações SIGEF',
  );
  assertUniqueIds(input.movements.movements.map((movement) => movement.id), 'movimentos SIGEF');
}

export function assembleReconciliationPortfolio(
  input: ReconciliationPipelineInput,
): PortfolioReconciliationResult {
  validatePipelineInput(input);
  return reconcilePortfolio({
    payments: input.pddeInfo.payments,
    releases: input.releaseExports.flatMap((item) => item.releases),
    movements: input.movements.movements,
    sources: {
      pddeInfo: input.pddeInfo.source,
      sigefMovements: input.movements.source,
      sigefReleases: input.releaseExports.map((item) => ({
        schoolCnpj: item.entity.cnpj,
        programCode: item.query.programCode,
        snapshot: item.source,
      })),
    },
  });
}
