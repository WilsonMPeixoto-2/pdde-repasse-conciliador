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
import { downloadCurrentWorkbook } from './export-workbook';
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
  downloadWorkbook: () => Promise<void>;
};

type PortfolioContextValue = PortfolioState & PortfolioActions & {
  refreshing: boolean;
  refreshError: string | null;
  refreshProgress: LivePortfolioProgress | null;
  liveGeneratedAt: string | null;
  exportingWorkbook: boolean;
  exportError: string | null;
};

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider(props: { children: ReactNode }) {
  const [state, setState] = useState<PortfolioState>({ status: 'loading', data: null, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshProgress, setRefreshProgress] = useState<LivePortfolioProgress | null>(null);
  const [liveGeneratedAt, setLiveGeneratedAt] = useState<string | null>(null);
  const [exportingWorkbook, setExportingWorkbook] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
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

  const downloadWorkbook = useCallback(async (): Promise<void> => {
    if (refreshing || exportingWorkbook || state.status !== 'ready') return;
    setExportingWorkbook(true);
    setExportError(null);

    try {
      const schools = state.source === 'live' && liveSchoolsRef.current
        ? state.data.schools.map((summary) => {
            const school = liveSchoolsRef.current?.[summary.inep];
            if (!school) throw new Error(`A unidade ${summary.inep} não está disponível para exportação.`);
            return school;
          })
        : await Promise.all(state.data.schools.map((summary) => loadHumanSchool(summary.inep)));
      await downloadCurrentWorkbook(state.data, schools, state.source === 'live' ? liveGeneratedAt : null);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Não foi possível gerar a planilha agora.');
    } finally {
      setExportingWorkbook(false);
    }
  }, [exportingWorkbook, liveGeneratedAt, refreshing, state]);

  const value = useMemo<PortfolioContextValue>(() => ({
    ...state,
    refreshing,
    refreshError,
    refreshProgress,
    liveGeneratedAt,
    exportingWorkbook,
    exportError,
    refreshLive,
    loadSchool,
    downloadWorkbook,
  }), [
    state,
    refreshing,
    refreshError,
    refreshProgress,
    liveGeneratedAt,
    exportingWorkbook,
    exportError,
    refreshLive,
    loadSchool,
    downloadWorkbook,
  ]);

  return <PortfolioContext.Provider value={value}>{props.children}</PortfolioContext.Provider>;
}

export function usePortfolio(): PortfolioContextValue {
  const value = useContext(PortfolioContext);
  if (!value) throw new Error('usePortfolio precisa estar dentro de PortfolioProvider.');
  return value;
}
