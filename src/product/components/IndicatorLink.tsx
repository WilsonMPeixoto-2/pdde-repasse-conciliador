import { Link } from 'react-router-dom';
import type { HumanIndicator } from '../types';
import { slugify } from '../routing';

export function IndicatorLink(props: { indicator: HumanIndicator }) {
  const attention = /parcial|confirmar|conferência|sem posição|não exibida/i.test(props.indicator.label);
  return (
    <Link
      className={`indicator-link${attention ? ' indicator-link--attention' : ''}`}
      to={`/indicadores/${slugify(props.indicator.label)}`}
      aria-label={`${props.indicator.count} unidades: ${props.indicator.label}. Abrir lista.`}
    >
      <span>
        <strong className="indicator-link__count">{props.indicator.count}</strong>
        <span className="indicator-link__label">{props.indicator.label}</span>
      </span>
      <span className="indicator-link__arrow" aria-hidden="true">→</span>
    </Link>
  );
}
