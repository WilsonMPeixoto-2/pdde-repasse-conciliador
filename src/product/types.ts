import { z } from 'zod';
import {
  humanAccountSchema,
  humanIndicatorSchema,
  humanPortfolioMetricsSchema,
  humanPortfolioSchoolSchema,
  humanPositionSchema,
  humanPublicPortfolioSchema,
  humanPublicSchoolSchema,
  humanUnitSchema,
} from '../../shared/human-financial-contract';

export {
  humanPortfolioMetricsSchema,
  humanPortfolioSchoolSchema,
  humanPositionSchema,
  humanUnitSchema,
} from '../../shared/human-financial-contract';

export const humanPortfolioSchema = humanPublicPortfolioSchema;
export const humanSchoolSchema = humanPublicSchoolSchema;

export type HumanPortfolio = z.infer<typeof humanPortfolioSchema>;
export type HumanSchool = z.infer<typeof humanSchoolSchema>;
export type HumanAccount = z.infer<typeof humanAccountSchema>;
export type HumanPosition = z.infer<typeof humanPositionSchema>;
export type HumanIndicator = z.infer<typeof humanIndicatorSchema>;
export type HumanUnit = z.infer<typeof humanUnitSchema>;
export type HumanPortfolioSchool = z.infer<typeof humanPortfolioSchoolSchema>;
