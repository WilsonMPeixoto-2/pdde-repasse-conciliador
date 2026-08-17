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
  loadTemporaryPortfolio,
  loadTemporarySchool,
  loadTemporarySessionStatus,
  loadTemporaryWorkbook,
  startTemporarySession,
} from './api';
import type { HumanPortfolio, HumanSchool } from './types';

const SESSION_STORAGE_KEY = 'pdde-financial-temporary-session-v1';

type SessionPhase = 'QUEUED' | 'RUNNING' | 'FINALIZING';
type SessionTerminalStatus = 'COMPLETE' | 'PARTIAL';

type PortfolioState =
  | { status: 'loading'; data: null; error: null }
  | { status: 'idle'; data: null; error: null }
  | { status: 'running'; data: null; error: null; phase: SessionPhase; sessionId: string }
  | {
      status: 'ready';
      data: HumanPortfolio;
      error: null;
      source: 'persistent' | 'temporary';
      sessionId?: string;
      sessionStatus?: SessionTerminalStatus;
    }
  | { status: 'error'; data: null; error: string };

type SessionCredentials = { accessKey: string; sessionId: string };

type PortfolioActions = {
  startTemporary: (accessKey: string, ineps: 'all' | string[]) => Promise<void>;
  loadSchool: (inep: string, signal?: AbortSignal) => Promise<HumanSchool>;
  downloadWorkbook: () => Promise<void>;
  resetTemporary: () => void;
};

type PortfolioContextValue = PortfolioState & PortfolioActions;

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

function missingPersistentSnapshot(error: unknown): boolean {
  return error instanceof Error && /ainda não foi publicada/i.test(error.message);
}

function readStoredSession(): SessionCredentials | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionCredentials>;
    if (typeof parsed.accessKey !== 'string' || parsed.accessKey.length < 24) return null;
    if (typeof parsed.sessionId !== 'string' || !/^[A-Za-z0-9._:-]+$/.test(parsed.sessionId)) return null;
    return { accessKey: parsed.accessKey, sessionId: parsed.sessionId };
  } catch {
    return null;
  }
}

function storeSession(credentials: SessionCredentials | null): void {
  try {
    if (!credentials) sessionStorage.removeItem(SESSION_STORAGE_KEY);
    else sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(credentials));
  } catch {
    // A sessão continua utilizável na memória mesmo se o storage do navegador estiver indisponível.
  }
}

export function PortfolioProvider(props: { children: ReactNode }) {
  const [state, setState] = useState<PortfolioState>({ status: 'loading', data: null, error: null });
  const credentialsRef = useRef<SessionCredentials | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const stored = readStoredSession();
    if (stored) {
      credentialsRef.current = stored;
      setState({ status: 'running', data: null, error: null, phase: 'QUEUED', sessionId: stored.sessionId });
      return () => controller.abort();
    }

    loadHumanPortfolio(controller.signal)
      .then((data) => setState({ status: 'ready', data, error: null, source: 'persistent' }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (missingPersistentSnapshot(error)) {
          setState({ status: 'idle', data: null, error: null });
          return;
        }
        setState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error.message : 'Não foi possível abrir a posição financeira.',
        });
      });
    return () => controller.abort();
  }, []);

  const runningSessionId = state.status === 'running' ? state.sessionId : null;
  useEffect(() => {
    if (!runningSessionId) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const credentials = credentialsRef.current;
    if (!credentials || credentials.sessionId !== runningSessionId) {
      setState({ status: 'error', data: null, error: 'A consulta temporária perdeu as credenciais desta sessão.' });
      return undefined;
    }

    const poll = async () => {
      try {
        const status = await loadTemporarySessionStatus(credentials.accessKey, credentials.sessionId);
        if (cancelled) return;
        if (status.state === 'FAILED') {
          setState({ status: 'error', data: null, error: 'A consulta temporária não pôde ser concluída.' });
          return;
        }
        if ((status.state === 'COMPLETE' || status.state === 'PARTIAL') && status.ready) {
          const data = await loadTemporaryPortfolio(credentials.accessKey, credentials.sessionId);
          if (cancelled) return;
          setState({
            status: 'ready',
            data,
            error: null,
            source: 'temporary',
            sessionId: credentials.sessionId,
            sessionStatus: status.state,
          });
          return;
        }
        const phase: SessionPhase = status.state === 'FINALIZING'
          ? 'FINALIZING'
          : status.state === 'RUNNING'
            ? 'RUNNING'
            : 'QUEUED';
        setState({ status: 'running', data: null, error: null, phase, sessionId: credentials.sessionId });
        timer = setTimeout(poll, 1000);
      } catch (error) {
        if (cancelled) return;
        setState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error.message : 'Não foi possível acompanhar a consulta temporária.',
        });
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [runningSessionId]);

  const startTemporary = useCallback(async (accessKey: string, ineps: 'all' | string[]) => {
    const started = await startTemporarySession(accessKey, ineps);
    const credentials = { accessKey, sessionId: started.sessionId };
    credentialsRef.current = credentials;
    storeSession(credentials);
    setState({
      status: 'running',
      data: null,
      error: null,
      phase: 'QUEUED',
      sessionId: started.sessionId,
    });
  }, []);

  const loadSchool = useCallback(async (inep: string, signal?: AbortSignal): Promise<HumanSchool> => {
    if (state.status === 'ready' && state.source === 'temporary') {
      const credentials = credentialsRef.current;
      if (!credentials) throw new Error('Credenciais da consulta temporária não estão disponíveis.');
      return loadTemporarySchool(credentials.accessKey, credentials.sessionId, inep, signal);
    }
    return loadHumanSchool(inep, signal);
  }, [state]);

  const downloadWorkbook = useCallback(async (): Promise<void> => {
    if (state.status !== 'ready' || state.source !== 'temporary') {
      throw new Error('O Excel temporário só está disponível após uma consulta temporária.');
    }
    const credentials = credentialsRef.current;
    if (!credentials) throw new Error('Credenciais da consulta temporária não estão disponíveis.');
    const blob = await loadTemporaryWorkbook(credentials.accessKey, credentials.sessionId);
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'inteligencia-financeira-pdde-4cre-2026.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }, [state]);

  const resetTemporary = useCallback(() => {
    credentialsRef.current = null;
    storeSession(null);
    setState({ status: 'idle', data: null, error: null });
  }, []);

  const value = useMemo<PortfolioContextValue>(() => ({
    ...state,
    startTemporary,
    loadSchool,
    downloadWorkbook,
    resetTemporary,
  }), [state, startTemporary, loadSchool, downloadWorkbook, resetTemporary]);

  return <PortfolioContext.Provider value={value}>{props.children}</PortfolioContext.Provider>;
}

export function usePortfolio(): PortfolioContextValue {
  const value = useContext(PortfolioContext);
  if (!value) throw new Error('usePortfolio precisa estar dentro de PortfolioProvider.');
  return value;
}
