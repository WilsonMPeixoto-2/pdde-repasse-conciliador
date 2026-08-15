import { Inngest } from 'inngest';
import type { DurableStepRunner } from './durable-step-workflow';

export interface InngestBridgeOptions {
  enabled?: boolean;
  appId?: string;
}

export type InngestBridge =
  | { enabled: false; client: null }
  | { enabled: true; client: Inngest };

export interface InngestStepLike {
  run<T>(id: string, handler: () => Promise<T>): Promise<T>;
}

export function createInngestBridge(options: InngestBridgeOptions = {}): InngestBridge {
  if (options.enabled !== true) return { enabled: false, client: null };
  const appId = options.appId?.trim();
  if (!appId) throw new Error('appId é obrigatório para habilitar o Inngest.');
  return {
    enabled: true,
    client: new Inngest({ id: appId }),
  };
}

export function createInngestBridgeFromEnv(
  env: Readonly<Record<string, string | undefined>> = process.env,
): InngestBridge {
  const raw = env.INNGEST_ENABLED?.trim().toLowerCase();
  const enabled = raw === 'true' || raw === '1' || raw === 'yes';
  return createInngestBridge({ enabled, appId: env.INNGEST_APP_ID });
}

export function inngestStepRunner(step: InngestStepLike): DurableStepRunner {
  return {
    run<T>(id: string, handler: () => Promise<T>): Promise<T> {
      return step.run(id, handler);
    },
  };
}
