export default function BackgroundEffects({ beacon = false }: { beacon?: boolean }) {
  return (
    <div className="site-bg-effects" aria-hidden="true">
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />
      <div className="bg-blob bg-blob-3" />
      <div className="bg-grid" />
      {beacon && (
        <>
          <div className="bg-beacon" />
          <div className="bg-ring" />
        </>
      )}
    </div>
  );
}
