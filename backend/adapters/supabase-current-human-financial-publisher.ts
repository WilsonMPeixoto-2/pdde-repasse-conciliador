import type { CurrentHumanFinancialPublisher } from '../application/current-human-financial-read-model';
import { prepareCurrentHumanFinancialSnapshot } from '../application/current-human-financial-read-model';

interface SupabaseRpcResult {
  data: unknown;
  error: unknown;
}

interface SupabaseRpcClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<SupabaseRpcResult>;
}

function message(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return String(error);
}

export class SupabaseCurrentHumanFinancialPublisher implements CurrentHumanFinancialPublisher {
  private readonly client: SupabaseRpcClient;

  constructor(client: unknown) {
    this.client = client as SupabaseRpcClient;
  }

  async publish(input: {
    runId: string;
    expectedSchoolCount: number;
    human: unknown;
  }): Promise<void> {
    const prepared = prepareCurrentHumanFinancialSnapshot(input);
    const { error } = await this.client.rpc('publish_current_human_financial_snapshot', {
      p_run_id: prepared.portfolio.runId,
      p_snapshot: prepared,
    });
    if (error) {
      throw new Error(`Publicação do retrato financeiro humano corrente: ${message(error)}.`);
    }
  }
}
