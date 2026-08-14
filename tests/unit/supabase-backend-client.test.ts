import { describe, expect, test, vi } from 'vitest';
import {
  createSupabaseBackendClient,
  loadSupabaseBackendConfig,
} from '../../backend/adapters/supabase-backend-client';

function jwt(role: string): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode({ role })}.signature`;
}

describe('cliente Supabase exclusivo do backend', () => {
  test('aceita secret key moderna ou JWT service_role e rejeita chave pública', () => {
    expect(loadSupabaseBackendConfig({
      SUPABASE_URL: 'https://projeto.supabase.co',
      SUPABASE_SECRET_KEY: `sb_secret_${'a'.repeat(32)}`,
    })).toMatchObject({ url: 'https://projeto.supabase.co' });

    expect(loadSupabaseBackendConfig({
      SUPABASE_URL: 'https://projeto.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: jwt('service_role'),
    }).key).toBe(jwt('service_role'));

    expect(() => loadSupabaseBackendConfig({
      SUPABASE_URL: 'https://projeto.supabase.co',
      SUPABASE_SECRET_KEY: `sb_publishable_${'a'.repeat(32)}`,
    })).toThrow(/pública|publishable|backend/i);
    expect(() => loadSupabaseBackendConfig({
      SUPABASE_URL: 'https://projeto.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: jwt('anon'),
    })).toThrow(/service_role|backend/i);
  });

  test('cria SDK sem sessão persistente nem refresh no runtime servidor', () => {
    const factory = vi.fn(() => ({ client: true }));
    const config = {
      url: 'https://projeto.supabase.co',
      key: `sb_secret_${'a'.repeat(32)}`,
    };
    expect(createSupabaseBackendClient(config, factory)).toEqual({ client: true });
    expect(factory).toHaveBeenCalledWith(config.url, config.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { 'X-Client-Info': 'pdde-repasse-conciliador-backend/0.5' },
      },
    });
  });

  test('falha cedo quando URL ou credencial administrativa estão ausentes', () => {
    expect(() => loadSupabaseBackendConfig({})).toThrow(/SUPABASE_URL/);
    expect(() => loadSupabaseBackendConfig({
      SUPABASE_URL: 'https://projeto.supabase.co',
    })).toThrow(/SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
  });
});
