import ExcelJS from 'exceljs';
import { describe, expect, test } from 'vitest';
import type { ReleaseAssistantResult } from '../../backend/application/assist-sigef-release-exports';

const subjectUrl = new URL(
  '../../backend/report/release-assistant-workbook.ts',
  import.meta.url,
).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function resultFixture(): ReleaseAssistantResult {
  return {
    generatedAt: '2026-08-12T10:00:00-03:00',
    fiscalYear: 2026,
    workspace: {
      root: '/tmp/coleta',
      originalsDirectory: '/tmp/coleta/originais',
      releasesDirectory: '/tmp/coleta/liberacoes',
      controlDirectory: '/tmp/coleta/controle',
      controlWorkbookPath: '/tmp/coleta/controle/controle-liberacoes-2026.xlsx',
    },
    summary: {
      schools: 2,
      expectedPairs: 2,
      availablePairs: 1,
      missingPairs: 1,
      processedFiles: 2,
      conflicts: 1,
      errors: 0,
    },
    files: [
      {
        sourcePath: '/tmp/coleta/arquivo.xls',
        sha256: 'a'.repeat(64),
        status: 'IMPORTADO',
        cnpj: '11111111000191',
        programCode: '02',
        queryDate: '2026-08-12',
        originalPath: '/tmp/coleta/originais/02/original.xls',
        canonicalPath: '/tmp/coleta/liberacoes/11111111000191__02.xls',
      },
      {
        sourcePath: '/tmp/coleta/conflito.xls',
        sha256: 'b'.repeat(64),
        status: 'CONFLITO',
        cnpj: '11111111000191',
        programCode: '02',
        queryDate: '2026-08-12',
        originalPath: '/tmp/coleta/originais/02/conflito.xls',
        canonicalPath: '/tmp/coleta/liberacoes/11111111000191__02.xls',
        message: '=CONTEUDO NAO DEVE VIRAR FORMULA',
      },
    ],
    coverage: [
      {
        sme: '0431001',
        schoolName: 'ESCOLA A',
        cnpj: '11111111000191',
        programCode: '02',
        status: 'DISPONIVEL',
        canonicalPath: '/tmp/coleta/liberacoes/11111111000191__02.xls',
        queryDate: '2026-08-12',
        records: 1,
      },
      {
        sme: '0431002',
        schoolName: 'ESCOLA B',
        cnpj: '22222222000182',
        programCode: '0B',
        status: 'FALTANTE',
        canonicalPath: '/tmp/coleta/liberacoes/22222222000182__0B.xls',
      },
    ],
    pending: [
      {
        kind: 'PAR_FALTANTE',
        cnpj: '22222222000182',
        programCode: '0B',
        message: 'Falta a exportação.',
      },
      {
        kind: 'CONFLITO',
        cnpj: '11111111000191',
        programCode: '02',
        sourcePath: '/tmp/coleta/conflito.xls',
        message: '=CONTEUDO NAO DEVE VIRAR FORMULA',
      },
    ],
  };
}

describe('buildReleaseAssistantWorkbook', () => {
  test('gera as quatro abas de controle com os dados consolidados', async () => {
    const module = await loadSubject();
    expect(module, 'o relatório do Assistente ainda não foi implementado').not.toBeNull();
    if (!module) return;
    const buffer = await (module.buildReleaseAssistantWorkbook as Function)(resultFixture());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Resumo', 'Cobertura', 'Arquivos', 'Pendências',
    ]);
    const resumo = workbook.getWorksheet('Resumo')!;
    expect(resumo.getCell('B4').value).toBe(2);
    expect(resumo.getCell('B5').value).toBe(2);
    expect(resumo.getCell('B6').value).toBe(1);
    expect(resumo.getCell('B7').value).toBe(1);

    const cobertura = workbook.getWorksheet('Cobertura')!;
    expect(cobertura.rowCount).toBe(3);
    expect(cobertura.getCell('E2').value).toBe('02');
    expect(cobertura.getCell('F3').value).toBe('FALTANTE');

    const arquivos = workbook.getWorksheet('Arquivos')!;
    expect(arquivos.rowCount).toBe(3);
    expect(arquivos.getCell('F3').value).toBe('CONFLITO');

    const pendencias = workbook.getWorksheet('Pendências')!;
    expect(pendencias.rowCount).toBe(3);
  });

  test('neutraliza textos que o Excel poderia interpretar como fórmula', async () => {
    const module = await loadSubject();
    expect(module).not.toBeNull();
    if (!module) return;
    const buffer = await (module.buildReleaseAssistantWorkbook as Function)(resultFixture());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const arquivos = workbook.getWorksheet('Arquivos')!;
    const pendencias = workbook.getWorksheet('Pendências')!;

    expect(arquivos.getCell('J3').value).toBe("'=CONTEUDO NAO DEVE VIRAR FORMULA");
    expect(pendencias.getCell('E3').value).toBe("'=CONTEUDO NAO DEVE VIRAR FORMULA");
    for (const sheet of workbook.worksheets) {
      sheet.eachRow((row) => row.eachCell((cell) => {
        expect(cell.value && typeof cell.value === 'object' && 'formula' in cell.value).toBe(false);
      }));
    }
  });
});
