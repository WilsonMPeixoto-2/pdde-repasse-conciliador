import { randomUUID } from 'node:crypto';
import type { HumanFinancialPortfolioView } from './build-human-financial-view';
import {
  runFinancialIntelligenceMonitoring,
  type RunFinancialIntelligenceMonitoringOptions,
} from './run-financial-intelligence-monitoring';
import type { MonitoringSchool } from './run-monitoring';
import { buildHumanFinancialWorkbook } from '../report/human-financial-workbook';

export type TemporaryFinancialSessionPhase =
  | 'PREPARING'
  | 'COLLECTING'
  | 'EXPORTING'
  | 'COMPLETE'
  | 'PARTIAL'
  | 'FAILED';

export interface TemporaryFinancialSessionProgress {
  phase: TemporaryFinancialSessionPhase;
  message: string;
}

export interface TemporaryFinancialSessionResult {
  runId: string;
  status: 'COMPLETE' | 'PARTIAL';
  human: HumanFinancialPortfolioView;
  workbookBytes: Uint8Array;
  workbookFilename: string;
}

type SessionExecutor = (
  options: RunFinancialIntelligenceMonitoringOptions,
) => Promise<{
  status: 'COMPLETE' | 'PARTIAL';
  human: HumanFinancialPortfolioView;
}>;

export interface RunTemporaryFinancialSessionOptions {
  schools: MonitoringSchool[];
  workspacePath: string;
  runId?: string;
  signal?: AbortSignal;
  execute?: SessionExecutor;
  onProgress?: (progress: TemporaryFinancialSessionProgress) => void;
}

function emit(
  callback: RunTemporaryFinancialSessionOptions['onProgress'],
  phase: TemporaryFinancialSessionPhase,
  message: string,
): void {
  callback?.({ phase, message });
}

export async function runTemporaryFinancialSession(
  options: RunTemporaryFinancialSessionOptions,
): Promise<TemporaryFinancialSessionResult> {
  if (options.schools.length < 1 || options.schools.length > 163) {
    throw new Error('A consulta temporária deve conter entre 1 e 163 unidades escolares.');
  }

  const runId = options.runId ?? `session-${randomUUID()}`;
  const execute = options.execute ?? runFinancialIntelligenceMonitoring;
  emit(options.onProgress, 'PREPARING', 'Preparando a consulta temporária.');

  try {
    emit(options.onProgress, 'COLLECTING', 'Consultando e conciliando as fontes financeiras.');
    const result = await execute({
      schools: options.schools,
      workspacePath: options.workspacePath,
      fiscalYear: 2026,
      runId,
      manageExecutionLifecycle: false,
      ...(options.signal ? { signal: options.signal } : {}),
    });

    emit(options.onProgress, 'EXPORTING', 'Organizando a visualização e o arquivo Excel.');
    const workbook = buildHumanFinancialWorkbook(result.human);
    const workbookBytes = Buffer.from(await workbook.xlsx.writeBuffer());
    const terminalPhase = result.status === 'COMPLETE' ? 'COMPLETE' : 'PARTIAL';
    emit(
      options.onProgress,
      terminalPhase,
      result.status === 'COMPLETE'
        ? 'Consulta temporária concluída.'
        : 'Consulta concluída com cobertura parcial; confira os acompanhamentos.',
    );

    return {
      runId,
      status: result.status,
      human: result.human,
      workbookBytes,
      workbookFilename: 'inteligencia-financeira-pdde-4cre-2026.xlsx',
    };
  } catch (cause) {
    emit(
      options.onProgress,
      'FAILED',
      cause instanceof Error ? cause.message : 'A consulta temporária falhou.',
    );
    throw cause;
  }
}
