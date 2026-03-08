"""
LegacyLift — LLM Explainer
Uses structured semantic facts + LLM to generate plain English explanations.
Supports Ollama (local), LM Studio (local), and AWS Bedrock (cloud).
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional
import json
import requests

import ollama as ollama_sdk


# ─── Provider Interfaces ───

class CompletionProvider(ABC):
    """Interface for text completion."""

    @abstractmethod
    def complete(self, prompt: str, system: str = "") -> str:
        ...


class EmbeddingProvider(ABC):
    """Interface for text embeddings."""

    @abstractmethod
    def embed(self, text: str) -> list[float]:
        ...


# ─── Ollama Provider ───

class OllamaProvider(CompletionProvider):
    """Local LLM via Ollama."""

    def __init__(self, model: str = "glm4:latest", host: str = "http://localhost:11434"):
        self.model = model
        self.host = host

    def complete(self, prompt: str, system: str = "") -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        # Use direct HTTP call with an explicit timeout so /explain cannot hang forever.
        try:
            resp = requests.post(
                f"{self.host.rstrip('/')}/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False,
                    # Increased to support the 8-section 1500-word output
                    "options": {"temperature": 0.2, "num_predict": 2500},
                },
                timeout=150,
            )
            resp.raise_for_status()
            data = resp.json()
            msg = data.get("message", {}) or {}
            # Some local models return text in a separate "thinking" field.
            raw = (msg.get("content") or msg.get("thinking") or "").strip()
            if "FINAL:" in raw:
                raw = raw.split("FINAL:", 1)[1].strip()
            # Heuristic cleanup for models that emit planning + a drafted answer.
            # Prefer the drafted "Summary/Business Rules/Dependencies/Risks" block when present.
            import re
            m = re.search(r"\*\s*\*Summary:\*", raw)
            if m:
                return raw[m.start():].strip().lstrip("\"").strip()
            return raw.lstrip("\"").lstrip(".").strip()
        except Exception as e:
            return f"[LLM Error: {e}]"

    def test_connection(self) -> dict:
        """Test if Ollama is reachable and model is available."""
        try:
            client = ollama_sdk.Client(host=self.host)
            models = client.list()
            model_names = [m.model for m in models.models] if hasattr(models, 'models') else []
            return {"ok": True, "models": model_names, "provider": "ollama"}
        except Exception as e:
            return {"ok": False, "error": str(e), "provider": "ollama"}


# ─── LM Studio Provider ───

class LMStudioProvider(CompletionProvider):
    """Local LLM via LM Studio (OpenAI-compatible API)."""

    def __init__(self, model: str = "default", base_url: str = "http://localhost:1234"):
        self.model = model
        self.base_url = base_url.rstrip("/")

    def complete(self, prompt: str, system: str = "") -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        try:
            resp = requests.post(
                f"{self.base_url}/v1/chat/completions",
                json={"model": self.model, "messages": messages, "temperature": 0.3},
                timeout=1800,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            return f"[LLM Error: {e}]"

    def test_connection(self) -> dict:
        """Test if LM Studio is reachable."""
        try:
            resp = requests.get(f"{self.base_url}/v1/models", timeout=5)
            resp.raise_for_status()
            data = resp.json()
            model_names = [m["id"] for m in data.get("data", [])]
            return {"ok": True, "models": model_names, "provider": "lmstudio"}
        except Exception as e:
            return {"ok": False, "error": str(e), "provider": "lmstudio"}


# ─── AWS Bedrock Provider ───

class AWSBedrockProvider(CompletionProvider):
    """Cloud LLM via AWS Bedrock."""

    def __init__(self, model_id: str = "anthropic.claude-3-haiku-20240307-v1:0",
                 region: str = "us-east-1",
                 access_key: str = "",
                 secret_key: str = ""):
        self.model_id = model_id
        self.region = region
        self.access_key = access_key
        self.secret_key = secret_key

    def _get_client(self):
        import boto3
        return boto3.client(
            "bedrock-runtime",
            region_name=self.region,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
        )

    def complete(self, prompt: str, system: str = "") -> str:
        try:
            client = self._get_client()

            messages = [{"role": "user", "content": [{"text": prompt}]}]
            system_prompts = [{"text": system}] if system else []

            response = client.converse(
                modelId=self.model_id,
                messages=messages,
                system=system_prompts,
                inferenceConfig={"maxTokens": 4096, "temperature": 0.2},
            )

            return response["output"]["message"]["content"][0]["text"]
        except Exception as e:
            return f"[LLM Error: {e}]"

    def test_connection(self) -> dict:
        """Test if AWS Bedrock is reachable with the given credentials."""
        try:
            import boto3
            client = boto3.client(
                "bedrock",
                region_name=self.region,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
            )
            # List a few models to verify credentials work
            resp = client.list_foundation_models(byOutputModality="TEXT")
            models = [m["modelId"] for m in resp.get("modelSummaries", [])[:10]]
            return {"ok": True, "models": models, "provider": "bedrock"}
        except Exception as e:
            return {"ok": False, "error": str(e), "provider": "bedrock"}


# ─── Provider Factory ───

def create_provider_from_config(config: dict = None) -> CompletionProvider:
    """
    Create the correct LLM provider based on config.
    Falls back to Ollama if config is missing.
    """
    if config is None:
        from legacylift.api.config import load_config
        config = load_config()

    mode = config.get("mode", "local")

    if mode == "cloud":
        cloud = config.get("cloud", {})
        return AWSBedrockProvider(
            model_id=cloud.get("bedrock_model", "anthropic.claude-3-haiku-20240307-v1:0"),
            region=cloud.get("aws_region", "us-east-1"),
            access_key=cloud.get("aws_access_key", ""),
            secret_key=cloud.get("aws_secret_key", ""),
        )
    else:
        local = config.get("local", {})
        provider_type = local.get("provider", "ollama")

        if provider_type == "lmstudio":
            return LMStudioProvider(
                model=local.get("lmstudio_model", "default"),
                base_url=local.get("lmstudio_url", "http://localhost:1234"),
            )
        else:
            return OllamaProvider(
                model=local.get("ollama_model", "glm4:latest"),
                host=local.get("ollama_url", "http://localhost:11434"),
            )


def test_provider_connection(config: dict = None) -> dict:
    """Test connectivity for the currently configured provider."""
    provider = create_provider_from_config(config)
    if hasattr(provider, "test_connection"):
        return provider.test_connection()
    return {"ok": False, "error": "Provider does not support connection testing"}


# ─── Prompt Builder ───

SYSTEM_PROMPT = """You are an expert **Legacy System Modernization AI** specializing in analyzing **COBOL enterprise applications** and converting them into modern system architectures.

Your task is to analyze the provided COBOL source code facts and produce a **deep modernization analysis** suitable for enterprise migration tools such as LegacyLift.

You must produce **exactly 8 structured outputs**.
Your analysis must be **precise, technical, and structured**.

Avoid generic explanations. Focus on **program behavior, business logic, architecture, and migration insights**.

Return ONLY the final analysis in Markdown format. Start your response with: FINAL:"""

EXPLAIN_TEMPLATE = """Generate an Enterprise Modernization Analysis based on the following extracted facts:

**Program:** {program_name}

**AST Summary:**
{ast_summary}

**Variables:**
{variables}

**Business Rules:**
{rules}

**External Calls:**
{calls}

**Control Flow (Paragraphs):**
{paragraphs}

**Security Flags:**
{security}

---

# OUTPUT STRUCTURE

You must generate the following **8 sections in this exact order**. Use clear Markdown headings (e.g., `# 1️⃣ PROGRAM ANALYSIS`) and tables where appropriate. Format your output to total roughly 800-1500 words.

# 1️⃣ PROGRAM ANALYSIS
**Purpose:** Explain the program’s role and high-level behavior. Include the functional domain (e.g. HR, payroll) and a processing flow summary. Keep this section 3-6 paragraphs.

# 2️⃣ DATA STRUCTURE MAPPING
**Purpose:** Extract COBOL data structures and explain them. Provide a Markdown table with columns: `Field Name | COBOL PIC | Type | Description | Suggested Modern Type`. Explain how these map to modern structures (Java, TypeScript, JSON, DB schemas).

# 3️⃣ CONTROL FLOW ANALYSIS
**Purpose:** Explain the execution order. Provide a step-by-step numbered workflow. Also provide a flow diagram representation (e.g., `START → VALIDATE → PROCESS → END`). Explain each step briefly.

# 4️⃣ EXTERNAL DEPENDENCY DETECTION
**Purpose:** Detect system integrations. Provide a Markdown table: `Dependency | Type | Purpose | Migration Risk`. Explain how these dependencies affect modernization.

# 5️⃣ BUSINESS RULE EXTRACTION
**Purpose:** Extract core business logic based on the IF/EVALUATE rules provided. Provide a numbered list of readable rules. Include decision tables if applicable. Explain why these rules matter in the business process.

# 6️⃣ SECURITY AND RISK INSIGHTS
**Purpose:** Detect potential problems. Provide a Markdown table: `Severity | Issue | Description | Recommended Fix`. Evaluate the provided security flags and infer risks from external calls or logic. Explain each issue clearly.

# 7️⃣ MIGRATION BLUEPRINT
**Purpose:** Show how this program should be modernized. Suggest classes, services, APIs, and data models (e.g. EmployeeService, ValidationService). Include a short example of modern code structure in pseudocode.

# 8️⃣ MODERNIZATION RECOMMENDATIONS
**Purpose:** Provide enterprise modernization guidance (Microservices, API architecture, DB migration). Use bullet points with clear explanations.

Start your response with: FINAL:
"""


MIGRATION_ASSIST_TEMPLATE = """You are an expert **Legacy System Modernization AI Architect** helping to migrate a COBOL program to {target_lang}.

You are given structured facts extracted from the COBOL code. Use this to produce a **deep, actionable Migration Architecture Document**, NOT full code.

**COBOL Program:** {program_name}

**AST Summary:**
{ast_summary}

**Variables (Working Storage):**
{variables}

**Business Rules:**
{rules}

**External Calls:**
{calls}

**Control Flow (Paragraphs):**
{paragraphs}

---

# OUTPUT STRUCTURE
You must generate exactly the following sections in this exact order. Use clear Markdown headings. Format your output to total roughly 800 words.

# 1️⃣ ARCHITECTURAL MAPPING
**Purpose:** Explain how the COBOL structure translates to {target_lang}. Suggest specific design patterns (e.g., MVC, Hexagonal Architecture) suitable for this domain. Recommend specific frameworks.

# 2️⃣ DATA ENTITY DESIGN
**Purpose:** Translate the COBOL Variables into modern {target_lang} Data Models (Classes/Interfaces/Structs). Provide a Markdown table: `COBOL Field | {target_lang} Type | Suggested Variable Name | Description`. Group related variables into logical entities.

# 3️⃣ SERVICE LAYER DEFINITION
**Purpose:** Translate the COBOL Paragraphs into modern Service layer methods/functions. List the core use-cases that need to be implemented. Explain the logic flow for each.

# 4️⃣ INTEGRATION STRATEGY
**Purpose:** Address the External Calls. Detail how to replace them (e.g., REST APIS, message queues, new database drivers). Identify potential modernization bottlenecks.

# 5️⃣ MIGRATION RISK ASSESSMENT
**Purpose:** Highlight specific pitfalls based on the Business Rules and Flow. Address issues like data precision (handling COMP-3 in {target_lang}), state management (moving from procedural to stateless), and transaction boundaries.

Return ONLY the final analysis in Markdown format. Start your response with: FINAL:
"""


AI_INSIGHTS_TEMPLATE = """You are an expert **Enterprise Security & Data Quality Auditor** reviewing a COBOL program.

You are given structured facts extracted from the program. Analyze these facts to uncover deep operational, security, and architectural risks.

**Program:** {program_name}

**Variables:**
{variables}

**Business Rules:**
{rules}

**External Calls:**
{calls}

**Security Flags (Static Analysis):**
{security}

---

# OUTPUT STRUCTURE
You must generate exactly the following sections in this exact order. Use clear Markdown headings. Format your output to total roughly 800 words.

# 1️⃣ SECURITY VULNERABILITY ASSESSMENT
**Purpose:** Evaluate the Security Flags and infer vulnerabilities from the Variables/Rules (e.g., hardcoded values, lack of encryption logic). Provide a Markdown table: `Severity (High/Med/Low) | Finding | Impact | Remediation`.

# 2️⃣ DATA INTEGRITY & VALIDATION GAPS
**Purpose:** Analyze the Business Rules and Variables. Identify missing validations (e.g., lack of bounds checking, unvalidated inputs before processing). Provide a Markdown table: `Field/Logic | Suspected Vulnerability | Recommended Check`.

# 3️⃣ OPERATIONAL STABILITY RISKS
**Purpose:** Review the Control Flow and External Calls. Explain risks related to batch processing failure, abrupt termination, or tight coupling to legacy systems that could cause cascading failures.

# 4️⃣ TECHNICAL DEBT ANALYSIS
**Purpose:** Summarize the architectural rigidities in the current COBOL program. How difficult will it be to maintain or extend this code? Provide bullet points with specific examples drawn from the facts.

Return ONLY the final analysis in Markdown format. Start your response with: FINAL:
"""

def _format_variables(variables: dict) -> str:
    if not variables:
        return "None found"
    lines = []
    for name, pic in variables.items():
        lines.append(f"  - {name}: PIC {pic}")
    return "\n".join(lines)


def _format_rules(rules: list[dict]) -> str:
    if not rules:
        return "None found"
    lines = []
    for r in rules:
        lines.append(f"  - [{r['type'].upper()}] IF {r['condition']} THEN {r['action']}")
    return "\n".join(lines)


def _format_calls(calls: list[dict]) -> str:
    if not calls:
        return "No external calls"
    lines = []
    for c in calls:
        args = ", ".join(c.get("args", []))
        lines.append(f"  - CALL {c['target']}({args})")
    return "\n".join(lines)


def _format_paragraphs(paragraphs: list[dict]) -> str:
    if not paragraphs:
        return "None found"
    lines = []
    for p in paragraphs:
        performs = " → ".join(p.get("performs", [])) if p.get("performs") else "(no sub-calls)"
        lines.append(f"  - {p['name']}: {performs}")
    return "\n".join(lines)


def explain_program(semantic_dict: dict, provider: Optional[CompletionProvider] = None, ast_summary: str = "") -> str:
    """
    Generate a plain English explanation of a COBOL program.

    Args:
        semantic_dict: Output from SemanticResult.to_dict()
        provider: LLM provider (defaults to OllamaProvider)

    Returns:
        Plain English explanation string.
    """
    if provider is None:
        # Default to the configured provider (local or cloud)
        provider = create_provider_from_config()

    prompt = EXPLAIN_TEMPLATE.format(
        program_name=semantic_dict.get("program_name", "UNKNOWN"),
        ast_summary=ast_summary or "Not available",
        variables=_format_variables(semantic_dict.get("variables", {})),
        rules=_format_rules(semantic_dict.get("rules", [])),
        calls=_format_calls(semantic_dict.get("calls", [])),
        paragraphs=_format_paragraphs(semantic_dict.get("paragraphs", [])),
        security="\n".join(semantic_dict.get("security_flags", [])) or "None",
    )

    return provider.complete(prompt, system=SYSTEM_PROMPT)


def migration_assist(semantic_dict: dict, target_lang: str, provider: Optional[CompletionProvider] = None, ast_summary: str = "") -> str:
    """
    Generate AI-assisted migration guidance for a COBOL program.
    """
    if provider is None:
        provider = create_provider_from_config()

    prompt = MIGRATION_ASSIST_TEMPLATE.format(
        target_lang=target_lang,
        program_name=semantic_dict.get("program_name", "UNKNOWN"),
        ast_summary=ast_summary or "Not available",
        variables=_format_variables(semantic_dict.get("variables", {})),
        rules=_format_rules(semantic_dict.get("rules", [])),
        calls=_format_calls(semantic_dict.get("calls", [])),
        paragraphs=_format_paragraphs(semantic_dict.get("paragraphs", [])),
    )

    return provider.complete(prompt, system=SYSTEM_PROMPT)


def ai_insights_view(semantic_dict: dict, provider: Optional[CompletionProvider] = None) -> str:
    """
    Generate security/quality insights for a COBOL program.
    """
    if provider is None:
        provider = create_provider_from_config()

    prompt = AI_INSIGHTS_TEMPLATE.format(
        program_name=semantic_dict.get("program_name", "UNKNOWN"),
        variables=_format_variables(semantic_dict.get("variables", {})),
        rules=_format_rules(semantic_dict.get("rules", [])),
        calls=_format_calls(semantic_dict.get("calls", [])),
        security="\n".join(semantic_dict.get("security_flags", [])) or "None",
    )

    return provider.complete(prompt, system=SYSTEM_PROMPT)


if __name__ == "__main__":
    import sys
    from legacylift.analyzers.semantic_extractor import extract_semantics

    target = sys.argv[1] if len(sys.argv) > 1 else None
    if target:
        sem = extract_semantics(target)
        sem_dict = sem.to_dict()

        print("=== Extracted Facts ===")
        print(f"Program: {sem_dict['program_name']}")
        print(f"Variables: {len(sem_dict['variables'])}")
        print(f"Rules: {len(sem_dict['rules'])}")
        print(f"Calls: {len(sem_dict['calls'])}")
        print()
        print("=== AI Explanation ===")
        explanation = explain_program(sem_dict)
        print(explanation)
    else:
        print("Usage: python llm_explainer.py <file.cbl>")
