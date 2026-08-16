import { formatMoney } from '../format';

type Tone = 'neutral' | 'paid' | 'credit' | 'balance';

export function MetricValue(props: {
  label: string;
  valueCents: number | null;
  tone?: Tone;
  meta?: string;
}) {
  const tone = props.tone ?? 'neutral';
  return (
    <div className={`metric metric--${tone}`}>
      <span className="metric__label">{props.label}</span>
      <strong className="metric-value">{formatMoney(props.valueCents)}</strong>
      {props.meta ? <span className="metric__meta">{props.meta}</span> : null}
    </div>
  );
}
