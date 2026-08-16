import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteEffects() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const root = document.getElementById('app');
    if (!root) return undefined;

    let observer: MutationObserver | null = null;
    let timeout = 0;

    const focusReadyMain = () => {
      const main = root.querySelector<HTMLElement>('main:not(.loading)');
      if (!main) return false;
      main.tabIndex = -1;
      main.focus({ preventScroll: true });
      observer?.disconnect();
      window.clearTimeout(timeout);
      return true;
    };

    if (!focusReadyMain()) {
      observer = new MutationObserver(() => focusReadyMain());
      observer.observe(root, { childList: true, subtree: true });
      timeout = window.setTimeout(() => observer?.disconnect(), 10_000);
    }

    return () => {
      observer?.disconnect();
      window.clearTimeout(timeout);
    };
  }, [pathname]);

  return null;
}
