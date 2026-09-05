import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { runMonitoring } from '../../backend/application/run-monitoring';

const temporaryPaths: string[] = [];
afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function workspace(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'pdde-sigef-escalation-'));
  temporaryPaths.push(path);
  return path;
}

const school = { inep: '33069247', sme: '0410001', nome: 'ESCOLA A' };
const pddeAccount = { bank: '001', agency: '0249', number: '0000549789' };
const qualityAccount = { bank: '001', agency: '0249', number: '0000546402' };

const rawSchool = {
  inep: school.inep,
  sme: school.sme,
  nome: school.nome,
  denominacaoFnde: 'ESCOLA A',
  uex: 'CONSELHO ESCOLA COMUNIDADE DA ESCOLA A',
  cnpj: '04.500.463/0001-73',
  accounts: [
    { programa: 'PDDE', banco: '001', agencia: '0249', conta: '0000549789', saldo: '0,00', ocorrencia: '' },
    { programa: 'PDDE QUALIDADE', banco: '001', agencia: '0249', conta: '0000546402', saldo: '3.065,23', ocorrencia: '' },
  ],
  finance: [
    {
      destinacao: 'PDDE / PDDE Básico - 1ª Parcela',
      devidoCusteio: '837,00', devidoCapital: '3.348,00', devidoTotal: '4.185,00',
      ajusteCusteio: '0,00', ajusteCapital: '0,00', ajusteTotal: '0,00',
      finalDevidoTotal: '4.185,00', pagoCusteio: '837,00', pagoCapital: '3.348,00', pagoTotal: '4.185,00',
      data: '05/08/2026',
    },
    {
      destinacao: 'PDDE QUALIDADE / Educação Conectada 2026',
      devidoCusteio: '1.800,00', devidoCapital: '1.528,00', devidoTotal: '3.328,00',
      ajusteCusteio: '0,00', ajusteCapital: '0,00', ajusteTotal: '0,00',
      finalDevidoTotal: '3.328,00', pagoCusteio: '0,00', pagoCapital: '0,00', pagoTotal: '0,00',
      data: '',
    },
  ],
  source: 'https://www.fnde.gov.br/pddeinfo/escola/33069247',
  sourceIdentity: { inep: school.inep, sme: school.sme, denominacao: 'ESCOLA A' },
};

describe('escalada SIGEF orientada por pagamento', () => {
  test('passa requiredThrough somente para a conta/programa com pagamento positivo conhecido', async () => {
    const collectPddeInfoSchool = vi.fn(async () => ({
      school: rawSchool,
      queriedAt: '2026-09-05T08:00:00Z',
      rawBytes: Buffer.from('<html>pddeinfo</html>'),
    }));
    const collectSigefAccount = vi.fn(async (input: any) => ({
      status: 'COMPLETE' as const,
      pagesFetched: 1,
      declaredTotal: 0,
      movements: [],
      coverageThrough: input.programCode === '02' ? '2026-05-28' : '2026-09-01',
    }));

    await runMonitoring({
      schools: [school],
      workspacePath: await workspace(),
      fiscalYear: 2026,
      runId: 'sigef-escalation-2026',
      collectPddeInfoSchool,
      collectSigefAccount,
      now: () => '2026-09-05T08:30:00Z',
    } as never);

    const pddeCall = collectSigefAccount.mock.calls
      .map(([input]) => input)
      .find((input) => input.programCode === '02');
    const qualityCall = collectSigefAccount.mock.calls
      .map(([input]) => input)
      .find((input) => input.programCode === '0B');

    expect(pddeCall).toMatchObject({
      cnpj: '04.500.463/0001-73',
      account: pddeAccount,
      requiredThrough: '2026-08-05',
    });
    expect(qualityCall).toMatchObject({
      cnpj: '04.500.463/0001-73',
      account: qualityAccount,
    });
    expect(qualityCall).not.toHaveProperty('requiredThrough');
  });
});
