import type { CurrentMonitoringPublisher } from '../application/current-monitoring-publisher';
import { prepareCurrentFiscalSnapshot } from '../application/current-fiscal-read-model';
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

export class SupabaseCurrentMonitoringPublisher implements CurrentMonitoringPublisher {
  private readonly client: SupabaseRpcClient;

  constructor(client: unknown) {
    this.client = client as SupabaseRpcClient;
  }

  async publish(input: {
    runId: string;
    expectedSchoolCount: number;
    fiscal: unknown;
    human: unknown;
  }): Promise<void> {
    const fiscal = prepareCurrentFiscalSnapshot({
      runId: input.runId,
      expectedSchoolCount: input.expectedSchoolCount,
      fiscal: input.fiscal,
    });
    const human = prepareCurrentHumanFinancialSnapshot({
      runId: input.runId,
      expectedSchoolCount: input.expectedSchoolCount,
      human: input.human,
    });

    if (fiscal.portfolio.runId !== human.portfolio.runId) {
      throw new Error('Os retratos fiscal e humano pertencem a execuções diferentes.');
    }
    if (fiscal.portfolio.fiscalYear !== human.portfolio.fiscalYear) {
      throw new Error('Os retratos fiscal e humano pertencem a exercícios diferentes.');
    }

    const { error } = await this.client.rpc('publish_current_monitoring_snapshot', {
      p_run_id: fiscal.portfolio.runId,
      p_fiscal_snapshot: fiscal,
      p_human_snapshot: human,
    });
    if (error) {
      throw new Error(`Publicação atômica do monitoramento corrente: ${message(error)}.`);
    }
  }
}
