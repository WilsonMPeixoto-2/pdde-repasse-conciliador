import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  loadHumanPortfolio,
  loadHumanSchool,
} from './api';
import {
  runLivePortfolioQuery,
  type LivePortfolioProgress,
} from './live-portfolio';
import type { HumanPortfolio, HumanSchool } from './types';

type PortfolioState =
  | { status: 'loading'; data: null; error: null }
  | {
      status: 'ready';
      data: HumanPortfolio;
      error: null;
      source: 'published' | 'live';
    }
  | { status: 'error'; data: null; error: string };

type PortfolioActions = {
  loadSchool: (inep: string, signal?: AbortSignal) => Promise<HumanSchool>;
  refreshLive: () => Promise<void>;
};

type PortfolioContextValue = PortfolioState & PortfolioActions & {
  refreshing: boolean;
  refreshError: string | null;
  refreshProgress: LivePortfolioProgress | null;
  liveGeneratedAt: string | null;
};

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider(props: { children: ReactNode }) {
  const [state, setState] = useState<PortfolioState>({ status: 'loading', data: null, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshProgress, setRefreshProgress] = useState<LivePortfolioProgress | null>(null);
  const [liveGeneratedAt, setLiveGeneratedAt] = useState<string | null>(null);
  const liveSchoolsRef = useRef<Record<string, HumanSchool> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadHumanPortfolio(controller.signal)
      .then((data) => setState({ status: 'ready', data, error: null, source: 'published' }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error.message : 'Não foi possível abrir a posição financeira.',
        });
      });
    return () => controller.abort();
  }, []);

  const refreshLive = useCallback(async (): Promise<void> => {
    if (refreshing || state.status !== 'ready') return;

    const ineps = state.data.schools.map((school) => school.inep);
    setRefreshing(true);
    setRefreshError(null);
    setRefreshProgress({ completed: 0, total: ineps.length, succeeded: 0, failed: 0 });

    try {
      const result = await runLivePortfolioQuery(ineps, {
        concurrency: 3,
        attempts: 2,
        onProgress: setRefreshProgress,
      });
      liveSchoolsRef.current = result.schools;
      setLiveGeneratedAt(result.generatedAt);
      setState({ status: 'ready', data: result.portfolio, error: null, source: 'live' });
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : 'Não foi possível concluir a nova consulta.');
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, state]);

  const loadSchool = useCallback(async (inep: string, signal?: AbortSignal): Promise<HumanSchool> => {
    const liveSchool = liveSchoolsRef.current?.[inep];
    if (liveSchool) return liveSchool;
    return loadHumanSchool(inep, signal);
  }, []);

  const value = useMemo<PortfolioContextValue>(() => ({
    ...state,
    refreshing,
    refreshError,
    refreshProgress,
    liveGeneratedAt,
    refreshLive,
    loadSchool,
  }), [
    state,
    refreshing,
    refreshError,
    refreshProgress,
    liveGeneratedAt,
    refreshLive,
    loadSchool,
  ]);

  return <PortfolioContext.Provider value={value}>{props.children}</PortfolioContext.Provider>;
}

export function usePortfolio(): PortfolioContextValue {
  const value = useContext(PortfolioContext);
  if (!value) throw new Error('usePortfolio precisa estar dentro de PortfolioProvider.');
  return value;
}
