export default async function EditorPage({
  params,
}: {
  params: Promise<{ graphId: string }>;
}) {
  const { graphId } = await params;

  return (
    <div className="page">
      <section>
        <div className="eyebrow">Editor</div>
        <h1 className="page-title">Graph editor for {graphId}</h1>
        <p className="page-subtitle">
          This scaffold reserves the four-part editor layout: node palette, canvas, config
          panel, and toolbar. Real React Flow integration comes next.
        </p>
      </section>

      <section className="card">
        <div className="toolbar">
          <span className="pill">Validate Graph</span>
          <span className="pill">Save Graph</span>
          <span className="pill">Run Graph</span>
          <span className="pill">Idle</span>
        </div>
      </section>

      <section className="empty-editor">
        <div className="panel">
          <h2>Node Palette</h2>
          <div className="list">
            <div className="list-item">Input</div>
            <div className="list-item">Knowledge</div>
            <div className="list-item">Memory</div>
            <div className="list-item">Planner</div>
            <div className="list-item">Skill Executor</div>
            <div className="list-item">Evaluator</div>
            <div className="list-item">Finalizer</div>
          </div>
        </div>
        <div className="panel">
          <h2>Canvas</h2>
          <p className="muted">
            React Flow canvas placeholder. The next step will wire real graph nodes, edges, and
            selection state here.
          </p>
        </div>
        <div className="panel">
          <h2>Config Panel</h2>
          <p className="muted">
            Selected node configuration will appear here once editor state is connected.
          </p>
        </div>
      </section>
    </div>
  );
}
