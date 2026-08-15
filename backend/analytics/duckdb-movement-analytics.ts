import { DuckDBInstance, type DuckDBConnection } from '@duckdb/node-api';
import { z } from 'zod';
import { bankAccountSchema, sigefMovementSchema, type BankAccount, type SigefMovement } from '../core/schemas';

const candidateQuerySchema = z.object({
  schoolCnpj: z.string().regex(/^\d{14}$/),
  programCode: z.string().min(1),
  account: bankAccountSchema,
  amountCents: z.number().int().nonnegative(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict();

const summaryQuerySchema = z.object({
  schoolCnpj: z.string().regex(/^\d{14}$/),
  fiscalYear: z.number().int().min(2000).max(2100),
}).strict();

export interface MovementCandidateQuery {
  schoolCnpj: string;
  programCode: string;
  account: BankAccount;
  amountCents: number;
  dateFrom: string;
  dateTo: string;
}

export interface MovementSummaryQuery {
  schoolCnpj: string;
  fiscalYear: number;
}

export interface MovementSummary {
  movementCount: number;
  creditCents: number;
  debitCents: number;
}

function safeInteger(value: unknown, label: string): number {
  const number = typeof value === 'bigint' ? Number(value) : Number(value);
  if (!Number.isSafeInteger(number)) throw new RangeError(`${label} fora da faixa segura de inteiros.`);
  return number;
}

function rowToMovement(row: Record<string, unknown>): SigefMovement {
  return sigefMovementSchema.parse({
    id: row.id,
    schoolCnpj: row.school_cnpj,
    programCode: row.program_code,
    operation: row.operation,
    amountCents: safeInteger(row.amount_cents, 'amount_cents'),
    movementDate: row.movement_date,
    account: {
      bank: row.bank,
      agency: row.agency,
      number: row.account_number,
    },
    document: row.document,
    history: row.history,
  });
}

export class DuckDbMovementAnalytics {
  private constructor(private readonly connection: DuckDBConnection) {}

  static async create(): Promise<DuckDbMovementAnalytics> {
    const instance = await DuckDBInstance.create(':memory:');
    const connection = await instance.connect();
    await connection.run(`
      CREATE TABLE movements (
        id VARCHAR NOT NULL,
        school_cnpj VARCHAR NOT NULL,
        fiscal_year INTEGER NOT NULL,
        program_code VARCHAR NOT NULL,
        operation VARCHAR NOT NULL,
        amount_cents BIGINT NOT NULL,
        movement_date VARCHAR NOT NULL,
        bank VARCHAR NOT NULL,
        agency VARCHAR NOT NULL,
        account_number VARCHAR NOT NULL,
        document VARCHAR NOT NULL,
        history VARCHAR NOT NULL
      )
    `);
    return new DuckDbMovementAnalytics(connection);
  }

  async loadMovements(rawMovements: unknown): Promise<void> {
    const movements = z.array(sigefMovementSchema).parse(rawMovements);
    await this.connection.run('DELETE FROM movements');
    await this.connection.run('BEGIN TRANSACTION');
    try {
      for (const movement of movements) {
        const fiscalYear = Number(movement.movementDate.slice(0, 4));
        await this.connection.run(`
          INSERT INTO movements VALUES (
            $id, $schoolCnpj, $fiscalYear, $programCode, $operation,
            $amountCents, $movementDate, $bank, $agency, $accountNumber,
            $document, $history
          )
        `, {
          id: movement.id,
          schoolCnpj: movement.schoolCnpj,
          fiscalYear,
          programCode: movement.programCode,
          operation: movement.operation,
          amountCents: BigInt(movement.amountCents),
          movementDate: movement.movementDate,
          bank: movement.account.bank,
          agency: movement.account.agency,
          accountNumber: movement.account.number,
          document: movement.document,
          history: movement.history,
        });
      }
      await this.connection.run('COMMIT');
    } catch (cause) {
      await this.connection.run('ROLLBACK').catch(() => undefined);
      throw cause;
    }
  }

  async findCandidates(rawQuery: MovementCandidateQuery): Promise<SigefMovement[]> {
    const query = candidateQuerySchema.parse(rawQuery);
    const reader = await this.connection.runAndReadAll(`
      SELECT id, school_cnpj, program_code, operation, amount_cents, movement_date,
             bank, agency, account_number, document, history
      FROM movements
      WHERE school_cnpj = $schoolCnpj
        AND program_code = $programCode
        AND bank = $bank
        AND agency = $agency
        AND account_number = $accountNumber
        AND amount_cents = $amountCents
        AND movement_date BETWEEN $dateFrom AND $dateTo
      ORDER BY movement_date, id
    `, {
      schoolCnpj: query.schoolCnpj,
      programCode: query.programCode,
      bank: query.account.bank,
      agency: query.account.agency,
      accountNumber: query.account.number,
      amountCents: BigInt(query.amountCents),
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
    return reader.getRowObjects().map((row) => rowToMovement(row as Record<string, unknown>));
  }

  async summarize(rawQuery: MovementSummaryQuery): Promise<MovementSummary> {
    const query = summaryQuerySchema.parse(rawQuery);
    const reader = await this.connection.runAndReadAll(`
      SELECT
        COUNT(*)::INTEGER AS movement_count,
        COALESCE(SUM(CASE WHEN operation = 'credit' THEN amount_cents ELSE 0 END), 0)::BIGINT AS credit_cents,
        COALESCE(SUM(CASE WHEN operation = 'debit' THEN amount_cents ELSE 0 END), 0)::BIGINT AS debit_cents
      FROM movements
      WHERE school_cnpj = $schoolCnpj AND fiscal_year = $fiscalYear
    `, {
      schoolCnpj: query.schoolCnpj,
      fiscalYear: query.fiscalYear,
    });
    const row = reader.getRowObjects()[0] as Record<string, unknown> | undefined;
    if (!row) throw new Error('DuckDB não retornou resumo de movimentações.');
    return {
      movementCount: safeInteger(row.movement_count, 'movement_count'),
      creditCents: safeInteger(row.credit_cents, 'credit_cents'),
      debitCents: safeInteger(row.debit_cents, 'debit_cents'),
    };
  }

  async close(): Promise<void> {
    this.connection.closeSync();
  }
}
