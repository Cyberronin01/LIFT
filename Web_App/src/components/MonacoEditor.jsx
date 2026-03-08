import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { tokenizeLine_COBOL, tokenizeTypescriptLine, getTokenColor } from './CobolSyntax';

const LINE_HEIGHT = 20;
const GUTTER_WIDTH = 56;
const FOLD_INDICATOR_WIDTH = 16;

const COBOL_FOLD_SECTIONS = [
    { start: 1, end: 4, label: 'IDENTIFICATION DIVISION' },
    { start: 5, end: 11, label: 'ENVIRONMENT DIVISION' },
    { start: 12, end: 26, label: 'DATA DIVISION' },
    { start: 27, end: 52, label: 'PROCEDURE DIVISION' },
];

function renderTokens(tokens) {
    return tokens.map((t, i) => (
        <span key={i} style={{ color: getTokenColor(t.type) }}>{t.text}</span>
    ));
}

export function MonacoEditor({
    code,
    language = 'cobol',
    filename = 'No file open',
    breadcrumb = '',
    onClose,
    diagnostics = [],
    highlightLines = [],
    theme = 'vsdark',
}) {
    const isAmoled = theme === 'amoled';
    const isLight = theme === 'light';
    const bg = isAmoled ? '#000000' : isLight ? '#ffffff' : '#1e1e1e';
    const headerBg = isAmoled ? '#050505' : isLight ? '#f3f3f3' : '#252526';
    const border = isAmoled ? '#111' : isLight ? '#e0e0e0' : '#3c3c3c';
    const text = isLight ? '#333333' : '#cccccc';
    const activeBorder = isLight ? '#005fb8' : '#007acc';

    const safeCode = typeof code === 'string' ? code : '';
    const hasContent = safeCode.trim().length > 0;
    const lines = safeCode.split('\n');
    const [foldedSections, setFoldedSections] = useState(new Set());
    const [hoveredLine, setHoveredLine] = useState(null);
    const [activeLine, setActiveLine] = useState(1);

    const isFolded = (lineNum) => {
        for (const section of COBOL_FOLD_SECTIONS) {
            if (foldedSections.has(section.start) && lineNum > section.start && lineNum <= section.end) return true;
        }
        return false;
    };

    const toggleFold = (startLine) => {
        setFoldedSections(prev => {
            const next = new Set(prev);
            if (next.has(startLine)) next.delete(startLine);
            else next.add(startLine);
            return next;
        });
    };

    const getFoldSection = (lineNum) => COBOL_FOLD_SECTIONS.find(s => s.start === lineNum);
    const getDiagnosticForLine = (lineNum) => diagnostics.filter(d => d.line === lineNum);
    const getHighlightForLine = (lineNum) => highlightLines.find(h => h.line === lineNum);

    const visibleLines = [];
    lines.forEach((content, idx) => {
        const lineNum = idx + 1;
        if (!isFolded(lineNum)) visibleLines.push({ lineNum, content });
    });

    const tokenize = (line, lineNum) => {
        if (language === 'typescript') return tokenizeTypescriptLine(line);
        return tokenizeLine_COBOL(line, lineNum);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: bg, color: text, fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace" }}>
            {/* Tab Bar */}
            <div style={{ background: headerBg, borderBottom: `1px solid ${border}`, minHeight: 35, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                <div style={{ background: bg, borderTop: `1px solid ${activeBorder}`, borderRight: `1px solid ${border}`, color: text, fontSize: 13, padding: '0 16px', height: 35, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: language === 'cobol' ? '#4ec9b0' : '#3178c6', fontSize: 11 }}>
                        {language === 'cobol' ? 'CBL' : 'TS'}
                    </span>
                    <span>{filename}</span>
                    {hasContent && typeof onClose === 'function' && (
                        <button
                            onClick={onClose}
                            title="Close"
                            style={{ background: 'transparent', border: 'none', padding: 0, marginLeft: 4, cursor: 'pointer', display: 'flex' }}
                        >
                            <X size={12} style={{ color: '#858585' }} />
                        </button>
                    )}
                </div>
                {hasContent && breadcrumb && (
                    <div style={{ color: '#858585', fontSize: 12, padding: '0 16px', marginLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {breadcrumb}
                    </div>
                )}
            </div>

            {/* Editor Body */}
            <div style={{ flex: 1, overflow: 'auto', background: bg, position: 'relative' }}>
                {!hasContent ? (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#858585', fontSize: 13, textAlign: 'center', padding: 24 }}>
                        Open a project, then select a file to view it here.
                    </div>
                ) : (
                    <div style={{ position: 'relative', minHeight: visibleLines.length * LINE_HEIGHT + 40, minWidth: 'max-content' }}>
                        {visibleLines.map(({ lineNum, content }, visIdx) => {
                            const lineDiags = getDiagnosticForLine(lineNum);
                            const highlight = getHighlightForLine(lineNum);
                            const foldSection = getFoldSection(lineNum);
                            const isFoldedStart = foldedSections.has(lineNum);
                            const isActive = activeLine === lineNum;
                            const isHovered = hoveredLine === lineNum;

                            let lineBackground = 'transparent';
                            if (highlight?.type === 'added') lineBackground = 'rgba(40,167,69,0.2)';
                            else if (highlight?.type === 'removed') lineBackground = 'rgba(220,38,38,0.2)';
                            else if (highlight?.type === 'modified') lineBackground = 'rgba(255,165,0,0.1)';
                            else if (isActive) lineBackground = isAmoled ? '#111' : isLight ? '#f0f0f0' : '#282828';
                            else if (isHovered) lineBackground = isAmoled ? '#0a0a0a' : isLight ? '#f9f9f9' : '#2a2a2a';

                            const hasError = lineDiags.some(d => d.type === 'error');
                            const hasWarning = lineDiags.some(d => d.type === 'warning');
                            const hasInfo = lineDiags.some(d => d.type === 'info');

                            return (
                                <div
                                    key={lineNum}
                                    style={{
                                        display: 'flex', alignItems: 'flex-start', height: LINE_HEIGHT, background: lineBackground,
                                        position: 'relative', cursor: 'text',
                                        borderLeft: highlight?.type === 'added' ? '3px solid #28a745' :
                                            highlight?.type === 'removed' ? '3px solid #dc3545' :
                                                highlight?.type === 'modified' ? '3px solid #ffa500' : '3px solid transparent',
                                    }}
                                    onMouseEnter={() => setHoveredLine(lineNum)}
                                    onMouseLeave={() => setHoveredLine(null)}
                                    onClick={() => setActiveLine(lineNum)}
                                >
                                    {/* Diagnostics gutter */}
                                    <div style={{ width: 20, minWidth: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', height: LINE_HEIGHT }}>
                                        {hasError && <AlertCircle size={12} style={{ color: '#f44747' }} />}
                                        {!hasError && hasWarning && <AlertTriangle size={12} style={{ color: '#cca700' }} />}
                                        {!hasError && !hasWarning && hasInfo && <Info size={12} style={{ color: '#75beff' }} />}
                                    </div>

                                    {/* Line number */}
                                    <div style={{ width: 36, minWidth: 36, textAlign: 'right', color: isActive ? '#c6c6c6' : '#858585', fontSize: 13, lineHeight: `${LINE_HEIGHT}px`, userSelect: 'none', paddingRight: 8 }}>
                                        {lineNum}
                                    </div>

                                    {/* Fold indicator */}
                                    <div
                                        style={{ width: FOLD_INDICATOR_WIDTH, minWidth: FOLD_INDICATOR_WIDTH, display: 'flex', alignItems: 'center', justifyContent: 'center', height: LINE_HEIGHT, cursor: foldSection ? 'pointer' : 'default' }}
                                        onClick={e => { if (foldSection) { e.stopPropagation(); toggleFold(lineNum); } }}
                                    >
                                        {foldSection && (isFoldedStart ? <ChevronRight size={12} style={{ color: '#858585' }} /> : <ChevronDown size={12} style={{ color: '#858585' }} />)}
                                        {!foldSection && isHovered && <div style={{ width: 1, height: LINE_HEIGHT, background: '#454545' }} />}
                                    </div>

                                    {/* Code content */}
                                    <div style={{ flex: 1, fontSize: 13, lineHeight: `${LINE_HEIGHT}px`, whiteSpace: 'pre', overflow: 'visible', paddingRight: 40 }}>
                                        {isFoldedStart ? (
                                            <span>
                                                {renderTokens(tokenize(content, lineNum))}
                                                <span
                                                    style={{ color: '#858585', background: '#3a3a3a', border: '1px solid #555', borderRadius: 3, padding: '0 6px', marginLeft: 8, fontSize: 11, cursor: 'pointer' }}
                                                    onClick={e => { e.stopPropagation(); toggleFold(lineNum); }}
                                                >
                                                    ⋯ {COBOL_FOLD_SECTIONS.find(s => s.start === lineNum)?.end - lineNum} lines folded
                                                </span>
                                            </span>
                                        ) : renderTokens(tokenize(content, lineNum))}
                                    </div>

                                    {/* Diagnostic underline */}
                                    {lineDiags.length > 0 && (
                                        <div style={{ position: 'absolute', bottom: 2, left: GUTTER_WIDTH + FOLD_INDICATOR_WIDTH, right: 0, height: 2, background: hasError ? '#f44747' : hasWarning ? '#cca700' : '#75beff', opacity: 0.6, pointerEvents: 'none' }} />
                                    )}

                                    {/* Diagnostic hover tooltip */}
                                    {isHovered && lineDiags.length > 0 && (
                                        <div style={{ position: 'absolute', top: LINE_HEIGHT, left: GUTTER_WIDTH + FOLD_INDICATOR_WIDTH, zIndex: 100, background: '#252526', border: `1px solid ${hasError ? '#f44747' : hasWarning ? '#cca700' : '#75beff'}`, borderRadius: 4, padding: '6px 10px', fontSize: 12, color: '#cccccc', maxWidth: 420, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', pointerEvents: 'none', whiteSpace: 'normal' }}>
                                            {lineDiags.map((d, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: i < lineDiags.length - 1 ? 4 : 0 }}>
                                                    {d.type === 'error' && <AlertCircle size={12} style={{ color: '#f44747', marginTop: 1 }} />}
                                                    {d.type === 'warning' && <AlertTriangle size={12} style={{ color: '#cca700', marginTop: 1 }} />}
                                                    {d.type === 'info' && <Info size={12} style={{ color: '#75beff', marginTop: 1 }} />}
                                                    <span>{d.message}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
