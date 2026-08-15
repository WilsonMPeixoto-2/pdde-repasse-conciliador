import { Inngest } from 'inngest';

export interface InngestBridgeOptions {
  enabled?: boolean;
  appId?: string;
}

export type InngestBridge =
  | { enabled: false; client: null }
  | { enabled: true; client: Inngest };

export function createInngestBridge(options: InngestBridgeOptions = {}): InngestBridge {
  if (options.enabled !== true) return { enabled: false, client: null };
  const appId = options.appId?.trim();
  if (!appId) throw new Error('appId é obrigatório para habilitar o Inngest.');
  return {
    enabled: true,
    client: new Inngest({ id: appId }),
  };
}
