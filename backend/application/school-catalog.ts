import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const schoolSchema = z.object({
  inep: z.string().regex(/^\d{8}$/),
  sme: z.string().regex(/^\d{7}$/),
  nome: z.string().min(1),
}).strict();
const masterSchema = z.object({
  schools: z.array(schoolSchema).length(163),
}).strict();

export type MasterSchool = z.infer<typeof schoolSchema>;

export async function loadMasterSchools(): Promise<MasterSchool[]> {
  const source = await readFile(new URL('../schools4cre.json', import.meta.url), 'utf8');
  const parsed = masterSchema.parse(JSON.parse(source) as unknown);
  const uniqueIneps = new Set(parsed.schools.map((school) => school.inep));
  const uniqueSme = new Set(parsed.schools.map((school) => school.sme));
  if (uniqueIneps.size !== 163 || uniqueSme.size !== 163) {
    throw new Error('A lista-mestre das 163 escolas não é única por INEP/SME.');
  }
  return parsed.schools;
}
