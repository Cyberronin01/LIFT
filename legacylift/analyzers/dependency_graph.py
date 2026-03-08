"""
LegacyLift — Dependency Graph
Builds a call graph from CALL statements across all files.
Shows who-calls-who and detects external dependencies.
"""

import os
from dataclasses import dataclass, field
from legacylift.analyzers.semantic_extractor import extract_semantics, SemanticResult
from legacylift.core.scanner import scan_project


@dataclass
class DependencyNode:
    program: str
    filepath: str = ""
    calls_out: list[str] = field(default_factory=list)
    called_by: list[str] = field(default_factory=list)
    is_external: bool = False  # True if not found in project


@dataclass
class DependencyGraph:
    nodes: dict[str, DependencyNode] = field(default_factory=dict)
    edges: list[tuple[str, str]] = field(default_factory=list)
    external_deps: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "nodes": {
                name: {
                    "filepath": n.filepath,
                    "calls_out": n.calls_out,
                    "called_by": n.called_by,
                    "is_external": n.is_external,
                }
                for name, n in self.nodes.items()
            },
            "edges": [{"from": a, "to": b} for a, b in self.edges],
            "external_deps": self.external_deps,
            "stats": {
                "total_programs": len([n for n in self.nodes.values() if not n.is_external]),
                "total_external": len(self.external_deps),
                "total_edges": len(self.edges),
            },
        }

    def to_mermaid(self) -> str:
        """Generate a Mermaid diagram string."""
        lines = ["graph TD"]
        for name, node in self.nodes.items():
            if node.is_external:
                lines.append(f'    {name}["{name}<br/>(External)"]:::external')
            else:
                lines.append(f'    {name}["{name}"]:::internal')
        for src, dst in self.edges:
            lines.append(f"    {src} --> {dst}")
        lines.append("    classDef internal fill:#2563eb,color:#fff,stroke:#1e40af")
        lines.append("    classDef external fill:#e94560,color:#fff,stroke:#c81d42")
        return "\n".join(lines)


def build_dependency_graph(project_path: str) -> DependencyGraph:
    """
    Scan a project and build a dependency graph from CALL statements.

    Args:
        project_path: Path to project folder.

    Returns:
        DependencyGraph with nodes, edges, and external dependencies.
    """
    graph = DependencyGraph()

    # Scan for COBOL files
    scan = scan_project(project_path, extensions=[".cbl", ".cob"])

    # Extract semantics from each file
    semantics: list[SemanticResult] = []
    known_programs: dict[str, str] = {}  # program_name -> filepath

    for file_info in scan.files:
        filepath = os.path.join(project_path, file_info.path)
        sem = extract_semantics(filepath)
        semantics.append(sem)

        if sem.program_name and sem.program_name != "UNKNOWN":
            known_programs[sem.program_name] = filepath

    # Build nodes for all known programs
    for name, fpath in known_programs.items():
        graph.nodes[name] = DependencyNode(
            program=name,
            filepath=fpath,
            is_external=False,
        )

    # Build edges from CALL statements
    for sem in semantics:
        if sem.program_name == "UNKNOWN":
            continue

        for call in sem.calls:
            target = call.target.upper()

            # Add edge
            graph.edges.append((sem.program_name, target))

            # Track in source node
            if sem.program_name in graph.nodes:
                graph.nodes[sem.program_name].calls_out.append(target)

            # Create node for target if not exists
            if target not in graph.nodes:
                graph.nodes[target] = DependencyNode(
                    program=target,
                    is_external=True,
                )
                graph.external_deps.append(target)

            # Track called_by
            graph.nodes[target].called_by.append(sem.program_name)

    return graph


if __name__ == "__main__":
    import json
    import sys

    target = sys.argv[1] if len(sys.argv) > 1 else "."
    graph = build_dependency_graph(target)
    print(json.dumps(graph.to_dict(), indent=2))
    print("\n--- Mermaid Diagram ---")
    print(graph.to_mermaid())
