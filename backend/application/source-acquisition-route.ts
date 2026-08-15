export type AcquisitionStrategyKind = 'STRUCTURED_API' | 'HTTP' | 'BROWSER_ASSISTED';

export class AcquisitionUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AcquisitionUnavailableError';
  }
}

export interface AcquisitionStrategy<T> {
  kind: AcquisitionStrategyKind;
  run(): Promise<T>;
}

export interface AcquisitionAttempt {
  kind: AcquisitionStrategyKind;
  status: 'UNAVAILABLE' | 'SUCCESS';
  detail?: string;
}

export interface AcquisitionResult<T> {
  via: AcquisitionStrategyKind;
  value: T;
  attempts: AcquisitionAttempt[];
}

export async function acquireWithFallback<T>(
  strategies: readonly AcquisitionStrategy<T>[],
): Promise<AcquisitionResult<T>> {
  if (strategies.length === 0) throw new Error('A rota de aquisição exige ao menos uma estratégia.');
  const attempts: AcquisitionAttempt[] = [];

  for (const strategy of strategies) {
    try {
      const value = await strategy.run();
      attempts.push({ kind: strategy.kind, status: 'SUCCESS' });
      return { via: strategy.kind, value, attempts };
    } catch (cause) {
      if (!(cause instanceof AcquisitionUnavailableError)) throw cause;
      attempts.push({ kind: strategy.kind, status: 'UNAVAILABLE', detail: cause.message });
    }
  }

  throw new AcquisitionUnavailableError(
    `Nenhuma estratégia de aquisição respondeu de forma utilizável: ${attempts.map((item) => item.kind).join(' -> ')}.`,
  );
}
