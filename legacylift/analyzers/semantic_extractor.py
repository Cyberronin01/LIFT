"""
LegacyLift — Semantic Extractor
Extracts structured facts from COBOL AST:
  - Program ID
  - Variables (WORKING-STORAGE)
  - Business Rules (IF, EVALUATE)
  - External Calls (CALL statements)
  - Paragraphs (control flow)
"""

from dataclasses import dataclass, field
from legacylift.parsers.cobol_parser import parse_file, get_node_text, find_nodes_by_type, find_nodes_by_types


@dataclass
class Variable:
    name: str
    pic: str
    level: str
    parent: str = ""


@dataclass
class BusinessRule:
    rule_type: str  # "if" or "evaluate"
    condition: str
    action: str
    line: int = 0


@dataclass
class ExternalCall:
    target: str
    arguments: list[str] = field(default_factory=list)
    line: int = 0


@dataclass
class Paragraph:
    name: str
    performs: list[str] = field(default_factory=list)
    line: int = 0


@dataclass
class SemanticResult:
    """All extracted facts from one COBOL file."""
    filepath: str
    program_name: str = ""
    variables: list[Variable] = field(default_factory=list)
    rules: list[BusinessRule] = field(default_factory=list)
    calls: list[ExternalCall] = field(default_factory=list)
    paragraphs: list[Paragraph] = field(default_factory=list)
    security_flags: list[str] = field(default_factory=list)
    parse_errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "filepath": self.filepath,
            "program_name": self.program_name,
            "variables": {v.name: v.pic for v in self.variables},
            "rules": [
                {"type": r.rule_type, "condition": r.condition, "action": r.action, "line": r.line}
                for r in self.rules
            ],
            "calls": [
                {"target": c.target, "args": c.arguments, "line": c.line}
                for c in self.calls
            ],
            "paragraphs": [
                {"name": p.name, "performs": p.performs, "line": p.line}
                for p in self.paragraphs
            ],
            "security_flags": self.security_flags,
            "stats": {
                "variable_count": len(self.variables),
                "rule_count": len(self.rules),
                "call_count": len(self.calls),
                "paragraph_count": len(self.paragraphs),
                "complexity": self._calc_complexity(),
            },
        }

    def _calc_complexity(self) -> int:
        """Simple cyclomatic complexity: count decision points."""
        return len(self.rules) + len(self.calls) + max(0, len(self.paragraphs) - 1)


def _clean_text(text: str) -> str:
    """Clean whitespace from extracted text."""
    return " ".join(text.split())


def _extract_program_id(root, source: bytes) -> str:
    """Extract PROGRAM-ID from IDENTIFICATION DIVISION."""
    # Look for program_id node or walk for PROGRAM-ID pattern
    for node in _walk_all(root):
        if node.type == "program_name":
            return get_node_text(node, source).strip().rstrip(".")
        # Some grammars use WORD after PROGRAM-ID
        if node.type == "WORD":
            text = get_node_text(node, source).strip()
            # Check if parent context suggests this is the program name
            parent = node.parent
            if parent and "program" in parent.type.lower():
                return text
    return "UNKNOWN"


def _extract_variables(root, source: bytes) -> list[Variable]:
    """Extract variables from WORKING-STORAGE SECTION."""
    variables = []
    current_group = ""

    for node in _walk_all(root):
        # Look for data description entries (level numbers + names + PIC)
        if node.type in ("data_description", "data_description_entry"):
            text = get_node_text(node, source)
            parts = text.split()
            if len(parts) >= 2:
                level = parts[0]
                name = parts[1].rstrip(".")

                # Find PIC clause
                pic = ""
                pic_idx = text.upper().find("PIC ")
                if pic_idx == -1:
                    pic_idx = text.upper().find("PICTURE ")
                if pic_idx >= 0:
                    rest = text[pic_idx:].split()
                    if len(rest) >= 2:
                        pic = rest[1].rstrip(".")

                # Track group levels
                if level == "01":
                    current_group = name
                elif level in ("05", "10", "15", "77"):
                    if pic:  # Only add variables with PIC clauses
                        variables.append(Variable(
                            name=name,
                            pic=pic,
                            level=level,
                            parent=current_group,
                        ))
    return variables


def _extract_rules_from_if(root, source: bytes) -> list[BusinessRule]:
    """Extract IF conditions and their actions."""
    rules = []

    for node in _walk_all(root):
        if node.type == "if_header":
            condition = ""
            # Find the expression inside the IF
            for child in node.children:
                if child.type == "expr":
                    condition = _clean_text(get_node_text(child, source))
                    break
            if not condition:
                condition = _clean_text(get_node_text(node, source))
                # Remove "IF" prefix
                if condition.upper().startswith("IF "):
                    condition = condition[3:]

            # Find the action (next sibling that's a statement)
            action = _get_next_action(node, source)
            if condition:
                rules.append(BusinessRule(
                    rule_type="if",
                    condition=condition,
                    action=action,
                    line=node.start_point[0] + 1,
                ))

    return rules


def _extract_rules_from_evaluate(root, source: bytes) -> list[BusinessRule]:
    """Extract EVALUATE/WHEN conditions and their actions."""
    rules = []

    for node in _walk_all(root):
        if node.type == "when":
            condition = ""
            for child in node.children:
                if child.type == "expr":
                    condition = _clean_text(get_node_text(child, source))
                    break
            if not condition:
                text = _clean_text(get_node_text(node, source))
                if text.upper().startswith("WHEN "):
                    condition = text[5:]

            action = _get_next_action(node, source)
            if condition:
                rules.append(BusinessRule(
                    rule_type="evaluate",
                    condition=condition,
                    action=action,
                    line=node.start_point[0] + 1,
                ))

        elif node.type == "when_other":
            action = _get_next_action(node, source)
            rules.append(BusinessRule(
                rule_type="evaluate",
                condition="OTHER (default)",
                action=action,
                line=node.start_point[0] + 1,
            ))

    return rules


def _extract_calls(root, source: bytes) -> list[ExternalCall]:
    """Extract CALL statements (external module dependencies)."""
    calls = []

    for node in _walk_all(root):
        if node.type == "call_statement":
            target = ""
            args = []
            for child in node.children:
                if child.type == "string":
                    target = get_node_text(child, source).strip().strip("'\"")
                elif child.type == "call_param_arg":
                    arg_text = _clean_text(get_node_text(child, source))
                    args.append(arg_text)

            if target:
                calls.append(ExternalCall(
                    target=target,
                    arguments=args,
                    line=node.start_point[0] + 1,
                ))

    return calls


def _extract_paragraphs(root, source: bytes) -> list[Paragraph]:
    """Extract paragraph names and their PERFORM targets."""
    paragraphs = []
    current_para = None

    for node in _walk_all(root):
        if node.type == "paragraph_header":
            name = ""
            for child in node.children:
                if child.type in ("WORD", "label", "qualified_word"):
                    name = get_node_text(child, source).strip().rstrip(".")
                    break
            if not name:
                text = get_node_text(node, source).strip().rstrip(".")
                name = text

            if name:
                current_para = Paragraph(name=name, line=node.start_point[0] + 1)
                paragraphs.append(current_para)

        elif node.type == "perform_procedure" and current_para:
            target = _clean_text(get_node_text(node, source))
            if target:
                current_para.performs.append(target)

    return paragraphs


def _check_security(source: bytes) -> list[str]:
    """Quick pattern-based security flag detection."""
    flags = []
    text = source.decode("utf-8", errors="replace").upper()

    if "HARDCODED" in text or "PASSWORD" in text:
        flags.append("Possible hardcoded credentials detected")
    if "VALUE \"" in text or "VALUE '" in text:
        # Check if any VALUE looks like a key/password
        import re
        for match in re.finditer(r'VALUE\s+["\']([^"\']{8,})["\']', text):
            val = match.group(1)
            if any(c.isdigit() for c in val) and any(c.isalpha() for c in val):
                flags.append(f"Hardcoded value resembling credential: {val[:20]}...")

    return flags


def _get_next_action(node, source: bytes) -> str:
    """Get the action statement following a condition node."""
    parent = node.parent
    if not parent:
        return ""

    found = False
    for child in parent.children:
        if child == node:
            found = True
            continue
        if found and child.type not in ("period", "END_IF", "END_EVALUATE", "when", "when_other", "else_header", "else_if_header"):
            text = _clean_text(get_node_text(child, source))
            if text and len(text) > 2:
                return text
    return ""


def _walk_all(node):
    """Walk entire tree yielding all nodes."""
    yield node
    for child in node.children:
        yield from _walk_all(child)


def extract_semantics(filepath: str) -> SemanticResult:
    """
    Main entry point: extract all semantic facts from a COBOL file.

    Args:
        filepath: Path to a .cbl or .cob file.

    Returns:
        SemanticResult with all extracted facts.
    """
    result = SemanticResult(filepath=filepath)

    parse_result = parse_file(filepath)
    if not parse_result["success"]:
        result.parse_errors.append(parse_result["error"])
        return result

    root = parse_result["root_node"]
    source = parse_result["source"]

    # Extract all facts
    result.program_name = _extract_program_id(root, source)
    result.variables = _extract_variables(root, source)
    result.rules = _extract_rules_from_if(root, source) + _extract_rules_from_evaluate(root, source)
    result.calls = _extract_calls(root, source)
    result.paragraphs = _extract_paragraphs(root, source)
    result.security_flags = _check_security(source)

    return result


if __name__ == "__main__":
    import json
    import sys

    target = sys.argv[1] if len(sys.argv) > 1 else None
    if target:
        result = extract_semantics(target)
        print(json.dumps(result.to_dict(), indent=2))
    else:
        print("Usage: python semantic_extractor.py <file.cbl>")
