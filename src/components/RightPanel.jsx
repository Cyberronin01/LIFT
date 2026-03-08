import React, { useState, useCallback, useEffect } from 'react';
import {
    Cloud, CheckCircle, AlertTriangle, AlertCircle, Zap,
    ExternalLink, Maximize2, BarChart2, GitCompare, Terminal, Brain,
    Search, RefreshCw, Copy, Loader2, Network,
} from 'lucide-react';
import { DiffView } from './DiffView';
import { MonacoEditor } from './MonacoEditor';
import { MIGRATED_TYPESCRIPT } from './cobol-data';
import * as api from '../api';

const TABS = [
    { id: 'analysis', label: 'Analysis', icon: <BarChart2 size={12} /> },
    { id: 'migration', label: 'Migration Output', icon: <GitCompare size={12} /> },
    { id: 'diff', label: 'Diff View', icon: <GitCompare size={12} /> },
    { id: 'logs', label: 'Logs', icon: <Terminal size={12} /> },
    { id: 'ai', label: 'AI Reasoning', icon: <Brain size={12} /> },
    { id: 'ai-insights', label: 'AI Insights', icon: <Brain size={12} /> },
];

const STATUS_COLOR = { info: '#569cd6', success: '#3fb950', warning: '#cca700', error: '#f85149' };

/* ─── Analysis Panel ──────────────────────────────────────────────────────── */
function AnalysisPanel({ analysisData, theme }) {
    const isAmoled = theme === 'amoled';
    const isLight = theme === 'light';
    const cardBg = isAmoled ? '#050505' : isLight ? '#ffffff' : '#252526';
    const border = isAmoled ? '#111' : isLight ? '#e0e0e0' : '#3c3c3c';
    const text = isLight ? '#333333' : '#cccccc';
    const textMuted = isLight ? '#777777' : '#858585';

    const scan = analysisData?.scan;
    const health = analysisData?.health_score;
    const semantics = analysisData?.semantics || [];

    const totalVars = semantics.reduce((sum, s) => sum + Object.keys(s.variables || {}).length, 0);
    const totalRules = semantics.reduce((sum, s) => sum + (s.rules || []).length, 0);
    const totalCalls = semantics.reduce((sum, s) => sum + (s.calls || []).length, 0);
    const totalSecurity = semantics.reduce((sum, s) => sum + (s.security_flags || []).length, 0);

    const metrics = [
        { label: 'Total Files', value: String(scan?.total_files || 0), color: '#569cd6' },
        { label: 'Total Lines', value: String(scan?.total_lines || 0), color: '#4ec9b0' },
        { label: 'Variables', value: String(totalVars), color: '#dcdcaa' },
        { label: 'Business Rules', value: String(totalRules), color: '#c586c0' },
        { label: 'External Calls', value: String(totalCalls), color: '#569cd6' },
        { label: 'Health Score', value: health ? `${health.score}/10` : 'N/A', color: health?.score >= 7 ? '#3fb950' : health?.score >= 4 ? '#cca700' : '#f85149' },
    ];

    const issues = [];
    if (health?.breakdown?.security_issues > 0) issues.push({ level: 'error', msg: `${health.breakdown.security_issues} security issues found`, line: '' });
    if (health?.breakdown?.external_dependencies > 0) issues.push({ level: 'warning', msg: `${health.breakdown.external_dependencies} unresolved external dependencies`, line: '' });
    if (health?.breakdown?.high_complexity_files > 0) issues.push({ level: 'warning', msg: `${health.breakdown.high_complexity_files} high-complexity files`, line: '' });

    const readiness = health ? Math.round((health.score / 10) * 100) : 0;

    if (!analysisData) {
        return (
            <div style={{ padding: 20, color: textMuted, textAlign: 'center', fontSize: 13 }}>
                <BarChart2 size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                <div>Run analysis on a project to see metrics here.</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Click "Run Analysis" in the top bar.</div>
            </div>
        );
    }

    return (
        <div style={{ overflow: 'auto', height: '100%', padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>Project Metrics</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {metrics.map(m => (
                    <div key={m.label} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 5, padding: '8px 10px' }}>
                        <div style={{ color: m.color, fontSize: 18, fontFamily: 'Consolas, monospace' }}>{m.value}</div>
                        <div style={{ color: textMuted, fontSize: 11, marginTop: 2 }}>{m.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ color: textMuted, fontSize: 11 }}>Migration Readiness</span>
                    <span style={{ color: '#4ec9b0', fontSize: 11 }}>{readiness}%</span>
                </div>
                <div style={{ height: 6, background: border, borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${readiness}%`, background: 'linear-gradient(90deg,#007acc,#4ec9b0)', borderRadius: 3, transition: 'width 0.5s' }} />
                </div>
            </div>

            {issues.length > 0 && (
                <>
                    <div style={{ fontSize: 10, color: textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>Diagnostics</div>
                    {issues.map((iss, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', marginBottom: 4, borderRadius: 4, background: iss.level === 'error' ? 'rgba(248,81,73,0.08)' : 'rgba(204,167,0,0.08)', border: `1px solid ${iss.level === 'error' ? 'rgba(248,81,73,0.25)' : 'rgba(204,167,0,0.25)'}`, fontSize: 12 }}>
                            {iss.level === 'error' ? <AlertCircle size={12} style={{ color: '#f85149' }} /> : <AlertTriangle size={12} style={{ color: '#cca700' }} />}
                            <span style={{ color: text, flex: 1 }}>{iss.msg}</span>
                        </div>
                    ))}
                </>
            )}

            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 5, padding: 12, marginTop: 12 }}>
                <div style={{ color: text, fontSize: 12, marginBottom: 10 }}>Health Rating</div>
                <div style={{ color: health?.score >= 7 ? '#3fb950' : health?.score >= 4 ? '#cca700' : '#f85149', fontSize: 24, fontFamily: 'Consolas, monospace' }}>
                    {health?.rating || 'Unknown'}
                </div>
            </div>
        </div>
    );
}

/* ─── Logs Panel (Live) ───────────────────────────────────────────────────── */
function LogsPanel({ theme }) {
    const isAmoled = theme === 'amoled';
    const isLight = theme === 'light';
    const cardBg = isAmoled ? '#050505' : isLight ? '#ffffff' : '#2d2d2d';
    const border = isAmoled ? '#111' : isLight ? '#e0e0e0' : '#1a1a1a';
    const text = isLight ? '#333333' : '#cccccc';
    const textMuted = isLight ? '#777777' : '#858585';
    const rowHover = isAmoled ? '#0a0a0a' : isLight ? '#f9f9f9' : '#2a2a2a';

    const [filter, setFilter] = useState('');
    const [logs, setLogs] = useState([]);
    const [polling, setPolling] = useState(true);

    const fetchLogs = useCallback(async () => {
        try {
            const data = await api.getLogs();
            setLogs(data.logs || []);
        } catch { /* backend offline */ }
    }, []);

    useEffect(() => {
        fetchLogs();
        if (polling) {
            const interval = setInterval(fetchLogs, 3000);
            return () => clearInterval(interval);
        }
    }, [fetchLogs, polling]);

    const filtered = logs.filter(e => !filter || e.detail?.toLowerCase().includes(filter.toLowerCase()) || e.label?.toLowerCase().includes(filter.toLowerCase()));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '6px 12px', borderBottom: `1px solid ${border}`, display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: cardBg, borderRadius: 4, padding: '4px 8px', border: `1px solid ${isLight ? '#e0e0e0' : 'transparent'}` }}>
                    <Search size={11} style={{ color: textMuted }} />
                    <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter logs…"
                        style={{ background: 'transparent', border: 'none', outline: 'none', color: text, fontSize: 12, flex: 1 }} />
                </div>
                <button title="Refresh" onClick={fetchLogs} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textMuted, display: 'flex' }}><RefreshCw size={13} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', fontFamily: "'JetBrains Mono', Consolas, monospace" }}>
                {filtered.length === 0 ? (
                    <div style={{ padding: 20, color: textMuted, textAlign: 'center', fontSize: 12 }}>
                        {logs.length === 0 ? 'No log entries yet. Run an analysis to see activity.' : 'No matching logs.'}
                    </div>
                ) : (
                    filtered.map((entry, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 100px 1fr', borderBottom: `1px solid ${border}`, minHeight: 36, alignItems: 'start' }}
                            onMouseEnter={e => e.currentTarget.style.background = rowHover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <div style={{ color: textMuted, fontSize: 11, padding: '8px 0 8px 12px' }}>{entry.time}</div>
                            <div style={{ color: STATUS_COLOR[entry.status] || textMuted, fontSize: 12, padding: '8px 8px', lineHeight: 1.4 }}>{entry.label}</div>
                            <div style={{ color: text, fontSize: 11, padding: '8px 12px 8px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.detail || entry.msg}</div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

/* ─── Dependency Graph Panel ──────────────────────────────────────────────── */
function DependencyGraphPanel({ analysisData, theme }) {
    const isAmoled = theme === 'amoled';
    const isLight = theme === 'light';
    const border = isAmoled ? '#111' : isLight ? '#e0e0e0' : '#3c3c3c';
    const text = isLight ? '#333333' : '#cccccc';
    const textMuted = isLight ? '#777777' : '#858585';

    const graph = analysisData?.dependency_graph;

    if (!analysisData) {
        return (
            <div style={{ padding: 20, color: textMuted, textAlign: 'center', fontSize: 13 }}>
                <Network size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                <div>Run analysis on a project to see the dependency graph.</div>
            </div>
        );
    }

    if (!graph) {
        return (
            <div style={{ padding: 20, color: textMuted, textAlign: 'center', fontSize: 13 }}>
                Dependency graph data is not available. Try re-running analysis.
            </div>
        );
    }

    const stats = graph.stats || {};
    const nodes = graph.nodes || {};
    const edges = graph.edges || [];
    const internalPrograms = Object.entries(nodes).filter(([_, n]) => !n.is_external);
    const externalDeps = graph.external_deps || [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <Network size={14} style={{ color: '#4ec9b0' }} />
                <span style={{ color: text, fontSize: 13 }}>Program Call Graph</span>
            </div>
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <div style={{ width: 260, borderRight: `1px solid ${border}`, padding: '10px 12px', overflow: 'auto' }}>
                    <div style={{ fontSize: 10, color: textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>Summary</div>
                    <div style={{ fontSize: 12, color: text, marginBottom: 10 }}>
                        <div>Programs: {stats.total_programs ?? internalPrograms.length}</div>
                        <div>External deps: {stats.total_external ?? externalDeps.length}</div>
                        <div>Edges: {stats.total_edges ?? edges.length}</div>
                    </div>
                    <div style={{ fontSize: 10, color: textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>External Dependencies</div>
                    {externalDeps.length === 0 ? (
                        <div style={{ fontSize: 12, color: textMuted }}>None detected</div>
                    ) : (
                        externalDeps.map(dep => (
                            <div key={dep} style={{ fontSize: 12, color: text, marginBottom: 2 }}>• {dep}</div>
                        ))
                    )}
                </div>
                <div style={{ flex: 1, padding: '10px 14px', overflow: 'auto' }}>
                    <div style={{ fontSize: 10, color: textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>Flow</div>
                    {edges.length === 0 ? (
                        <div style={{ fontSize: 12, color: textMuted }}>No CALL relationships found between programs.</div>
                    ) : (
                        edges.map((e, idx) => (
                            <div key={idx} style={{ fontSize: 12, color: text, marginBottom: 3 }}>
                                <span style={{ color: '#4ec9b0' }}>{e.from}</span>
                                <span style={{ color: textMuted }}>  →  </span>
                                <span style={{ color: nodes[e.to]?.is_external ? '#e94560' : '#569cd6' }}>{e.to}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── AI Reasoning Panel ──────────────────────────────────────────────────── */
function AIReasoningPanel({ activeFile, mode, theme, cache, setCache }) {
    const isAmoled = theme === 'amoled';
    const isLight = theme === 'light';
    const bgCard = isAmoled ? '#050505' : isLight ? '#ffffff' : '#252526';
    const borderCard = isAmoled ? '#111' : isLight ? '#e0e0e0' : '#3c3c3c';
    const text = isLight ? '#333333' : '#cccccc';
    const textMuted = isLight ? '#777777' : '#858585';

    const fileCache = activeFile && cache[activeFile] ? cache[activeFile] : { data: null, loading: false, error: null };
    const { data: explanation, loading, error } = fileCache;

    const handleExplain = async () => {
        if (!activeFile) return;
        setCache(prev => ({ ...prev, [activeFile]: { ...prev[activeFile], loading: true, error: null } }));
        try {
            const result = await api.explainFile(activeFile);
            setCache(prev => ({ ...prev, [activeFile]: { data: result, loading: false, error: null } }));
        } catch (e) {
            setCache(prev => ({ ...prev, [activeFile]: { ...prev[activeFile], loading: false, error: e.message } }));
        }
    };

    return (
        <div style={{ overflow: 'auto', height: '100%', padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, background: bgCard, border: `1px solid ${borderCard}`, borderRadius: 6, padding: '10px 12px' }}>
                <Zap size={14} style={{ color: '#007acc' }} />
                <div>
                    <div style={{ color: text, fontSize: 13 }}>AI Explanation</div>
                    <div style={{ color: textMuted, fontSize: 11 }}>{mode === 'cloud' ? 'AWS Bedrock' : 'Local LLM'}</div>
                </div>
                <button onClick={handleExplain} disabled={!activeFile || loading} style={{
                    marginLeft: 'auto', padding: '6px 14px', fontSize: 12, cursor: activeFile ? 'pointer' : 'not-allowed',
                    background: '#007acc', color: '#fff', border: 'none', borderRadius: 4,
                    display: 'flex', alignItems: 'center', gap: 5, opacity: activeFile ? 1 : 0.5,
                }}>
                    {loading ? (
                        <div style={{
                            width: 14, height: 14, borderRadius: '50%',
                            border: '2px solid rgba(255,255,255,0.5)',
                            borderTopColor: '#fff',
                            animation: 'spin 0.8s linear infinite',
                        }} />
                    ) : (
                        <Brain size={12} />
                    )}
                    {loading ? 'Thinking...' : 'Explain'}
                </button>
            </div>

            {!activeFile && !explanation && (
                <div style={{ color: textMuted, fontSize: 12, textAlign: 'center', padding: 20 }}>
                    Select a file in the explorer, then click "Explain" to get an AI analysis.
                </div>
            )}

            {error && (
                <div style={{ padding: '8px 10px', borderRadius: 4, background: 'rgba(248,81,73,0.1)', border: '1px solid #f85149', fontSize: 12, color: '#f85149', marginBottom: 12 }}>
                    {error}
                </div>
            )}

            {explanation && (
                <>
                    <div style={{ color: '#569cd6', fontSize: 14, marginBottom: 8 }}>
                        {explanation.program || 'Program Analysis'}
                    </div>
                    <div style={{ color: text, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', background: bgCard, border: `1px solid ${borderCard}`, borderRadius: 6, padding: 12 }}>
                        {explanation.explanation}
                    </div>

                    {explanation.facts && (
                        <>
                            <div style={{ color: '#4ec9b0', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 6, borderBottom: `1px solid ${isLight ? '#e0e0e0' : '#2d2d2d'}`, paddingBottom: 4 }}>Extracted Facts</div>
                            <div style={{ fontSize: 12, color: textMuted }}>
                                <div>Variables: {Object.keys(explanation.facts.variables || {}).length}</div>
                                <div>Business Rules: {(explanation.facts.rules || []).length}</div>
                                <div>External Calls: {(explanation.facts.calls || []).length}</div>
                                <div>Security Flags: {(explanation.facts.security_flags || []).length}</div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}

function AIInsightsPanel({ activeFile, mode, theme, cache, setCache }) {
    const isAmoled = theme === 'amoled';
    const isLight = theme === 'light';
    const bgCard = isAmoled ? '#050505' : isLight ? '#ffffff' : '#252526';
    const borderCard = isAmoled ? '#111' : isLight ? '#e0e0e0' : '#3c3c3c';
    const text = isLight ? '#333333' : '#d4d4d4';
    const textTitle = isLight ? '#333333' : '#cccccc';
    const textMuted = isLight ? '#777777' : '#858585';

    const fileCache = activeFile && cache[activeFile] ? cache[activeFile] : { data: null, loading: false, error: null };
    const { data: insights, loading, error } = fileCache;

    const handleRun = async () => {
        if (!activeFile) return;
        setCache(prev => ({ ...prev, [activeFile]: { ...prev[activeFile], loading: true, error: null } }));
        try {
            const result = await api.getAiInsights(activeFile);
            setCache(prev => ({ ...prev, [activeFile]: { data: result, loading: false, error: null } }));
        } catch (e) {
            setCache(prev => ({ ...prev, [activeFile]: { ...prev[activeFile], loading: false, error: e.message } }));
        }
    };

    return (
        <div style={{ overflow: 'auto', height: '100%', padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, background: bgCard, border: `1px solid ${borderCard}`, borderRadius: 6, padding: '10px 12px' }}>
                <Zap size={14} style={{ color: '#f5c518' }} />
                <div>
                    <div style={{ color: textTitle, fontSize: 13 }}>AI Insights</div>
                    <div style={{ color: textMuted, fontSize: 11 }}>{mode === 'cloud' ? 'AWS Bedrock' : 'Local LLM'}</div>
                </div>
                <button onClick={handleRun} disabled={!activeFile || loading} style={{
                    marginLeft: 'auto', padding: '6px 14px', fontSize: 12, cursor: activeFile ? 'pointer' : 'not-allowed',
                    background: '#007acc', color: '#fff', border: 'none', borderRadius: 4,
                    display: 'flex', alignItems: 'center', gap: 5, opacity: activeFile ? 1 : 0.5,
                }}>
                    {loading ? (
                        <div style={{
                            width: 14, height: 14, borderRadius: '50%',
                            border: '2px solid rgba(255,255,255,0.5)',
                            borderTopColor: '#fff',
                            animation: 'spin 0.8s linear infinite',
                        }} />
                    ) : (
                        <Brain size={12} />
                    )}
                    {loading ? 'Thinking...' : 'Run'}
                </button>
            </div>

            {!activeFile && !insights && (
                <div style={{ color: textMuted, fontSize: 12, textAlign: 'center', padding: 20 }}>
                    Select a file in the explorer, then click "Run" to get AI insights.
                </div>
            )}

            {error && (
                <div style={{ padding: '8px 10px', borderRadius: 4, background: 'rgba(248,81,73,0.1)', border: '1px solid #f85149', fontSize: 12, color: '#f85149', marginBottom: 12 }}>
                    {error}
                </div>
            )}

            {insights && (
                <div style={{ color: text, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', background: bgCard, border: `1px solid ${borderCard}`, borderRadius: 6, padding: 12 }}>
                    {insights.insights}
                </div>
            )}
        </div>
    );
}

/* ─── Migration Panel ─────────────────────────────────────────────────────── */
function MigrationPanel({ activeFile, analysisData, onMigration, theme }) {
    const [migration, setMigration] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleMigrate = async () => {
        if (!activeFile) return;
        setLoading(true);
        try {
            const result = await api.migrateFile(activeFile);
            setMigration(result);
            if (onMigration) {
                onMigration(result);
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    if (!migration) {
        return (
            <div style={{ padding: 20, textAlign: 'center' }}>
                <GitCompare size={32} style={{ color: '#858585', opacity: 0.3, marginBottom: 12 }} />
                <div style={{ color: '#858585', fontSize: 13, marginBottom: 12 }}>
                    {activeFile ? 'Click below to generate migration code' : 'Select a file first'}
                </div>
                <button onClick={handleMigrate} disabled={!activeFile || loading} style={{
                    padding: '8px 20px', fontSize: 13, cursor: activeFile ? 'pointer' : 'not-allowed',
                    background: '#007acc', color: '#fff', border: 'none', borderRadius: 4,
                    opacity: activeFile ? 1 : 0.5, display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                    {loading ? <Loader2 size={13} style={{ animation: 'spin 0.9s linear infinite' }} /> : <GitCompare size={13} />}
                    {loading ? 'Generating...' : 'Generate Migration'}
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, minHeight: 0 }}>
                <MonacoEditor
                    code={migration.generated_code || MIGRATED_TYPESCRIPT}
                    language="typescript"
                    filename={`${migration.program || 'output'}.ts`}
                    diagnostics={[]}
                    highlightLines={[]}
                    theme={theme}
                />
            </div>
            {migration.ai_notes && migration.ai_notes.trim() && (
                <div style={{ borderTop: `1px solid ${theme === 'amoled' ? '#111' : theme === 'light' ? '#e0e0e0' : '#3c3c3c'}`, background: theme === 'amoled' ? '#050505' : theme === 'light' ? '#ffffff' : '#252526', padding: '10px 12px', maxHeight: 160, overflow: 'auto' }}>
                    <div style={{ fontSize: 11, color: '#4ec9b0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                        AI-Assisted Migration Notes
                    </div>
                    <div style={{ fontSize: 12, color: theme === 'light' ? '#333333' : '#d4d4d4', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                        {migration.ai_notes}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Governance Panels (Vulnerabilities / Modernization / Data Model) ───── */
function VulnerabilitiesPanel({ analysisData, theme }) {
    const isAmoled = theme === 'amoled';
    const isLight = theme === 'light';
    const textTitle = isLight ? '#333333' : '#d4d4d4';
    const textMuted = isLight ? '#777777' : '#858585';
    const border = isAmoled ? '#111' : isLight ? '#e0e0e0' : '#3c3c3c';
    const rowBorder = isLight ? '#eeeeee' : '#2d2d2d';
    const bgHeader = isAmoled ? '#050505' : isLight ? '#f9f9f9' : '#252526';
    const health = analysisData?.health_score;
    const breakdown = health?.breakdown || {};

    return (
        <div style={{ padding: '12px 14px', overflow: 'auto', height: '100%' }}>
            <div style={{ fontSize: 14, color: textTitle, marginBottom: 8 }}>Vulnerabilities</div>
            {!analysisData ? (
                <div style={{ color: textMuted, fontSize: 13 }}>Run analysis first to see security insights.</div>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                        <tr style={{ background: bgHeader }}>
                            <th style={{ textAlign: 'left', padding: 6, borderBottom: `1px solid ${border}` }}>Severity</th>
                            <th style={{ textAlign: 'left', padding: 6, borderBottom: `1px solid ${border}` }}>Issue</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ padding: 6, borderBottom: `1px solid ${rowBorder}`, color: '#f85149' }}>High</td>
                            <td style={{ padding: 6, borderBottom: `1px solid ${rowBorder}`, color: isLight ? '#333333' : 'inherit' }}>
                                {breakdown.security_issues > 0
                                    ? `${breakdown.security_issues} security flag(s) detected (e.g. hardcoded secrets, risky patterns).`
                                    : 'No explicit security flags detected in semantics.'}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: 6, borderBottom: `1px solid ${rowBorder}`, color: '#cca700' }}>Medium</td>
                            <td style={{ padding: 6, borderBottom: `1px solid ${rowBorder}`, color: isLight ? '#333333' : 'inherit' }}>
                                {breakdown.external_dependencies > 0
                                    ? `${breakdown.external_dependencies} unresolved external dependency(ies) – verify contracts and SLAs.`
                                    : 'No unresolved external dependencies detected.'}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: 6, color: '#569cd6' }}>Low</td>
                            <td style={{ padding: 6, color: isLight ? '#333333' : 'inherit' }}>
                                {breakdown.high_complexity_files > 0
                                    ? `${breakdown.high_complexity_files} high-complexity file(s) – candidates for refactoring.`
                                    : 'No files above complexity threshold.'}
                            </td>
                        </tr>
                    </tbody>
                </table>
            )}
        </div>
    );
}

function ModernizationPanel({ analysisData, lastMigration, theme }) {
    const isLight = theme === 'light';
    const textTitle = isLight ? '#333333' : '#d4d4d4';
    const text = isLight ? '#333333' : '#cccccc';

    const sem = (analysisData?.semantics || [])[0];
    const program = sem?.program_name || lastMigration?.program || 'Program';
    const notes = lastMigration?.ai_notes;

    return (
        <div style={{ padding: '12px 14px', overflow: 'auto', height: '100%' }}>
            <div style={{ fontSize: 14, color: textTitle, marginBottom: 8 }}>Modernization</div>
            <div style={{ fontSize: 12, color: text, marginBottom: 8 }}>
                Program: <span style={{ color: '#4ec9b0' }}>{program}</span>
            </div>
            <div style={{ fontSize: 12, color: text, marginBottom: 6 }}>Suggested microservice slices:</div>
            <ul style={{ fontSize: 12, color: text, paddingLeft: 18, marginBottom: 10 }}>
                <li>Employee Validation Service</li>
                <li>Performance Classification Service</li>
                <li>Payroll Integration Service</li>
                <li>Database Persistence / Reporting Service</li>
            </ul>
            {notes && notes.trim() && (
                <>
                    <div style={{ fontSize: 12, color: '#4ec9b0', marginBottom: 4 }}>AI Migration Notes</div>
                    <div style={{ fontSize: 12, color: textTitle, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                        {notes}
                    </div>
                </>
            )}
        </div>
    );
}

function DataModelPanel({ analysisData, activeFile, theme }) {
    const isLight = theme === 'light';
    const textTitle = isLight ? '#333333' : '#d4d4d4';
    const text = isLight ? '#333333' : '#cccccc';
    const textMuted = isLight ? '#777777' : '#858585';

    const semantics = analysisData?.semantics || [];
    let sem = null;
    if (activeFile) {
        sem = semantics.find(s => s.filepath === activeFile) || null;
    }
    if (!sem && semantics.length > 0) {
        sem = semantics[0];
    }
    const vars = sem?.variables || {};

    return (
        <div style={{ padding: '12px 14px', overflow: 'auto', height: '100%' }}>
            <div style={{ fontSize: 14, color: textTitle, marginBottom: 8 }}>Data Model</div>
            {!sem ? (
                <div style={{ fontSize: 12, color: textMuted }}>Run analysis and select a COBOL file to see its data model.</div>
            ) : (
                <>
                    <div style={{ fontSize: 12, color: text, marginBottom: 8 }}>
                        Program: <span style={{ color: '#4ec9b0' }}>{sem.program_name}</span>
                    </div>
                    <div style={{ fontSize: 12, color: textTitle, marginBottom: 6 }}>Record Fields:</div>
                    <ul style={{ fontSize: 12, color: textTitle, paddingLeft: 18 }}>
                        {Object.entries(vars).map(([name, pic]) => (
                            <li key={name}>{name} — PIC {pic}</li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}

/* ─── Main RightPanel ─────────────────────────────────────────────────────── */
export function RightPanel({ analysisData, activeFile, projectPath, mode = 'local', activeNav, theme = 'vsdark' }) {
    const [activeTab, setActiveTab] = useState('logs');
    const [lastMigration, setLastMigration] = useState(null);
    const [aiExplanations, setAiExplanations] = useState({});
    const [aiInsights, setAiInsights] = useState({});

    useEffect(() => {
        if (activeNav === 'dep-graph') setActiveTab('graph');
        else if (activeNav === 'ai-reasoning') setActiveTab('ai');
        else if (activeNav === 'ai-insights') setActiveTab('ai-insights');
        else if (activeNav === 'vulnerabilities') setActiveTab('gov-vulns');
        else if (activeNav === 'modernization') setActiveTab('gov-modern');
        else if (activeNav === 'data-model') setActiveTab('gov-data');
    }, [activeNav]);

    const isAmoled = theme === 'amoled';
    const isLight = theme === 'light';
    const bg = isAmoled ? '#000000' : isLight ? '#ffffff' : '#1e1e1e';
    const headerBg = isAmoled ? '#050505' : isLight ? '#f3f3f3' : '#252526';
    const border = isAmoled ? '#111' : isLight ? '#e0e0e0' : '#3c3c3c';
    const textMuted = isLight ? '#777777' : '#858585';
    const textActive = isLight ? '#333333' : '#ffffff';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: bg }}>
            {/* Tab bar */}
            <div style={{ background: headerBg, borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'stretch', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
                {TABS.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                            display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px',
                            background: isActive ? bg : 'transparent', border: 'none',
                            borderBottom: isActive ? '2px solid #007acc' : '2px solid transparent',
                            color: isActive ? textActive : textMuted, fontSize: 12, cursor: 'pointer',
                            whiteSpace: 'nowrap', transition: 'color 0.12s', flexShrink: 0,
                        }}>
                            <span style={{ opacity: isActive ? 1 : 0.6 }}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    );
                })}
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 8px' }}>
                    <button title="Open in new window" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textMuted, display: 'flex', alignItems: 'center', padding: '4px 5px', borderRadius: 3 }}>
                        <ExternalLink size={13} />
                    </button>
                    <button title="Maximize" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textMuted, display: 'flex', alignItems: 'center', padding: '4px 5px', borderRadius: 3 }}>
                        <Maximize2 size={13} />
                    </button>
                </div>
            </div>

            {/* Status sub-bar */}
            <div style={{ background: headerBg, borderBottom: `1px solid ${border}`, padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: textMuted, flexShrink: 0 }}>
                {mode === 'cloud' ? (
                    <><Cloud size={12} style={{ color: '#569cd6' }} /><span>AWS Bedrock</span></>
                ) : (
                    <><Cloud size={12} style={{ color: '#4ec9b0' }} /><span>Local LLM</span></>
                )}
                <span style={{ marginLeft: 'auto', color: '#3fb950', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={11} /> Ready
                </span>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {activeTab === 'analysis' && <AnalysisPanel analysisData={analysisData} theme={theme} />}
                {activeTab === 'migration' && <MigrationPanel activeFile={activeFile} analysisData={analysisData} onMigration={setLastMigration} theme={theme} />}
                {activeTab === 'diff' && <DiffView migration={lastMigration} theme={theme} />}
                {activeTab === 'graph' && <DependencyGraphPanel analysisData={analysisData} theme={theme} />}
                {activeTab === 'logs' && <LogsPanel theme={theme} />}
                {activeTab === 'ai' && <AIReasoningPanel activeFile={activeFile} mode={mode} theme={theme} cache={aiExplanations} setCache={setAiExplanations} />}
                {activeTab === 'gov-vulns' && <VulnerabilitiesPanel analysisData={analysisData} theme={theme} />}
                {activeTab === 'gov-modern' && <ModernizationPanel analysisData={analysisData} lastMigration={lastMigration} theme={theme} />}
                {activeTab === 'gov-data' && <DataModelPanel analysisData={analysisData} activeFile={activeFile} theme={theme} />}
                {activeTab === 'ai-insights' && <AIInsightsPanel activeFile={activeFile} mode={mode} theme={theme} cache={aiInsights} setCache={setAiInsights} />}
            </div>
        </div>
    );
}
