"""
LegacyLift — RAG Store
Stores code chunks with semantic metadata in ChromaDB.
Supports semantic search for context retrieval.
"""

import os
import hashlib
from typing import Optional

import chromadb
from chromadb.config import Settings

from legacylift.analyzers.semantic_extractor import extract_semantics


# ─── ChromaDB Setup ───

_client: Optional[chromadb.ClientAPI] = None
_collection = None

DB_PATH = os.path.join(os.path.expanduser("~"), ".legacylift", "chromadb")


def get_collection(db_path: str = DB_PATH):
    """Get or create the ChromaDB collection."""
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(path=db_path)
        _collection = _client.get_or_create_collection(
            name="legacylift_code",
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def _make_id(filepath: str, chunk_type: str, index: int = 0) -> str:
    """Create a deterministic ID for a chunk."""
    key = f"{filepath}:{chunk_type}:{index}"
    return hashlib.md5(key.encode()).hexdigest()


# ─── Indexing ───

def index_file(filepath: str, db_path: str = DB_PATH) -> dict:
    """
    Extract semantics from a COBOL file and store chunks in ChromaDB.

    Each file produces multiple chunks:
      - One "overview" chunk with program summary
      - One chunk per business rule
      - One chunk per paragraph

    Args:
        filepath: Path to .cbl file
        db_path: ChromaDB storage path

    Returns:
        dict with indexing stats
    """
    sem = extract_semantics(filepath)
    sem_dict = sem.to_dict()
    collection = get_collection(db_path)

    chunks_added = 0

    # Overview chunk
    vars_summary = ", ".join(f"{k} ({v})" for k, v in list(sem_dict["variables"].items())[:5])
    overview_text = (
        f"Program: {sem.program_name}. "
        f"Variables: {vars_summary}. "
        f"Rules: {len(sem_dict['rules'])}. "
        f"Calls: {', '.join(c['target'] for c in sem_dict['calls'])}. "
        f"Complexity: {sem_dict['stats']['complexity']}."
    )
    collection.upsert(
        ids=[_make_id(filepath, "overview")],
        documents=[overview_text],
        metadatas=[{
            "filepath": filepath,
            "program": sem.program_name,
            "chunk_type": "overview",
            "complexity": str(sem_dict["stats"]["complexity"]),
        }],
    )
    chunks_added += 1

    # Rule chunks
    for i, rule in enumerate(sem_dict["rules"]):
        rule_text = (
            f"In program {sem.program_name}: "
            f"{rule['type'].upper()} rule at line {rule['line']}: "
            f"IF {rule['condition']} THEN {rule['action']}"
        )
        collection.upsert(
            ids=[_make_id(filepath, "rule", i)],
            documents=[rule_text],
            metadatas=[{
                "filepath": filepath,
                "program": sem.program_name,
                "chunk_type": "rule",
                "rule_type": rule["type"],
                "line": str(rule["line"]),
            }],
        )
        chunks_added += 1

    # Paragraph chunks
    for i, para in enumerate(sem_dict["paragraphs"]):
        performs = " → ".join(para.get("performs", [])) or "no sub-calls"
        para_text = (
            f"In program {sem.program_name}, paragraph {para['name']} "
            f"at line {para['line']}: calls {performs}"
        )
        collection.upsert(
            ids=[_make_id(filepath, "paragraph", i)],
            documents=[para_text],
            metadatas=[{
                "filepath": filepath,
                "program": sem.program_name,
                "chunk_type": "paragraph",
                "paragraph_name": para["name"],
            }],
        )
        chunks_added += 1

    return {
        "filepath": filepath,
        "program": sem.program_name,
        "chunks_added": chunks_added,
    }


def index_project(project_path: str, db_path: str = DB_PATH) -> dict:
    """Index all COBOL files in a project."""
    from legacylift.core.scanner import scan_project

    scan = scan_project(project_path, extensions=[".cbl", ".cob"])
    results = []

    for file_info in scan.files:
        filepath = os.path.join(project_path, file_info.path)
        result = index_file(filepath, db_path)
        results.append(result)

    total_chunks = sum(r["chunks_added"] for r in results)
    return {
        "files_indexed": len(results),
        "total_chunks": total_chunks,
        "details": results,
    }


# ─── Retrieval ───

def search(query: str, n_results: int = 5, db_path: str = DB_PATH) -> list[dict]:
    """
    Search for relevant code chunks using semantic similarity.

    Args:
        query: Natural language query (e.g., "tax calculation logic")
        n_results: Number of results to return
        db_path: ChromaDB storage path

    Returns:
        List of matching chunks with metadata
    """
    collection = get_collection(db_path)

    if collection.count() == 0:
        return []

    results = collection.query(
        query_texts=[query],
        n_results=min(n_results, collection.count()),
    )

    matches = []
    for i in range(len(results["ids"][0])):
        matches.append({
            "id": results["ids"][0][i],
            "text": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "distance": results["distances"][0][i] if results.get("distances") else None,
        })

    return matches


def clear_index(db_path: str = DB_PATH):
    """Clear all indexed data."""
    global _client, _collection
    client = chromadb.PersistentClient(path=db_path)
    try:
        client.delete_collection("legacylift_code")
    except Exception:
        pass
    _collection = None


if __name__ == "__main__":
    import json
    import sys

    if len(sys.argv) < 2:
        print("Usage:")
        print("  python rag_store.py index <project_path>")
        print("  python rag_store.py search <query>")
        sys.exit(1)

    command = sys.argv[1]

    if command == "index":
        path = sys.argv[2] if len(sys.argv) > 2 else "."
        result = index_project(path)
        print(json.dumps(result, indent=2))

    elif command == "search":
        query = " ".join(sys.argv[2:])
        results = search(query)
        print(f"Found {len(results)} results for: {query!r}\n")
        for r in results:
            print(f"  [{r['metadata'].get('chunk_type', '?')}] {r['text'][:100]}...")
            print(f"  Distance: {r['distance']}")
            print()
