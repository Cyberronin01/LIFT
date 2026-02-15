# LIFT
### *From Legacy Chaos to Modern Mastery.*
<br>

<div align="center">

![LegacyLift](https://img.shields.io/badge/Status-Prototype-e94560?style=for-the-badge)
![LegacyLift](https://img.shields.io/badge/AI-Private_%26_Secure-2563eb?style=for-the-badge)
![LegacyLift](https://img.shields.io/badge/Architecture-Electron_%2B_Python-1a1a2e?style=for-the-badge&logo=electron)

**An Enterprise-Grade, Offline-First Modernization Studio for Legacy Codebases.**

[Features](#-features) • [Architecture](#-architecture) • [AI Engine](#-intelligence-engine) • [Installation](#-quick-start)

</div>

---

## The Problem
**220 Billion lines of COBOL** run the world's banks. **95% of ATM transactions** rely on code written before the moon landing. Developers are retiring, documentation is lost, and rewriting is "too risky."

## The Solution: LegacyLift
LegacyLift is not just another AI chat wrapper. It is a **full-scale desktop studio** that brings:
1.  **Deterministic Accuracy:** Tree-sitter parsing for exact syntax analysis.
2.  **AI Reasoning:** Custom Code Models to understand *intent* and *business logic*.
3.  **Total Privacy:** Your code **NEVER** leaves your machine.

---

## Features

### 1. Multi-Language Intelligence
We don't just "read" code; we build **Abstract Syntax Trees (AST)** for:
*   COBOL (IBM/Gnu)
*   Python (2.x & 3.x)
*   Java (6 to 21)
*   JavaScript / TypeScript
*   *...and more via Tree-sitter*

### 2. Hybrid Analysis Engine
Stop choosing between "dumb" static analysis and "hallucinating" AI. We use both.
*   **Fact Extraction:** Imports, dependencies, complexity scores (Deterministic).
*   **Logic Extraction:** "This function locks the account after 3 failed tries" (AI).

### 3. Security First
*   **CVE Scanning:** Maps dependencies to the OSV.dev vulnerability database.
*   **Pattern Matching:** Instantly flags hardcoded keys, MD5/SHA1 usage, and SQLi risks.
*   **Offline by Default:** No cloud connection required.

### 4. The "Lift" Porting Studio
Don't just view code—modernize it.
*   **Side-by-Side Diffs:** See the legacy code and the AI-suggested modern version.
*   **One-Click Port:** Convert `urllib2` to `requests` or `MySQLdb` to `mysql-connector` instantly.

---


## Intelligence Engine

We use a **Retrieval-Augmented Generation (RAG)** pipeline optimized for code.

1.  **Chunking:** Code is split by *function* and *class* (semantic), not just lines.
2.  **Embedding:** High-performance embeddings map code to mathematical vectors.
3.  **Retrieval:** When you ask "Where is the auth logic?", we find the exact 5 functions responsible, even in a 100k line codebase.

---

## Quick Start
### Prerequisites
*   Windows / macOS / Linux
*   16GB RAM recommended
*   (Optional) NVIDIA GPU for faster local inference

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/yourusername/LegacyLift.git
cd LegacyLift

# 2. Install dependencies (requires Python 3.11+ & Node.js 18+)
pip install -r requirements.txt
npm install

# 3. Launch Development Mode
npm run electron:dev
```

---

## Security & Privacy
LegacyLift is **Private by Design**. 
*   **Zero Telemetry:** We don't track your code.
*   **Local Inference:** All AI processing happens on your hardware.
*   **Optional Cloud:** Connect to AWS Bedrock *only if you explicitly enable it*.

---

<div align="center">
  <br>
  <sub>Built for the AI for Bharat Hackathon 🇮🇳</sub>
  <br>
  <sub>Team N9022</sub>
</div>
