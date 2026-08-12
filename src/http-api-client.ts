export interface ApiResponse<T = unknown> {
  data: T;
}

async function responseData(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!body) return null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw new Error(`A API retornou JSON inválido (HTTP ${response.status}).`);
    }
  }
  return body;
}

function errorMessage(data: unknown, response: Response): string {
  if (data && typeof data === 'object') {
    if ('error' in data && typeof data.error === 'string') return data.error;
    if ('message' in data && typeof data.message === 'string') return data.message;
  }
  if (typeof data === 'string' && data.trim()) return data.trim();
  return `A API respondeu com HTTP ${response.status}.`;
}

async function request<T>(
  path: string,
  init: RequestInit,
): Promise<ApiResponse<T>> {
  if (!path.startsWith('/')) throw new Error(`Caminho de API inválido: ${path}.`);
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
  });
  const data = await responseData(response);
  if (!response.ok) throw new Error(errorMessage(data, response));
  return { data: data as T };
}

export const api = {
  get<T = unknown>(path: string): Promise<ApiResponse<T>> {
    return request<T>(path, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  },
  post<T = unknown>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return request<T>(path, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  },
};
