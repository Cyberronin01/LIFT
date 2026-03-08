import React from 'react';

export default function Dependencies({ analysisData }) {
    const graph = analysisData?.dependency_graph;
    const mermaid = analysisData?.dependency_mermaid;

    if (!analysisData) {
        return (
            <div className="page-enter" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Analyze a project first to view dependencies.</p>
            </div>
        );
    }

    return (
        <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="app-content__header">
                <h1 className="app-content__title">Dependency Graph</h1>
                <div style={{ display: 'flex', gap: 12 }}>
                    <span className="dep-node dep-node--internal">● Internal</span>
                    <span className="dep-node dep-node--external">● External</span>
                </div>
            </div>

            <div className="app-content__body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Stats */}
                    <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <div className="stat-card">
                            <div className="stat-card__value">{graph?.stats?.total_programs || 0}</div>
                            <div className="stat-card__label">Programs</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card__value" style={{ color: 'var(--danger)' }}>{graph?.stats?.total_external || 0}</div>
                            <div className="stat-card__label">External Dependencies</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card__value">{graph?.stats?.total_edges || 0}</div>
                            <div className="stat-card__label">Connections</div>
                        </div>
                    </div>

                    {/* Visual graph */}
                    <div className="card" style={{ padding: 32 }}>
                        <div className="card__title">Call Graph</div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            padding: 32,
                            gap: 24,
                            flexWrap: 'wrap',
                        }}>
                            {Object.entries(graph?.nodes || {}).map(([name, node]) => (
                                <div
                                    key={name}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <div
                                        className={`dep-node ${node.is_external ? 'dep-node--external' : 'dep-node--internal'}`}
                                        style={{ padding: '10px 18px', fontSize: 14, fontWeight: 600 }}
                                    >
                                        {name}
                                    </div>
                                    {node.calls_out?.length > 0 && (
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                            → {node.calls_out.join(', ')}
                                        </div>
                                    )}
                                    {node.called_by?.length > 0 && (
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                            ← {node.called_by.join(', ')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Edge list */}
                    <div className="card">
                        <div className="card__title">All Connections</div>
                        <div style={{ marginTop: 12 }}>
                            {(graph?.edges || []).map((edge, i) => {
                                const isExternal = graph?.nodes?.[edge.to]?.is_external;
                                return (
                                    <div key={i} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '8px 12px',
                                        borderBottom: '1px solid var(--border-base)',
                                        fontSize: 13,
                                    }}>
                                        <span className="dep-node dep-node--internal" style={{ minWidth: 120, justifyContent: 'center' }}>
                                            {edge.from}
                                        </span>
                                        <span style={{ color: 'var(--text-secondary)' }}>→</span>
                                        <span className={`dep-node ${isExternal ? 'dep-node--external' : 'dep-node--internal'}`} style={{ minWidth: 120, justifyContent: 'center' }}>
                                            {edge.to}
                                        </span>
                                        {isExternal && <span style={{ fontSize: 11, color: 'var(--danger)' }}>EXTERNAL</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Mermaid source */}
                    <div className="card">
                        <div className="card__title">Mermaid Diagram Source</div>
                        <pre style={{
                            marginTop: 12,
                            padding: 16,
                            background: 'var(--bg-2)',
                            borderRadius: 8,
                            fontFamily: 'var(--font-mono)',
                            fontSize: 12,
                            color: 'var(--text-primary)',
                            whiteSpace: 'pre-wrap',
                            overflowX: 'auto',
                        }}>
                            {mermaid || 'No diagram available'}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}
