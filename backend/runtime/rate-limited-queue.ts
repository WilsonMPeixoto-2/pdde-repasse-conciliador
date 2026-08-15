import PQueue from 'p-queue';

export interface RateLimitedQueueOptions {
  concurrency: number;
  intervalCap: number;
  intervalMs: number;
  timeoutMs?: number;
  strict?: boolean;
}

export interface RunRateLimitedOptions extends RateLimitedQueueOptions {
  signal?: AbortSignal;
}

export interface RateLimitedWorkerContext {
  index: number;
  signal?: AbortSignal;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} deve ser um inteiro positivo.`);
  }
  return value;
}

export function createRateLimitedQueue(options: RateLimitedQueueOptions): PQueue {
  const concurrency = positiveInteger(options.concurrency, 'concurrency');
  const intervalCap = positiveInteger(options.intervalCap, 'intervalCap');
  const interval = positiveInteger(options.intervalMs, 'intervalMs');
  const timeout = options.timeoutMs === undefined
    ? undefined
    : positiveInteger(options.timeoutMs, 'timeoutMs');

  return new PQueue({
    concurrency,
    intervalCap,
    interval,
    ...(timeout === undefined ? {} : { timeout }),
    strict: options.strict ?? true,
  });
}

export async function runRateLimited<T, R>(
  items: readonly T[],
  worker: (item: T, context: RateLimitedWorkerContext) => Promise<R>,
  options: RunRateLimitedOptions,
): Promise<R[]> {
  options.signal?.throwIfAborted();
  const queue = createRateLimitedQueue(options);
  const tasks = items.map((item, index) => {
    options.signal?.throwIfAborted();
    return queue.add(
      () => worker(item, { index, ...(options.signal ? { signal: options.signal } : {}) }),
      options.signal ? { signal: options.signal } : undefined,
    ) as Promise<R>;
  });
  return Promise.all(tasks);
}
