import { useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

type SectionNavScrollState = {
  canScrollBackward: boolean;
  canScrollForward: boolean;
};

export function deriveSectionNavScrollState({
  scrollLeft,
  clientWidth,
  scrollWidth,
}: {
  scrollLeft: number;
  clientWidth: number;
  scrollWidth: number;
}): SectionNavScrollState {
  const tolerance = 2;

  return {
    canScrollBackward: scrollLeft > tolerance,
    canScrollForward: scrollLeft + clientWidth < scrollWidth - tolerance,
  };
}

export function SchoolSectionNav({
  hasMovements,
  hasAccounting,
}: {
  hasMovements: boolean;
  hasAccounting: boolean;
}) {
  const { hash } = useLocation();
  const navId = useId();
  const navRef = useRef<HTMLElement>(null);
  const [scrollState, setScrollState] = useState<SectionNavScrollState>({
    canScrollBackward: false,
    canScrollForward: false,
  });
  const currentSection = hash || '#resumo';

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;

    const updateScrollState = () => {
      const nextState = deriveSectionNavScrollState(nav);
      setScrollState((currentState) => (
        currentState.canScrollBackward === nextState.canScrollBackward
        && currentState.canScrollForward === nextState.canScrollForward
          ? currentState
          : nextState
      ));
    };

    updateScrollState();
    nav.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver(updateScrollState);
    resizeObserver?.observe(nav);

    return () => {
      nav.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      resizeObserver?.disconnect();
    };
  }, [hasAccounting, hasMovements]);

  const scrollSections = (direction: -1 | 1) => {
    const nav = navRef.current;
    if (!nav) return;

    nav.scrollBy({
      left: direction * Math.max(nav.clientWidth * 0.72, 180),
      behavior: 'smooth',
    });
  };

  return (
    <div className="school-section-nav-shell">
      <button
        type="button"
        className="school-section-nav__scroll-control school-section-nav__scroll-control--previous"
        aria-label="Ver seções anteriores"
        aria-controls={navId}
        hidden={!scrollState.canScrollBackward}
        onClick={() => scrollSections(-1)}
      >
        <span aria-hidden="true">‹</span>
        Voltar
      </button>

      <nav
        ref={navRef}
        id={navId}
        className="school-section-nav"
        aria-label="Seções do prontuário financeiro"
      >
        <a href="#resumo" aria-current={currentSection === '#resumo' ? 'location' : undefined}>
          Resumo
        </a>
        <a href="#repasses" aria-current={currentSection === '#repasses' ? 'location' : undefined}>
          Repasses
        </a>
        <a href="#contas-saldos" aria-current={currentSection === '#contas-saldos' ? 'location' : undefined}>
          Contas e saldos
        </a>
        {hasMovements ? (
          <a
            href="#movimentacoes"
            aria-current={currentSection === '#movimentacoes' ? 'location' : undefined}
          >
            Movimentações
          </a>
        ) : null}
        {hasAccounting ? (
          <a
            href="#prestacao-contas"
            aria-current={currentSection === '#prestacao-contas' ? 'location' : undefined}
          >
            Prestação de contas
          </a>
        ) : null}
      </nav>

      <button
        type="button"
        className="school-section-nav__scroll-control school-section-nav__scroll-control--next"
        aria-label="Ver próximas seções"
        aria-controls={navId}
        hidden={!scrollState.canScrollForward}
        onClick={() => scrollSections(1)}
      >
        Mais
        <span aria-hidden="true">›</span>
      </button>
    </div>
  );
}
