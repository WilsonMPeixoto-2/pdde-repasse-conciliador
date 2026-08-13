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
import {
  administrativeCommandTokenSchema,
  createInstitutionalApi,
} from '../api/institutional-api';
import { ExecutionCommandService } from '../application/execution-command-service';
import { ArtifactIntakeService } from '../application/artifact-intake-service';
import { ExecutionWorker } from '../application/execution-worker';
import { InstitutionalJobExecutor } from '../application/institutional-job-executor';
import { InstitutionalReadService } from '../application/institutional-read-service';
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
  const artifactIntakeService = new ArtifactIntakeService(artifactStore, evidenceStore);
  const queue = new SupabaseExecutionQueue(client);
  const commandService = new ExecutionCommandService(queue, { artifactEvidence: evidenceStore });
  const readRepository = new SupabaseInstitutionalReadRepository(client);
  const readService = new InstitutionalReadService(evidenceStore, schools, readRepository);
  return {
    client,
    schools,
    evidenceStore,
    artifactStore,
    artifactIntakeService,
    queue,
    commandService,
    readRepository,
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
  });
  const worker = new ExecutionWorker(services.queue, executor);
  return { ...services, executor, worker };
}
