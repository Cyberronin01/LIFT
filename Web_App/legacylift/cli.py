"""
LegacyLift — CLI Entry Point
Command-line interface for the analysis pipeline.
"""

import json
import sys
import os
import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import print as rprint


console = Console()


@click.group()
@click.version_option(version="0.1.0", prog_name="LegacyLift")
def cli():
    """LegacyLift — AI-powered legacy code analysis and modernization."""
    pass


@cli.command()
@click.argument("path", type=click.Path(exists=True))
def scan(path):
    """Scan a project directory for legacy code files."""
    from legacylift.core.scanner import scan_project

    with console.status("Scanning project..."):
        result = scan_project(path)

    # Display results
    console.print(Panel(
        f"[bold]{result.project_name}[/bold]\n"
        f"Path: {result.project_path}",
        title="Project Scan",
        border_style="blue",
    ))

    table = Table(title="Files Found")
    table.add_column("File", style="cyan")
    table.add_column("Language", style="green")
    table.add_column("Lines", justify="right")
    table.add_column("Size", justify="right")

    for f in result.files:
        table.add_row(
            f.filename,
            f.language,
            str(f.line_count),
            f"{f.size_bytes:,} B",
        )

    console.print(table)
    console.print(f"\n[bold green]Total:[/bold green] {result.total_files} files, {result.total_lines} lines")


@cli.command()
@click.argument("path", type=click.Path(exists=True))
@click.option("--json-output", is_flag=True, help="Output as JSON")
def analyze(path, json_output):
    """Full analysis: scan + parse + extract semantics."""
    from legacylift.analyzers.semantic_extractor import extract_semantics
    from legacylift.core.scanner import scan_project

    scan_result = scan_project(path, extensions=[".cbl", ".cob"])

    if json_output:
        all_semantics = []
        for f in scan_result.files:
            filepath = os.path.join(path, f.path)
            sem = extract_semantics(filepath)
            all_semantics.append(sem.to_dict())
        click.echo(json.dumps(all_semantics, indent=2))
        return

    for f in scan_result.files:
        filepath = os.path.join(path, f.path)
        with console.status(f"Analyzing {f.filename}..."):
            sem = extract_semantics(filepath)
            sd = sem.to_dict()

        console.print(Panel(
            f"[bold cyan]{sd['program_name']}[/bold cyan] ({f.filename})\n"
            f"Variables: {sd['stats']['variable_count']} | "
            f"Rules: {sd['stats']['rule_count']} | "
            f"Calls: {sd['stats']['call_count']} | "
            f"Complexity: {sd['stats']['complexity']}",
            border_style="blue",
        ))

        if sd['rules']:
            for r in sd['rules'][:5]:
                rprint(f"  [yellow]{r['type'].upper()}[/yellow] IF {r['condition']} → {r['action']}")

        if sd['calls']:
            calls_str = ", ".join(c['target'] for c in sd['calls'])
            rprint(f"  [red]CALLS:[/red] {calls_str}")

        if sd['security_flags']:
            for flag in sd['security_flags']:
                rprint(f"  [red bold]⚠ SECURITY:[/red bold] {flag}")

        console.print()


@cli.command()
@click.argument("file", type=click.Path(exists=True))
def explain(file):
    """Get AI explanation for a COBOL file."""
    from legacylift.analyzers.semantic_extractor import extract_semantics
    from legacylift.llm.llm_explainer import explain_program

    with console.status("Extracting facts..."):
        sem = extract_semantics(file)
        sd = sem.to_dict()

    console.print(Panel(
        f"[bold]{sd['program_name']}[/bold] — {sd['stats']['variable_count']} vars, "
        f"{sd['stats']['rule_count']} rules, {sd['stats']['call_count']} calls",
        title="Extracted Facts",
        border_style="cyan",
    ))

    with console.status("Asking AI to explain (this may take a moment)..."):
        explanation = explain_program(sd)

    console.print(Panel(explanation, title="AI Explanation", border_style="green"))


@cli.command()
@click.argument("file", type=click.Path(exists=True))
@click.option("--target", default="Java", help="Target language (default: Java)")
def migrate(file, target):
    """Generate migration blueprint for a COBOL file."""
    from legacylift.analyzers.semantic_extractor import extract_semantics
    from legacylift.analyzers.migration_blueprint import generate_blueprint

    with console.status("Generating migration blueprint..."):
        sem = extract_semantics(file)
        bp = generate_blueprint(sem.to_dict(), target_lang=target)

    console.print(Panel(
        f"[bold]{bp.source_program}[/bold] → [green]{bp.class_name}[/green]\n"
        f"Fields: {len(bp.fields)} | Methods: {len(bp.methods)} | Deps: {len(bp.dependencies)}",
        title=f"Migration Blueprint ({target})",
        border_style="yellow",
    ))

    console.print("\n[bold]Generated Skeleton:[/bold]\n")
    from rich.syntax import Syntax
    syntax = Syntax(bp.skeleton_code, "java", theme="monokai", line_numbers=True)
    console.print(syntax)


@cli.command()
@click.argument("path", type=click.Path(exists=True))
def graph(path):
    """Show dependency graph for a project."""
    from legacylift.analyzers.dependency_graph import build_dependency_graph

    with console.status("Building dependency graph..."):
        dep_graph = build_dependency_graph(path)
        gd = dep_graph.to_dict()

    console.print(Panel(
        f"Programs: {gd['stats']['total_programs']} | "
        f"External Deps: {gd['stats']['total_external']} | "
        f"Connections: {gd['stats']['total_edges']}",
        title="Dependency Graph",
        border_style="magenta",
    ))

    table = Table(title="Call Graph")
    table.add_column("From", style="cyan")
    table.add_column("→", style="white")
    table.add_column("To", style="green")
    table.add_column("Type", style="yellow")

    for edge in gd["edges"]:
        is_ext = gd["nodes"][edge["to"]]["is_external"]
        table.add_row(edge["from"], "→", edge["to"], "EXTERNAL" if is_ext else "internal")

    console.print(table)

    console.print("\n[bold]Mermaid Diagram:[/bold]\n")
    console.print(dep_graph.to_mermaid())


@cli.command()
def serve():
    """Start the FastAPI backend server."""
    import uvicorn
    console.print(f"[bold green]▶[/bold green] Starting FastAPI server on http://localhost:8420")
    uvicorn.run("legacylift.api.server:app", host="0.0.0.0", port=8420, reload=True, timeout_keep_alive=1800)


if __name__ == "__main__":
    cli()
