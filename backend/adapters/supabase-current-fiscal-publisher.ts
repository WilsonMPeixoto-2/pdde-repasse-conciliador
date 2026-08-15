import type { CurrentFiscalPublisher } from '../application/current-fiscal-read-model';
import { prepareCurrentFiscalSnapshot } from '../application/current-fiscal-read-model';

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

export class SupabaseCurrentFiscalPublisher implements CurrentFiscalPublisher {
  private readonly client: SupabaseRpcClient;

  constructor(client: unknown) {
    this.client = client as SupabaseRpcClient;
  }

  async publish(input: {
    runId: string;
    expectedSchoolCount: number;
    fiscal: unknown;
  }): Promise<void> {
    const prepared = prepareCurrentFiscalSnapshot(input);
    const { error } = await this.client.rpc('publish_current_fiscal_snapshot', {
      p_run_id: prepared.portfolio.runId,
      p_snapshot: prepared,
    });
    if (error) throw new Error(`Publicação do retrato fiscal corrente: ${message(error)}.`);
  }
}
