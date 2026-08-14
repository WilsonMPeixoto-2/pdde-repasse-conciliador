import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { runMonitoring } from '../../backend/application/run-monitoring';

const temporaryPaths: string[] = [];
afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

const school = { inep: '33069247', sme: '0410001', nome: 'ESCOLA A' };

const rawSchool = {
  inep: school.inep,
  sme: school.sme,
  nome: school.nome,
  denominacaoFnde: 'ESCOLA A',
  uex: 'CONSELHO ESCOLA COMUNIDADE DA ESCOLA A',
  cnpj: '01.872.287/0001-02',
  accounts: [{
    programa: 'PDDE QUALIDADE',
    banco: '001',
    agencia: '0249',
    conta: '0000555215',
    saldo: '13.000,00',
    ocorrencia: '',
  }],
  finance: [{
    destinacao: 'PDDE QUALIDADE / EDUCAÇÃO CONECTADA 2026',
    devidoCusteio: '13.000,00',
    devidoCapital: '0,00',
    devidoTotal: '13.000,00',
    ajusteCusteio: '0,00',
    ajusteCapital: '0,00',
    ajusteTotal: '0,00',
    finalDevidoTotal: '13.000,00',
    pagoCusteio: '13.000,00',
    pagoCapital: '0,00',
    pagoTotal: '13.000,00',
    data: '12/05/2026',
  }],
  source: 'https://www.fnde.gov.br/pddeinfo/escola/33069247',
  sourceIdentity: {
    inep: school.inep,
    sme: school.sme,
    denominacao: 'ESCOLA A',
  },
};

const movement2025 = {
  id: 'mov-2025',
  schoolCnpj: '01872287000102',
  programCode: '0B',
  operation: 'debit' as const,
  amountCents: 100,
  movementDate: '2025-12-31',
  account: { bank: '001', agency: '0249', number: '0000555215' },
  document: 'HIST',
  history: 'APLICACAO EM BB FIX',
  classification: 'APLICACAO_FINANCEIRA' as const,
  counterparty: { document: null, name: null, bank: null, agency: null, account: null },
  sourceUrl: 'https://www.fnde.gov.br/sigefweb/extrato',
};

const movement2026 = {
  id: 'mov-2026',
  schoolCnpj: '01872287000102',
  programCode: '0B',
  operation: 'credit' as const,
  amountCents: 1_300_000,
  movementDate: '2026-05-12',
  account: { bank: '001', agency: '0249', number: '0000555215' },
  document: '00000002229445000096',
  history: 'ORDEM BANCARIA',
  classification: 'REPASSE_FNDE' as const,
  counterparty: {
    document: '00378257000181',
    name: 'FUNDO NACIONAL DE DESENVOLVIMENTO DA EDUCACAO',
    bank: '001',
    agency: '1607',
    account: '0997380845',
  },
  sourceUrl: 'https://www.fnde.gov.br/sigefweb/extrato',
};

async function workspace(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'pdde-monitoring-'));
  temporaryPaths.push(path);
  return path;
}

function pddeCollector() {
  return vi.fn(async () => ({
    school: rawSchool,
    queriedAt: '2026-08-14T18:00:00Z',
    rawBytes: Buffer.from('<html>pddeinfo</html>'),
  }));
}

function sigefCollector(status: 'COMPLETE' | 'PARTIAL' = 'COMPLETE') {
  return vi.fn(async () => ({
    status,
    pagesFetched: 1,
    declaredTotal: 2,
    movements: [movement2025, movement2026],
    coverageThrough: '2026-08-14',
  }));
}

describe('runMonitoring', () => {
  test('bloqueia qualquer exercício diferente de 2026', async () => {
    await expect(runMonitoring({
      schools: [school],
      workspacePath: await workspace(),
      fiscalYear: 2025,
      runId: 'monitoring-2025',
      collectPddeInfoSchool: pddeCollector(),
      collectSigefAccount: sigefCollector(),
    } as never)).rejects.toThrow(/2026|exercício/i);
  });

  test('produz monitor bruto, visão operacional e visão fiscal usando apenas movimentos de 2026', async () => {
    const result = await runMonitoring({
      schools: [school],
      workspacePath: await workspace(),
      fiscalYear: 2026,
      runId: 'monitoring-2026',
      collectPddeInfoSchool: pddeCollector(),
      collectSigefAccount: sigefCollector(),
      now: () => '2026-08-14T18:30:00Z',
    } as never) as any;

    expect(result.status).toBe('COMPLETE');
    expect(result.raw.fiscalYear).toBe(2026);
    expect(result.raw.schools).toHaveLength(1);
    expect(result.raw.schools[0].accounts[0].uniqueMovements).toBe(2);
    expect(result.raw.schools[0].accounts[0].movements).toEqual([movement2026]);
    expect(result.raw.summary.movimentosHistoricosExtraidos).toBe(2);
    expect(result.raw.summary.movimentosDoExercicio).toBe(1);

    expect(result.operational.repasses).toHaveLength(1);
    expect(result.operational.repasses[0]).toMatchObject({
      bankCreditStatus: 'CREDITO_CONFIRMADO',
      bankCreditDate: '2026-05-12',
      bankCreditAmountCents: 1_300_000,
    });
    expect(result.operational.movements.map((item: any) => item.movementDate)).toEqual(['2026-05-12']);

    expect(result.fiscal.schools).toHaveLength(1);
    expect(result.fiscal.schools[0].repasses[0].installments[0].bankCredit.presentationStatus)
      .toBe('CREDITO_LOCALIZADO');
    expect(result.fiscal.schools[0].statements[0].entries.map((entry: any) => entry.date))
      .toEqual(['2026-05-12']);
  });

  test('propaga cobertura parcial do SIGEF sem transformar ausência em zero conclusivo', async () => {
    const result = await runMonitoring({
      schools: [school],
      workspacePath: await workspace(),
      fiscalYear: 2026,
      runId: 'monitoring-parcial',
      collectPddeInfoSchool: pddeCollector(),
      collectSigefAccount: sigefCollector('PARTIAL'),
      now: () => '2026-08-14T18:30:00Z',
    } as never) as any;

    expect(result.status).toBe('PARTIAL');
    expect(result.raw.coverage.mappedAccountsPartial).toBe(1);
    expect(result.fiscal.schools[0].statements[0].collectionStatus).toBe('PARTIAL');
    expect(result.fiscal.schools[0].repasses[0].installments[0].bankCredit.presentationStatus)
      .toBe('CONSULTA_DA_CONTA_INCONCLUSIVA');
  });
});
