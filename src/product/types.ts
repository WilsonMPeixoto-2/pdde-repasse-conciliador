import { z } from 'zod';
import {
  humanAccountSchema,
  humanIndicatorSchema,
  humanPortfolioMetricsSchema,
  humanPositionSchema,
  humanSchoolContentSchema,
  humanSourceSchema,
  humanUnitSchema,
} from '../../shared/human-financial-contract';

export { humanPortfolioMetricsSchema, humanPositionSchema, humanUnitSchema } from '../../shared/human-financial-contract';

export const humanPortfolioSchema = z.object({
  title: z.literal('Inteligência Financeira PDDE | 4ª CRE'),
  fiscalYear: z.literal(2026),
  referenceLabel: z.string().min(1),
  schoolCount: z.number().int().positive(),
  metrics: humanPortfolioMetricsSchema,
  sources: z.array(humanSourceSchema).min(1),
  indicators: z.array(humanIndicatorSchema),
  schools: z.array(humanUnitSchema),
}).strict().refine((value) => value.schoolCount === value.schools.length, {
  message: 'Cobertura escolar divergente no portfólio humano.',
}).refine((value) => value.metrics.schoolCount === value.schoolCount, {
  message: 'Métricas e cobertura escolar divergem.',
});

export const humanSchoolSchema = humanSchoolContentSchema.extend({
  fiscalYear: z.literal(2026),
}).strict();

export type HumanPortfolio = z.infer<typeof humanPortfolioSchema>;
export type HumanSchool = z.infer<typeof humanSchoolSchema>;
export type HumanAccount = z.infer<typeof humanAccountSchema>;
export type HumanPosition = z.infer<typeof humanPositionSchema>;
export type HumanIndicator = z.infer<typeof humanIndicatorSchema>;
export type HumanUnit = z.infer<typeof humanUnitSchema>;
