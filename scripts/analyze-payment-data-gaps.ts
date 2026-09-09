import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { analyzePaymentDataGaps } from '../backend/application/analyze-payment-data-gaps';

const [
  inputPath = '.tmp/monitor-all-163/financial-intelligence.json',
  outputPath = 'artifacts/full-163-session/payment-data-gaps.json',
] = process.argv.slice(2);

const raw = JSON.parse(await readFile(resolve(inputPath), 'utf8')) as unknown;
const report = analyzePaymentDataGaps(raw);
const destination = resolve(outputPath);
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  status: report.status,
  totalPaidRepasses: report.totalPaidRepasses,
  confirmedBankCredits: report.confirmedBankCredits,
  unresolvedPayments: report.unresolvedPayments,
  countsByGapReason: report.countsByGapReason,
  countsByRecoveryStatus: report.countsByRecoveryStatus,
  countsByPaymentDate: report.countsByPaymentDate,
  output: destination,
}, null, 2));
