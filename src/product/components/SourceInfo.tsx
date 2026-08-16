export function SourceInfo(props: {
  sources: readonly { name: string; information: string }[];
}) {
  return (
    <details className="source-details">
      <summary>Sobre estas informações</summary>
      <div className="source-details__body">
        {props.sources.map((source) => (
          <p key={source.name}><strong>{source.name}:</strong> {source.information}</p>
        ))}
        <p>As datas de saldo indicam a posição publicada pela fonte e não devem ser interpretadas como saldo bancário em tempo real.</p>
      </div>
    </details>
  );
}
