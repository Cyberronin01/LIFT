"""
LegacyLift — Project Scanner
Walks a directory, finds legacy code files, collects metadata.
"""

import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

# Supported legacy file extensions
LANGUAGE_MAP = {
    ".cbl": "cobol",
    ".cob": "cobol",
    ".cpy": "cobol-copybook",
    ".py":  "python",
    ".java": "java",
    ".js":  "javascript",
    ".ts":  "typescript",
    ".c":   "c",
    ".h":   "c-header",
    ".cpp": "cpp",
    ".cs":  "csharp",
    ".rb":  "ruby",
    ".pl":  "perl",
    ".f90": "fortran",
    ".f":   "fortran",
    ".pas": "pascal",
    ".bas": "basic",
}


@dataclass
class FileInfo:
    """Metadata for a single source file."""
    path: str
    filename: str
    language: str
    extension: str
    line_count: int
    size_bytes: int
    blank_lines: int = 0
    comment_lines: int = 0


@dataclass
class ScanResult:
    """Result of scanning an entire project."""
    project_name: str
    project_path: str
    total_files: int = 0
    total_lines: int = 0
    total_blank_lines: int = 0
    total_size_bytes: int = 0
    files: list[FileInfo] = field(default_factory=list)
    languages: dict[str, int] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "project_name": self.project_name,
            "project_path": self.project_path,
            "total_files": self.total_files,
            "total_lines": self.total_lines,
            "total_blank_lines": self.total_blank_lines,
            "total_size_bytes": self.total_size_bytes,
            "languages": self.languages,
            "files": [
                {
                    "path": f.path,
                    "filename": f.filename,
                    "language": f.language,
                    "extension": f.extension,
                    "line_count": f.line_count,
                    "size_bytes": f.size_bytes,
                }
                for f in self.files
            ],
            "errors": self.errors,
        }


def count_lines(filepath: str) -> tuple[int, int]:
    """Count total lines and blank lines in a file."""
    total = 0
    blank = 0
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                total += 1
                if line.strip() == "":
                    blank += 1
    except Exception:
        pass
    return total, blank


def scan_project(project_path: str, extensions: Optional[list[str]] = None) -> ScanResult:
    """
    Scan a project directory for source files.

    Args:
        project_path: Path to the project folder.
        extensions: Optional list of extensions to filter (e.g. ['.cbl', '.cob']).
                    If None, scans all known extensions.

    Returns:
        ScanResult with all file metadata.
    """
    path = Path(project_path).resolve()

    if not path.exists():
        result = ScanResult(
            project_name=path.name,
            project_path=str(path),
        )
        result.errors.append(f"Path does not exist: {path}")
        return result

    result = ScanResult(
        project_name=path.name,
        project_path=str(path),
    )

    allowed = set(extensions) if extensions else set(LANGUAGE_MAP.keys())

    for root, _dirs, files in os.walk(path):
        for filename in sorted(files):
            ext = Path(filename).suffix.lower()
            if ext not in allowed:
                continue

            filepath = os.path.join(root, filename)
            language = LANGUAGE_MAP.get(ext, "unknown")

            try:
                size = os.path.getsize(filepath)
                lines, blanks = count_lines(filepath)

                file_info = FileInfo(
                    path=os.path.relpath(filepath, path),
                    filename=filename,
                    language=language,
                    extension=ext,
                    line_count=lines,
                    size_bytes=size,
                    blank_lines=blanks,
                )

                result.files.append(file_info)
                result.total_files += 1
                result.total_lines += lines
                result.total_blank_lines += blanks
                result.total_size_bytes += size

                # Track language counts
                result.languages[language] = result.languages.get(language, 0) + 1

            except Exception as e:
                result.errors.append(f"Error scanning {filepath}: {e}")

    return result


if __name__ == "__main__":
    import json
    import sys

    target = sys.argv[1] if len(sys.argv) > 1 else "."
    result = scan_project(target)
    print(json.dumps(result.to_dict(), indent=2))
