import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { probeAntonietaDataProduct } from '../backend/adapters/antonieta-data-product';
import { loadMasterSchools } from '../backend/application/school-catalog';

const [productIdArg = '24', outputArg = 'artifacts/antonieta-pdde-product-24.json'] = process.argv.slice(2);
const productId = Number(productIdArg);
if (!Number.isInteger(productId) || productId < 1) throw new Error(`Produto Antonieta inválido: ${productIdArg}.`);

const schools = await loadMasterSchools();
if (schools.length !== 163) {
  throw new Error(`Catálogo mestre inesperado: ${schools.length}/163 escolas.`);
}
const targetIneps = new Set(schools.map((school) => school.inep));
const signal = AbortSignal.timeout(30 * 60 * 1000);
const probe = await probeAntonietaDataProduct({ productId, targetIneps, signal, maxSamples: 25 });
const output = resolve(outputArg);
await mkdir(dirname(output), { recursive: true });
const document = {
  generatedAt: new Date().toISOString(),
  targetSchoolCount: targetIneps.size,
  ...probe,
};
await writeFile(output, `${JSON.stringify(document, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  productId: probe.productId,
  artifact: probe.metadata.name,
  metadataLastUpdated: probe.metadata.lastUpdated,
  compressedBytes: probe.compressedBytes,
  metadataSizeMatchesDownload: probe.metadataSizeMatchesDownload,
  recordCount: probe.recordCount,
  years: probe.years,
  matchedTargetSchools: probe.matchedTargetIneps.length,
  matchedTargetRows2026: Object.entries(probe.targetMatchCountsByYear)
    .filter(([key]) => key.startsWith('2026:'))
    .reduce((total, [, count]) => total + count, 0),
  sample2026Rows: probe.sample2026Rows.length,
  output,
}, null, 2));
