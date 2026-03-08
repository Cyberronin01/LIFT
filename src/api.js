/**
 * LegacyLift — API Client
 * Handles all communication with the FastAPI backend.
 * Supports both Electron (localhost:8420) and web (relative /api) modes.
 */

const BASE_URL = window.electronAPI
    ? 'http://localhost:8420'
    : (window.location.hostname === 'localhost' ? 'http://localhost:8420' : '/api');

async function request(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const { method = 'GET', body, isFormData = false, timeoutMs = 1800000 } = options;

    const headers = {};
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const resp = await fetch(url, {
            method,
            headers,
            body: isFormData ? body : body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ detail: resp.statusText }));
            throw new Error(err.detail || `HTTP ${resp.status}`);
        }

        return await resp.json();
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error('Request timed out. The operation is taking too long — check backend / LLM status and try again.');
        }
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
            throw new Error('Backend not reachable. Start the server with: python -m legacylift.cli serve');
        }
        throw err;
    }
}

// ─── Health ───
export const checkHealth = () => request('/health');

// ─── Config ───
export const getConfig = () => request('/config');
export const setConfig = (config) => request('/config', { method: 'POST', body: { config } });
export const testConnection = () => request('/config/test-connection', { method: 'POST' });

// ─── Projects ───
export const listProjects = () => request('/projects/list');
export const openProject = (path) => request('/projects/open', { method: 'POST', body: { path } });
export const createProject = (name, path) => request('/projects/create', { method: 'POST', body: { name, path } });
export const listFiles = (path) => request('/projects/files', { method: 'POST', body: { path } });

// ─── Upload ───
export const uploadFiles = (files) => {
    const formData = new FormData();
    for (const file of files) {
        formData.append('files', file);
    }
    return request('/upload', { method: 'POST', body: formData, isFormData: true });
};

// ─── Analysis ───
// Heavy operations get a longer but finite timeout so the UI spinner never hangs forever.
export const analyzeProject = (path) => request('/analyze', { method: 'POST', body: { path }, timeoutMs: 1800000 });
export const getFileSource = (file) => request('/file/source', { method: 'POST', body: { file } });
export const getFileSemantics = (file) => request('/file/semantics', { method: 'POST', body: { file } });
export const explainFile = (file) => request('/explain', { method: 'POST', body: { file }, timeoutMs: 1800000 });
export const migrateFile = (file, target = 'Java') => request('/migrate', { method: 'POST', body: { file, target }, timeoutMs: 1800000 });

// ─── AI Views ───
export const getAiInsights = (file) => request('/ai/insights', { method: 'POST', body: { file }, timeoutMs: 1800000 });

// ─── Logs ───
export const getLogs = () => request('/logs');

// ─── Platform detection ───
export const isElectron = () => !!window.electronAPI;
export const isWeb = () => !window.electronAPI;
