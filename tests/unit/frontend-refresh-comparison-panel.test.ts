import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { RefreshComparisonPanel } from '../../src/product/components/RefreshComparisonPanel';
import type { RefreshComparison } from '../../src/product/refresh-comparison';

const comparison: RefreshComparison = {
  generatedAt: '2026-09-03T13:00:00Z',
  referenceBefore: 'Posição financeira pública disponível até 31/07/2026',
  referenceAfter: 'Posição financeira pública disponível até 31/07/2026',
  referenceChanged: false,
  metrics: [
    { key: 'programmed', label: 'Programado', beforeCents: 218205000, afterCents: 223850200, deltaCents: 5645200, changed: true },
    { key: 'paymentInformed', label: 'Pagamento informado', beforeCents: 82761500, afterCents: 82761500, deltaCents: 0, changed: false },
    { key: 'creditLocated', label: 'Crédito compatível localizado', beforeCents: 40901000, afterCents: 40901000, deltaCents: 0, changed: false },
    { key: 'reportedBalance', label: 'Saldo informado', beforeCents: 164417185, afterCents: 164417185, deltaCents: 0, changed: false },
    { key: 'applications', label: 'Aplicações', beforeCents: 136804522, afterCents: 136804522, deltaCents: 0, changed: false },
  ],
  counts: [
    { key: 'transfers', label: 'Registros de repasse', before: 520, after: 537, delta: 17, changed: true },
    { key: 'accounting', label: 'Registros de prestação de contas', before: 311, after: 325, delta: 14, changed: true },
    { key: 'movements', label: 'Movimentações SIGEF', before: 408, after: 408, delta: 0, changed: false },
    { key: 'registrations', label: 'Cadastros obtidos', before: 0, after: 163, delta: 163, changed: true },
    { key: 'accountOpenings', label: 'Situações de abertura de conta', before: 0, after: 0, delta: 0, changed: false },
    { key: 'suspensions', label: 'Suspensões publicadas', before: 0, after: 0, delta: 0, changed: false },
    { key: 'unavailableSources', label: 'Observações de fonte indisponível', before: 0, after: 163, delta: 163, changed: true },
  ],
  changedSchools: [{ inep: '33069247', sme: '0410001', name: 'EM EMA NEGRAO DE LIMA', financial: true, supplemental: true }],
  financialChangedSchoolCount: 1,
  supplementalChangedSchoolCount: 1,
  unavailableSourceObservations: 163,
  unavailableSourceSchoolCount: 163,
  hasFinancialChange: true,
  hasAnyChange: true,
};

describe('quadro de comparação da consulta', () => {
  test('mostra mudanças e permanências sem esconder fonte indisponível', () => {
    const html = renderToStaticMarkup(createElement(RefreshComparisonPanel, { comparison }));
    expect(html).toContain('O que mudou nesta consulta');
    expect(html).toContain('+ R$&nbsp;56.452,00');
    expect(html).toContain('Sem alteração');
    expect(html).toContain('Sem nova referência publicada');
    expect(html).toContain('17');
    expect(html).toContain('163 ocorrência(s) de fonte indisponível');
  });
});
