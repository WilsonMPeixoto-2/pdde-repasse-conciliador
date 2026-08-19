import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { loadMasterSchools } from '../backend/application/school-catalog.ts';
import { prepareCurrentHumanFinancialSnapshot } from '../backend/application/current-human-financial-read-model.ts';
import { runFinancialIntelligenceMonitoring } from '../backend/application/run-financial-intelligence-monitoring.ts';

export const config = {
  maxDuration: 800,
};

const inepSchema = z.string().regex(/^\d{8}$/);
const requestSchema = z.object({
  ineps: z.union([z.literal('all'), z.array(inepSchema).min(1).max(163)]).default('all'),
}).strict();

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
      const input = requestSchema.parse(await request.json().catch(() => ({ ineps: 'all' })));
      const master = await loadMasterSchools();
      const masterByInep = new Map(master.map((school) => [school.inep, school]));
      const schools = input.ineps === 'all'
        ? master
        : input.ineps.map((inep) => {
            const school = masterByInep.get(inep);
            if (!school) throw new Error(`INEP ${inep} não pertence à lista-mestre da 4ª CRE.`);
            return school;
          });

      await mkdir(workspacePath, { recursive: true });
      const result = await runFinancialIntelligenceMonitoring({
        schools,
        workspacePath,
        fiscalYear: 2026,
        runId,
        manageExecutionLifecycle: false,
      });
      const prepared = prepareCurrentHumanFinancialSnapshot({
        runId,
        expectedSchoolCount: schools.length,
        human: result.human,
      });
      const { runId: _portfolioRunId, ...portfolio } = prepared.portfolio;
      const snapshots = Object.fromEntries(prepared.schools.map(({ school, snapshot }) => {
        const { runId: _schoolRunId, ...publicSnapshot } = snapshot;
        return [school.inep, publicSnapshot];
      }));

      return json({
        generatedAt: new Date().toISOString(),
        status: result.status,
        portfolio,
        schools: snapshots,
      });
    } catch (cause) {
      if (cause instanceof z.ZodError) {
        return json({ error: 'Escopo da consulta inválido.' }, 400);
      }
      return json({
        error: cause instanceof Error ? cause.message : 'Não foi possível concluir a nova consulta.',
      }, 502);
    } finally {
      await rm(workspacePath, { recursive: true, force: true }).catch(() => undefined);
    }
  },
};
