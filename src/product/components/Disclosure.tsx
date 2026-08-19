import { useEffect, useState, type ReactNode } from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';

export function Disclosure(props: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);

  useEffect(() => {
    if (props.defaultOpen) setOpen(true);
  }, [props.defaultOpen]);

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} asChild>
      <section className="disclosure">
        <Collapsible.Trigger className="disclosure__trigger">
          <span>
            <span className="disclosure__title">{props.title}</span>
            {props.summary ? <span className="disclosure__summary"> · {props.summary}</span> : null}
          </span>
          <span className="disclosure__chevron" aria-hidden="true">›</span>
        </Collapsible.Trigger>
        <Collapsible.Content className="disclosure__content">
          {props.children}
        </Collapsible.Content>
      </section>
    </Collapsible.Root>
  );
}
