import { humanPortfolioSchema, humanSchoolSchema, type HumanPortfolio, type HumanSchool } from './types';

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error('O serviço financeiro respondeu em um formato inesperado.');
  }
  return response.json();
}

async function request(path: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { headers: { Accept: 'application/json' }, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error('Não foi possível consultar os dados financeiros agora.');
  }
  if (response.status === 404) {
    throw new Error('A posição financeira de 2026 ainda não foi publicada para esta consulta.');
  }
  if (!response.ok) {
    throw new Error('Os dados financeiros estão temporariamente indisponíveis.');
  }
  return readJson(response);
}

export async function loadHumanPortfolio(signal?: AbortSignal): Promise<HumanPortfolio> {
  return humanPortfolioSchema.parse(await request('/api/current/human/portfolio', signal));
}

export async function loadHumanSchool(inep: string, signal?: AbortSignal): Promise<HumanSchool> {
  if (!/^\d{8}$/.test(inep)) throw new Error('INEP inválido.');
  return humanSchoolSchema.parse(await request(`/api/current/human/schools/${encodeURIComponent(inep)}`, signal));
}
