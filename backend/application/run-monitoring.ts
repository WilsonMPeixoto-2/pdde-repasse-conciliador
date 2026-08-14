import type { ArtifactStore } from './artifact-store';
import type { EvidenceEventStore } from './evidence-store';

export interface MonitoringSchool {
  inep: string;
  sme: string;
  nome: string;
}

export interface RunMonitoringOptions {
  schools: MonitoringSchool[];
  workspacePath: string;
  fiscalYear: 2026;
  runId: string;
  evidenceStore?: EvidenceEventStore;
  artifactStore?: ArtifactStore;
  manageExecutionLifecycle?: boolean;
  institutionalPathPrefix?: string;
  signal?: AbortSignal;
}

export interface RunMonitoringResult {
  status: 'COMPLETE' | 'PARTIAL';
}

/**
 * Serviço de aplicação que substituirá a orquestração hoje concentrada no
 * script monitor-live-2026. O contrato institucional nasce antes da migração
 * do pipeline para permitir evolução testada em passos pequenos.
 */
export async function runMonitoring(
  _options: RunMonitoringOptions,
): Promise<RunMonitoringResult> {
  throw new Error('runMonitoring ainda não implementado.');
}
