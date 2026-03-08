import React, { useState, useEffect } from 'react';

export default function CodeViewer({ analysisData, selectedFile, setSelectedFile, explainFile }) {
    const [explanation, setExplanation] = useState(null);
    const [explaining, setExplaining] = useState(false);
    const [activeTab, setActiveTab] = useState('facts');
    const [source, setSource] = useState('');

    const files = analysisData?.semantics || [];
    const current = selectedFile || files[0];

    // Load source code
    useEffect(() => {
        if (current?.filepath) {
            fetch('http://localhost:8420/file/source', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: current.filepath }),
            })
                .then(r => r.json())
                .then(d => setSource(d.source || ''))
                .catch(() => setSource(''));
        }
    }, [current?.filepath]);

    const handleExplain = async () => {
        if (!current?.filepath) return;
        setExplaining(true);
        setActiveTab('ai');
        const result = await explainFile(current.filepath);
        setExplanation(result?.explanation || 'No explanation available.');
        setExplaining(false);
    };

    if (!analysisData) {
        return (
            <div className="page-enter" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Analyze a project first to view code.</p>
            </div>
        );
    }

    return (
        <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="app-content__header">
                <h1 className="app-content__title">Code Analysis</h1>
                <div style={{ display: 'flex', gap: 8 }}>
                    <select
                        value={current?.program_name || ''}
                        onChange={e => {
                            const f = files.find(f => f.program_name === e.target.value);
                            if (f) setSelectedFile(f);
                        }}
                        style={{
                            background: 'var(--bg-2)',
                            border: '1px solid var(--border-base)',
                            borderRadius: 6,
                            padding: '6px 12px',
                            color: 'var(--text-primary)',
                            fontSize: 13,
                            outline: 'none',
                        }}
                    >
                        {files.map(f => (
                            <option key={f.program_name} value={f.program_name}>{f.program_name}</option>
                        ))}
                    </select>
                    <button className="btn btn--brand" onClick={handleExplain} disabled={explaining}>
                        {explaining ? '⏳ Asking AI...' : '🤖 Explain with AI'}
                    </button>
                </div>
            </div>

            <div className="split-panel" style={{ flex: 1 }}>
                {/* Left: Source Code */}
                <div className="split-panel__left">
                    <div className="split-panel__header">
                        Source — {current?.program_name || 'N/A'} ({current?.filepath?.split(/[/\\]/).pop()})
                    </div>
                    <pre style={{
                        padding: 16,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: 'var(--text-primary)',
                        whiteSpace: 'pre-wrap',
                        overflowY: 'auto',
                        height: 'calc(100% - 35px)',
                    }}>
                        {source || 'Loading...'}
                    </pre>
                </div>

                {/* Right: Facts / AI Panel */}
                <div className="split-panel__right">
                    <div className="tab-bar">
                        <div className={`tab-bar__item ${activeTab === 'facts' ? 'tab-bar__item--active' : ''}`} onClick={() => setActiveTab('facts')}>
                            Extracted Facts
                        </div>
                        <div className={`tab-bar__item ${activeTab === 'ai' ? 'tab-bar__item--active' : ''}`} onClick={() => setActiveTab('ai')}>
                            AI Explanation
                        </div>
                    </div>

                    <div style={{ padding: 16, overflowY: 'auto', height: 'calc(100% - 35px)' }}>
                        {activeTab === 'facts' && current && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {/* Variables */}
                                <div>
                                    <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                                        Variables ({current.stats?.variable_count || 0})
                                    </h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {Object.entries(current.variables || {}).map(([name, pic]) => (
                                            <span key={name} style={{
                                                padding: '3px 8px',
                                                background: 'var(--bg-2)',
                                                border: '1px solid var(--border-base)',
                                                borderRadius: 4,
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 11,
                                            }}>
                                                {name} <span style={{ color: 'var(--text-secondary)' }}>{pic}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Rules */}
                                <div>
                                    <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                                        Business Rules ({current.rules?.length || 0})
                                    </h3>
                                    <div className="rule-list">
                                        {(current.rules || []).map((rule, i) => (
                                            <div key={i} className="rule-item">
                                                <span className={`rule-item__badge rule-item__badge--${rule.type}`}>
                                                    {rule.type}
                                                </span>
                                                <div>
                                                    <div className="rule-item__text">IF {rule.condition}</div>
                                                    <div className="rule-item__text" style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                                                        → {rule.action}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Calls */}
                                {current.calls?.length > 0 && (
                                    <div>
                                        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                                            External Calls ({current.calls.length})
                                        </h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {current.calls.map((call, i) => (
                                                <span key={i} className="dep-node dep-node--external">
                                                    CALL {call.target} ({call.args?.join(', ')})
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Paragraphs */}
                                <div>
                                    <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                                        Control Flow ({current.paragraphs?.length || 0} paragraphs)
                                    </h3>
                                    {(current.paragraphs || []).map((p, i) => (
                                        <div key={i} style={{
                                            padding: '6px 12px',
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: 12,
                                            borderLeft: '2px solid var(--primary)',
                                            marginBottom: 4,
                                            background: 'var(--bg-1)',
                                        }}>
                                            <strong>{p.name}</strong>
                                            {p.performs?.length > 0 && (
                                                <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>
                                                    → {p.performs.join(' → ')}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Security */}
                                {current.security_flags?.length > 0 && (
                                    <div>
                                        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)', marginBottom: 8 }}>
                                            ⚠ Security Findings
                                        </h3>
                                        {current.security_flags.map((flag, i) => (
                                            <div key={i} className="security-flag">{flag}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'ai' && (
                            <div>
                                {explaining ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div className="shimmer" style={{ height: 20, width: '80%' }} />
                                        <div className="shimmer" style={{ height: 20, width: '60%' }} />
                                        <div className="shimmer" style={{ height: 20, width: '90%' }} />
                                        <div className="shimmer" style={{ height: 20, width: '50%' }} />
                                        <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 8 }}>
                                            GLM-4.7 Flash is analyzing the extracted facts...
                                        </p>
                                    </div>
                                ) : explanation ? (
                                    <div style={{
                                        fontFamily: 'var(--font-sans)',
                                        fontSize: 14,
                                        lineHeight: 1.7,
                                        color: 'var(--text-primary)',
                                        whiteSpace: 'pre-wrap',
                                    }}>
                                        {explanation}
                                    </div>
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)' }}>
                                        Click "Explain with AI" to get a plain English explanation of this program.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
