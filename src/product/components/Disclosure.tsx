import { useId, useState, type ReactNode } from 'react';

export function Disclosure(props: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);
  const id = useId();
  return (
    <section className="disclosure">
      <button
        className="disclosure__trigger"
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          <span className="disclosure__title">{props.title}</span>
          {props.summary ? <span className="disclosure__summary"> · {props.summary}</span> : null}
        </span>
        <span className="disclosure__chevron" aria-hidden="true">›</span>
      </button>
      <div id={id} className="disclosure__content" hidden={!open}>
        {props.children}
      </div>
    </section>
  );
}
