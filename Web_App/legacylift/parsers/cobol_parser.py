"""
LegacyLift — COBOL Parser
Uses tree-sitter to parse COBOL files into ASTs.
"""

from pathlib import Path
from tree_sitter_language_pack import get_parser, get_language


# Initialize COBOL parser once
_cobol_parser = None


def get_cobol_parser():
    """Get or create the COBOL tree-sitter parser."""
    global _cobol_parser
    if _cobol_parser is None:
        _cobol_parser = get_parser("cobol")
    return _cobol_parser


def parse_file(filepath: str) -> dict:
    """
    Parse a COBOL file and return the AST root node + metadata.

    Args:
        filepath: Path to a .cbl or .cob file.

    Returns:
        dict with 'tree', 'root_node', 'source', 'filepath', 'success', 'error'
    """
    path = Path(filepath)
    if not path.exists():
        return {
            "tree": None,
            "root_node": None,
            "source": b"",
            "filepath": str(path),
            "success": False,
            "error": f"File not found: {path}",
        }

    try:
        source = path.read_bytes()
        parser = get_cobol_parser()
        tree = parser.parse(source)

        return {
            "tree": tree,
            "root_node": tree.root_node,
            "source": source,
            "filepath": str(path),
            "success": True,
            "error": None,
        }
    except Exception as e:
        return {
            "tree": None,
            "root_node": None,
            "source": b"",
            "filepath": str(path),
            "success": False,
            "error": str(e),
        }


def walk_tree(node, depth=0):
    """
    Recursively walk the AST and yield (depth, node_type, text) tuples.
    Useful for debugging/inspection.
    """
    text = ""
    if node.child_count == 0:
        text = node.text.decode("utf-8", errors="replace") if node.text else ""
    yield (depth, node.type, text, node.start_point, node.end_point)
    for child in node.children:
        yield from walk_tree(child, depth + 1)


def summarize_ast(root_node, source: bytes, max_depth: int = 5, max_nodes: int = 250) -> str:
    """
    Produce a compact, readable AST outline for LLM prompting / debugging.

    - Limits depth and node count to keep the prompt small.
    - Includes leaf node text (trimmed) for better grounding.
    """
    if root_node is None:
        return ""

    lines: list[str] = []
    node_count = 0

    for depth, node_type, text, start, end in walk_tree(root_node):
        if depth > max_depth:
            continue
        node_count += 1
        if node_count > max_nodes:
            lines.append("... (truncated)")
            break

        indent = "  " * depth
        if text:
            snippet = text.replace("\n", " ").strip()
            if len(snippet) > 60:
                snippet = snippet[:57] + "..."
            lines.append(f"{indent}{node_type}: {snippet}")
        else:
            lines.append(f"{indent}{node_type}")

    return "\n".join(lines)


def summarize_file_ast(filepath: str, max_depth: int = 5, max_nodes: int = 250) -> dict:
    """
    Parse a file and return a compact AST summary.
    Returns { success, summary, error }.
    """
    result = parse_file(filepath)
    if not result.get("success"):
        return {"success": False, "summary": "", "error": result.get("error")}

    summary = summarize_ast(result.get("root_node"), result.get("source", b""), max_depth=max_depth, max_nodes=max_nodes)
    return {"success": True, "summary": summary, "error": None}


def print_tree(filepath: str, max_depth: int = 6):
    """Print the AST of a COBOL file for debugging."""
    result = parse_file(filepath)
    if not result["success"]:
        print(f"PARSE ERROR: {result['error']}")
        return

    for depth, node_type, text, start, end in walk_tree(result["root_node"]):
        if depth > max_depth:
            continue
        indent = "  " * depth
        if text:
            print(f"{indent}{node_type}: {text!r}  [{start[0]}:{start[1]}]")
        else:
            print(f"{indent}{node_type}  [{start[0]}:{start[1]}-{end[0]}:{end[1]}]")


def get_node_text(node, source: bytes) -> str:
    """Extract the text content of an AST node."""
    return source[node.start_byte:node.end_byte].decode("utf-8", errors="replace")


def find_nodes_by_type(node, node_type: str) -> list:
    """Recursively find all nodes of a given type in the AST."""
    results = []
    if node.type == node_type:
        results.append(node)
    for child in node.children:
        results.extend(find_nodes_by_type(child, node_type))
    return results


def find_nodes_by_types(node, node_types: set) -> list:
    """Recursively find all nodes matching any of the given types."""
    results = []
    if node.type in node_types:
        results.append(node)
    for child in node.children:
        results.extend(find_nodes_by_types(child, node_types))
    return results


if __name__ == "__main__":
    import sys
    target = sys.argv[1] if len(sys.argv) > 1 else None
    if target:
        print_tree(target, max_depth=8)
    else:
        print("Usage: python cobol_parser.py <file.cbl>")
