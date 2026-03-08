// COBOL Syntax Tokenizer — adapted from Figma export

export function tokenizeLine_COBOL(line, lineNum) {
    const tokens = [];
    if (!line) { tokens.push({ text: '', type: 'plain' }); return tokens; }

    const KEYWORDS = ['IDENTIFICATION', 'DIVISION', 'PROGRAM-ID', 'AUTHOR', 'DATE-WRITTEN', 'ENVIRONMENT',
        'INPUT-OUTPUT', 'SECTION', 'FILE-CONTROL', 'SELECT', 'ASSIGN', 'TO', 'ORGANIZATION', 'IS', 'INDEXED',
        'ACCESS', 'MODE', 'DYNAMIC', 'RECORD', 'KEY', 'DATA', 'FILE', 'FD', 'WORKING-STORAGE', 'PROCEDURE',
        'PERFORM', 'UNTIL', 'STOP', 'RUN', 'OPEN', 'INPUT', 'OUTPUT', 'CLOSE', 'READ', 'NEXT', 'AT', 'END',
        'MOVE', 'IF', 'NOT', 'DISPLAY', 'ADD', 'END-IF', 'END-READ', 'VALUE', 'PIC', 'ZEROS', 'COPY'];

    const parts = line.split(/(\s+)/);
    for (const part of parts) {
        if (/^\s+$/.test(part)) {
            tokens.push({ text: part, type: 'plain' });
        } else if (KEYWORDS.includes(part.replace('.', '').toUpperCase())) {
            tokens.push({ text: part, type: 'keyword' });
        } else if (/^[0-9]+$/.test(part) || /^S?9\(/.test(part) || /^X\(/.test(part) || /^V[0-9]+/.test(part)) {
            tokens.push({ text: part, type: 'number' });
        } else if (/^['"]/.test(part)) {
            tokens.push({ text: part, type: 'string' });
        } else if (/^[A-Z][A-Z0-9-]*\.?$/.test(part) && part.length > 2) {
            tokens.push({ text: part, type: 'identifier' });
        } else {
            tokens.push({ text: part, type: 'plain' });
        }
    }
    return tokens;
}

export function tokenizeTypescriptLine(line) {
    const tokens = [];
    if (!line) { tokens.push({ text: '', type: 'plain' }); return tokens; }

    const TS_KEYWORDS = ['import', 'from', 'export', 'class', 'const', 'let', 'async', 'await', 'return',
        'try', 'catch', 'throw', 'new', 'for', 'of', 'if', 'else', 'private', 'readonly', 'void', 'number',
        'string', 'null', 'constructor', 'extends', 'implements', 'interface', 'type'];

    const parts = line.split(/(\s+|[{}();,.<>:=+\-*/!?&|[\]])/);
    for (const part of parts) {
        if (!part) continue;
        if (/^\s+$/.test(part)) tokens.push({ text: part, type: 'plain' });
        else if (TS_KEYWORDS.includes(part)) tokens.push({ text: part, type: 'keyword' });
        else if (/^['"`]/.test(part)) tokens.push({ text: part, type: 'string' });
        else if (/^[0-9]+/.test(part)) tokens.push({ text: part, type: 'number' });
        else if (/^@/.test(part)) tokens.push({ text: part, type: 'decorator' });
        else if (/^[A-Z][a-zA-Z]*$/.test(part)) tokens.push({ text: part, type: 'type' });
        else if (/^[{}();,.<>:=+\-*/!?&|[\]]$/.test(part)) tokens.push({ text: part, type: 'punctuation' });
        else tokens.push({ text: part, type: 'identifier' });
    }
    return tokens;
}

export function getTokenColor(type) {
    const colors = {
        keyword: '#569cd6',
        number: '#b5cea8',
        string: '#ce9178',
        identifier: '#9cdcfe',
        type: '#4ec9b0',
        decorator: '#dcdcaa',
        punctuation: '#d4d4d4',
        comment: '#6a9955',
        plain: '#d4d4d4',
    };
    return colors[type] || '#d4d4d4';
}
