from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: marcador esperado 1 vez, encontrado {count}: {old[:120]!r}')
    file.write_text(text.replace(old, new, 1))


replace_once(
    'backend/application/current-fiscal-read-model.ts',
    "export interface PreparedCurrentFiscalSnapshot {\n  portfolio: CurrentFiscalPortfolio;\n",
    "export interface PreparedCurrentFiscalSnapshot {\n  sourceStatus: 'COMPLETE';\n  portfolio: CurrentFiscalPortfolio;\n",
)
replace_once(
    'backend/application/current-fiscal-read-model.ts',
    "  return {\n    portfolio: {\n",
    "  return {\n    sourceStatus: 'COMPLETE',\n    portfolio: {\n",
)

replace_once(
    'backend/api/institutional-api.ts',
    "  getCurrentReport(runId: string): Promise<{\n    kind: string;\n    provider: string;\n    bucket: string | null;\n    path: string;\n    sha256: string;\n  } | null>;\n}\n",
    "  getCurrentReport(runId: string): Promise<{\n    kind: string;\n    provider: string;\n    bucket: string | null;\n    path: string;\n    sha256: string;\n  } | null>;\n  getCurrentFiscalPortfolio?(): Promise<unknown | null>;\n  getCurrentFiscalSchool?(inep: string): Promise<unknown | null>;\n}\n",
)
replace_once(
    'backend/api/institutional-api.ts',
    "      if (segments.length === 2 && segments[1] === 'schools') {\n",
    "      if (segments[1] === 'current') {\n        if (request.method !== 'GET') return methodNotAllowed('GET');\n        if (segments.length === 3 && segments[2] === 'portfolio') {\n          if (!dependencies.readService.getCurrentFiscalPortfolio) {\n            return errorResponse(503, 'Read model fiscal corrente não configurado neste runtime.');\n          }\n          const portfolio = await dependencies.readService.getCurrentFiscalPortfolio();\n          return portfolio ? json(portfolio) : errorResponse(404, 'Retrato fiscal corrente ainda não publicado.');\n        }\n        if (segments.length === 4 && segments[2] === 'schools') {\n          if (!dependencies.readService.getCurrentFiscalSchool) {\n            return errorResponse(503, 'Read model fiscal corrente não configurado neste runtime.');\n          }\n          const school = await dependencies.readService.getCurrentFiscalSchool(segments[3]);\n          return school ? json(school) : errorResponse(404, 'Retrato fiscal corrente da escola ainda não publicado.');\n        }\n      }\n\n      if (segments.length === 2 && segments[1] === 'schools') {\n",
)

replace_once(
    'backend/application/institutional-read-repository.ts',
    "import type { EvidenceRunProjection } from './evidence-history';\n",
    "import type { EvidenceRunProjection } from './evidence-history';\nimport type { CurrentFiscalPortfolio, CurrentFiscalSchoolSnapshot } from './current-fiscal-read-model';\n",
)
replace_once(
    'backend/application/institutional-read-repository.ts',
    "  listExecutionsByRuns(runIds: string[]): Promise<EvidenceRunProjection[]>;\n}\n",
    "  listExecutionsByRuns(runIds: string[]): Promise<EvidenceRunProjection[]>;\n  getCurrentFiscalPortfolio?(): Promise<CurrentFiscalPortfolio | null>;\n  getCurrentFiscalSchool?(inep: string): Promise<CurrentFiscalSchoolSnapshot | null>;\n}\n",
)

replace_once(
    'backend/application/institutional-read-service.ts',
    "import type { EvidenceEventStore } from './evidence-store';\n",
    "import type { EvidenceEventStore } from './evidence-store';\nimport type { CurrentFiscalPortfolio, CurrentFiscalSchoolSnapshot } from './current-fiscal-read-model';\n",
)
replace_once(
    'backend/application/institutional-read-service.ts',
    "  async listArtifacts(runId: string): Promise<ArtifactReadModel[]> {\n",
    "  async getCurrentFiscalPortfolio(): Promise<CurrentFiscalPortfolio | null> {\n    if (!this.repository?.getCurrentFiscalPortfolio) return null;\n    return this.repository.getCurrentFiscalPortfolio();\n  }\n\n  async getCurrentFiscalSchool(inep: string): Promise<CurrentFiscalSchoolSnapshot | null> {\n    z.string().regex(/^\\d{8}$/, 'INEP inválido').parse(inep);\n    if (!this.schoolByInep.has(inep) || !this.repository?.getCurrentFiscalSchool) return null;\n    return this.repository.getCurrentFiscalSchool(inep);\n  }\n\n  async listArtifacts(runId: string): Promise<ArtifactReadModel[]> {\n",
)

replace_once(
    'backend/adapters/supabase-institutional-read-repository.ts',
    "import { isoTimestampSchema } from '../core/time';\n",
    "import { isoTimestampSchema } from '../core/time';\nimport { sourceObservationSchema } from '../core/source-observation';\nimport type { CurrentFiscalPortfolio, CurrentFiscalSchoolSnapshot, CurrentFiscalSchoolSummary } from '../application/current-fiscal-read-model';\n",
)
replace_once(
    'backend/adapters/supabase-institutional-read-repository.ts',
    "const RUN_ID_BATCH_SIZE = 40;\n",
    "const CURRENT_FISCAL_SNAPSHOT_COLUMNS = [\n  'fiscal_year', 'run_id', 'generated_at', 'source_generated_at',\n  'source_observations', 'coverage', 'metrics',\n].join(',');\nconst CURRENT_FISCAL_SCHOOL_COLUMNS = ['school_inep', 'sme', 'school_name', 'metrics'].join(',');\nconst RUN_ID_BATCH_SIZE = 40;\n",
)
replace_once(
    'backend/adapters/supabase-institutional-read-repository.ts',
    "const projectedStatusSchema = z.enum(['QUEUED', 'RUNNING', 'COMPLETE', 'PARTIAL', 'FAILED', 'UNKNOWN']);\n",
    "const projectedStatusSchema = z.enum(['QUEUED', 'RUNNING', 'COMPLETE', 'PARTIAL', 'FAILED', 'UNKNOWN']);\nconst currentFiscalMetricsSchema = z.object({\n  schools: z.number().int().nonnegative(),\n  accounts: z.number().int().nonnegative(),\n  movements: z.number().int().nonnegative(),\n  programmedCents: z.number().int().nonnegative(),\n  paidInformedCents: z.number().int().nonnegative(),\n  creditedCents: z.number().int().nonnegative(),\n  reportedBalanceCents: z.number().int(),\n}).strict();\nconst currentFiscalSchoolMetricsSchema = currentFiscalMetricsSchema.omit({ schools: true });\n",
)
old_tail = """    return projections
      .sort((left, right) => right.anchor - left.anchor)
      .map((item) => item.projection);
  }

}
"""
new_tail = """    return projections
      .sort((left, right) => right.anchor - left.anchor)
      .map((item) => item.projection);
  }

  async getCurrentFiscalPortfolio(): Promise<CurrentFiscalPortfolio | null> {
    const snapshotResult = await this.client.from('current_fiscal_snapshots')
      .select(CURRENT_FISCAL_SNAPSHOT_COLUMNS)
      .eq('fiscal_year', 2026)
      .limit(1);
    if (snapshotResult.error) throw new Error(`Read model fiscal corrente: ${message(snapshotResult.error)}.`);
    if (!Array.isArray(snapshotResult.data)) throw new Error('Read model fiscal corrente retornou formato inválido.');
    if (snapshotResult.data.length === 0) return null;
    const snapshot = record(snapshotResult.data[0]);

    const schoolResult = await this.client.from('current_fiscal_schools')
      .select(CURRENT_FISCAL_SCHOOL_COLUMNS)
      .eq('fiscal_year', 2026)
      .order('sme', { ascending: true })
      .limit(500);
    if (schoolResult.error) throw new Error(`Read models fiscais das escolas: ${message(schoolResult.error)}.`);
    if (!Array.isArray(schoolResult.data)) throw new Error('Read models fiscais das escolas retornaram formato inválido.');
    const schools: CurrentFiscalSchoolSummary[] = schoolResult.data.map((raw) => {
      const row = record(raw);
      return {
        inep: z.string().regex(/^\\d{8}$/).parse(row.school_inep),
        sme: z.string().regex(/^\\d{7}$/).parse(row.sme),
        name: z.string().min(1).parse(row.school_name),
        metrics: currentFiscalSchoolMetricsSchema.parse(row.metrics),
      };
    });
    return {
      fiscalYear: z.literal(2026).parse(Number(snapshot.fiscal_year)),
      runId: evidenceIdentifierSchema.parse(snapshot.run_id),
      generatedAt: isoTimestampSchema.parse(snapshot.generated_at),
      sourceGeneratedAt: isoTimestampSchema.parse(snapshot.source_generated_at),
      sourceObservations: z.array(sourceObservationSchema).parse(snapshot.source_observations),
      coverage: z.record(z.string(), z.unknown()).parse(snapshot.coverage),
      metrics: currentFiscalMetricsSchema.parse(snapshot.metrics),
      schools,
    };
  }

  async getCurrentFiscalSchool(inep: string): Promise<CurrentFiscalSchoolSnapshot | null> {
    const validatedInep = z.string().regex(/^\\d{8}$/).parse(inep);
    const result = await this.client.from('current_fiscal_schools')
      .select('snapshot')
      .eq('fiscal_year', 2026)
      .eq('school_inep', validatedInep)
      .limit(1);
    if (result.error) throw new Error(`Read model fiscal da escola: ${message(result.error)}.`);
    if (!Array.isArray(result.data)) throw new Error('Read model fiscal da escola retornou formato inválido.');
    if (result.data.length === 0) return null;
    const value = record(record(result.data[0]).snapshot);
    return {
      fiscalYear: z.literal(2026).parse(Number(value.fiscalYear)),
      runId: evidenceIdentifierSchema.parse(value.runId),
      school: z.object({
        inep: z.string().regex(/^\\d{8}$/), sme: z.string().regex(/^\\d{7}$/),
        name: z.string().min(1), uex: z.string(), cnpj: z.string(),
      }).strict().parse(value.school),
      repasses: z.array(z.unknown()).parse(value.repasses),
      statements: z.array(z.unknown()).parse(value.statements),
    };
  }

}
"""
replace_once('backend/adapters/supabase-institutional-read-repository.ts', old_tail, new_tail)

replace_once(
    'backend/application/institutional-job-executor.ts',
    "import type { ArtifactReference, ArtifactStore } from './artifact-store';\n",
    "import type { ArtifactReference, ArtifactStore } from './artifact-store';\nimport type { CurrentFiscalPublisher } from './current-fiscal-read-model';\n",
)
replace_once(
    'backend/application/institutional-job-executor.ts',
    "type MonitoringRunner = (\n  options: RunMonitoringOptions,\n) => Promise<{ status: 'COMPLETE' | 'PARTIAL' }>;\n",
    "type MonitoringRunner = (\n  options: RunMonitoringOptions,\n) => Promise<{ status: 'COMPLETE' | 'PARTIAL'; fiscal?: unknown }>;\n",
)
replace_once(
    'backend/application/institutional-job-executor.ts',
    "  artifactStore: ArtifactStore;\n  collectPddeInfo?: CollectionRunner;\n",
    "  artifactStore: ArtifactStore;\n  currentFiscalPublisher?: CurrentFiscalPublisher;\n  collectPddeInfo?: CollectionRunner;\n",
)
replace_once(
    'backend/application/institutional-job-executor.ts',
    "    });\n    return { status: result.status };\n  }\n\n  private async executeReconciliation(\n",
    "    });\n    if (result.status === 'COMPLETE' && schools.length === this.schools.length && this.dependencies.currentFiscalPublisher) {\n      if (result.fiscal === undefined) throw new Error('MONITORING completo não retornou a visão fiscal para publicação.');\n      await this.dependencies.currentFiscalPublisher.publish({\n        runId: job.runId, expectedSchoolCount: this.schools.length, fiscal: result.fiscal,\n      });\n    }\n    return { status: result.status };\n  }\n\n  private async executeReconciliation(\n",
)

replace_once(
    'backend/runtime/institutional-runtime.ts',
    "import { SupabaseInstitutionalReadRepository } from '../adapters/supabase-institutional-read-repository';\n",
    "import { SupabaseInstitutionalReadRepository } from '../adapters/supabase-institutional-read-repository';\nimport { SupabaseCurrentFiscalPublisher } from '../adapters/supabase-current-fiscal-publisher';\n",
)
replace_once(
    'backend/runtime/institutional-runtime.ts',
    "  const readRepository = new SupabaseInstitutionalReadRepository(client);\n  const readService = new InstitutionalReadService(evidenceStore, schools, readRepository);\n",
    "  const readRepository = new SupabaseInstitutionalReadRepository(client);\n  const currentFiscalPublisher = new SupabaseCurrentFiscalPublisher(client);\n  const readService = new InstitutionalReadService(evidenceStore, schools, readRepository);\n",
)
replace_once(
    'backend/runtime/institutional-runtime.ts',
    "    readRepository,\n    readService,\n",
    "    readRepository,\n    currentFiscalPublisher,\n    readService,\n",
)
replace_once(
    'backend/runtime/institutional-runtime.ts',
    "    artifactStore: services.artifactStore,\n  });\n",
    "    artifactStore: services.artifactStore,\n    currentFiscalPublisher: services.currentFiscalPublisher,\n  });\n",
)
