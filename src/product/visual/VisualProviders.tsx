import type { ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import * as Tooltip from '@radix-ui/react-tooltip';

export function VisualProviders({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <Tooltip.Provider delayDuration={450} skipDelayDuration={250}>
        {children}
      </Tooltip.Provider>
    </MotionConfig>
  );
}
