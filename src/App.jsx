import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    LayoutDashboard, FolderOpen, Upload, Search, GitBranch, Shield,
    AlertTriangle, AlertCircle, ScrollText, Zap, Network, Settings, HelpCircle,
    ChevronDown, ChevronRight, Cloud, Monitor, Play, Download, Code2, Brain,
    Sun, Moon, Contrast, X, Check, Plus, FolderPlus, FileUp, RefreshCw,
    Loader2, Wifi, WifiOff, Eye, EyeOff, TestTube2,
} from 'lucide-react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { MonacoEditor } from './components/MonacoEditor';
import { RightPanel } from './components/RightPanel';
import { FileExplorer } from './components/FileExplorer';
import { SAMPLE_COBOL, DIAGNOSTICS } from './components/cobol-data';
import * as api from './api';

/* ─── Themes ──────────────────────────────────────────────────────────────── */
const THEMES = {
    vsdark: {
        appBg: '#1e1e1e', topBar: '#181818', sidebar: '#181818', sidebarText: '#cccccc',
        sidebarBorder: '#3c3c3c', panelBg: '#252526', panelText: '#cccccc', panelBorder: '#3c3c3c',
        activeItem: '#37373d', activeAccent: '#007acc', mutedText: '#858585', statusBar: '#007acc',
        inputBg: '#3c3c3c', cardBg: '#2d2d2d', divider: '#3c3c3c',
    },
    light: {
        appBg: '#f5f5f5', topBar: '#ffffff', sidebar: '#ffffff', sidebarText: '#333333',
        sidebarBorder: '#e0e0e0', panelBg: '#f3f3f3', panelText: '#333333', panelBorder: '#e0e0e0',
        activeItem: '#e8e8e8', activeAccent: '#005fb8', mutedText: '#777777', statusBar: '#005fb8',
        inputBg: '#e8e8e8', cardBg: '#ffffff', divider: '#e0e0e0',
    },
    amoled: {
        appBg: '#000000', topBar: '#000000', sidebar: '#000000', sidebarText: '#e0e0e0',
        sidebarBorder: '#050505', panelBg: '#000000', panelText: '#e0e0e0', panelBorder: '#050505',
        activeItem: '#050505', activeAccent: '#00b4ff', mutedText: '#777777', statusBar: '#00b4ff',
        inputBg: '#050505', cardBg: '#000000', divider: '#050505',
    },
};

/* ─── Settings Panel ──────────────────────────────────────────────────────── */
function SettingsPanel({ config, onConfigChange, theme, onTheme, t, onClose, backendStatus }) {
    const [settingsTab, setSettingsTab] = useState('general');
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [showSecret, setShowSecret] = useState(false);
    const [localForm, setLocalForm] = useState(config?.local || {});
    const [cloudForm, setCloudForm] = useState(config?.cloud || {});

    useEffect(() => {
        setLocalForm(config?.local || {});
        setCloudForm(config?.cloud || {});
    }, [config]);

    const handleSaveLocal = async () => {
        await onConfigChange({ local: localForm });
    };
    const handleSaveCloud = async () => {
        await onConfigChange({ cloud: cloudForm });
    };
    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const result = await api.testConnection();
            setTestResult(result);
        } catch (e) {
            setTestResult({ ok: false, error: e.message });
        }
        setTesting(false);
    };

    const themes = [
        { id: 'vsdark', label: 'VS Dark', desc: 'Classic dark theme', icon: <Moon size={15} />, preview: ['#1e1e1e', '#252526', '#007acc'] },
        { id: 'light', label: 'Light', desc: 'Clean light workspace', icon: <Sun size={15} />, preview: ['#ffffff', '#f3f3f3', '#005fb8'] },
        { id: 'amoled', label: 'AMOLED', desc: 'True black — OLED optimised', icon: <Contrast size={15} />, preview: ['#000000', '#0a0a0a', '#00b4ff'] },
    ];

    const settingsTabs = [
        { id: 'general', label: 'General' },
        { id: 'local', label: 'Local AI' },
        { id: 'cloud', label: 'Cloud AI' },
    ];

    const inputStyle = { width: '100%', background: t.inputBg, border: `1px solid ${t.divider}`, borderRadius: 4, padding: '6px 10px', color: t.panelText, fontSize: 13, outline: 'none' };
    const labelStyle = { color: t.mutedText, fontSize: 11, marginBottom: 4, display: 'block' };
    const sectionStyle = { marginBottom: 16 };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: t.panelBg }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${t.panelBorder}`, flexShrink: 0 }}>
                <span style={{ color: t.panelText, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Settings</span>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.mutedText, display: 'flex' }}><X size={14} /></button>
            </div>

            {/* Settings tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${t.panelBorder}`, flexShrink: 0 }}>
                {settingsTabs.map(tab => (
                    <button key={tab.id} onClick={() => setSettingsTab(tab.id)} style={{
                        flex: 1, padding: '8px 4px', fontSize: 11, cursor: 'pointer', border: 'none',
                        background: settingsTab === tab.id ? t.activeItem : 'transparent',
                        color: settingsTab === tab.id ? t.panelText : t.mutedText,
                        borderBottom: settingsTab === tab.id ? `2px solid ${t.activeAccent}` : '2px solid transparent',
                    }}>{tab.label}</button>
                ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                {/* General Tab */}
                {settingsTab === 'general' && (
                    <>
                        <div style={{ fontSize: 10, color: t.mutedText, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>Appearance</div>
                        {themes.map(th => (
                            <button key={th.id} onClick={() => onTheme(th.id)} style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px', marginBottom: 6,
                                background: theme === th.id ? t.activeItem : 'transparent',
                                border: `1px solid ${theme === th.id ? t.activeAccent : t.panelBorder}`,
                                borderRadius: 6, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                            }}>
                                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                                    {th.preview.map((c, i) => (<div key={i} style={{ width: i === 2 ? 8 : 12, height: 28, background: c, borderRadius: 3, border: `1px solid ${t.divider}` }} />))}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: t.panelText, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>{th.icon} {th.label}</div>
                                    <div style={{ color: t.mutedText, fontSize: 11, marginTop: 2 }}>{th.desc}</div>
                                </div>
                                {theme === th.id && <Check size={13} style={{ color: t.activeAccent }} />}
                            </button>
                        ))}

                        <div style={{ borderTop: `1px solid ${t.panelBorder}`, margin: '16px 0' }} />
                        <div style={{ fontSize: 10, color: t.mutedText, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>Backend</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: t.cardBg, borderRadius: 5, border: `1px solid ${t.divider}` }}>
                            {backendStatus === 'online' ? <Wifi size={14} style={{ color: '#3fb950' }} /> : <WifiOff size={14} style={{ color: '#f85149' }} />}
                            <span style={{ color: t.panelText, fontSize: 13 }}>{backendStatus === 'online' ? 'Backend Connected' : 'Backend Offline'}</span>
                            <span style={{ color: t.mutedText, fontSize: 11, marginLeft: 'auto' }}>localhost:8420</span>
                        </div>
                    </>
                )}

                {/* Local AI Tab */}
                {settingsTab === 'local' && (
                    <>
                        <div style={{ fontSize: 10, color: t.mutedText, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>Provider</div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                            {['ollama', 'lmstudio'].map(p => (
                                <button key={p} onClick={() => setLocalForm({ ...localForm, provider: p })} style={{
                                    flex: 1, padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderRadius: 5,
                                    background: localForm.provider === p ? t.activeAccent : t.cardBg,
                                    color: localForm.provider === p ? '#fff' : t.panelText,
                                    border: `1px solid ${localForm.provider === p ? t.activeAccent : t.divider}`,
                                }}>{p === 'ollama' ? 'Ollama' : 'LM Studio'}</button>
                            ))}
                        </div>

                        {localForm.provider === 'ollama' ? (
                            <>
                                <div style={sectionStyle}>
                                    <label style={labelStyle}>Ollama URL</label>
                                    <input style={inputStyle} value={localForm.ollama_url || ''} onChange={e => setLocalForm({ ...localForm, ollama_url: e.target.value })} placeholder="http://localhost:11434" />
                                </div>
                                <div style={sectionStyle}>
                                    <label style={labelStyle}>Model Name</label>
                                    <input style={inputStyle} value={localForm.ollama_model || ''} onChange={e => setLocalForm({ ...localForm, ollama_model: e.target.value })} placeholder="glm4:latest" />
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={sectionStyle}>
                                    <label style={labelStyle}>LM Studio URL</label>
                                    <input style={inputStyle} value={localForm.lmstudio_url || ''} onChange={e => setLocalForm({ ...localForm, lmstudio_url: e.target.value })} placeholder="http://localhost:1234" />
                                </div>
                                <div style={sectionStyle}>
                                    <label style={labelStyle}>Model Name</label>
                                    <input style={inputStyle} value={localForm.lmstudio_model || ''} onChange={e => setLocalForm({ ...localForm, lmstudio_model: e.target.value })} placeholder="default" />
                                </div>
                            </>
                        )}

                        <button onClick={handleSaveLocal} style={{ width: '100%', padding: '8px', fontSize: 13, cursor: 'pointer', background: t.activeAccent, color: '#fff', border: 'none', borderRadius: 4, marginBottom: 8 }}>Save Local Settings</button>
                        <button onClick={handleTestConnection} disabled={testing} style={{ width: '100%', padding: '8px', fontSize: 13, cursor: 'pointer', background: t.cardBg, color: t.panelText, border: `1px solid ${t.divider}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {testing ? <Loader2 size={13} className="spin" /> : <TestTube2 size={13} />}
                            {testing ? 'Testing...' : 'Test Connection'}
                        </button>

                        {testResult && (
                            <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 4, background: testResult.ok ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)', border: `1px solid ${testResult.ok ? '#3fb950' : '#f85149'}`, fontSize: 12 }}>
                                {testResult.ok ? (
                                    <div><Check size={12} style={{ color: '#3fb950' }} /> Connected! Models: {testResult.models?.slice(0, 3).join(', ')}</div>
                                ) : (
                                    <div><AlertCircle size={12} style={{ color: '#f85149' }} /> {testResult.error}</div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Cloud AI Tab */}
                {settingsTab === 'cloud' && (
                    <>
                        <div style={{ fontSize: 10, color: t.mutedText, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>AWS Bedrock</div>
                        <div style={sectionStyle}>
                            <label style={labelStyle}>AWS Access Key ID</label>
                            <input style={inputStyle} value={cloudForm.aws_access_key || ''} onChange={e => setCloudForm({ ...cloudForm, aws_access_key: e.target.value })} placeholder="AKIA..." />
                        </div>
                        <div style={sectionStyle}>
                            <label style={labelStyle}>AWS Secret Access Key</label>
                            <div style={{ position: 'relative' }}>
                                <input style={{ ...inputStyle, paddingRight: 36 }} type={showSecret ? 'text' : 'password'} value={cloudForm.aws_secret_key || ''} onChange={e => setCloudForm({ ...cloudForm, aws_secret_key: e.target.value })} placeholder="••••••••" />
                                <button onClick={() => setShowSecret(!showSecret)} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: t.mutedText, display: 'flex' }}>
                                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>
                        <div style={sectionStyle}>
                            <label style={labelStyle}>Region</label>
                            <select style={{ ...inputStyle, cursor: 'pointer' }} value={cloudForm.aws_region || 'us-east-1'} onChange={e => setCloudForm({ ...cloudForm, aws_region: e.target.value })}>
                                {['us-east-1', 'us-west-2', 'eu-west-1', 'ap-south-1', 'ap-southeast-1', 'ap-northeast-1'].map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                        <div style={sectionStyle}>
                            <label style={labelStyle}>Bedrock Model ID</label>
                            <input style={inputStyle} value={cloudForm.bedrock_model || ''} onChange={e => setCloudForm({ ...cloudForm, bedrock_model: e.target.value })} placeholder="anthropic.claude-3-haiku-20240307-v1:0" />
                        </div>

                        <button onClick={handleSaveCloud} style={{ width: '100%', padding: '8px', fontSize: 13, cursor: 'pointer', background: t.activeAccent, color: '#fff', border: 'none', borderRadius: 4, marginBottom: 8 }}>Save Cloud Settings</button>
                        <button onClick={handleTestConnection} disabled={testing} style={{ width: '100%', padding: '8px', fontSize: 13, cursor: 'pointer', background: t.cardBg, color: t.panelText, border: `1px solid ${t.divider}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {testing ? <Loader2 size={13} /> : <TestTube2 size={13} />}
                            {testing ? 'Testing...' : 'Test Connection'}
                        </button>

                        {testResult && (
                            <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 4, background: testResult.ok ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)', border: `1px solid ${testResult.ok ? '#3fb950' : '#f85149'}`, fontSize: 12 }}>
                                {testResult.ok ? (
                                    <div><Check size={12} style={{ color: '#3fb950' }} /> Connected! Models: {testResult.models?.slice(0, 3).join(', ')}</div>
                                ) : (
                                    <div><AlertCircle size={12} style={{ color: '#f85149' }} /> {testResult.error}</div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

/* ─── Overview Panel (Projects) ──────────────────────────────────────────── */
function OverviewPanel({ t, recentProjects, onOpenProject, onCreateProject, loading }) {
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPath, setNewPath] = useState('C:\\Users\\pooja\\Desktop');
    const [pathInput, setPathInput] = useState('');
    const fileInputRef = useRef(null);

    const inputStyle = { width: '100%', background: t.inputBg, border: `1px solid ${t.divider}`, borderRadius: 4, padding: '6px 10px', color: t.panelText, fontSize: 13, outline: 'none' };

    const handleOpen = () => {
        if (pathInput.trim()) onOpenProject(pathInput.trim());
    };

    const handleCreate = () => {
        if (newName.trim() && newPath.trim()) {
            onCreateProject(newName.trim(), newPath.trim());
            setShowCreate(false);
            setNewName('');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: t.panelBg }}>
            <div style={{ fontSize: 11, color: t.mutedText, textTransform: 'uppercase', letterSpacing: 1.2, padding: '10px 14px', borderBottom: `1px solid ${t.panelBorder}`, flexShrink: 0 }}>Projects</div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>

                {/* Open project */}
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: t.mutedText, marginBottom: 4 }}>OPEN PROJECT</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <input style={{ ...inputStyle, flex: 1 }} value={pathInput} onChange={e => setPathInput(e.target.value)}
                            placeholder="Enter project path..." onKeyDown={e => e.key === 'Enter' && handleOpen()} />
                        <button onClick={handleOpen} disabled={loading} style={{ padding: '6px 10px', background: t.activeAccent, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {loading ? <Loader2 size={12} /> : <FolderOpen size={12} />}
                        </button>
                    </div>
                </div>

                {/* Create project */}
                {!showCreate ? (
                    <button onClick={() => setShowCreate(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: t.cardBg, border: `1px solid ${t.divider}`, borderRadius: 4, cursor: 'pointer', color: t.panelText, fontSize: 12, marginBottom: 12 }}>
                        <FolderPlus size={13} /> Create New Project
                    </button>
                ) : (
                    <div style={{ padding: '10px', background: t.cardBg, border: `1px solid ${t.divider}`, borderRadius: 6, marginBottom: 12 }}>
                        <div style={{ fontSize: 10, color: t.mutedText, marginBottom: 6 }}>NEW PROJECT</div>
                        <input style={{ ...inputStyle, marginBottom: 6 }} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Project name" />
                        <input style={{ ...inputStyle, marginBottom: 8 }} value={newPath} onChange={e => setNewPath(e.target.value)} placeholder="Parent folder path" />
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={handleCreate} style={{ flex: 1, padding: '6px', fontSize: 12, background: t.activeAccent, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Create</button>
                            <button onClick={() => setShowCreate(false)} style={{ padding: '6px 10px', fontSize: 12, background: 'transparent', color: t.mutedText, border: `1px solid ${t.divider}`, borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                )}

                {/* Upload files */}
                <input type="file" ref={fileInputRef} multiple accept=".cbl,.cob,.cpy,.cobol,.jcl,.pli,.rpg,.asm,.txt,.dat"
                    style={{ display: 'none' }} onChange={async (e) => {
                        if (e.target.files?.length) {
                            try { await api.uploadFiles(e.target.files); } catch { }
                        }
                    }} />
                <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: t.cardBg, border: `1px dashed ${t.divider}`, borderRadius: 4, cursor: 'pointer', color: t.panelText, fontSize: 12, marginBottom: 16 }}>
                    <FileUp size={13} /> Upload Legacy Files
                </button>

                {/* Recent projects */}
                <div style={{ fontSize: 10, color: t.mutedText, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Recent</div>
                {recentProjects.length === 0 ? (
                    <div style={{ color: t.mutedText, fontSize: 12, padding: '8px 0' }}>No recent projects</div>
                ) : (
                    recentProjects.map((p, i) => (
                        <button key={i} onClick={() => onOpenProject(p.path)} style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 3,
                            background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer',
                            color: p.exists ? t.panelText : t.mutedText, fontSize: 12, textAlign: 'left',
                            opacity: p.exists ? 1 : 0.5,
                        }}>
                            <FolderOpen size={13} style={{ color: p.exists ? '#dcb67a' : t.mutedText, flexShrink: 0 }} />
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                <div style={{ fontSize: 10, color: t.mutedText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.path}</div>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

function UploadPanel({ t }) {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState(null);

    const handleFiles = async (files) => {
        if (!files?.length) return;
        setUploading(true);
        setStatus(null);
        try {
            await api.uploadFiles(files);
            setStatus({ ok: true, message: `Uploaded ${files.length} file(s).` });
        } catch (e) {
            setStatus({ ok: false, message: e.message || 'Upload failed.' });
        }
        setUploading(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: t.panelBg }}>
            <div style={{ fontSize: 11, color: t.mutedText, textTransform: 'uppercase', letterSpacing: 1.2, padding: '10px 14px', borderBottom: `1px solid ${t.panelBorder}`, flexShrink: 0 }}>
                Upload Code Files
            </div>
            <div style={{ flex: 1, padding: '12px 14px' }}>
                <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept=".cbl,.cob,.cpy,.cobol,.jcl,.pli,.rpg,.asm,.txt,.dat"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                        if (e.target.files?.length) {
                            await handleFiles(e.target.files);
                            e.target.value = '';
                        }
                    }}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 8, padding: '10px 12px', background: t.cardBg, border: `1px dashed ${t.divider}`,
                        borderRadius: 6, cursor: 'pointer', color: t.panelText, fontSize: 13, marginBottom: 12,
                    }}
                >
                    <FileUp size={14} /> {uploading ? 'Uploading…' : 'Select Files to Upload'}
                </button>
                <div style={{ fontSize: 12, color: t.mutedText, marginBottom: 8 }}>
                    Drop COBOL and related legacy files here to add them to the current project.
                </div>
                {status && (
                    <div style={{
                        marginTop: 8, padding: '8px 10px', borderRadius: 4,
                        background: status.ok ? 'rgba(63,185,80,0.08)' : 'rgba(248,81,73,0.08)',
                        border: `1px solid ${status.ok ? '#3fb950' : '#f85149'}`, fontSize: 12, color: '#cccccc',
                    }}>
                        {status.message}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Nav Panel ───────────────────────────────────────────────────────────── */
const NAV_SECTIONS = {
    intelligence: [
        { id: 'ai-reasoning', label: 'AI Reasoning', icon: <Brain size={14} /> },
        { id: 'ai-insights', label: 'AI Insights', icon: <Zap size={14} /> },
        { id: 'dep-graph', label: 'Dependency Graph', icon: <Network size={14} /> },
    ],
    governance: [
        { id: 'vulnerabilities', label: 'Vulnerabilities', icon: <AlertTriangle size={14} /> },
        { id: 'modernization', label: 'Modernization', icon: <GitBranch size={14} /> },
        { id: 'data-model', label: 'Data Model', icon: <ScrollText size={14} /> },
    ],
};

function NavPanel({ sectionId, activeNav, onNav, t }) {
    const items = NAV_SECTIONS[sectionId] ?? [];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: t.panelBg }}>
            <div style={{ fontSize: 11, color: t.mutedText, textTransform: 'uppercase', letterSpacing: 1.2, padding: '10px 14px', borderBottom: `1px solid ${t.panelBorder}`, flexShrink: 0 }}>{sectionId}</div>
            <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4 }}>
                {items.map(item => (
                    <button key={item.id} onClick={() => onNav(item.id)} style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                        background: activeNav === item.id ? t.activeItem : 'transparent', border: 'none',
                        borderLeft: activeNav === item.id ? `2px solid ${t.activeAccent}` : '2px solid transparent',
                        color: activeNav === item.id ? '#ffffff' : t.panelText, fontSize: 13, cursor: 'pointer', textAlign: 'left',
                    }}>
                        <span style={{ color: activeNav === item.id ? t.activeAccent : t.mutedText }}>{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ─── App ─────────────────────────────────────────────────────────────────── */
export default function App() {
    // UI state
    const [activeNav, setActiveNav] = useState('analyze');
    const [openPanel, setOpenPanel] = useState('overview');
    const [theme, setTheme] = useState('vsdark');
    const t = THEMES[theme];

    // Backend state
    const [backendStatus, setBackendStatus] = useState('checking');
    const [config, setConfig] = useState(null);
    const [recentProjects, setRecentProjects] = useState([]);

    // Project state
    const [projectPath, setProjectPath] = useState(null);
    const [projectName, setProjectName] = useState(null);
    const [fileTree, setFileTree] = useState([]);
    const [activeFile, setActiveFile] = useState(null);
    const [activeFilePath, setActiveFilePath] = useState(null);
    const [fileSource, setFileSource] = useState('');
    const [fileLang, setFileLang] = useState('cobol');

    // Analysis state
    const [analysisData, setAnalysisData] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Mode
    const [activeEnv, setActiveEnv] = useState('local');

    // ─── Boot: check backend, load config ───
    useEffect(() => {
        const boot = async () => {
            try {
                const h = await api.checkHealth();
                setBackendStatus('online');

                const cfg = await api.getConfig();
                setConfig(cfg);
                setActiveEnv(cfg.mode || 'local');

                const projs = await api.listProjects();
                setRecentProjects(projs.projects || []);
            } catch {
                setBackendStatus('offline');
            }
        };
        boot();
        const interval = setInterval(async () => {
            try { await api.checkHealth(); setBackendStatus('online'); } catch { setBackendStatus('offline'); }
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    // ─── Handlers ───
    const handleConfigChange = useCallback(async (updates) => {
        try {
            const updated = await api.setConfig(updates);
            setConfig(updated);
        } catch (e) {
            console.error('Config update failed:', e);
        }
    }, []);

    const handleModeSwitch = useCallback(async (mode) => {
        setActiveEnv(mode);
        await handleConfigChange({ mode });
    }, [handleConfigChange]);

    const handleOpenProject = useCallback(async (path) => {
        setLoading(true);
        try {
            const result = await api.openProject(path);
            setProjectPath(path);
            setProjectName(result.name);

            // Fetch file tree
            const files = await api.listFiles(path);
            setFileTree(files.tree || []);

            // Update recent projects
            const projs = await api.listProjects();
            setRecentProjects(projs.projects || []);

            setOpenPanel('explorer');
        } catch (e) {
            console.error('Open project failed:', e);
        }
        setLoading(false);
    }, []);

    const handleCreateProject = useCallback(async (name, parentPath) => {
        setLoading(true);
        try {
            const result = await api.createProject(name, parentPath);
            await handleOpenProject(result.project);
        } catch (e) {
            console.error('Create project failed:', e);
        }
        setLoading(false);
    }, [handleOpenProject]);

    const handleFileSelect = useCallback(async (fileName, filePath) => {
        setActiveFile(fileName);
        setActiveFilePath(filePath);
        if (filePath) {
            try {
                const result = await api.getFileSource(filePath);
                setFileSource(result.source);
                const ext = fileName.split('.').pop()?.toLowerCase();
                setFileLang(['cbl', 'cob', 'cpy', 'cobol'].includes(ext) ? 'cobol' : 'typescript');
            } catch (e) {
                setFileSource(`// Error loading file: ${e.message}`);
            }
        }
    }, []);

    const handleCloseFile = useCallback(() => {
        setActiveFile(null);
        setActiveFilePath(null);
        setFileSource('');
        setFileLang('cobol');
    }, []);

    const handleRunAnalysis = useCallback(async () => {
        if (!projectPath) return;
        setAnalyzing(true);
        try {
            const data = await api.analyzeProject(projectPath);
            setAnalysisData(data);
        } catch (e) {
            console.error('Analysis failed:', e);
        }
        setAnalyzing(false);
    }, [projectPath]);

    const togglePanel = (id) => setOpenPanel(prev => prev === id ? null : id);

    const activityItems = [
        { id: 'explorer', icon: <FolderOpen size={18} />, label: 'Explorer' },
        { id: 'overview', icon: <LayoutDashboard size={18} />, label: 'Projects' },
        { id: 'upload', icon: <Upload size={18} />, label: 'Upload' },
        { id: 'intelligence', icon: <Brain size={18} />, label: 'Intelligence' },
        { id: 'governance', icon: <Shield size={18} />, label: 'Governance' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: t.appBg, color: t.panelText, fontFamily: "system-ui, -apple-system, sans-serif" }}>

            {/* ── Top Bar ── */}
            <header style={{ height: 48, background: t.topBar, borderBottom: `1px solid ${t.divider}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0, zIndex: 50 }}>
                {/* Mac-style window controls on the left */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 10 }}>
                    <button
                        onClick={() => window.electronAPI?.close?.()}
                        style={{ width: 12, height: 12, borderRadius: '50%', border: 'none', background: '#ff5f57', cursor: 'pointer' }}
                        title="Close"
                    />
                    <button
                        onClick={() => window.electronAPI?.minimize?.()}
                        style={{ width: 12, height: 12, borderRadius: '50%', border: 'none', background: '#febc2e', cursor: 'pointer' }}
                        title="Minimize"
                    />
                    <button
                        onClick={() => window.electronAPI?.maximize?.()}
                        style={{ width: 12, height: 12, borderRadius: '50%', border: 'none', background: '#28c840', cursor: 'pointer' }}
                        title="Maximize"
                    />
                </div>

                <button onClick={() => setOpenPanel('overview')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${t.divider}`, borderRadius: 4, color: t.panelText, padding: '4px 10px', fontSize: 13, cursor: 'pointer' }}>
                    <FolderOpen size={13} />
                    <span>{projectName || 'No project open'}</span>
                    <ChevronDown size={12} />
                </button>

                <div style={{ flex: 1 }} />
                {projectPath && <span style={{ color: t.activeAccent, fontSize: 12 }}>Active Branch: main</span>}
                {activeFile && <span style={{ color: t.mutedText, fontSize: 12 }}>/src/{activeFile}</span>}
                <div style={{ flex: 1 }} />

                {/* Cloud/Local toggle */}
                <div style={{ display: 'flex', background: t.panelBg, borderRadius: 4, border: `1px solid ${t.divider}`, overflow: 'hidden' }}>
                    {['cloud', 'local'].map(env => (
                        <button key={env} onClick={() => handleModeSwitch(env)} style={{
                            padding: '5px 14px', fontSize: 12, cursor: 'pointer', border: 'none',
                            background: activeEnv === env ? t.activeAccent : 'transparent',
                            color: activeEnv === env ? '#fff' : t.mutedText,
                            display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
                        }}>
                            {env === 'cloud' ? <Cloud size={12} /> : <Monitor size={12} />}
                            {env.charAt(0).toUpperCase() + env.slice(1)}
                        </button>
                    ))}
                </div>

                <span style={{ background: theme === 'light' ? '#e6f4ea' : '#2d4a22', color: theme === 'light' ? '#137333' : '#4ec9b0', border: `1px solid ${theme === 'light' ? '#34a853' : '#3fb950'}`, borderRadius: 4, padding: '3px 8px', fontSize: 11, letterSpacing: 1 }}>DEV</span>

                <button onClick={handleRunAnalysis} disabled={!projectPath || analyzing} style={{
                    display: 'flex', alignItems: 'center', gap: 6, background: projectPath ? t.activeAccent : t.cardBg,
                    border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 4, fontSize: 13,
                    cursor: projectPath ? 'pointer' : 'not-allowed', opacity: projectPath ? 1 : 0.5,
                }}>
                    {analyzing ? (
                        <div style={{
                            width: 14, height: 14, borderRadius: '50%',
                            border: '2px solid rgba(255,255,255,0.5)',
                            borderTopColor: '#fff',
                            animation: 'spin 0.8s linear infinite',
                        }} />
                    ) : (
                        <Play size={12} />
                    )}
                    {analyzing ? 'Analyzing...' : 'Run Analysis'}
                </button>

                <button
                    onClick={() => {
                        if (!analysisData) return;
                        try {
                            const blob = new Blob([JSON.stringify(analysisData, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'legacylift-analysis.json';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        } catch (e) {
                            console.error('Export failed:', e);
                        }
                    }}
                    disabled={!analysisData}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${t.divider}`, color: t.panelText, padding: '6px 14px', borderRadius: 4, fontSize: 13, cursor: analysisData ? 'pointer' : 'not-allowed', opacity: analysisData ? 1 : 0.5 }}
                >
                    <Download size={12} /> Export
                </button>
            </header>

            {/* ── Body ── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* ── Activity Bar ── */}
                <div style={{ width: 44, background: t.sidebar, borderRight: `1px solid ${t.sidebarBorder}`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8, gap: 2, flexShrink: 0 }}>
                    {activityItems.map(item => {
                        const isActive = openPanel === item.id;
                        return (
                            <button key={item.id} title={item.label} onClick={() => togglePanel(item.id)} style={{
                                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isActive ? t.activeItem : 'transparent',
                                border: isActive ? `1px solid ${t.activeAccent}` : '1px solid transparent',
                                borderRadius: 5, cursor: 'pointer', color: isActive ? t.activeAccent : t.mutedText,
                            }}>
                                {item.icon}
                            </button>
                        );
                    })}
                    <div style={{ flex: 1 }} />
                    <button title="Settings" onClick={() => togglePanel('settings')} style={{
                        width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: openPanel === 'settings' ? t.activeItem : 'transparent',
                        border: openPanel === 'settings' ? `1px solid ${t.activeAccent}` : '1px solid transparent',
                        borderRadius: 5, cursor: 'pointer', color: openPanel === 'settings' ? t.activeAccent : t.mutedText, marginBottom: 2,
                    }}>
                        <Settings size={18} />
                    </button>
                    <button title="Help" style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: t.mutedText, marginBottom: 6 }}>
                        <HelpCircle size={18} />
                    </button>
                </div>

                {/* ── Collapsible Left Panel ── */}
                {openPanel !== null && (
                    <div style={{
                        width: openPanel === 'settings' ? 260 : 220, background: t.panelBg,
                        borderRight: `1px solid ${t.panelBorder}`, flexShrink: 0,
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    }}>
                        {openPanel === 'explorer' && (
                            <FileExplorer
                                tree={fileTree}
                                activeFile={activeFile}
                                onFileSelect={handleFileSelect}
                                theme={t}
                            />
                        )}
                        {openPanel === 'overview' && (
                            <OverviewPanel
                                t={t}
                                recentProjects={recentProjects}
                                onOpenProject={handleOpenProject}
                                onCreateProject={handleCreateProject}
                                loading={loading}
                            />
                        )}
                        {openPanel === 'upload' && (
                            <UploadPanel t={t} />
                        )}
                        {['intelligence', 'governance'].includes(openPanel) && (
                            <NavPanel sectionId={openPanel} activeNav={activeNav} onNav={setActiveNav} t={t} />
                        )}
                        {openPanel === 'settings' && (
                            <SettingsPanel
                                config={config}
                                onConfigChange={handleConfigChange}
                                theme={theme}
                                onTheme={setTheme}
                                t={t}
                                onClose={() => setOpenPanel(null)}
                                backendStatus={backendStatus}
                            />
                        )}
                    </div>
                )}

                {/* ── Resizable Editor + Right Panel ── */}
                <PanelGroup direction="horizontal" style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                    <Panel defaultSize={55} minSize={25} id="editor-panel" order={1}>
                        <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <MonacoEditor
                                code={fileSource}
                                language={fileLang}
                                filename={activeFile || 'No file open'}
                                breadcrumb={activeFilePath ? activeFilePath : ''}
                                onClose={handleCloseFile}
                                diagnostics={DIAGNOSTICS}
                                highlightLines={[]}
                                theme={theme}
                            />
                        </div>
                    </Panel>
                    <PanelResizeHandle style={{ width: 5, background: t.panelBorder, cursor: 'col-resize', position: 'relative', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 3, height: 32, borderRadius: 2, background: t.mutedText, opacity: 0.7 }} />
                    </PanelResizeHandle>
                    <Panel defaultSize={45} minSize={20} id="right-panel" order={2}>
                        <div style={{ height: '100%', overflow: 'hidden' }}>
                            <RightPanel
                                analysisData={analysisData}
                                activeFile={activeFilePath}
                                projectPath={projectPath}
                                mode={activeEnv}
                                activeNav={activeNav}
                                theme={theme}
                            />
                        </div>
                    </Panel>
                </PanelGroup>
            </div>

            {/* ── Status Bar ── */}
            <div style={{ height: 22, background: t.statusBar, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', fontSize: 12, color: '#ffffff', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><GitBranch size={11} /> main</span>
                    <span>UTF-8</span>
                    {analysisData && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <AlertCircle size={11} /> {analysisData.health_score?.breakdown?.security_issues || 0}&nbsp;
                        <AlertTriangle size={11} /> {analysisData.health_score?.breakdown?.high_complexity_files || 0}
                    </span>}
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <span style={{ opacity: 0.85 }}>{activeEnv === 'cloud' ? 'AWS BEDROCK' : config?.local?.provider?.toUpperCase() || 'OLLAMA'}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: backendStatus === 'online' ? '#4caf50' : '#f44336', display: 'inline-block' }} />
                        {backendStatus === 'online' ? 'CONNECTED' : 'OFFLINE'}
                    </span>
                    <span style={{ opacity: 0.85 }}>LIFT v2.4.1</span>
                </div>
            </div>
        </div>
    );
}
