import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { z } from 'zod';

const DEFAULT_BASE_URL = 'https://www.fnde.gov.br/plataforma-antonieta-de-barros-api/products';

const artifactMetadataSchema = z.object({
  size: z.number().int().positive().nullable(),
  name: z.string().min(1),
  lastUpdated: z.string().datetime({ offset: true }).nullable(),
  path: z.string().default(''),
}).passthrough();

export type AntonietaArtifactMetadata = z.infer<typeof artifactMetadataSchema>;

export interface AntonietaDataProductProbe {
  productId: number;
  metadataUrl: string;
  artifactUrl: string;
  metadata: AntonietaArtifactMetadata;
  compressedBytes: number;
  compressedSha256: string;
  metadataSizeMatchesDownload: boolean | null;
  recordCount: number;
  header: string[] | null;
  headerFieldCount: number | null;
  fieldCountDistribution: Record<string, number>;
  dominantFieldCount: number | null;
  nonDominantFieldCount: number;
  yearColumnIndexes: number[];
  inepColumnIndexes: number[];
  years: Record<string, number>;
  matchedTargetIneps: string[];
  targetMatchCountsByYear: Record<string, number>;
  sample2026Rows: string[][];
  sample2026TargetRows: string[][];
}

export interface ProbeAntonietaDataProductOptions {
  productId: number;
  targetIneps: ReadonlySet<string>;
  fetchImpl?: typeof fetch;
  maxSamples?: number;
  signal?: AbortSignal;
  baseUrl?: string;
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isYearHeader(value: string): boolean {
  const normalized = normalizeHeader(value);
  return normalized === 'ANO'
    || normalized === 'EXERCICIO'
    || normalized.includes('ANO_EXERCICIO')
    || normalized.includes('EXERCICIO_ANO');
}

function isInepHeader(value: string): boolean {
  const normalized = normalizeHeader(value);
  return normalized.includes('INEP')
    || normalized === 'CO_ENTIDADE'
    || normalized === 'CODIGO_ESCOLA'
    || normalized === 'CO_ESCOLA';
}

function normalizeInep(value: string): string {
  return value.replace(/\D/g, '');
}

function yearsInRow(row: readonly string[], indexes: readonly number[]): string[] {
  if (indexes.length === 0) return [];
  const candidates = indexes.map((index) => row[index] ?? '');
  return [...new Set(candidates
    .map((value) => value.trim())
    .filter((value) => /^(?:19|20)\d{2}$/.test(value)))];
}

function targetInepsInRow(
  row: readonly string[],
  indexes: readonly number[],
  targetIneps: ReadonlySet<string>,
): string[] {
  const candidates = indexes.length > 0
    ? indexes.map((index) => row[index] ?? '')
    : row;
  return [...new Set(candidates
    .map(normalizeInep)
    .filter((value) => /^\d{8}$/.test(value) && targetIneps.has(value)))];
}

function increment(counter: Map<string, number>, key: string): void {
  counter.set(key, (counter.get(key) ?? 0) + 1);
}

function orderedCounter(counter: Map<string, number>): Record<string, number> {
  return Object.fromEntries([...counter.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

/**
 * Interpreta uma linha física do artefato sem permitir que aspas defeituosas em
 * um registro nacional contaminem o estado do registro seguinte. A Antonieta
 * contém tanto campos CSV realmente delimitados por aspas quanto aspas
 * literais no meio de nomes de escolas. Quando uma aspa de abertura não fecha
 * na própria linha, a linha é tratada de forma conservadora como delimitada
 * apenas por ponto e vírgula. Assim a anomalia permanece visível na distribuição
 * de colunas, mas não impede a leitura das escolas subsequentes da carteira.
 */
function parseSemicolonPhysicalLine(line: string): string[] {
  const fallback = (): string[] => line.split(';').map((value) => value.trim());
  const row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index] ?? '';

    if (inQuotes) {
      if (char !== '"') {
        field += char;
        continue;
      }

      if (line[index + 1] === '"') {
        field += '"';
        index += 1;
        continue;
      }

      let nextMeaningful = index + 1;
      while (nextMeaningful < line.length && /\s/.test(line[nextMeaningful] ?? '')) {
        nextMeaningful += 1;
      }
      if (nextMeaningful === line.length || line[nextMeaningful] === ';') {
        inQuotes = false;
        index = nextMeaningful - 1;
        continue;
      }

      // Aspa dentro de um campo já delimitado, mas sem função estrutural.
      field += '"';
      continue;
    }

    if (char === ';') {
      row.push(field.trim());
      field = '';
      continue;
    }

    if (char === '"' && field.trim().length === 0) {
      field = '';
      inQuotes = true;
      continue;
    }

    field += char;
  }

  if (inQuotes) return fallback();
  row.push(field.trim());
  return row;
}

async function fetchChecked(
  fetchImpl: typeof fetch,
  url: string,
  signal: AbortSignal | undefined,
  accept: string,
): Promise<Response> {
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { accept },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Antonieta respondeu HTTP ${response.status} em ${url}${detail ? `: ${detail.slice(0, 500)}` : ''}`);
  }
  return response;
}

export async function probeAntonietaDataProduct(
  options: ProbeAntonietaDataProductOptions,
): Promise<AntonietaDataProductProbe> {
  const productId = z.number().int().positive().parse(options.productId);
  const maxSamples = z.number().int().positive().max(100).parse(options.maxSamples ?? 20);
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  const metadataUrl = `${baseUrl}/data-products/${productId}/artifact-metadata`;
  const artifactUrl = `${baseUrl}/data-products/${productId}/artifact`;

  const metadataResponse = await fetchChecked(
    fetchImpl,
    metadataUrl,
    options.signal,
    'application/json',
  );
  const metadata = artifactMetadataSchema.parse(await metadataResponse.json());

  const artifactResponse = await fetchChecked(
    fetchImpl,
    artifactUrl,
    options.signal,
    'application/gzip, application/octet-stream, */*',
  );
  if (!artifactResponse.body) throw new Error(`Antonieta retornou artefato ${productId} sem corpo.`);

  let compressedBytes = 0;
  const hash = createHash('sha256');
  const meter = new Transform({
    transform(chunk: Buffer | Uint8Array, _encoding, callback) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      compressedBytes += bytes.length;
      hash.update(bytes);
      callback(null, bytes);
    },
  });

  const source = Readable.from(artifactResponse.body as AsyncIterable<Uint8Array>);
  const gunzip = createGunzip();
  const pumping = pipeline(source, meter, gunzip);
  const lines = createInterface({ input: gunzip, crlfDelay: Infinity });

  let header: string[] | null = null;
  let recordCount = 0;
  const fieldCounts = new Map<string, number>();
  const years = new Map<string, number>();
  const matchedTargetIneps = new Set<string>();
  const targetMatchCountsByYear = new Map<string, number>();
  const sample2026Rows: string[][] = [];
  const sample2026TargetRows: string[][] = [];
  let yearColumnIndexes: number[] = [];
  let inepColumnIndexes: number[] = [];

  try {
    for await (const physicalLine of lines) {
      if (!physicalLine.trim()) continue;
      const row = parseSemicolonPhysicalLine(physicalLine);
      if (!header) {
        if (row[0]) row[0] = row[0].replace(/^\uFEFF/, '');
        header = row;
        yearColumnIndexes = header.flatMap((value, index) => isYearHeader(value) ? [index] : []);
        inepColumnIndexes = header.flatMap((value, index) => isInepHeader(value) ? [index] : []);
        continue;
      }

      recordCount += 1;
      increment(fieldCounts, String(row.length));
      const rowYears = yearsInRow(row, yearColumnIndexes);
      const rowTargets = targetInepsInRow(row, inepColumnIndexes, options.targetIneps);
      for (const year of rowYears) increment(years, year);
      for (const inep of rowTargets) matchedTargetIneps.add(inep);
      for (const year of rowYears) {
        for (const inep of rowTargets) increment(targetMatchCountsByYear, `${year}:${inep}`);
      }
      if (rowYears.includes('2026') && sample2026Rows.length < maxSamples) sample2026Rows.push(row);
      if (rowYears.includes('2026') && rowTargets.length > 0 && sample2026TargetRows.length < maxSamples) {
        sample2026TargetRows.push(row);
      }
    }
    await pumping;
  } catch (cause) {
    lines.close();
    await pumping.catch(() => undefined);
    throw cause;
  }

  if (!header) throw new Error(`Artefato Antonieta ${productId} não contém cabeçalho CSV.`);

  const distribution = [...fieldCounts.entries()]
    .map(([fieldCount, count]) => ({ fieldCount: Number(fieldCount), count }))
    .sort((left, right) => right.count - left.count || left.fieldCount - right.fieldCount);
  const dominantFieldCount = distribution[0]?.fieldCount ?? null;
  const dominantCount = distribution[0]?.count ?? 0;

  return {
    productId,
    metadataUrl,
    artifactUrl,
    metadata,
    compressedBytes,
    compressedSha256: hash.digest('hex'),
    metadataSizeMatchesDownload: metadata.size === null ? null : metadata.size === compressedBytes,
    recordCount,
    header,
    headerFieldCount: header.length,
    fieldCountDistribution: orderedCounter(fieldCounts),
    dominantFieldCount,
    nonDominantFieldCount: recordCount - dominantCount,
    yearColumnIndexes,
    inepColumnIndexes,
    years: orderedCounter(years),
    matchedTargetIneps: [...matchedTargetIneps].sort(),
    targetMatchCountsByYear: orderedCounter(targetMatchCountsByYear),
    sample2026Rows,
    sample2026TargetRows,
  };
}
