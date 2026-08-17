import { handleTemporarySessionRequest } from '../backend/api/temporary-session-api';
import { createGithubActionsTemporarySessionClient } from '../backend/infrastructure/github-actions-temporary-session';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} não está configurada no ambiente do backend.`);
  return value;
}

export function temporarySessionWorkflowRef(
  environment: Record<string, string | undefined> = process.env,
): string {
  return environment.PDDE_SESSION_GITHUB_REF?.trim() || 'main';
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const client = createGithubActionsTemporarySessionClient({
        token: requiredEnv('PDDE_SESSION_GITHUB_TOKEN'),
        owner: 'WilsonMPeixoto-2',
        repo: 'pdde-repasse-conciliador',
        workflow: 'temporary-session-run.yml',
        ref: temporarySessionWorkflowRef(),
      });
      return handleTemporarySessionRequest(request, {
        accessKey: requiredEnv('PDDE_SESSION_ACCESS_KEY'),
        client,
      });
    } catch (cause) {
      const message = cause instanceof Error
        ? cause.message
        : 'Modo Sessão indisponível por configuração do servidor.';
      return Response.json(
        { error: message },
        {
          status: 503,
          headers: { 'cache-control': 'private, no-store, max-age=0' },
        },
      );
    }
  },
};
