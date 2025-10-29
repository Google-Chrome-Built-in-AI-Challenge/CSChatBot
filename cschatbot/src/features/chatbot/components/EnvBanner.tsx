export function EnvBanner({ state }:{ state: Record<string, number> }) {
  // state: { translator: 0..1, writer: 0..1, prompt: 0..1 }
  const keys = Object.keys(state);
  return (
    <div className="fixed bottom-4 left-4 z-50 rounded-lg border bg-white/80 backdrop-blur p-3 text-xs">
      {keys.map(k => <div key={k}>{k}: {(state[k]*100|0)}%</div>)}
    </div>
  );
}
