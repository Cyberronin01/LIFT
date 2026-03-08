# LegacyLift - Requirements

## Project Overview

**LegacyLift** is an AI-powered legacy code analysis, dependency resolution, and modernization tool. It uses offline, code-specific language models to understand, diagnose, and port legacy codebases — helping organizations modernize safely.

## Problem Statement

Over 220-800 billion lines of COBOL still run critical systems globally. 95% of ATM transactions, 80% of in-person payments, and 45 out of 50 US state government systems depend on legacy code. Meanwhile:
- The average COBOL developer is 55+ years old (retiring)
- 20% of SQL Server instances run past End-of-Life
- 45% of data migration projects fail from compatibility issues
- Supply chain attacks on abandoned packages increased 742% since 2019

Organizations cannot modernize because:
1. No one understands what legacy code does anymore
2. Dependencies are dead — old packages, broken links, expired downloads
3. Porting is manual, risky, and requires rare expertise
4. Existing tools are cloud-only, expensive, or vendor-locked

## Proposed Solution

A desktop application (Electron + React frontend, Python backend) that:
1. **Parses** legacy code using Tree-sitter ASTs across multiple languages
2. **Analyzes** dependencies, complexity, security vulnerabilities, and dead code using hybrid deterministic + AI methods
3. **Understands** business logic using offline code-specific LLMs (Local Inference Engine)
4. **Prescribes** modernization paths — porting suggestions, package replacements, migration roadmaps
5. **Reports** findings via interactive dashboard, Markdown, and PDF exports

## Functional Requirements

### FR1: Project Scanning
- Accept project folder or repository as input
- Detect programming languages automatically
- Build file tree with metadata (size, language, line count)

### FR2: Code Parsing
- Parse source files into Abstract Syntax Trees using Tree-sitter
- Extract functions, classes, imports, variables, and comments
- Support Python, JavaScript, Java (extensible to more)

### FR3: Dependency Analysis
- Extract all direct and transitive dependencies
- Check package health (last updated, maintained, deprecated)
- Map old packages to modern replacements (500+ mappings)
- Look up CVE vulnerabilities via OSV.dev

### FR4: Security Analysis
- Pattern-match for hardcoded credentials, weak crypto, SQL injection
- AI-enhanced threat assessment explaining real-world risk
- Severity scoring (Critical, High, Medium, Low)

### FR5: AI Code Understanding
- Explain any code file/function in plain English
- Extract hidden business rules from legacy logic
- Assess code quality and maintainability
- Uses RAG pipeline for large codebase context

### FR6: Code Porting
- Suggest conversions (Python 2→3, old Java→modern Java)
- Generate side-by-side diff view
- Provide confidence scores for each suggestion
- Generate test cases for ported code

### FR7: Reporting
- Interactive HTML dashboard with health scores, charts, heatmaps
- Exportable Markdown and PDF reports
- Migration plan with effort estimation

### FR8: GUI (Primary Interface)
- Desktop application (Electron + React)
- Multi-panel layout with sidebar navigation
- Integrated code viewer (Monaco Editor)
- Side-by-side diff viewer for ported code
- Real-time progress during analysis
- Dark theme with modern LM Studio-like aesthetic

### FR9: CLI (Secondary Interface)
- JSON output for AI agent tool-calling
- Scriptable commands: analyze, explain, port, report
- Importable as Python library

### FR10: Pluggable LLM Backend
- Default: Local Inference Engine with code-specific models (offline)
- Support OpenAI-compatible API endpoints
- External agent mode: caller provides their own LLM
- Configurable via config.yaml

## Non-Functional Requirements

### NFR1: Privacy
- Fully offline operation — code never leaves the machine
- No cloud dependency required

### NFR2: Performance
- Scan 10,000+ line project in under 30 seconds (deterministic)
- AI analysis within 2-5 minutes depending on project size

### NFR3: Portability
- Runs on Windows 10/11
- Packaged as installable .exe (Electron + PyInstaller)

### NFR4: Extensibility
- Plugin architecture for new language parsers
- Pluggable LLM providers
- JSON-based package mapping database

### NFR5: Hardware
- Minimum: 8GB RAM, any modern CPU (CPU-only inference)
- Recommended: 16GB RAM, NVIDIA GPU with 8GB+ VRAM

## User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| US1 | Developer | Analyze a legacy project | I understand its structure and risks |
| US2 | Developer | See vulnerable dependencies | I can fix security issues |
| US3 | Team Lead | Get a health score | I can justify modernization budget |
| US4 | Developer | Get plain English explanations | I understand code I didn't write |
| US5 | Developer | See porting suggestions | I can modernize step by step |
| US6 | AI Agent | Call LegacyLift via CLI | I can automate code analysis |
| US7 | Developer | Switch LLM models | I can use the best model available |

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Electron, React 18, Monaco Editor |
| Backend | Python 3.11+ |
| Code Parsing | Tree-sitter |
| Vector Database | ChromaDB |
| LLM Runtime | Local Inference Engine (Custom Code Model) |
| Embeddings | High-Performance Code Embeddings |
| CLI | Click + Rich |
| Reports | Jinja2 templates |
| Distribution | PyInstaller + electron-builder |

## AWS Integration Points

| AWS Service | Usage |
|-------------|-------|
| **Bedrock** | Alternative LLM provider (cloud mode) |
| **Lambda** | Serverless CVE scanning endpoint |
| **S3** | Store/share analysis reports |
| **CloudWatch** | Usage monitoring and telemetry |

## For India

- Helps Indian IT companies modernize COBOL banking systems
- Reduces dependency on expensive foreign consultants
- Supports government digital transformation initiatives
- Enterprise Ready — accessible to startups and capable of handling critical infrastructure
- Addresses the critical COBOL skills gap in Indian talent pool
