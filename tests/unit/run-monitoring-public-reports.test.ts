import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { runFinancialIntelligenceMonitoring } from '../../backend/application/run-financial-intelligence-monitoring';

const temporaryPaths: string[] = [];
afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

const school = { inep: '33069247', sme: '0410001', nome: 'ESCOLA A' };
const rawSchool = {
  inep: school.inep,
  sme: school.sme,
  nome: school.nome,
  denominacaoFnde: school.nome,
  uex: 'CONSELHO ESCOLA COMUNIDADE DA ESCOLA A',
  cnpj: '04.500.463/0001-73',
  accounts: [{
    programa: 'PDDE QUALIDADE', banco: '001', agencia: '0249', conta: '0000546402',
    saldo: '3.186,99', ocorrencia: '',
  }],
  finance: [],
  source: 'https://www.fnde.gov.br/pddeinfo/escola/33069247',
  sourceIdentity: { inep: school.inep, sme: school.sme, denominacao: school.nome },
};

async function workspace(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'pdde-monitoring-public-'));
  temporaryPaths.push(path);
  return path;
}

const publicResult = {
  attendance: [{
    fiscalYear: 2026 as const,
    schoolInep: school.inep,
    uexCnpj: '04500463000173',
    schoolName: school.nome,
    programName: 'PDDE',
    destination: 'PDDE Básico - 1ª Parcela',
    costCents: 83700,
    capitalCents: 334800,
    totalCents: 418500,
    paymentOrderDate: '2026-08-04',
  }],
  accounting: [{
    fiscalYear: 2026 as const,
    programName: 'PDDE',
    schoolInep: school.inep,
    uexCnpj: '04500463000173',
    accountingStatus: 'Aguardando análise',
    paymentSuspended: false,
    expectedTotalCents: 418500,
  }],
  balances: [{
    schoolIneps: [school.inep],
    coverageThrough: '2026-06-30',
    uexCnpj: '04500463000173',
    bank: '001', agency: '0249', account: '0000546402', programName: 'PDDE QUALIDADE',
    checkingBalanceCents: 0,
    fundBalanceCents: 318699,
    savingsBalanceCents: 0,
    rdbCdbBalanceCents: 0,
    investmentBalanceCents: 318699,
    totalReportedBalanceCents: 318699,
  }],
  failures: [],
  artifacts: [],
  balanceReferenceMonth: '06-2026',
  coverageThrough: '2026-06-30',
};

function monitoringDependencies(publicCollector: ReturnType<typeof vi.fn>) {
  return {
    schools: [school],
    fiscalYear: 2026,
    collectPddeInfoSchool: vi.fn(async () => ({
      school: rawSchool,
      queriedAt: '2026-08-15T22:00:00Z',
      rawBytes: Buffer.from('<html>pddeinfo</html>'),
    })),
    collectSigefAccount: vi.fn(async () => ({
      status: 'COMPLETE' as const,
      pagesFetched: 0,
      declaredTotal: 0,
      movements: [],
      coverageThrough: '2026-08-15',
    })),
    collectPddeInfoPublicPortfolio: publicCollector,
    now: () => '2026-08-15T22:30:00Z',
  };
}

describe('MONITORING + relatórios públicos FNDE', () => {
  test('incorpora dados públicos, pede todas as posições de 2026 e produz uma saída humana separada', async () => {
    const publicCollector = vi.fn(async () => publicResult);
    const result = await runFinancialIntelligenceMonitoring({
      ...monitoringDependencies(publicCollector),
      workspacePath: await workspace(),
      runId: 'monitoring-public-reports',
    } as never) as any;

    expect(publicCollector).toHaveBeenCalledOnce();
    expect(publicCollector).toHaveBeenCalledWith(expect.objectContaining({
      fiscalYear: 2026,
      balanceMode: 'ALL_AVAILABLE_2026',
    }));
    expect(result.raw.publicReports.balanceReferenceMonth).toBe('06-2026');
    expect(result.raw.publicReports.balances[0].fundBalanceCents).toBe(318699);
    expect(result.human.title).toBe('Inteligência Financeira PDDE | 4ª CRE');
    expect(result.human.referenceLabel).toContain('30/06/2026');
    expect(result.human.schools[0].accounting[0].status).toBe('Aguardando análise');

    const humanOnDisk = JSON.parse(await readFile(result.paths.human, 'utf8'));
    expect(humanOnDisk.title).toBe('Inteligência Financeira PDDE | 4ª CRE');
    const serialized = JSON.stringify(humanOnDisk).toLowerCase();
    expect(serialized).not.toContain('sourceurl');
    expect(serialized).not.toContain('pagesfetched');
    expect(serialized).not.toContain('technicalclassification');
  });

  test('preserva LATEST somente quando o chamador o solicita explicitamente', async () => {
    const publicCollector = vi.fn(async () => publicResult);
    await runFinancialIntelligenceMonitoring({
      ...monitoringDependencies(publicCollector),
      workspacePath: await workspace(),
      runId: 'monitoring-public-reports-latest',
      balanceMode: 'LATEST',
    } as never);

    expect(publicCollector).toHaveBeenCalledWith(expect.objectContaining({
      balanceMode: 'LATEST',
    }));
  });
});