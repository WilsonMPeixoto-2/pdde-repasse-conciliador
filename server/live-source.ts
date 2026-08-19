import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import masterSource from '../backend/schools4cre.json';
import { prepareCurrentHumanFinancialSnapshot } from '../backend/application/current-human-financial-read-model';
import { runFinancialIntelligenceMonitoring } from '../backend/application/run-financial-intelligence-monitoring';

const requestSchema = z.object({
  inep: z.string().regex(/^\d{8}$/),
}).strict();

const masterSchoolSchema = z.object({
  inep: z.string().regex(/^\d{8}$/),
  sme: z.string().regex(/^\d{7}$/),
  nome: z.string().min(1),
}).strict();

const master = z.object({
  schools: z.array(masterSchoolSchema).length(163),
}).strict().parse(masterSource).schools;

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: {
      'cache-control': 'private, no-store, max-age=0',
    },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return json({ error: 'Método não permitido.' }, 405);
    }

    const runId = `web-live-${randomUUID()}`;
    const workspacePath = join('/tmp', runId);

    try {
      const input = requestSchema.parse(await request.json());
      const school = master.find((item) => item.inep === input.inep);
      if (!school) {
        return json({ error: 'A unidade informada não pertence à lista-mestre da 4ª CRE.' }, 404);
      }

      await mkdir(workspacePath, { recursive: true });
      const result = await runFinancialIntelligenceMonitoring({
        schools: [school],
        workspacePath,
        fiscalYear: 2026,
        runId,
        manageExecutionLifecycle: false,
      });
      const prepared = prepareCurrentHumanFinancialSnapshot({
        runId,
        expectedSchoolCount: 1,
        human: result.human,
      });
      const { runId: _portfolioRunId, ...portfolio } = prepared.portfolio;
      const { runId: _schoolRunId, ...snapshot } = prepared.schools[0].snapshot;

      return json({
        generatedAt: new Date().toISOString(),
        status: result.status,
        portfolio,
        school: snapshot,
      });
    } catch (cause) {
      if (cause instanceof z.ZodError || cause instanceof SyntaxError) {
        return json({ error: 'Unidade inválida para a nova consulta.' }, 400);
      }
      return json({
        error: cause instanceof Error ? cause.message : 'Não foi possível concluir a nova consulta.',
      }, 502);
    } finally {
      await rm(workspacePath, { recursive: true, force: true }).catch(() => undefined);
    }
  },
};
