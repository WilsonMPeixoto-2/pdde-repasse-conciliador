import { describe, expect, test } from 'vitest';
import { temporarySessionWorkflowRef } from '../../api/session';

describe('ref do worker disparado pelo Modo Sessão', () => {
  test('usa ref configurada no ambiente para evitar misturar preview e main', () => {
    expect(temporarySessionWorkflowRef({
      PDDE_SESSION_GITHUB_REF: 'feat/modo-sessao-temporaria-2026',
    })).toBe('feat/modo-sessao-temporaria-2026');
  });

  test('mantém main como fallback explícito para produção', () => {
    expect(temporarySessionWorkflowRef({})).toBe('main');
  });
});
