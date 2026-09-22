import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import {
  buildPddeInfoPaidMunicipalAttendanceExcelUrl,
  parsePddeInfoAttendanceExcel,
} from '../../backend/adapters/pddeinfo-attendance-excel';

describe('XLSX agregado de Atendimento do PDDEInfo', () => {
  it('usa o recorte oficial 2026 · RJ · Rio · municipal · PDDE · pagos', () => {
    const url = new URL(buildPddeInfoPaidMunicipalAttendanceExcelUrl());
    expect(url.hostname).toBe('webservice.fnde.gov.br');
    expect(url.pathname).toContain('/situacaoatendimentoentidade/');
    expect(url.searchParams.get('an_exercicio')).toBe('2026');
    expect(url.searchParams.get('programas')).toBe('02');
    expect(url.searchParams.get('sg_uf')).toBe('RJ');
    expect(url.searchParams.get('co_municipio_fnde')).toBe('330455');
    expect(url.searchParams.get('esferaAdm')).toBe("'2'");
    expect(url.searchParams.get('stpg')).toBe("'1'");
    expect(url.searchParams.get('tpRelatorio')).toBe('1');
  });

  it('normaliza o XLSX agregado sem depender do layout visual da página', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Atendimento');
    sheet.addRow(['Situação de Atendimento da Entidade']);
    sheet.addRow([]);
    sheet.addRow([
      'Nome da Escola',
      'Cód. da Escola',
      'CNPJ Executora',
      'Programa',
      'Destinação',
      'Qtd. Alunos',
      'Valor Custeio',
      'Valor Capital',
      'Valor Total',
      'Data da Ord. Pagamento',
    ]);
    sheet.addRow([
      '0410001 EM TESTE',
      '33069247',
      '04.500.463/0001-73',
      'PDDE',
      '',
      100,
      1110,
      1665,
      2775,
      '14/09/2026',
    ]);

    const bytes = Buffer.from(await workbook.xlsx.writeBuffer());
    const rows = await parsePddeInfoAttendanceExcel(bytes);

    expect(rows).toEqual([{
      fiscalYear: 2026,
      schoolInep: '33069247',
      uexCnpj: '04500463000173',
      schoolName: '0410001 EM TESTE',
      programName: 'PDDE',
      destination: '',
      studentCount: 100,
      costCents: 111000,
      capitalCents: 166500,
      totalCents: 277500,
      paymentOrderDate: '2026-09-14',
    }]);
  });

  it('falha quando o layout perde as colunas financeiras essenciais', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Atendimento');
    sheet.addRow(['Nome da Escola', 'Cód. da Escola', 'CNPJ Executora']);

    const bytes = Buffer.from(await workbook.xlsx.writeBuffer());

    await expect(parsePddeInfoAttendanceExcel(bytes)).rejects.toThrow(
      /cabeçalho do XLSX agregado/i,
    );
  });
});
