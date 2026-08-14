import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export interface SupabaseBackendConfig {
  url: string;
  key: string;
}

type SupabaseClientFactory = (
  url: string,
  key: string,
  options: {
    auth: {
      persistSession: false;
      autoRefreshToken: false;
      detectSessionInUrl: false;
    };
    global: { headers: { 'X-Client-Info': string } };
  },
) => unknown;

function parseBackendKey(key: string): string {
  if (key.startsWith('sb_publishable_')) {
    throw new Error('Chave Supabase pública não pode autenticar o backend institucional.');
  }
  if (key.startsWith('sb_secret_')) return z.string().min(32).parse(key);

  const parts = key.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as unknown;
      const role = payload && typeof payload === 'object' && 'role' in payload
        ? String((payload as { role: unknown }).role)
        : '';
      if (role === 'service_role') return key;
    } catch {
      // A mensagem única abaixo evita vazar detalhes da credencial inválida.
    }
  }
  throw new Error('SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY não é uma credencial de backend service_role.');
}

function parseUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('SUPABASE_URL é inválida.');
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new Error('SUPABASE_URL deve usar HTTPS (HTTP é aceito apenas no ambiente local).');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('SUPABASE_URL não pode conter credenciais, query ou fragmento.');
  }
  return url.href.replace(/\/$/, '');
}

export function loadSupabaseBackendConfig(
  environment: Record<string, string | undefined> = process.env,
): SupabaseBackendConfig {
  const rawUrl = environment.SUPABASE_URL?.trim();
  if (!rawUrl) throw new Error('SUPABASE_URL é obrigatória no backend.');
  const rawKey = environment.SUPABASE_SECRET_KEY?.trim()
    || environment.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!rawKey) {
    throw new Error('SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY é obrigatória no backend.');
  }
  return { url: parseUrl(rawUrl), key: parseBackendKey(rawKey) };
}

export function createSupabaseBackendClient(
  config: SupabaseBackendConfig,
  factory: SupabaseClientFactory = createClient,
): unknown {
  return factory(config.url, config.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'X-Client-Info': 'pdde-repasse-conciliador-backend/0.5' },
    },
  });
}
