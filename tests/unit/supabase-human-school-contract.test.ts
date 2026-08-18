import { describe, expect, test } from 'vitest';
import { SupabaseInstitutionalReadRepository } from '../../backend/adapters/supabase-institutional-read-repository';

type Result = { data: unknown[]; error: null };

class SingleRowQuery implements PromiseLike<Result> {
  constructor(private readonly row: unknown) {}
  select() { return this; }
  eq() { return this; }
  limit() { return this; }
  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    _onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({ data: [this.row], error: null }).then(onfulfilled ?? undefined);
  }
}

function client(snapshot: unknown) {
  return {
    from(table: string) {
      if (table !== 'current_human_financial_schools') throw new Error(`Tabela inesperada: ${table}`);
      return new SingleRowQuery({ snapshot });
    },
  };
}

const validSnapshot = {
  fiscalYear: 2026,
  runId: 'human-school-contract-run',
  school: {
    inep: '33069247',
    sme: '0410001',
    name: 'EM EMA NEGRAO DE LIMA',
    uex: 'CEC EMA NEGRAO DE LIMA',
    cnpj: '01872287000102',
  },
  programs: [],
  accounts: [],
  accounting: [],
  followUp: [],
};

describe('contrato do prontuário humano persistido no Supabase', () => {
  test('aceita um prontuário completo válido', async () => {
    const repository = new SupabaseInstitutionalReadRepository(client(validSnapshot));
    await expect(repository.getCurrentHumanSchool('33069247')).resolves.toEqual(validSnapshot);
  });

  test('rejeita conteúdo interno malformado em vez de atravessar arrays unknown', async () => {
    const malformed = {
      ...validSnapshot,
      programs: [{ qualquerCoisa: 'isto não é um programa financeiro' }],
    };
    const repository = new SupabaseInstitutionalReadRepository(client(malformed));

    await expect(repository.getCurrentHumanSchool('33069247')).rejects.toThrow();
  });
});
