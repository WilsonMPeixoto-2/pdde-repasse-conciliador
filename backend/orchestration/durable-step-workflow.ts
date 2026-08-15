export interface DurableStepRunner {
  run<T>(id: string, handler: () => Promise<T>): Promise<T>;
}

export interface DurableWorkflowStep {
  id: string;
  run(previous: Readonly<Record<string, unknown>>): unknown | Promise<unknown>;
}

function assertStepId(id: string, seen: Set<string>): void {
  if (!/^[a-z0-9][a-z0-9._:-]{0,79}$/i.test(id)) {
    throw new Error(`ID de etapa durável inválido: ${id}.`);
  }
  if (seen.has(id)) throw new Error(`ID de etapa durável duplicado: ${id}.`);
  seen.add(id);
}

function assertSerializable(value: unknown, id: string): void {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new Error('resultado indefinido');
  } catch (cause) {
    throw new Error(`Resultado da etapa ${id} não é serializável em JSON.`, { cause });
  }
}

export async function runDurableSteps(
  runner: DurableStepRunner,
  steps: readonly DurableWorkflowStep[],
): Promise<Record<string, unknown>> {
  if (steps.length === 0) throw new Error('Workflow durável sem etapas.');
  const seen = new Set<string>();
  for (const step of steps) assertStepId(step.id, seen);

  const results: Record<string, unknown> = {};
  for (const step of steps) {
    const value = await runner.run(step.id, async () => {
      const output = await step.run(Object.freeze({ ...results }));
      assertSerializable(output, step.id);
      return output;
    });
    results[step.id] = value;
  }
  return results;
}
