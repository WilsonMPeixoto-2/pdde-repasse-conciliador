import { describe, expect, it } from 'vitest';
import {
  createPortalTransparenciaClientFromEnv,
  PortalTransparenciaClient,
} from '../../backend/adapters/portal-transparencia-http';

describe('Portal da Transparência optional composition', () => {
  it('fica desabilitado quando a chave não está configurada', () => {
    const bridge = createPortalTransparenciaClientFromEnv({});
    expect(bridge).toEqual({ enabled: false, client: null });
  });

  it('cria cliente sem expor a chave quando a variável existe', () => {
    const bridge = createPortalTransparenciaClientFromEnv({
      PORTAL_TRANSPARENCIA_API_KEY: 'segredo-oficial',
    });
    expect(bridge.enabled).toBe(true);
    if (!bridge.enabled) throw new Error('bridge deveria estar habilitado');
    expect(bridge.client).toBeInstanceOf(PortalTransparenciaClient);
    expect(JSON.stringify(bridge)).not.toContain('segredo-oficial');
  });
});
