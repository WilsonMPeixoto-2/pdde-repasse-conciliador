import { readdir, readFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { z } from 'zod';
import {
  parseSigefReleaseHtml,
  type SigefReleaseHtmlResult,
} from '../adapters/sigef-releases-html';
import { canonicalCnpj, canonicalProgramCode } from '../core/normalization';

export const DEFAULT_SIGEF_RELEASE_SOURCE_URL =
  'https://www.fnde.gov.br/sigefweb/index.php/liberacoes';

const expectedPairSchema = z.object({
  cnpj: z.string().min(1),
  programCode: z.string().min(1),
}).strict();

const releaseManifestSchema = z.array(z.object({
  path: z.string().min(1),
  programCode: z.string().min(1),
  sourceUrl: z.string().url(),
}).strict()).min(1, 'O manifesto de Liberações está vazio.');

const optionsSchema = z.object({
  fiscalYear: z.number().int().min(2000).max(2100),
  expectedPairs: z.array(expectedPairSchema).min(1),
  manifestPath: z.string().min(1).optional(),
  directoryPath: z.string().min(1).optional(),
  directorySourceUrl: z.string().url().default(DEFAULT_SIGEF_RELEASE_SOURCE_URL),
}).strict().superRefine((value, context) => {
  if (value.manifestPath && value.directoryPath) {
    context.addIssue({
      code: 'custom',
      message: 'Use manifesto ou pasta de Liberações, nunca os dois na mesma execução.',
    });
  }
});

export interface ReleasePair {
  cnpj: string;
  programCode: string;
}

export interface LoadedReleaseFile extends ReleasePair {
  path: string;
  sourceUrl: string;
  records: number;
}

export interface LoadSigefReleaseExportsResult {
  mode: 'none' | 'manifest' | 'directory';
  exports: SigefReleaseHtmlResult[];
  files: LoadedReleaseFile[];
  coverage: {
    expectedPairs: number;
    importedPairs: number;
    missingPairs: ReleasePair[];
  };
}

interface ReleaseFileInput {
  path: string;
  programCode: string;
  sourceUrl: string;
  expectedCnpj?: string;
}

function pairKey(pair: ReleasePair): string {
  return `${canonicalCnpj(pair.cnpj)}:${canonicalProgramCode(pair.programCode)}`;
}

function normalizedPair(pair: ReleasePair): ReleasePair {
  return {
    cnpj: canonicalCnpj(pair.cnpj),
    programCode: canonicalProgramCode(pair.programCode),
  };
}

function comparePairs(left: ReleasePair, right: ReleasePair): number {
  return pairKey(left).localeCompare(pairKey(right), 'en');
}

async function parseJsonFile(path: string): Promise<unknown> {
  let source: string;
  try {
    source = await readFile(path, 'utf8');
  } catch (error) {
    throw new Error(
      `Não foi possível ler o manifesto ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  try {
    return JSON.parse(source) as unknown;
  } catch (error) {
    throw new Error(
      `JSON inválido no manifesto ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function manifestEntryPath(manifestPath: string, entryPath: string): string {
  return isAbsolute(entryPath) ? entryPath : resolve(dirname(manifestPath), entryPath);
}

async function manifestInputs(manifestPath: string): Promise<ReleaseFileInput[]> {
  const entries = releaseManifestSchema.parse(await parseJsonFile(manifestPath));
  return entries.map((entry) => ({
    path: manifestEntryPath(manifestPath, entry.path),
    programCode: canonicalProgramCode(entry.programCode),
    sourceUrl: entry.sourceUrl,
  }));
}

function directoryFilePair(filename: string): ReleasePair {
  const match = filename.match(/^(\d{14})__([0-9A-Z]+)\.xls$/i);
  if (!match) {
    throw new Error(
      `Arquivo de Liberações mal nomeado: ${filename}. Use o padrão CNPJ__PROGRAMA.xls.`,
    );
  }
  return normalizedPair({ cnpj: match[1], programCode: match[2] });
}

async function directoryInputs(
  directoryPath: string,
  sourceUrl: string,
): Promise<ReleaseFileInput[]> {
  let entries;
  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    throw new Error(
      `Não foi possível ler a pasta de Liberações ${directoryPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const xlsFiles = entries
    .filter((entry) => entry.isFile() && /\.xls$/i.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name, 'en'));
  if (xlsFiles.length === 0) {
    throw new Error(`A pasta ${directoryPath} não contém nenhum arquivo .xls de Liberações.`);
  }
  return xlsFiles.map((entry) => {
    const pair = directoryFilePair(entry.name);
    return {
      path: resolve(directoryPath, entry.name),
      programCode: pair.programCode,
      sourceUrl,
      expectedCnpj: pair.cnpj,
    };
  });
}

async function readReleaseFile(path: string): Promise<Buffer> {
  try {
    return await readFile(path);
  } catch (error) {
    throw new Error(
      `Não foi possível ler a exportação ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function loadSigefReleaseExports(
  rawOptions: z.input<typeof optionsSchema>,
): Promise<LoadSigefReleaseExportsResult> {
  const options = optionsSchema.parse(rawOptions);
  const expectedByKey = new Map<string, ReleasePair>();
  for (const rawPair of options.expectedPairs) {
    const pair = normalizedPair(rawPair);
    expectedByKey.set(pairKey(pair), pair);
  }
  const targetCnpjs = [...new Set(
    [...expectedByKey.values()].map((pair) => pair.cnpj),
  )];
  const expectedProgramCodes = new Set(
    [...expectedByKey.values()].map((pair) => pair.programCode),
  );

  let mode: LoadSigefReleaseExportsResult['mode'] = 'none';
  let inputs: ReleaseFileInput[] = [];
  if (options.manifestPath) {
    mode = 'manifest';
    inputs = await manifestInputs(options.manifestPath);
  } else if (options.directoryPath) {
    mode = 'directory';
    inputs = await directoryInputs(options.directoryPath, options.directorySourceUrl);
  }

  const loadedByKey = new Map<string, {
    export: SigefReleaseHtmlResult;
    file: LoadedReleaseFile;
  }>();

  for (const input of inputs) {
    const programCode = canonicalProgramCode(input.programCode);
    if (!expectedProgramCodes.has(programCode)) {
      throw new Error(
        `O programa ${programCode} da exportação ${input.path} não pertence à carteira.`,
      );
    }
    if (input.expectedCnpj) {
      const declaredPair = normalizedPair({
        cnpj: input.expectedCnpj,
        programCode,
      });
      if (!expectedByKey.has(pairKey(declaredPair))) {
        throw new Error(
          `O par CNPJ/programa ${declaredPair.cnpj}/${declaredPair.programCode} declarado no arquivo ${input.path} não pertence à carteira.`,
        );
      }
    }
    const parsed = parseSigefReleaseHtml(await readReleaseFile(input.path), {
      fiscalYear: options.fiscalYear,
      programCode,
      targetCnpjs,
      sourceUrl: input.sourceUrl,
    });
    const pair = normalizedPair({ cnpj: parsed.entity.cnpj, programCode });
    if (input.expectedCnpj && pair.cnpj !== input.expectedCnpj) {
      throw new Error(
        `O CNPJ ${pair.cnpj} dentro da exportação diverge do CNPJ ${input.expectedCnpj} informado no nome do arquivo ${input.path}.`,
      );
    }
    const key = pairKey(pair);
    if (!expectedByKey.has(key)) {
      throw new Error(
        `O par CNPJ/programa ${pair.cnpj}/${pair.programCode} da exportação ${input.path} não pertence à carteira.`,
      );
    }
    if (loadedByKey.has(key)) {
      throw new Error(`Exportação de Liberações duplicada para ${pair.cnpj}/${pair.programCode}.`);
    }
    loadedByKey.set(key, {
      export: parsed,
      file: {
        ...pair,
        path: input.path,
        sourceUrl: input.sourceUrl,
        records: parsed.statistics.releaseRows,
      },
    });
  }

  const loaded = [...loadedByKey.values()].sort(
    (left, right) => comparePairs(left.file, right.file),
  );
  const missingPairs = [...expectedByKey.entries()]
    .filter(([key]) => !loadedByKey.has(key))
    .map(([, pair]) => pair)
    .sort(comparePairs);

  return {
    mode,
    exports: loaded.map((item) => item.export),
    files: loaded.map((item) => item.file),
    coverage: {
      expectedPairs: expectedByKey.size,
      importedPairs: loadedByKey.size,
      missingPairs,
    },
  };
}
