"""
LegacyLift — Migration Blueprint Generator
Rule-based COBOL → Java/Python skeleton code generation.
NOT a transpiler. Generates a structural blueprint with mapped constructs.
"""

from dataclasses import dataclass, field


# ─── Type Mappings ───

PIC_TO_JAVA = {
    "9":   "int",
    "9V":  "BigDecimal",
    "S9":  "int",
    "X":   "String",
    "A":   "String",
}

COBOL_TO_JAVA_DEPS = {
    "DB2": "PostgreSQL (via JDBC)",
    "DBACCESS": "JPA Repository / Spring Data",
    "CICS": "Spring Boot REST Controller",
    "VSAM": "Cloud SQL / PostgreSQL",
    "MQ": "Apache Kafka / RabbitMQ",
    "JCL": "Shell Script / Kubernetes Job",
    "AUDITLOG": "SLF4J Logger / Audit Service",
}


@dataclass
class MigrationSuggestion:
    cobol_construct: str
    java_equivalent: str
    confidence: int  # 0-100
    notes: str = ""


@dataclass
class MigrationBlueprint:
    source_program: str
    target_language: str = "Java"
    class_name: str = ""
    fields: list[dict] = field(default_factory=list)
    methods: list[dict] = field(default_factory=list)
    dependencies: list[dict] = field(default_factory=list)
    suggestions: list[MigrationSuggestion] = field(default_factory=list)
    skeleton_code: str = ""

    def to_dict(self) -> dict:
        return {
            "source_program": self.source_program,
            "target_language": self.target_language,
            "class_name": self.class_name,
            "fields": self.fields,
            "methods": self.methods,
            "dependencies": self.dependencies,
            "suggestions": [
                {"cobol": s.cobol_construct, "java": s.java_equivalent,
                 "confidence": s.confidence, "notes": s.notes}
                for s in self.suggestions
            ],
            "skeleton_code": self.skeleton_code,
        }


def _pic_to_java_type(pic: str) -> str:
    """Convert COBOL PIC clause to Java type."""
    pic_upper = pic.upper().strip()

    if "V" in pic_upper:
        return "BigDecimal"
    if pic_upper.startswith("S9") or pic_upper.startswith("9"):
        # Count digits
        import re
        digits = re.findall(r"\((\d+)\)", pic_upper)
        total = sum(int(d) for d in digits) if digits else pic_upper.count("9")
        if total > 9:
            return "long"
        return "int"
    if pic_upper.startswith("X") or pic_upper.startswith("A"):
        return "String"

    return "Object"


def _to_camel_case(name: str) -> str:
    """Convert WS-EMPLOYEE-NAME → employeeName."""
    # Remove WS- prefix
    clean = name.replace("WS-", "").replace("ws-", "")
    parts = clean.lower().split("-")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


def _to_class_name(program: str) -> str:
    """Convert PAYROLL → PayrollService."""
    return program.capitalize() + "Service"


def _rule_to_java(rule: dict) -> str:
    """Convert a business rule to Java code."""
    condition = rule["condition"]
    action = rule["action"]

    # Convert COBOL operators
    java_cond = condition
    for old, new in [(" > ", " > "), (" < ", " < "), (" = ", " == "), (" NOT ", " !")]:
        java_cond = java_cond.replace(old, new)

    # Convert COBOL variable names to camelCase
    import re
    java_cond = re.sub(r"WS-([A-Z0-9-]+)", lambda m: _to_camel_case("WS-" + m.group(1)), java_cond)

    # Convert action
    java_action = action
    if "MOVE" in action.upper():
        parts = action.split()
        if len(parts) >= 4 and parts[-2].upper() == "TO":
            value = parts[1]
            target = _to_camel_case(parts[-1])
            java_action = f"{target} = {value};"
    elif "COMPUTE" in action.upper():
        java_action = re.sub(r"COMPUTE\s+", "", action, flags=re.IGNORECASE)
        java_action = re.sub(r"WS-([A-Z0-9-]+)", lambda m: _to_camel_case("WS-" + m.group(1)), java_action)
        java_action = java_action.rstrip(".") + ";"

    if rule["type"] == "evaluate":
        return f"    // WHEN {condition}\n    case: {java_action}"
    else:
        return f"    if ({java_cond}) {{\n        {java_action}\n    }}"


def generate_blueprint(semantic_dict: dict, target_lang: str = "Java") -> MigrationBlueprint:
    """
    Generate a migration blueprint from extracted semantic facts.

    Args:
        semantic_dict: Output from SemanticResult.to_dict()
        target_lang: Target language (default: Java)

    Returns:
        MigrationBlueprint with skeleton code and suggestions.
    """
    program = semantic_dict.get("program_name", "UNKNOWN")
    blueprint = MigrationBlueprint(
        source_program=program,
        target_language=target_lang,
        class_name=_to_class_name(program),
    )

    # Map variables → fields
    for name, pic in semantic_dict.get("variables", {}).items():
        java_type = _pic_to_java_type(pic)
        java_name = _to_camel_case(name)
        blueprint.fields.append({
            "cobol_name": name,
            "cobol_pic": pic,
            "java_type": java_type,
            "java_name": java_name,
        })
        blueprint.suggestions.append(MigrationSuggestion(
            cobol_construct=f"{name} PIC {pic}",
            java_equivalent=f"{java_type} {java_name}",
            confidence=85 if "V" not in pic else 70,
            notes="Decimal types need BigDecimal for precision" if "V" in pic else "",
        ))

    # Map paragraphs → methods
    for para in semantic_dict.get("paragraphs", []):
        method_name = _to_camel_case(para["name"])
        blueprint.methods.append({
            "cobol_paragraph": para["name"],
            "java_method": method_name,
            "calls": [_to_camel_case(p) for p in para.get("performs", [])],
        })

    # Map CALL targets → dependencies
    for call in semantic_dict.get("calls", []):
        target = call["target"]
        modern = COBOL_TO_JAVA_DEPS.get(target, f"{_to_class_name(target)}")
        blueprint.dependencies.append({
            "cobol_call": target,
            "java_equivalent": modern,
            "is_mapped": target in COBOL_TO_JAVA_DEPS,
        })
        blueprint.suggestions.append(MigrationSuggestion(
            cobol_construct=f"CALL '{target}'",
            java_equivalent=modern,
            confidence=90 if target in COBOL_TO_JAVA_DEPS else 60,
        ))

    # Generate skeleton code
    blueprint.skeleton_code = _generate_skeleton(blueprint, semantic_dict)

    return blueprint


def _generate_skeleton(blueprint: MigrationBlueprint, semantic_dict: dict) -> str:
    """Generate Java skeleton code."""
    lines = []
    lines.append(f"/**")
    lines.append(f" * Migrated from COBOL program: {blueprint.source_program}")
    lines.append(f" * Generated by LegacyLift — AI-Assisted Migration Blueprint")
    lines.append(f" * NOTE: This is a structural skeleton. Business logic validation required.")
    lines.append(f" */")
    lines.append(f"")
    lines.append(f"import java.math.BigDecimal;")
    lines.append(f"")
    lines.append(f"public class {blueprint.class_name} {{")
    lines.append(f"")

    # Fields
    lines.append(f"    // === Data Fields (from WORKING-STORAGE) ===")
    for f in blueprint.fields:
        lines.append(f"    private {f['java_type']} {f['java_name']};  // COBOL: {f['cobol_name']} PIC {f['cobol_pic']}")
    lines.append(f"")

    # Methods
    for method in blueprint.methods:
        lines.append(f"    /**")
        lines.append(f"     * Migrated from paragraph: {method['cobol_paragraph']}")
        lines.append(f"     */")
        lines.append(f"    public void {method['java_method']}() {{")
        for call in method.get("calls", []):
            lines.append(f"        {call}();")
        # Add translated rules for this paragraph
        lines.append(f"        // TODO: Implement business logic")
        lines.append(f"    }}")
        lines.append(f"")

    # Business rules as comments
    rules = semantic_dict.get("rules", [])
    if rules:
        lines.append(f"    // === Business Rules (extracted from COBOL) ===")
        for r in rules:
            lines.append(f"    // {r['type'].upper()}: IF {r['condition']} THEN {r['action']}")
        lines.append(f"")

    lines.append(f"}}")

    return "\n".join(lines)


if __name__ == "__main__":
    import json
    import sys
    from legacylift.analyzers.semantic_extractor import extract_semantics

    target = sys.argv[1] if len(sys.argv) > 1 else None
    if target:
        sem = extract_semantics(target)
        bp = generate_blueprint(sem.to_dict())
        print("=== Migration Blueprint ===")
        print(json.dumps(bp.to_dict(), indent=2, default=str))
        print("\n=== Generated Java Skeleton ===")
        print(bp.skeleton_code)
    else:
        print("Usage: python migration_blueprint.py <file.cbl>")
