import { useEffect, useMemo, useState } from 'react';
import { usePortfolio } from './PortfolioContext';
import type { HumanSchool } from './types';

type DetailedPortfolioState =
  | { status: 'loading'; schools: HumanSchool[]; error: null }
  | { status: 'ready'; schools: HumanSchool[]; error: null }
  | { status: 'error'; schools: HumanSchool[]; error: string };

export function usePortfolioSchoolDetails(): DetailedPortfolioState {
  const portfolio = usePortfolio();
  const [state, setState] = useState<DetailedPortfolioState>({
    status: 'loading',
    schools: [],
    error: null,
  });

  const key = useMemo(() => (
    portfolio.status === 'ready'
      ? [
          portfolio.source,
          portfolio.liveGeneratedAt ?? 'published',
          portfolio.data.referenceLabel,
          portfolio.data.schools.map((school) => school.inep).join(','),
        ].join('|')
      : portfolio.status
  ), [portfolio]);

  useEffect(() => {
    if (portfolio.status === 'loading') {
      setState({ status: 'loading', schools: [], error: null });
      return;
    }
    if (portfolio.status === 'error') {
      setState({ status: 'error', schools: [], error: portfolio.error });
      return;
    }

    let active = true;
    const controller = new AbortController();
    setState({ status: 'loading', schools: [], error: null });

    Promise.all(portfolio.data.schools.map((summary) => (
      portfolio.loadSchool(summary.inep, controller.signal)
    )))
      .then((schools) => {
        if (!active) return;
        setState({ status: 'ready', schools, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setState({
          status: 'error',
          schools: [],
          error: error instanceof Error
            ? error.message
            : 'Não foi possível carregar o detalhamento das escolas.',
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [key, portfolio]);

  return state;
}
