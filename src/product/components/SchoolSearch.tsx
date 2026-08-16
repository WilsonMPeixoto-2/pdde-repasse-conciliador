export function SchoolSearch(props: {
  value: string;
  onChange: (value: string) => void;
  visibleCount: number;
  totalCount: number;
  label?: string;
}) {
  return (
    <div className="search-field">
      <label className="sr-only" htmlFor="school-search">{props.label ?? 'Buscar unidade'}</label>
      <input
        id="school-search"
        type="search"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder="Buscar por nome, código SME ou INEP"
        autoComplete="off"
      />
      <div className="search-count" aria-live="polite">
        {props.visibleCount === props.totalCount
          ? `${props.totalCount} unidades`
          : `${props.visibleCount} de ${props.totalCount} unidades`}
      </div>
    </div>
  );
}
