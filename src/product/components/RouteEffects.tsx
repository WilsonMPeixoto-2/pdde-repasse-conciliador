import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteEffects() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const root = document.getElementById('app');
    if (!root) return undefined;

    let observer: MutationObserver | null = null;
    let timeout = 0;

    const finish = () => {
      observer?.disconnect();
      window.clearTimeout(timeout);
    };

    const focusReadyDestination = () => {
      const main = root.querySelector<HTMLElement>('main:not(.loading)');
      if (!main) return false;

      if (hash) {
        const targetId = decodeURIComponent(hash.slice(1));
        const target = document.getElementById(targetId);
        if (!target) return false;
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
        target.scrollIntoView({ behavior: 'auto', block: 'start' });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        main.tabIndex = -1;
        main.focus({ preventScroll: true });
      }

      finish();
      return true;
    };

    if (!focusReadyDestination()) {
      observer = new MutationObserver(() => focusReadyDestination());
      observer.observe(root, { childList: true, subtree: true });
      timeout = window.setTimeout(() => observer?.disconnect(), 10_000);
    }

    return () => finish();
  }, [pathname, hash]);

  return null;
}
