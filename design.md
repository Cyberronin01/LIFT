# LegacyLift - Design Document

## System Architecture

```mermaid
graph TB
    subgraph Desktop ["LegacyLift.exe"]
        subgraph FE ["Electron + React Frontend"]
            Sidebar["Sidebar Nav"]
            Dashboard["Dashboard"]
            CodeView["Monaco Editor"]
            DiffView["Diff Viewer"]
            Settings["Settings"]
        end

        subgraph BE ["Python Backend (Sidecar)"]
            Scanner["File Scanner"]
            Parser["Tree-sitter Parser"]
            Analyzers["Hybrid Analyzers"]
            RAG["RAG Pipeline"]
            Porter["Porting Engine"]
            Reporter["Report Generator"]
        end

        subgraph LLM ["LLM Provider (Pluggable)"]
            Ollama["Ollama (Offline Default)"]
            Bedrock["AWS Bedrock"]
            OpenAI["OpenAI-Compatible API"]
            ExtAgent["External Agent"]
        end
    end

    FE <-->|"IPC (JSON)"| BE
    Analyzers <--> RAG
    RAG <--> LLM
```

## Data Flow

```mermaid
flowchart TD
    A["📁 Project Folder"] --> B["🔍 Scanner"]
    B -->|"Detect langs, count files"| C["🌳 Tree-sitter Parser"]
    C -->|"AST per file"| D["📊 Deterministic Analyzers"]
    C -->|"Code chunks"| E["🧠 RAG Pipeline"]

    D -->|"Deps, complexity, CVEs"| F["📋 Combined Results"]
    E -->|"Context"| G["🤖 Code LLM"]
    G -->|"Explanations, porting"| F

    F --> H["🖥️ GUI Dashboard"]
    F --> I["💻 CLI / JSON"]
    F --> J["📄 Report Export"]
```

## Component Design

### Pluggable LLM Interface

```mermaid
classDiagram
    class LLMProvider {
        <<abstract>>
        +complete(prompt, system) str
        +embed(text) list~float~
        +supports_fim() bool
    }

    class OllamaProvider {
        -model_name: str
        -endpoint: str
        +complete(prompt, system) str
        +embed(text) list~float~
    }

    class BedrockProvider {
        -region: str
        -model_id: str
        +complete(prompt, system) str
    }

    class OpenAICompatProvider {
        -api_key: str
        -base_url: str
        +complete(prompt, system) str
    }

    class ExternalAgentProvider {
        -callback: callable
        +complete(prompt, system) str
    }

    LLMProvider <|-- OllamaProvider
    LLMProvider <|-- BedrockProvider
    LLMProvider <|-- OpenAICompatProvider
    LLMProvider <|-- ExternalAgentProvider
```

### Analysis Pipeline

```mermaid
flowchart LR
    subgraph Layer1 ["Layer 1: PARSE"]
        TS["Tree-sitter Engine"]
    end

    subgraph Layer2 ["Layer 2: UNDERSTAND"]
        DET1["Dependency Extractor"]
        DET2["Complexity Calculator"]
        AI1["AI Code Explainer"]
        AI2["Business Logic Extractor"]
    end

    subgraph Layer3 ["Layer 3: DIAGNOSE"]
        DET3["CVE Scanner"]
        DET4["Security Patterns"]
        AI3["AI Threat Analyzer"]
    end

    subgraph Layer4 ["Layer 4: PRESCRIBE"]
        AI4["Porting Engine"]
        AI5["Alternative Finder"]
    end

    subgraph Layer5 ["Layer 5: REPORT"]
        RPT["Report Generator"]
        DASH["Dashboard HTML"]
    end

    Layer1 --> Layer2 --> Layer3 --> Layer4 --> Layer5
```

### IPC Protocol (Frontend ↔ Backend)

```mermaid
sequenceDiagram
    participant User
    participant Electron
    participant Python
    participant Ollama

    User->>Electron: Opens project folder
    Electron->>Python: {"action": "analyze", "path": "./project"}
    Python->>Python: Scan files, parse ASTs
    Python-->>Electron: {"type": "progress", "step": "parsing", "current": 5, "total": 47}
    Python->>Python: Run deterministic analyzers
    Python-->>Electron: {"type": "progress", "step": "analyzing"}
    Python->>Ollama: Send code chunks for explanation
    Ollama-->>Python: AI explanations
    Python-->>Electron: {"type": "result", "health_score": 6.2, ...}
    Electron->>User: Display dashboard with results
```

## Database Design

### Vector Store (ChromaDB)

```mermaid
erDiagram
    CODE_CHUNKS {
        string id PK
        string file_path
        string language
        string chunk_type
        float[] embedding
        string content
        int complexity_score
    }

    EXPLANATIONS {
        string id PK
        string file_path
        string function_name
        string explanation
        datetime timestamp
    }

    DEPENDENCIES {
        string package_name PK
        string version
        string status
        string replacement
        string[] cves
    }

    CODE_CHUNKS ||--o{ EXPLANATIONS : "has"
    CODE_CHUNKS ||--o{ DEPENDENCIES : "imports"
```

### Static Knowledge Base

| File | Content | Format |
|------|---------|--------|
| `package_mappings.json` | 500+ old→new package mappings | `{"urllib2": {"replacement": "requests"}}` |
| `security_patterns.json` | Regex for vulnerabilities | `{"md5_hash": {"severity": "critical"}}` |
| `migration_rules.json` | Language upgrade rules | `{"python2to3": {"print_stmt": "..."}}` |

## Project Structure

```mermaid
graph TD
    Root["legacylift/"] --> E["electron/"]
    Root --> S["src/ (React)"]
    Root --> B["backend/ (Python)"]

    E --> EM["main.js"]
    E --> EP["preload.js"]
    E --> EPM["python-manager.js"]

    S --> Pages["pages/"]
    S --> Comp["components/"]
    S --> Svc["services/"]

    Pages --> PD["Dashboard.jsx"]
    Pages --> PDep["Dependencies.jsx"]
    Pages --> PSec["Security.jsx"]
    Pages --> PPort["PortView.jsx"]

    B --> Core["core/"]
    B --> Parse["parsers/"]
    B --> Analyze["analyzers/"]
    B --> BRAG["rag/"]
    B --> BLLM["llm/"]
    B --> Data["data/"]
```

## Technology Stack

```mermaid
graph LR
    subgraph Frontend
        Electron --> React
        React --> Monaco["Monaco Editor"]
        React --> Recharts
        React --> Framer["Framer Motion"]
    end

    subgraph Backend
        Python --> TreeSitter["Tree-sitter"]
        Python --> ChromaDB
        Python --> OllamaSDK["Ollama SDK"]
        Python --> Click
    end

    subgraph AI
        OllamaSDK --> DSCoder["DeepSeek Coder V2"]
        OllamaSDK --> Nomic["Nomic Embed Text"]
    end

    subgraph AWS
        Bedrock2["Bedrock"]
        Lambda2["Lambda"]
        S3_2["S3"]
    end

    Frontend <-->|IPC| Backend
    Backend <--> AI
    Backend -.->|Optional| AWS
```

## AWS Integration

```mermaid
graph TD
    LL["LegacyLift Desktop"] -->|"LLM queries"| BR["AWS Bedrock"]
    LL -->|"CVE lookups"| LM["AWS Lambda"]
    LL -->|"Save reports"| S3["AWS S3"]
    BR --> CW["CloudWatch"]
    LM --> CW
    S3 --> CW

    BR -->|"Claude / Titan"| LL
    LM -->|"CVE results"| LL

    style BR fill:#FF9900,color:#000
    style LM fill:#FF9900,color:#000
    style S3 fill:#FF9900,color:#000
    style CW fill:#FF9900,color:#000
```

## Security Considerations

- All code analysis runs locally by default (privacy-first)
- No data transmitted to cloud unless user explicitly enables AWS mode
- LLM inputs sanitized to remove discovered credentials
- API keys stored in local encrypted config, never in source
