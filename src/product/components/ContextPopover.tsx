import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import * as Popover from '@radix-ui/react-popover';

export function ContextPopover(props: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger className="info-button" aria-label={props.label}>i</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="context-popover" sideOffset={10} align="end">
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
          >
            <strong className="context-popover__title">{props.title}</strong>
            <div className="context-popover__body">{props.children}</div>
          </motion.div>
          <Popover.Arrow className="context-popover__arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
