import React, { useState } from 'react';

export default function Dashboard({ analysisData, loading, projectPath, analyzeProject, setPage }) {
    const [inputPath, setInputPath] = useState(projectPath || '');

    const handleAnalyze = (e) => {
        e.preventDefault();
        if (inputPath.trim()) analyzeProject(inputPath.trim());
    };

    const health = analysisData?.health_score;
    const scan = analysisData?.scan;
    const stats = analysisData?.semantics || [];

    const totalVars = stats.reduce((s, f) => s + (f.stats?.variable_count || 0), 0);
    const totalRules = stats.reduce((s, f) => s + (f.stats?.rule_count || 0), 0);
    const totalCalls = stats.reduce((s, f) => s + (f.stats?.call_count || 0), 0);
    const totalSecurity = stats.reduce((s, f) => s + (f.security_flags?.length || 0), 0);

    // Health gauge SVG
    const gaugeRadius = 60;
    const gaugeCircum = 2 * Math.PI * gaugeRadius;
    const score = health?.score || 0;
    const gaugeOffset = gaugeCircum - (score / 10) * gaugeCircum;
    const gaugeColor = score >= 7 ? 'var(--success)' : score >= 4 ? 'var(--warning)' : 'var(--danger)';

    return (
        <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="app-content__header">
                <h1 className="app-content__title">Dashboard</h1>
                <form onSubmit={handleAnalyze} style={{ display: 'flex', gap: 8 }}>
                    <input
                        type="text"
                        value={inputPath}
                        onChange={e => setInputPath(e.target.value)}
                        placeholder="Enter project path..."
                        style={{
                            background: 'var(--bg-2)',
                            border: '1px solid var(--border-base)',
                            borderRadius: 6,
                            padding: '6px 12px',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 12,
                            width: 320,
                            outline: 'none',
                        }}
                    />
                    <button className="btn btn--primary" type="submit" disabled={loading}>
                        {loading ? 'Analyzing...' : 'Analyze'}
                    </button>
                </form>
            </div>

            <div className="app-content__body">
                {!analysisData && !loading && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '60vh',
                        gap: 24,
                    }}>
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--bg-4)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                        </svg>
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                                Welcome to LegacyLift
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 400 }}>
                                Enter a project path containing COBOL files to begin analysis.
                                The AI engine will scan, parse, and extract insights from your legacy codebase.
                            </p>
                        </div>
                    </div>
                )}

                {loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24 }}>
                        <div className="shimmer" style={{ height: 160, width: '100%' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                            {[1, 2, 3, 4].map(i => <div key={i} className="shimmer" style={{ height: 100 }} />)}
                        </div>
                        <div className="shimmer" style={{ height: 200, width: '100%' }} />
                    </div>
                )}

                {analysisData && !loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Top row: Health + Stats */}
                        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                            {/* Health Gauge */}
                            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 24, minWidth: 220 }}>
                                <div className="health-gauge">
                                    <svg className="health-gauge__ring" width="160" height="160" viewBox="0 0 140 140">
                                        <circle className="health-gauge__bg" cx="70" cy="70" r={gaugeRadius} />
                                        <circle
                                            className="health-gauge__fill"
                                            cx="70" cy="70" r={gaugeRadius}
                                            stroke={gaugeColor}
                                            strokeDasharray={gaugeCircum}
                                            strokeDashoffset={gaugeOffset}
                                        />
                                    </svg>
                                    <div className="health-gauge__value" style={{ color: gaugeColor }}>
                                        {score}
                                    </div>
                                </div>
                                <div className="health-gauge__label">{health?.rating || 'N/A'}</div>
                            </div>

                            {/* Stat cards */}
                            <div style={{ flex: 1 }}>
                                <div className="stat-grid">
                                    <div className="stat-card">
                                        <div className="stat-card__value">{scan?.total_files || 0}</div>
                                        <div className="stat-card__label">COBOL Files</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-card__value">{scan?.total_lines || 0}</div>
                                        <div className="stat-card__label">Lines of Code</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-card__value">{totalVars}</div>
                                        <div className="stat-card__label">Variables</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-card__value">{totalRules}</div>
                                        <div className="stat-card__label">Business Rules</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-card__value">{totalCalls}</div>
                                        <div className="stat-card__label">External Calls</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-card__value" style={{ color: totalSecurity > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                            {totalSecurity}
                                        </div>
                                        <div className="stat-card__label">Security Issues</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-card__value">
                                            {analysisData.dependency_graph?.stats?.total_external || 0}
                                        </div>
                                        <div className="stat-card__label">External Deps</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-card__value">
                                            {analysisData.dependency_graph?.stats?.total_edges || 0}
                                        </div>
                                        <div className="stat-card__label">Connections</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* File list */}
                        <div className="card">
                            <div className="card__title">Analyzed Files</div>
                            <div className="file-tree" style={{ marginTop: 12 }}>
                                {stats.map((file, i) => (
                                    <div
                                        key={i}
                                        className="file-tree__item"
                                        onClick={() => { setPage('code'); }}
                                    >
                                        <span className="file-tree__icon" style={{ color: 'var(--primary)' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                                            </svg>
                                        </span>
                                        <span className="file-tree__name">{file.program_name}</span>
                                        <span className="file-tree__meta">{file.stats?.variable_count}v {file.stats?.rule_count}r {file.stats?.call_count}c</span>
                                        <span className="file-tree__meta">⚡{file.stats?.complexity}</span>
                                        {file.security_flags?.length > 0 && (
                                            <span style={{ color: 'var(--danger)', fontSize: 12 }}>⚠</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Security warnings */}
                        {totalSecurity > 0 && (
                            <div className="card">
                                <div className="card__title" style={{ color: 'var(--danger)' }}>⚠ Security Findings</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                                    {stats.filter(f => f.security_flags?.length > 0).map((file, i) =>
                                        file.security_flags.map((flag, j) => (
                                            <div key={`${i}-${j}`} className="security-flag">
                                                <strong>{file.program_name}:</strong> {flag}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
