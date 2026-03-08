import React from 'react';

export default function StatusBar({ status, projectPath, fileCount, healthScore }) {
    const dotClass = status === 'online' ? '' : status === 'checking' ? 'app-statusbar__dot--loading' : 'app-statusbar__dot--offline';

    return (
        <div className="app-statusbar">
            <div className="app-statusbar__left">
                <div className="app-statusbar__item">
                    <span className={`app-statusbar__dot ${dotClass}`} />
                    <span>GLM-4.7 Flash</span>
                </div>

                {projectPath && (
                    <div className="app-statusbar__item">
                        <span>{fileCount || 0} files</span>
                    </div>
                )}
            </div>

            <div className="app-statusbar__right">
                {healthScore && (
                    <div className="app-statusbar__item">
                        <span>Health: {healthScore.score}/{healthScore.max_score}</span>
                    </div>
                )}
                <div className="app-statusbar__item">
                    <span>LegacyLift v0.1</span>
                </div>
            </div>
        </div>
    );
}
