const BASE = 'https://www.fnde.gov.br/sigefweb/index.php/extratos';

export interface SigefPublicProgramOption {
  value: string;
  label: string;
}

export interface SigefPublicExtractProbe {
  status: 'AVAILABLE' | 'UNAVAILABLE';
  supportsPdde: boolean;
  programCode: '02';
  programs: SigefPublicProgramOption[];
  sourceUrl: string;
  detail: string | null;
}

function assertFiscalYear(year: number): void {
  if (year !== 2026) throw new Error(`SIGEF Extratos: exercício fora do escopo corrente: ${year}.`);
}

function month(value: number, label: string): string {
  if (!Number.isInteger(value) || value < 1 || value > 12) {
    throw new Error(`SIGEF Extratos: ${label} inválido: ${value}.`);
  }
  return String(value).padStart(2, '0');
}

function program(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[0-9A-Z]{2}$/.test(normalized)) {
    throw new Error(`SIGEF Extratos: programa inválido: ${value}.`);
  }
  return normalized;
}

export function buildSigefProgramsForYearUrl(year: number): string {
  assertFiscalYear(year);
  return `${BASE}/ajax/ano/${year}`;
}

export function buildSigefBulkExtractUrl(input: {
  year: number;
  programCode: string;
  startMonth: number;
  endMonth: number;
}): string {
  assertFiscalYear(input.year);
  if (input.startMonth > input.endMonth) {
    throw new Error('SIGEF Extratos: mês inicial não pode ser posterior ao mês final.');
  }
  const start = month(input.startMonth, 'mês inicial');
  const end = month(input.endMonth, 'mês final');
  return `${BASE}/gerar-extrato-bancario/ano/${input.year}`
    + `/programa/${program(input.programCode)}`
    + `/mes_ini/${start}/mes_fim/${end}`;
}

export function parseSigefProgramsForYearJson(raw: string): SigefPublicProgramOption[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('SIGEF Extratos: lista de programas inesperada.');
  const programs: SigefPublicProgramOption[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') throw new Error('SIGEF Extratos: item de programa inválido.');
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.value !== 'string' || typeof candidate.label !== 'string') {
      throw new Error('SIGEF Extratos: programa sem código/rótulo válido.');
    }
    const value = program(candidate.value);
    const label = candidate.label.trim();
    if (!label) throw new Error('SIGEF Extratos: rótulo de programa vazio.');
    programs.push({ value, label });
  }
  return programs;
}

export async function probeSigefPublicExtracts(input: {
  year: number;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}): Promise<SigefPublicExtractProbe> {
  const sourceUrl = buildSigefProgramsForYearUrl(input.year);
  const fetchImpl = input.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(sourceUrl, {
      signal: input.signal,
      headers: {
        Accept: 'application/json,text/plain;q=0.9,*/*;q=0.1',
        'Cache-Control': 'no-cache, no-store, max-age=0',
        Pragma: 'no-cache',
        'User-Agent': 'PDDE-4CRE/0.6 public-source-probe',
      },
    });
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    const raw = await response.text();
    if (!response.ok || !contentType.includes('json')) {
      return {
        status: 'UNAVAILABLE',
        supportsPdde: false,
        programCode: '02',
        programs: [],
        sourceUrl,
        detail: `Índice público respondeu ${response.status} em formato não JSON.`,
      };
    }
    const programs = parseSigefProgramsForYearJson(raw);
    const supportsPdde = programs.some((item) => item.value === '02');
    return {
      status: supportsPdde ? 'AVAILABLE' : 'UNAVAILABLE',
      supportsPdde,
      programCode: '02',
      programs,
      sourceUrl,
      detail: supportsPdde
        ? 'O índice público do SIGEF oferece o programa 02 (PDDE) para 2026. O download consolidado continua sujeito às validações legítimas do portal; nenhum CAPTCHA deve ser contornado.'
        : 'O índice público respondeu, mas não anunciou o programa 02 (PDDE).',
    };
  } catch (cause) {
    return {
      status: 'UNAVAILABLE',
      supportsPdde: false,
      programCode: '02',
      programs: [],
      sourceUrl,
      detail: cause instanceof Error ? cause.message : String(cause),
    };
  }
}
