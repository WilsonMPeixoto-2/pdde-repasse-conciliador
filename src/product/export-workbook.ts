import type { HumanFinancialPortfolioView, HumanFinancialSchoolView } from '../../backend/application/build-human-financial-view';
import type { HumanPortfolio, HumanSchool } from './types';

export const HUMAN_WORKBOOK_FILENAME = 'inteligencia-financeira-pdde-4cre-2026.xlsx';
const HUMAN_WORKBOOK_MEDIA_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function buildCurrentWorkbookView(
  portfolio: HumanPortfolio,
  schools: readonly HumanSchool[],
): HumanFinancialPortfolioView {
  if (schools.length !== portfolio.schoolCount) {
    throw new Error('A planilha não pode ser gerada porque a cobertura escolar está incompleta.');
  }

  const schoolsByInep = new Map(schools.map((school) => [school.school.inep, school]));
  const orderedSchools: HumanFinancialSchoolView[] = portfolio.schools.map((summary) => {
    const school = schoolsByInep.get(summary.inep);
    if (!school) {
      throw new Error(`A unidade ${summary.inep} não está disponível para gerar a planilha.`);
    }
    const { fiscalYear: _fiscalYear, ...humanSchool } = school;
    return humanSchool;
  });

  return {
    title: portfolio.title,
    fiscalYear: portfolio.fiscalYear,
    referenceLabel: portfolio.referenceLabel,
    metrics: portfolio.metrics,
    sources: portfolio.sources,
    indicators: portfolio.indicators,
    schools: orderedSchools,
  };
}

export async function downloadCurrentWorkbook(
  portfolio: HumanPortfolio,
  schools: readonly HumanSchool[],
  generatedAt?: string | null,
): Promise<void> {
  const { buildHumanFinancialWorkbook } = await import('../../backend/report/human-financial-workbook');
  const parsedGeneratedAt = generatedAt ? new Date(generatedAt) : new Date();
  const workbook = buildHumanFinancialWorkbook(
    buildCurrentWorkbookView(portfolio, schools),
    { generatedAt: Number.isNaN(parsedGeneratedAt.getTime()) ? new Date() : parsedGeneratedAt },
  );
  const bytes = await workbook.xlsx.writeBuffer();
  const blob = new Blob([bytes as BlobPart], { type: HUMAN_WORKBOOK_MEDIA_TYPE });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  try {
    anchor.href = url;
    anchor.download = HUMAN_WORKBOOK_FILENAME;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
