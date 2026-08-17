import { useEffect, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';

export function SessionStartDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (accessKey: string, ineps: 'all' | string[]) => Promise<void>;
}) {
  const [accessKey, setAccessKey] = useState('');
  const [scope, setScope] = useState<'all' | 'school'>('all');
  const [inep, setInep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!props.open) {
      setAccessKey('');
      setScope('all');
      setInep('');
      setError(null);
      setSubmitting(false);
    }
  }, [props.open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const key = accessKey.trim();
    if (key.length < 24) {
      setError('Informe a chave de acesso desta consulta.');
      return;
    }
    const selectedIneps: 'all' | string[] = scope === 'all' ? 'all' : [inep.trim()];
    if (scope === 'school' && !/^\d{8}$/.test(inep.trim())) {
      setError('Informe um INEP válido com 8 dígitos.');
      return;
    }
    setSubmitting(true);
    try {
      await props.onStart(key, selectedIneps);
      props.onOpenChange(false);
    } catch (cause) {
      setSubmitting(false);
      setError(cause instanceof Error ? cause.message : 'Não foi possível iniciar a consulta.');
    }
  }

  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="session-dialog__overlay" />
        <Dialog.Content className="session-dialog" asChild>
          <motion.section
            initial={{ opacity: 0, y: 10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
          >
            <div className="session-dialog__header">
              <div>
                <Dialog.Title>Nova consulta temporária</Dialog.Title>
                <Dialog.Description>
                  Consulte os dados de 2026, explore o resultado e gere o Excel sem armazenar permanentemente esta execução.
                </Dialog.Description>
              </div>
              <Dialog.Close className="session-dialog__close" aria-label="Fechar">×</Dialog.Close>
            </div>

            <form className="session-dialog__form" onSubmit={submit}>
              <fieldset className="session-scope">
                <legend>Escopo da consulta</legend>
                <label className={scope === 'all' ? 'session-choice session-choice--selected' : 'session-choice'}>
                  <input type="radio" name="scope" value="all" checked={scope === 'all'} onChange={() => setScope('all')} />
                  <span><strong>Carteira completa da 4ª CRE</strong><small>As 163 unidades da lista-mestre.</small></span>
                </label>
                <label className={scope === 'school' ? 'session-choice session-choice--selected' : 'session-choice'}>
                  <input type="radio" name="scope" value="school" checked={scope === 'school'} onChange={() => setScope('school')} />
                  <span><strong>Uma unidade</strong><small>Consulta focal por INEP.</small></span>
                </label>
              </fieldset>

              {scope === 'school' ? (
                <label className="session-field">
                  <span>INEP da unidade</span>
                  <input inputMode="numeric" maxLength={8} value={inep} onChange={(event) => setInep(event.target.value.replace(/\D/g, ''))} placeholder="33069247" />
                </label>
              ) : null}

              <label className="session-field">
                <span>Chave de acesso</span>
                <input type="password" autoComplete="off" value={accessKey} onChange={(event) => setAccessKey(event.target.value)} />
              </label>

              <p className="session-dialog__privacy">A chave autoriza somente esta operação no site. Ela não é enviada no arquivo Excel nem incorporada às URLs da consulta.</p>
              {error ? <p className="session-dialog__error" role="alert">{error}</p> : null}

              <div className="session-dialog__actions">
                <Dialog.Close className="button button--secondary" type="button">Cancelar</Dialog.Close>
                <button className="button button--primary" type="submit" disabled={submitting}>
                  {submitting ? 'Iniciando…' : 'Iniciar consulta'}
                </button>
              </div>
            </form>
          </motion.section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
