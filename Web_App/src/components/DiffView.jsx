import React from 'react';
import { CheckCircle } from 'lucide-react';
import { tokenizeLine_COBOL, tokenizeTypescriptLine, getTokenColor } from './CobolSyntax';

const LINE_HEIGHT = 19;
const COBOL_REMOVED_LINES = [];
const TS_ADDED_LINES = [];

function renderTokens(tokens) {
    return tokens.map((t, i) => (
        <span key={i} style={{ color: getTokenColor(t.type) }}>{t.text}</span>
    ));
}

function DiffPanel({ title, badge, badgeColor, code, language, highlightedLines, highlightType, theme }) {
    const isAmoled = theme === 'amoled';
    const bg = isAmoled ? '#000000' : '#1e1e1e';
    const headerBg = isAmoled ? '#050505' : '#252526';
    const border = isAmoled ? '#111' : '#3c3c3c';

    const lines = code.split('\n');
    const tokenize = (line, idx) => language === 'typescript' ? tokenizeTypescriptLine(line) : tokenizeLine_COBOL(line, idx + 1);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden', background: bg, color: '#cccccc' }}>
            <div style={{ background: headerBg, borderBottom: `1px solid ${border}`, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, flexShrink: 0 }}>
                <span style={{ color: '#cccccc' }}>{title}</span>
                <span style={{ background: badgeColor, color: '#fff', borderRadius: 3, padding: '2px 8px', fontSize: 11 }}>{badge}</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto', fontFamily: "'JetBrains Mono', Consolas, monospace" }}>
                {lines.map((line, idx) => {
                    const lineNum = idx + 1;
                    const isHighlighted = highlightedLines.includes(idx);
                    let bg = 'transparent', borderColor = 'transparent', prefix = ' ';
                    if (isHighlighted && highlightType === 'removed') { bg = 'rgba(220,38,38,0.18)'; borderColor = '#dc3545'; prefix = '-'; }
                    else if (isHighlighted && highlightType === 'added') { bg = 'rgba(40,167,69,0.18)'; borderColor = '#28a745'; prefix = '+'; }

                    return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', height: LINE_HEIGHT, background: bg, borderLeft: `3px solid ${borderColor}` }}>
                            <div style={{ width: 16, minWidth: 16, textAlign: 'center', fontSize: 12, lineHeight: `${LINE_HEIGHT}px`, color: highlightType === 'removed' ? '#f85149' : '#3fb950', userSelect: 'none', fontWeight: 600 }}>
                                {isHighlighted ? prefix : ' '}
                            </div>
                            <div style={{ width: 36, minWidth: 36, textAlign: 'right', color: '#555', fontSize: 12, lineHeight: `${LINE_HEIGHT}px`, userSelect: 'none', paddingRight: 8 }}>{lineNum}</div>
                            <div style={{ flex: 1, fontSize: 12, lineHeight: `${LINE_HEIGHT}px`, whiteSpace: 'pre', overflow: 'hidden', paddingRight: 8, textDecoration: isHighlighted && highlightType === 'removed' ? 'line-through' : 'none', opacity: isHighlighted && highlightType === 'removed' ? 0.7 : 1 }}>
                                {renderTokens(tokenize(line, idx))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function DiffView({ migration, theme }) {
    const isAmoled = theme === 'amoled';
    const isLight = theme === 'light';
    const bg = isAmoled ? '#000000' : isLight ? '#ffffff' : '#1e1e1e';
    const headerBg = isAmoled ? '#050505' : isLight ? '#f3f3f3' : '#252526';
    const border = isAmoled ? '#111' : isLight ? '#e0e0e0' : '#3c3c3c';
    const text = isLight ? '#333333' : '#cccccc';
    const textTitle = isLight ? '#333333' : '#d4d4d4';
    const textMuted = isLight ? '#777777' : '#858585';

    const original = migration?.original_code;
    const migrated = migration?.generated_code;

    if (!original || !migrated) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: bg, color: textMuted, alignItems: 'center', justifyContent: 'center', fontSize: 13, textAlign: 'center', padding: 24 }}>
                <div style={{ marginBottom: 8 }}>Run a migration on a COBOL file to see a side-by-side diff here.</div>
                <div style={{ fontSize: 12 }}>Use the “Migration Output” tab first, then come back to Diff View.</div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: bg, color: text }}>
            <div style={{ background: headerBg, borderBottom: `1px solid ${border}`, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: textMuted, flexShrink: 0 }}>
                <span style={{ color: textTitle }}>Comparing:</span>
                <span style={{ color: '#4ec9b0' }}>{migration.program || 'COBOL Program'}</span>
                <span>→</span>
                <span style={{ color: '#3178c6' }}>{`${migration.program || 'output'}.ts`}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
                    <span style={{ color: '#3fb950', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={13} /> Generated from latest migration
                    </span>
                </div>
            </div>
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', borderTop: `1px solid ${border}` }}>
                <DiffPanel title="ORIGINAL SOURCE" badge="COBOL" badgeColor="#4ec9b0" code={original} language="cobol" highlightedLines={COBOL_REMOVED_LINES} highlightType="removed" theme={theme} />
                <div style={{ width: 1, background: border, flexShrink: 0 }} />
                <DiffPanel title="MIGRATED TARGET" badge="TypeScript" badgeColor="#3178c6" code={migrated} language="typescript" highlightedLines={TS_ADDED_LINES} highlightType="added" theme={theme} />
            </div>
            <div style={{ background: headerBg, borderTop: `1px solid ${border}`, padding: '12px 16px', flexShrink: 0 }}>
                <div style={{ color: text, fontSize: 12, marginBottom: 8 }}>Migration Summary</div>
                <div style={{ display: 'flex', gap: 32, fontSize: 12 }}>
                    <div><span style={{ color: textMuted }}>Source lines </span><span style={{ color: '#f85149', fontWeight: 600 }}>{original.split('\n').length}</span></div>
                    <div><span style={{ color: textMuted }}>Target lines </span><span style={{ color: '#3fb950', fontWeight: 600 }}>{migrated.split('\n').length}</span></div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={13} style={{ color: '#3fb950' }} />
                        <span style={{ color: '#3fb950', fontSize: 12 }}>Blueprint only — review required</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
