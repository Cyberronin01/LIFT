"""LegacyLift — Full Phase 1 Test Suite"""

import os
import sys
import tempfile

passed = 0
failed = 0

def test(name, fn):
    global passed, failed
    try:
        fn()
        print(f"  PASS  {name}")
        passed += 1
    except Exception as e:
        print(f"  FAIL  {name}: {e}")
        failed += 1

print("=" * 60)
print("LEGACYLIFT PHASE 1 — FULL TEST SUITE")
print("=" * 60)

# TEST 1: Scanner
print("\n[TEST 1] Scanner")
from legacylift.core.scanner import scan_project
scan = scan_project("legacylift/samples")
test("finds 4 files", lambda: None if scan.total_files == 4 else (_ for _ in ()).throw(AssertionError(f"got {scan.total_files}")))
test("counts 263 lines", lambda: None if scan.total_lines == 263 else (_ for _ in ()).throw(Exception(f"got {scan.total_lines}")))
test("no errors", lambda: None if len(scan.errors) == 0 else (_ for _ in ()).throw(Exception(str(scan.errors))))
test("detects cobol", lambda: None if scan.languages.get("cobol") == 4 else (_ for _ in ()).throw(Exception(str(scan.languages))))
print(f"  → {scan.total_files} files, {scan.total_lines} lines")

# TEST 2: Parser
print("\n[TEST 2] COBOL Parser")
from legacylift.parsers.cobol_parser import parse_file
for f in ["payroll.cbl", "taxmodule.cbl", "empmanager.cbl", "reportgen.cbl"]:
    r = parse_file(f"legacylift/samples/{f}")
    test(f"parses {f}", lambda r=r: None if r["success"] else (_ for _ in ()).throw(Exception(r["error"])))

# TEST 3: Semantic Extractor
print("\n[TEST 3] Semantic Extractor")
from legacylift.analyzers.semantic_extractor import extract_semantics

sem_payroll = extract_semantics("legacylift/samples/payroll.cbl")
sd = sem_payroll.to_dict()
test("program name = PAYROLL", lambda: None if sd["program_name"] == "PAYROLL" else (_ for _ in ()).throw(Exception(sd["program_name"])))
test("10 variables", lambda: None if sd["stats"]["variable_count"] == 10 else (_ for _ in ()).throw(Exception(str(sd["stats"]["variable_count"]))))
test("5+ rules (IF + EVALUATE)", lambda: None if sd["stats"]["rule_count"] >= 5 else (_ for _ in ()).throw(Exception(str(sd["stats"]["rule_count"]))))
test("1 CALL (REPORTGEN)", lambda: None if sd["stats"]["call_count"] == 1 else (_ for _ in ()).throw(Exception(str(sd["stats"]["call_count"]))))
test("WS-SALARY = 9(6)V99", lambda: None if sd["variables"].get("WS-SALARY") == "9(6)V99" else (_ for _ in ()).throw(Exception(str(sd["variables"].get("WS-SALARY")))))
test("7 paragraphs", lambda: None if sd["stats"]["paragraph_count"] == 7 else (_ for _ in ()).throw(Exception(str(sd["stats"]["paragraph_count"]))))
print(f"  → {sd['program_name']}: {sd['stats']['variable_count']} vars, {sd['stats']['rule_count']} rules, {sd['stats']['call_count']} calls")

sem_emp = extract_semantics("legacylift/samples/empmanager.cbl")
test("security flag on empmanager", lambda: None if len(sem_emp.security_flags) > 0 else (_ for _ in ()).throw(Exception("no security flags")))
print(f"  → Security: {sem_emp.security_flags}")

sem_tax = extract_semantics("legacylift/samples/taxmodule.cbl")
td = sem_tax.to_dict()
test("taxmodule has 2 calls", lambda: None if td["stats"]["call_count"] == 2 else (_ for _ in ()).throw(Exception(str(td["stats"]["call_count"]))))
print(f"  → TAXMODULE: {td['stats']['call_count']} calls ({[c['target'] for c in td['calls']]})")

# TEST 4: Dependency Graph
print("\n[TEST 4] Dependency Graph")
from legacylift.analyzers.dependency_graph import build_dependency_graph
graph = build_dependency_graph("legacylift/samples")
gd = graph.to_dict()
test("4 internal programs", lambda: None if gd["stats"]["total_programs"] == 4 else (_ for _ in ()).throw(Exception(str(gd["stats"]["total_programs"]))))
test("2 external deps", lambda: None if gd["stats"]["total_external"] == 2 else (_ for _ in ()).throw(Exception(str(gd["stats"]["total_external"]))))
test("6 edges", lambda: None if gd["stats"]["total_edges"] == 6 else (_ for _ in ()).throw(Exception(str(gd["stats"]["total_edges"]))))
test("mermaid diagram", lambda: None if "graph TD" in graph.to_mermaid() else (_ for _ in ()).throw(Exception("missing")))
print(f"  → {gd['stats']['total_programs']} programs, {gd['stats']['total_external']} external, {gd['stats']['total_edges']} edges")

# TEST 5: Migration Blueprint
print("\n[TEST 5] Migration Blueprint")
from legacylift.analyzers.migration_blueprint import generate_blueprint
bp = generate_blueprint(sd)
test("class = PayrollService", lambda: None if bp.class_name == "PayrollService" else (_ for _ in ()).throw(Exception(bp.class_name)))
test("10 fields", lambda: None if len(bp.fields) == 10 else (_ for _ in ()).throw(Exception(str(len(bp.fields)))))
test("7 methods", lambda: None if len(bp.methods) == 7 else (_ for _ in ()).throw(Exception(str(len(bp.methods)))))
test("uses BigDecimal", lambda: None if "BigDecimal" in bp.skeleton_code else (_ for _ in ()).throw(Exception("missing")))
test("has class declaration", lambda: None if "public class PayrollService" in bp.skeleton_code else (_ for _ in ()).throw(Exception("missing")))
print(f"  → {bp.class_name}: {len(bp.fields)} fields, {len(bp.methods)} methods, {len(bp.skeleton_code)} chars")

# TEST 6: RAG Store
print("\n[TEST 6] RAG Store")
from legacylift.rag.rag_store import index_project, search, clear_index
db_path = os.path.join(tempfile.gettempdir(), "legacylift_test_db")
clear_index(db_path)
idx = index_project("legacylift/samples", db_path)
test("indexed 4 files", lambda: None if idx["files_indexed"] == 4 else (_ for _ in ()).throw(Exception(str(idx["files_indexed"]))))
test("30+ chunks", lambda: None if idx["total_chunks"] > 30 else (_ for _ in ()).throw(Exception(str(idx["total_chunks"]))))
results = search("tax calculation salary", n_results=3, db_path=db_path)
test("search returns results", lambda: None if len(results) > 0 else (_ for _ in ()).throw(Exception("empty")))
print(f"  → {idx['files_indexed']} files, {idx['total_chunks']} chunks, search={len(results)} results")

# TEST 7: LLM Explainer (no actual LLM call)
print("\n[TEST 7] LLM Explainer (prompt only)")
from legacylift.llm.llm_explainer import EXPLAIN_TEMPLATE, SYSTEM_PROMPT, OllamaProvider
test("template has Program field", lambda: None if "Program:" in EXPLAIN_TEMPLATE else (_ for _ in ()).throw(Exception("missing")))
test("system prompt anti-hallucination", lambda: None if "hallucinate" in SYSTEM_PROMPT.lower() else (_ for _ in ()).throw(Exception("missing")))
test("provider init", lambda: None if OllamaProvider("glm-4.7-flash").model == "glm-4.7-flash" else (_ for _ in ()).throw(Exception("wrong model")))

# TEST 8: FastAPI Server (import)
print("\n[TEST 8] FastAPI Server")
from legacylift.api.server import app
routes = [r.path for r in app.routes]
for endpoint in ["/health", "/scan", "/analyze", "/explain", "/migrate", "/search"]:
    test(f"endpoint {endpoint}", lambda ep=endpoint: None if ep in routes else (_ for _ in ()).throw(Exception("missing")))

# TEST 9: CLI
print("\n[TEST 9] CLI")
from legacylift.cli import cli
commands = list(cli.commands.keys())
for cmd in ["scan", "analyze", "explain", "migrate", "graph", "serve"]:
    test(f"command {cmd}", lambda c=cmd: None if c in commands else (_ for _ in ()).throw(Exception("missing")))

# SUMMARY
print("\n" + "=" * 60)
print(f"RESULTS: {passed} PASSED, {failed} FAILED out of {passed + failed}")
print("=" * 60)
if failed > 0:
    sys.exit(1)
