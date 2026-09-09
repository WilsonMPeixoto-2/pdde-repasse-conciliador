import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { analyzeLiveFinancialConsistency } from '../backend/application/verify-live-financial-consistency';
import type { RunFinancialIntelligenceMonitoringResult } from '../backend/application/run-financial-intelligence-monitoring';

const inputPath = resolve(process.argv[2] ?? 'artifacts/monitor-live-2026.json');
const raw = JSON.parse(await readFile(inputPath, 'utf8')) as RunFinancialIntelligenceMonitoringResult['raw'];
const report = analyzeLiveFinancialConsistency(raw);

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.status !== 'PASS') process.exitCode = 2;
