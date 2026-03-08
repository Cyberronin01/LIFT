import React from 'react';

export default function Titlebar({ projectPath }) {
    const minimize = () => window.electronAPI?.minimize();
    const maximize = () => window.electronAPI?.maximize();
    const close = () => window.electronAPI?.close();

    return (
        <div className="app-titlebar">
            <div className="app-titlebar__brand">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                </svg>
                <span>LegacyLift</span>
            </div>

            <div className="app-titlebar__center">
                {projectPath ? projectPath : 'No project loaded'}
            </div>

            <div className="app-titlebar__controls">
                <button className="app-titlebar__btn" onClick={minimize} title="Minimize">
                    <svg width="12" height="12" viewBox="0 0 12 12"><rect y="5" width="12" height="1.5" fill="currentColor" rx="0.75" /></svg>
                </button>
                <button className="app-titlebar__btn" onClick={maximize} title="Maximize">
                    <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" rx="1.5" /></svg>
                </button>
                <button className="app-titlebar__btn app-titlebar__btn--close" onClick={close} title="Close">
                    <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
            </div>
        </div>
    );
}
