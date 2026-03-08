"""
LegacyLift — FastAPI Backend Server
Serves analysis results to the Electron frontend and web app via localhost.
"""

import os
import shutil
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, Form, File as FastAPIFile
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

from legacylift.core.scanner import scan_project
from legacylift.parsers.cobol_parser import parse_file, summarize_file_ast
from legacylift.analyzers.semantic_extractor import extract_semantics
from legacylift.analyzers.dependency_graph import build_dependency_graph
from legacylift.analyzers.migration_blueprint import generate_blueprint
from legacylift.rag.rag_store import index_project, search as rag_search
from legacylift.llm.llm_explainer import (
    explain_program,
    migration_assist,
    ai_insights_view,
    create_provider_from_config,
    test_provider_connection,
)
from legacylift.api.config import (
    load_config, save_config, update_config, add_recent_project, get_masked_config,
)


app = FastAPI(
    title="LegacyLift API",
    description="AI-powered legacy code analysis engine",
    version="0.1.0",
)

# Allow Electron frontend + web app to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── State ───

_current_project: Optional[str] = None
_analysis_cache: Optional[dict] = None
_log_entries: list = []


def _add_log(label: str, detail: str, status: str = "info"):
    """Add an entry to the in-memory log."""
    from datetime import datetime
    _log_entries.insert(0, {
        "time": datetime.now().strftime("%H:%M:%S"),
        "label": label,
        "detail": detail,
        "msg": f"LIFT_ENGINE: {detail}",
        "status": status,
    })
    if len(_log_entries) > 100:
        _log_entries.pop()


def get_llm():
    """Create LLM provider from current config."""
    return create_provider_from_config()


# ─── Request Models ───

class AnalyzeRequest(BaseModel):
    path: str


class ExplainRequest(BaseModel):
    file: str


class MigrateRequest(BaseModel):
    file: str
    target: str = "Java"


class SearchRequest(BaseModel):
    query: str
    n_results: int = 5


class ConfigUpdate(BaseModel):
    config: dict


class ProjectCreateRequest(BaseModel):
    name: str
    path: str


# ─── Health & Config Endpoints ───

@app.get("/health")
def health():
    """Health check."""
    config = load_config()
    return {"status": "ok", "version": "0.1.0", "mode": config.get("mode", "local")}


@app.get("/config")
def get_config():
    """Get current config (secrets masked)."""
    config = load_config()
    return get_masked_config(config)


@app.post("/config")
def set_config(req: ConfigUpdate):
    """Update config."""
    updated = update_config(req.config)
    _add_log("Config", f"Configuration updated — mode: {updated.get('mode', 'local')}", "success")
    return get_masked_config(updated)


@app.post("/config/test-connection")
def test_connection():
    """Test if the configured LLM provider is reachable."""
    config = load_config()
    _add_log("System", "Testing LLM connection...", "info")
    result = test_provider_connection(config)
    if result.get("ok"):
        _add_log("System", f"Connection OK — {result.get('provider', 'unknown')}", "success")
    else:
        _add_log("System", f"Connection failed — {result.get('error', 'unknown')}", "error")
    return result


@app.get("/logs")
def get_logs():
    """Get recent log entries."""
    return {"logs": _log_entries[:50]}


# ─── Project Management ───

@app.get("/projects/list")
def list_projects():
    """List recent projects from config."""
    config = load_config()
    recents = config.get("recent_projects", [])
    projects = []
    for p in recents:
        exists = os.path.exists(p)
        name = os.path.basename(p) or p
        projects.append({"path": p, "name": name, "exists": exists})
    return {"projects": projects}


@app.post("/projects/open")
def open_project(req: AnalyzeRequest):
    """Open a project — scan it and add to recent list."""
    global _current_project

    if not os.path.exists(req.path):
        raise HTTPException(status_code=404, detail=f"Path not found: {req.path}")

    _current_project = req.path
    add_recent_project(req.path)
    _add_log("Project", f"Opened project: {os.path.basename(req.path)}", "success")

    # Return quick scan
    result = scan_project(req.path)
    return {"project": req.path, "name": os.path.basename(req.path), "scan": result.to_dict()}


@app.post("/projects/create")
def create_project(req: ProjectCreateRequest):
    """Create a new project folder structure."""
    project_path = os.path.join(req.path, req.name)

    try:
        os.makedirs(project_path, exist_ok=True)
        # Create standard subfolders
        for sub in ["src", "config", "output"]:
            os.makedirs(os.path.join(project_path, sub), exist_ok=True)

        add_recent_project(project_path)
        _add_log("Project", f"Created project: {req.name}", "success")

        return {"project": project_path, "name": req.name, "created": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/projects/files")
def list_files(req: AnalyzeRequest):
    """List all files in a project directory as a tree."""
    if not os.path.exists(req.path):
        raise HTTPException(status_code=404, detail=f"Path not found: {req.path}")

    def build_tree(dir_path: str, depth: int = 0) -> list:
        items = []
        try:
            entries = sorted(os.listdir(dir_path), key=lambda x: (not os.path.isdir(os.path.join(dir_path, x)), x.lower()))
        except PermissionError:
            return items

        for entry in entries:
            if entry.startswith(".") or entry in ("__pycache__", "node_modules", ".git", "dist", "venv"):
                continue

            full_path = os.path.join(dir_path, entry)

            if os.path.isdir(full_path):
                children = build_tree(full_path, depth + 1) if depth < 5 else []
                items.append({
                    "name": entry,
                    "type": "folder",
                    "path": os.path.relpath(full_path, start="."),
                    "expanded": depth < 2,
                    "children": children,
                })
            else:
                ext = os.path.splitext(entry)[1].lower()
                lang = _detect_lang(ext)
                items.append({
                    "name": entry,
                    "type": "file",
                    "path": os.path.relpath(full_path, start="."),
                    "lang": lang,
                    "size": os.path.getsize(full_path),
                })

        return items

    tree = build_tree(req.path)
    return {"path": req.path, "tree": tree}


def _detect_lang(ext: str) -> str:
    mapping = {
        ".cbl": "COBOL", ".cob": "COBOL", ".cpy": "COBOL", ".cobol": "COBOL",
        ".jcl": "JCL", ".proc": "JCL",
        ".pli": "PL/I", ".pl1": "PL/I",
        ".asm": "Assembler", ".s": "Assembler",
        ".rpg": "RPG", ".rpgle": "RPG",
        ".json": "JSON", ".yaml": "YAML", ".yml": "YAML",
        ".py": "Python", ".java": "Java", ".ts": "TypeScript", ".js": "JavaScript",
        ".xml": "XML", ".sql": "SQL", ".txt": "Text", ".md": "Markdown",
        ".csv": "CSV", ".dat": "Data",
    }
    return mapping.get(ext, "Other")


# ─── File Upload ───

@app.post("/upload")
async def upload_files(files: List[UploadFile] = FastAPIFile(...), session_id: str = Form(None)):
    """Upload files to the current project (or a new cloud session sandbox)."""
    import uuid
    if not session_id:
        session_id = str(uuid.uuid4())
        
    project_dir = os.path.abspath(os.path.join("uploads", session_id))
    src_dir = os.path.join(project_dir, "src")
    os.makedirs(src_dir, exist_ok=True)

    uploaded = []
    for upload in files:
        dest = os.path.join(src_dir, upload.filename)
        with open(dest, "wb") as f:
            content = await upload.read()
            f.write(content)
        uploaded.append({"name": upload.filename, "path": dest, "size": len(content)})
        _add_log("Upload", f"Uploaded: {upload.filename} ({len(content)} bytes) to session {session_id[:8]}", "success")

    return {"uploaded": uploaded, "count": len(uploaded), "session_id": session_id, "project_path": project_dir}


@app.post("/load-sample")
def load_sample():
    """Copy built-in sample files into a new UUID session sandbox."""
    import uuid
    session_id = str(uuid.uuid4())
    project_dir = os.path.join("uploads", session_id)
    src_dir = os.path.join(project_dir, "src")
    os.makedirs(src_dir, exist_ok=True)

    sample_dir = os.path.abspath(os.path.join("legacylift", "samples"))
    for file_name in os.listdir(sample_dir):
        if file_name.endswith(".cbl"):
            shutil.copy(os.path.join(sample_dir, file_name), os.path.join(src_dir, file_name))

    _add_log("Upload", f"Loaded sample code into session {session_id[:8]}", "success")
    return {"session_id": session_id, "project_path": project_dir}


# ─── Analysis Endpoints ───

@app.post("/scan")
def scan(req: AnalyzeRequest):
    """Scan a project directory and return metadata."""
    if not os.path.exists(req.path):
        raise HTTPException(status_code=404, detail=f"Path not found: {req.path}")

    result = scan_project(req.path)
    return result.to_dict()


@app.post("/file/source")
def file_source(req: ExplainRequest):
    """Return raw file source content."""
    if not os.path.exists(req.file):
        raise HTTPException(status_code=404, detail=f"File not found: {req.file}")
        
    try:
        content = Path(req.file).read_text(encoding="utf-8", errors="replace")
        return {"file": req.file, "source": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    """Full analysis: scan + parse + extract semantics + dependency graph."""
    global _current_project, _analysis_cache

    if not os.path.exists(req.path):
        raise HTTPException(status_code=404, detail=f"Path not found: {req.path}")

    _current_project = req.path
    add_recent_project(req.path)
    _add_log("Analysis", f"Starting analysis of {os.path.basename(req.path)}...", "info")

    # Scan
    scan_result = scan_project(req.path)
    _add_log("Scanner", f"Found {len(scan_result.files)} files, {scan_result.total_lines} lines", "success")

    # Extract semantics for all files
    file_semantics = []
    for file_info in scan_result.files:
        filepath = os.path.join(req.path, file_info.path)
        sem = extract_semantics(filepath)
        file_semantics.append(sem.to_dict())

    _add_log("Extractor", f"Extracted semantics from {len(file_semantics)} files", "success")

    # Build dependency graph
    dep_graph = build_dependency_graph(req.path)
    _add_log("Dependency", f"Built graph: {len(dep_graph.nodes)} nodes, {len(dep_graph.edges)} edges", "success")

    # Index into RAG
    rag_result = index_project(req.path)
    _add_log("RAG", f"Indexed into vector store", "success")

    # Calculate health score
    health = _calculate_health(scan_result, file_semantics, dep_graph)
    _add_log("Health", f"Score: {health['score']}/10 ({health['rating']})", "success")

    result = {
        "scan": scan_result.to_dict(),
        "semantics": file_semantics,
        "dependency_graph": dep_graph.to_dict(),
        "dependency_mermaid": dep_graph.to_mermaid(),
        "rag_index": rag_result,
        "health_score": health,
    }

    _analysis_cache = result
    _add_log("Analysis", "Analysis complete", "success")
    return result


@app.post("/explain")
def explain_file(req: ExplainRequest):
    """Get AI explanation for a specific file."""
    if not os.path.exists(req.file):
        raise HTTPException(status_code=404, detail=f"File not found: {req.file}")

    _add_log("AI", f"Explaining {os.path.basename(req.file)}...", "info")

    sem = extract_semantics(req.file)
    sem_dict = sem.to_dict()

    # Get AST summary (compact tree-sitter outline) to ground the LLM
    ast = summarize_file_ast(req.file, max_depth=5, max_nodes=250)
    ast_summary = ast["summary"] if ast.get("success") else f"(AST unavailable: {ast.get('error')})"

    # Get AI explanation
    explanation = explain_program(sem_dict, provider=get_llm(), ast_summary=ast_summary)
    _add_log("AI", f"Explanation generated for {sem_dict.get('program_name', 'UNKNOWN')}", "success")

    return {
        "file": req.file,
        "program": sem_dict["program_name"],
        "facts": sem_dict,
        "ast_summary": ast_summary,
        "explanation": explanation,
    }


@app.post("/ai/insights")
def ai_insights_endpoint(req: ExplainRequest):
    """Get AI security/quality insights for a specific file."""
    if not os.path.exists(req.file):
        raise HTTPException(status_code=404, detail=f"File not found: {req.file}")

    _add_log("AI", f"Insights for {os.path.basename(req.file)}...", "info")

    sem = extract_semantics(req.file)
    sem_dict = sem.to_dict()

    text = ai_insights_view(sem_dict, provider=get_llm())
    _add_log("AI", f"Insights generated for {sem_dict.get('program_name', 'UNKNOWN')}", "success")

    return {
        "file": req.file,
        "program": sem_dict["program_name"],
        "facts": sem_dict,
        "insights": text,
    }


@app.post("/migrate")
def migrate_file(req: MigrateRequest):
    """Generate migration blueprint for a file."""
    if not os.path.exists(req.file):
        raise HTTPException(status_code=404, detail=f"File not found: {req.file}")

    _add_log("Migration", f"Generating blueprint for {os.path.basename(req.file)}...", "info")

    sem = extract_semantics(req.file)
    sem_dict = sem.to_dict()
    blueprint = generate_blueprint(sem_dict, target_lang=req.target)

    # Read original source for side-by-side
    source = Path(req.file).read_text(encoding="utf-8", errors="replace")

    # Optional: AI-assisted migration notes using LLM
    ai_notes = ""
    try:
        ast = summarize_file_ast(req.file, max_depth=5, max_nodes=200)
        ast_summary = ast["summary"] if ast.get("success") else ""
        ai_notes = migration_assist(
            sem_dict,
            target_lang=req.target,
            provider=get_llm(),
            ast_summary=ast_summary,
        )
    except Exception as e:
        _add_log("Migration", f"AI assist failed: {e}", "error")

    _add_log("Migration", f"Blueprint generated: {blueprint.target_language}", "success")

    return {
        "file": req.file,
        "program": sem.program_name,
        "blueprint": blueprint.to_dict(),
        "original_code": source,
        "generated_code": blueprint.skeleton_code,
        "ai_notes": ai_notes,
    }


@app.post("/search")
def search_rag(req: SearchRequest):
    """Search indexed code using natural language."""
    results = rag_search(req.query, n_results=req.n_results)
    return {"query": req.query, "results": results}


@app.post("/file/semantics")
def file_semantics(req: ExplainRequest):
    """Get extracted semantics for a single file (no LLM call)."""
    if not os.path.exists(req.file):
        raise HTTPException(status_code=404, detail=f"File not found: {req.file}")

    sem = extract_semantics(req.file)
    return sem.to_dict()


@app.post("/file/source")
def file_source(req: ExplainRequest):
    """Get raw source code of a file."""
    if not os.path.exists(req.file):
        raise HTTPException(status_code=404, detail=f"File not found: {req.file}")

    source = Path(req.file).read_text(encoding="utf-8", errors="replace")
    return {"file": req.file, "source": source, "lines": source.count("\n") + 1}


# ─── Health Score ───

def _calculate_health(scan_result, semantics: list[dict], dep_graph) -> dict:
    """
    Calculate project health score (0-10).
    Formula: 10 - (security * 2) - (external_deps * 0.5) - (high_complexity * 0.3)
    """
    score = 10.0

    # Security flags
    total_security = sum(len(s.get("security_flags", [])) for s in semantics)
    score -= total_security * 2.0

    # External dependencies (unresolved)
    external_count = len(dep_graph.external_deps)
    score -= external_count * 0.5

    # High complexity files (complexity > 15)
    high_complexity = sum(1 for s in semantics if s.get("stats", {}).get("complexity", 0) > 15)
    score -= high_complexity * 0.3

    score = max(0.0, min(10.0, round(score, 1)))

    return {
        "score": score,
        "max_score": 10.0,
        "breakdown": {
            "security_issues": total_security,
            "external_dependencies": external_count,
            "high_complexity_files": high_complexity,
        },
        "rating": (
            "Critical" if score < 3 else
            "Poor" if score < 5 else
            "Fair" if score < 7 else
            "Good" if score < 9 else
            "Excellent"
        ),
    }


# ─── Static Frontend Serving (For AWS Deployment) ───
# If the React 'dist' folder exists, serve it so the app can be hosted on a single EC2 instance.
dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "dist"))
if os.path.exists(dist_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Serve exact file if it exists, otherwise fallback to React index.html
        requested_file = os.path.join(dist_dir, full_path)
        if os.path.isfile(requested_file):
            return FileResponse(requested_file)
        return FileResponse(os.path.join(dist_dir, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8420)
