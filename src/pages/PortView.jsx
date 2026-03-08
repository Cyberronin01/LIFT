import React, { useState, useEffect } from 'react';

export default function PortView({ analysisData, migrateFile }) {
    const [blueprint, setBlueprint] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedProgram, setSelectedProgram] = useState('');

    const files = analysisData?.semantics || [];

    useEffect(() => {
        if (files.length > 0 && !selectedProgram) {
            setSelectedProgram(files[0].filepath);
        }
    }, [files]);

    const handleMigrate = async () => {
        if (!selectedProgram) return;
        setLoading(true);
        const result = await migrateFile(selectedProgram);
        setBlueprint(result);
        setLoading(false);
    };

    if (!analysisData) {
        return (
            <div className="page-enter" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Analyze a project first to view migration options.</p>
            </div>
        );
    }

    return (
        <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="app-content__header">
                <h1 className="app-content__title">Port View — COBOL → Java</h1>
                <div style={{ display: 'flex', gap: 8 }}>
                    <select
                        value={selectedProgram}
                        onChange={e => setSelectedProgram(e.target.value)}
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
                            <option key={f.program_name} value={f.filepath}>{f.program_name}</option>
                        ))}
                    </select>
                    <button className="btn btn--primary" onClick={handleMigrate} disabled={loading}>
                        {loading ? 'Generating...' : 'Generate Blueprint'}
                    </button>
                </div>
            </div>

            {loading && (
                <div style={{ flex: 1, padding: 24 }}>
                    <div className="shimmer" style={{ height: '100%' }} />
                </div>
            )}

            {!loading && !blueprint && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                        Select a program and click "Generate Blueprint" to see the migration plan.
                    </p>
                </div>
            )}

            {!loading && blueprint && (
                <div className="split-panel" style={{ flex: 1 }}>
                    {/* Left: Original COBOL */}
                    <div className="split-panel__left">
                        <div className="split-panel__header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Original COBOL</span>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>{blueprint.program}.cbl</span>
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
                            {blueprint.original_code || 'Source not available'}
                        </pre>
                    </div>

                    {/* Right: Generated Java */}
                    <div className="split-panel__right">
                        <div className="split-panel__header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Generated Java</span>
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                                {blueprint.blueprint?.class_name}.java
                            </span>
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
                            {blueprint.generated_code || 'No code generated'}
                        </pre>
                    </div>
                </div>
            )}

            {/* Blueprint details */}
            {!loading && blueprint?.blueprint && (
                <div style={{
                    padding: '12px 24px',
                    borderTop: '1px solid var(--border-base)',
                    background: 'var(--bg-1)',
                    display: 'flex',
                    gap: 24,
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                }}>
                    <span>Fields: <strong style={{ color: 'var(--text-primary)' }}>{blueprint.blueprint.fields?.length}</strong></span>
                    <span>Methods: <strong style={{ color: 'var(--text-primary)' }}>{blueprint.blueprint.methods?.length}</strong></span>
                    <span>Dependencies: <strong style={{ color: 'var(--text-primary)' }}>{blueprint.blueprint.dependencies?.length}</strong></span>
                    <span>Suggestions: <strong style={{ color: 'var(--primary)' }}>{blueprint.blueprint.suggestions?.length}</strong></span>
                </div>
            )}
        </div>
    );
}
