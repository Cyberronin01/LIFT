import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileCode, FileJson, File as FileIcon } from 'lucide-react';

function FileIconComp({ lang }) {
    if (!lang) return <FileIcon size={13} style={{ color: '#858585' }} />;
    const colors = {
        'COBOL': '#4ec9b0', 'JCL': '#c586c0', 'PL/I': '#dcdcaa',
        'JSON': '#cca700', 'YAML': '#cca700', 'Python': '#3572A5',
        'Java': '#b07219', 'TypeScript': '#3178c6', 'JavaScript': '#f1e05a',
        'SQL': '#569cd6', 'Assembler': '#f44747', 'RPG': '#4ec9b0',
    };
    return <FileCode size={13} style={{ color: colors[lang] || '#858585' }} />;
}

function TreeNode({ node, depth, activeFile, onFileSelect, theme }) {
    const [expanded, setExpanded] = useState(node.expanded ?? false);
    const isActive = node.type === 'file' && (node.active || node.name === activeFile);

    const handleClick = () => {
        if (node.type === 'folder') setExpanded(e => !e);
        else if (onFileSelect) onFileSelect(node.name, node.path);
    };

    return (
        <div>
            <div
                onClick={handleClick}
                style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    paddingLeft: depth * 12 + 8, paddingRight: 8, height: 24,
                    cursor: 'pointer',
                    background: isActive ? (theme.activeItem || '#37373d') : 'transparent',
                    color: isActive ? '#ffffff' : (theme.panelText || '#cccccc'),
                    fontSize: 13, userSelect: 'none',
                }}
            >
                {node.type === 'folder' ? (
                    <>
                        <span style={{ color: theme.mutedText || '#858585', flexShrink: 0 }}>
                            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </span>
                        {expanded ? <FolderOpen size={13} style={{ color: '#dcb67a', flexShrink: 0 }} /> : <Folder size={13} style={{ color: '#dcb67a', flexShrink: 0 }} />}
                        <span>{node.name}</span>
                    </>
                ) : (
                    <>
                        <span style={{ width: 12, flexShrink: 0 }} />
                        <FileIconComp lang={node.lang} />
                        <span style={{ color: node.lang === 'COBOL' ? '#4ec9b0' : (theme.panelText || '#cccccc') }}>{node.name}</span>
                    </>
                )}
            </div>
            {node.type === 'folder' && expanded && node.children?.map(child => (
                <TreeNode key={child.name} node={child} depth={depth + 1} activeFile={activeFile} onFileSelect={onFileSelect} theme={theme} />
            ))}
        </div>
    );
}

export function FileExplorer({ tree, onFileSelect, activeFile, theme = {} }) {
    const displayTree = tree && tree.length > 0 ? tree : [];
    const t = {
        panelBg: theme.panelBg || '#252526',
        panelText: theme.panelText || '#cccccc',
        panelBorder: theme.panelBorder || '#3c3c3c',
        activeItem: theme.activeItem || '#37373d',
        mutedText: theme.mutedText || '#858585',
    };

    return (
        <div style={{ height: '100%', overflow: 'auto', background: t.panelBg }}>
            <div style={{ padding: '8px 12px', fontSize: 11, color: t.mutedText, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${t.panelBorder}` }}>
                Explorer
            </div>
            {displayTree.length === 0 ? (
                <div style={{ padding: '10px 12px', fontSize: 12, color: t.mutedText }}>
                    Open a project to see its files here.
                </div>
            ) : (
                displayTree.map((node, i) => (
                    <TreeNode key={node.name + i} node={node} depth={0} activeFile={activeFile} onFileSelect={onFileSelect} theme={t} />
                ))
            )}
        </div>
    );
}
