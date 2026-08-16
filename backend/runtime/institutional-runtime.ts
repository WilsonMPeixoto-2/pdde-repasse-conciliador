import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import {
  createSupabaseBackendClient,
  loadSupabaseBackendConfig,
} from '../adapters/supabase-backend-client';
import { SupabaseArtifactStore } from '../adapters/supabase-artifact-store';
import { SupabaseEvidenceStore } from '../adapters/supabase-evidence-store';
import { SupabaseExecutionQueue } from '../adapters/supabase-execution-queue';
import { SupabaseInstitutionalReadRepository } from '../adapters/supabase-institutional-read-repository';
import { SupabaseCurrentMonitoringPublisher } from '../adapters/supabase-current-monitoring-publisher';
import { SupabaseFinancialSnapshotStore } from '../adapters/supabase-financial-snapshot-store';
import {
  administrativeCommandTokenSchema,
  createInstitutionalApi,
} from '../api/institutional-api';
import { ExecutionCommandService } from '../application/execution-command-service';
import { ArtifactIntakeService } from '../application/artifact-intake-service';
import { ExecutionWorker } from '../application/execution-worker';
import { InstitutionalJobExecutor } from '../application/institutional-job-executor';
import { InstitutionalReadService } from '../application/institutional-read-service';
import { runFinancialIntelligenceMonitoring } from '../application/run-financial-intelligence-monitoring';
import { loadMasterSchools } from '../application/school-catalog';

type Environment = Record<string, string | undefined>;

async function packageVersion(): Promise<string> {
  const raw = await readFile(new URL('../../package.json', import.meta.url), 'utf8');
  const parsed = z.object({ version: z.string().min(1) }).passthrough()
    .parse(JSON.parse(raw) as unknown);
  return parsed.version;
}

async function dataServices(environment: Environment, clientOverride?: unknown) {
  const client = clientOverride ?? createSupabaseBackendClient(
    loadSupabaseBackendConfig(environment),
  );
  const schools = await loadMasterSchools();
  const evidenceStore = new SupabaseEvidenceStore(client);
  const artifactStore = new SupabaseArtifactStore(client);
  const financialSnapshotStore = new SupabaseFinancialSnapshotStore(client);
  const artifactIntakeService = new ArtifactIntakeService(artifactStore, evidenceStore);
  const queue = new SupabaseExecutionQueue(client);
  const commandService = new ExecutionCommandService(queue, { artifactEvidence: evidenceStore });
  const readRepository = new SupabaseInstitutionalReadRepository(client);
  const currentMonitoringPublisher = new SupabaseCurrentMonitoringPublisher(client);
  const readService = new InstitutionalReadService(evidenceStore, schools, readRepository);
  return {
    client,
    schools,
    evidenceStore,
    artifactStore,
    financialSnapshotStore,
    artifactIntakeService,
    queue,
    commandService,
    readRepository,
    currentMonitoringPublisher,
    readService,
    version: await packageVersion(),
  };
}

export async function createInstitutionalApiRuntime(
  environment: Environment = process.env,
  clientOverride?: unknown,
) {
  const services = await dataServices(environment, clientOverride);
  const commandToken = administrativeCommandTokenSchema.parse(
    environment.PDDE_API_COMMAND_TOKEN,
  );
  const api = createInstitutionalApi({
    readService: services.readService,
    commandService: services.commandService,
    artifactStore: services.artifactStore,
    artifactIntakeService: services.artifactIntakeService,
    commandToken,
    verifyEvidence: () => services.evidenceStore.verifyIntegrity(),
    version: services.version,
  });
  return { ...services, api };
}

export async function createInstitutionalWorkerRuntime(
  environment: Environment = process.env,
  clientOverride?: unknown,
) {
  const services = await dataServices(environment, clientOverride);
  const workspacePath = z.string().min(1, 'PDDE_WORKSPACE_PATH é obrigatório no runner.')
    .parse(environment.PDDE_WORKSPACE_PATH);
  const executor = new InstitutionalJobExecutor({
    workspacePath,
    schools: services.schools,
    evidenceStore: services.evidenceStore,
    artifactStore: services.artifactStore,
    currentMonitoringPublisher: services.currentMonitoringPublisher,
    runMonitoring: (options) => runFinancialIntelligenceMonitoring({
      ...options,
      financialSnapshotStore: services.financialSnapshotStore,
    }),
  });
  const worker = new ExecutionWorker(services.queue, executor);
  // O escopo institucional usa uma única instância do runner. Se o processo
  // anterior foi interrompido, qualquer RUNNING remanescente é encerrado como
  // FAILED antes de esta instância começar a reclamar novas tarefas.
  await worker.recoverInterrupted();
  return { ...services, executor, worker };
}
