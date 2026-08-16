import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadHumanPortfolio } from './api';
import type { HumanPortfolio } from './types';

type PortfolioState =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: HumanPortfolio; error: null }
  | { status: 'error'; data: null; error: string };

const PortfolioContext = createContext<PortfolioState | null>(null);

export function PortfolioProvider(props: { children: ReactNode }) {
  const [state, setState] = useState<PortfolioState>({ status: 'loading', data: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    loadHumanPortfolio(controller.signal)
      .then((data) => setState({ status: 'ready', data, error: null }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setState({ status: 'error', data: null, error: error instanceof Error ? error.message : 'Não foi possível abrir a posição financeira.' });
      });
    return () => controller.abort();
  }, []);
  const value = useMemo(() => state, [state]);
  return <PortfolioContext.Provider value={value}>{props.children}</PortfolioContext.Provider>;
}

export function usePortfolio(): PortfolioState {
  const value = useContext(PortfolioContext);
  if (!value) throw new Error('usePortfolio precisa estar dentro de PortfolioProvider.');
  return value;
}
