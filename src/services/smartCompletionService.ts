import type { Monaco } from '@monaco-editor/react';
import type { languages, editor } from 'monaco-editor';
import { FileNode } from '../types';

let isRegistered = false;
let workspaceFilesRef: FileNode[] = [];

export function setWorkspaceFilesForCompletions(files: FileNode[]) {
  workspaceFilesRef = files;
}

/**
 * Extracts symbols (variables, functions, classes) from text
 */
function extractSymbolsFromCode(text: string, language: string) {
  const symbols = new Set<string>();

  // General identifier extraction
  const words = text.match(/\b[A-Za-z_][A-Za-z0-9_]{2,}\b/g) || [];
  for (const w of words) {
    if (w.length > 2 && w.length < 35) {
      symbols.add(w);
    }
  }

  // Extract functions
  const fnMatches = text.matchAll(/(?:def|function|class|func|fn)\s+([A-Za-z_][A-Za-z0-9_]*)/g);
  const functions = new Set<string>();
  for (const m of fnMatches) {
    if (m[1]) functions.add(m[1]);
  }

  return { identifiers: Array.from(symbols), functions: Array.from(functions) };
}

/**
 * Fetches AI Smart Completion from server endpoint
 */
async function fetchSmartAiSuggestions(
  model: editor.ITextModel,
  position: { lineNumber: number; column: number },
  language: string
): Promise<string[]> {
  try {
    const fullText = model.getValue();
    const offset = model.getOffsetAt(position);
    const prefix = fullText.slice(0, offset);
    const suffix = fullText.slice(offset);

    // Only query if line has meaningful content
    const currentLine = model.getLineContent(position.lineNumber);
    if (!currentLine.trim()) return [];

    const res = await fetch('/api/completion/smart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prefix,
        suffix,
        language,
        filename: model.uri.path,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data.suggestions) ? data.suggestions : [];
    }
  } catch (e) {
    // silently fallback
  }
  return [];
}

/**
 * Common language snippets and completions
 */
const LANGUAGE_SNIPPETS: Record<string, Array<{ label: string; insertText: string; detail: string; doc: string }>> = {
  python: [
    {
      label: 'def',
      insertText: 'def ${1:function_name}(${2:params}):\n\t"""${3:Docstring}"""\n\t${0:pass}',
      detail: 'Function definition',
      doc: 'Defines a Python function with docstring',
    },
    {
      label: 'class',
      insertText: 'class ${1:ClassName}:\n\tdef __init__(self, ${2:args}):\n\t\t${0:pass}',
      detail: 'Class definition',
      doc: 'Creates a new Python class with constructor',
    },
    {
      label: 'ifmain',
      insertText: 'if __name__ == "__main__":\n\t${0:main()}',
      detail: 'Main entry point guard',
      doc: 'Standard Python script execution guard',
    },
    {
      label: 'try',
      insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${0:print(f"Error: {e}")}',
      detail: 'Try/Except block',
      doc: 'Exception handling block',
    },
    {
      label: 'with_open',
      insertText: 'with open("${1:filename.txt}", "${2:r}", encoding="utf-8") as ${3:f}:\n\t${0:content = f.read()}',
      detail: 'Context manager open file',
      doc: 'Safe file handling with context manager',
    },
    {
      label: 'list_comp',
      insertText: '[${1:x} for ${2:x} in ${3:iterable} if ${4:condition}]',
      detail: 'List comprehension',
      doc: 'Inline list generator',
    },
    {
      label: 'import_numpy',
      insertText: 'import numpy as np\n',
      detail: 'Import NumPy',
      doc: 'Imports numerical library NumPy as np',
    },
    {
      label: 'import_matplotlib',
      insertText: 'import matplotlib.pyplot as plt\n',
      detail: 'Import Matplotlib',
      doc: 'Imports headless plotting engine Matplotlib',
    },
    {
      label: 'plot_show',
      insertText: 'plt.figure(figsize=(8, 5))\nplt.plot(${1:x}, ${2:y}, label="${3:Data}")\nplt.title("${4:Title}")\nplt.xlabel("${5:X}")\nplt.ylabel("${6:Y}")\nplt.legend()\nplt.grid(True)\nplt.show()',
      detail: 'Plot visualization',
      doc: 'Generates and displays interactive Matplotlib graphic',
    },
  ],
  javascript: [
    {
      label: 'fn',
      insertText: 'function ${1:name}(${2:params}) {\n\t${0}\n}',
      detail: 'Function declaration',
      doc: 'Standard JavaScript function',
    },
    {
      label: 'afn',
      insertText: 'const ${1:name} = (${2:params}) => {\n\t${0}\n};',
      detail: 'Arrow function',
      doc: 'ES6 arrow function declaration',
    },
    {
      label: 'async_fn',
      insertText: 'async function ${1:name}(${2:params}) {\n\ttry {\n\t\t${0}\n\t} catch (err) {\n\t\tconsole.error(err);\n\t}\n}',
      detail: 'Async function with try/catch',
      doc: 'Asynchronous function declaration',
    },
    {
      label: 'fetch_json',
      insertText: 'const res = await fetch("${1:url}");\nconst data = await res.json();\n${0}',
      detail: 'Fetch JSON data',
      doc: 'Performs asynchronous HTTP request and parses JSON',
    },
    {
      label: 'clg',
      insertText: 'console.log("${1:tag}", ${2:value});',
      detail: 'Console log',
      doc: 'Print output to console',
    },
  ],
  typescript: [
    {
      label: 'interface',
      insertText: 'interface ${1:Name} {\n\t${2:id}: ${3:string};\n\t${0}\n}',
      detail: 'TypeScript interface',
      doc: 'Defines an interface schema',
    },
    {
      label: 'type',
      insertText: 'type ${1:Name} = {\n\t${2:property}: ${3:string};\n};',
      detail: 'TypeScript type alias',
      doc: 'Defines a custom type',
    },
  ],
  cpp: [
    {
      label: 'main',
      insertText: '#include <iostream>\n\nint main() {\n\tstd::cout << "${1:Hello, World!}" << std::endl;\n\treturn 0;\n}',
      detail: 'C++ main function',
      doc: 'Standard C++ program entry point',
    },
    {
      label: 'vector',
      insertText: 'std::vector<${1:int}> ${2:vec} = {${3:1, 2, 3}};\nfor (const auto& item : ${2:vec}) {\n\tstd::cout << item << " ";\n}\nstd::cout << std::endl;',
      detail: 'std::vector with range loop',
      doc: 'Vector collection and iteration',
    },
  ],
  c: [
    {
      label: 'main',
      insertText: '#include <stdio.h>\n\nint main() {\n\tprintf("${1:Hello, World!}\\n");\n\treturn 0;\n}',
      detail: 'C main entry point',
      doc: 'Standard C main function with stdio.h',
    },
  ],
  java: [
    {
      label: 'main',
      insertText: 'public class ${1:Main} {\n\tpublic static void main(String[] args) {\n\t\tSystem.out.println("${2:Hello, World!}");\n\t\t${0}\n\t}\n}',
      detail: 'Java main class',
      doc: 'Standard Java class boilerplate with main method',
    },
    {
      label: 'sout',
      insertText: 'System.out.println(${1:"Hello"});',
      detail: 'Print line to standard out',
      doc: 'Java System.out.println shorthand',
    },
  ],
  rust: [
    {
      label: 'main',
      insertText: 'fn main() {\n\tprintln!("${1:Hello, World!}");\n\t${0}\n}',
      detail: 'Rust main function',
      doc: 'Standard Rust executable entry point',
    },
  ],
  go: [
    {
      label: 'main',
      insertText: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("${1:Hello, World!}")\n\t${0}\n}',
      detail: 'Go main package',
      doc: 'Go standard package main with fmt.Println',
    },
  ],
  sql: [
    {
      label: 'select',
      insertText: 'SELECT ${1:*}\nFROM ${2:table_name}\nWHERE ${3:condition}\nORDER BY ${4:id} DESC;',
      detail: 'SELECT query',
      doc: 'Standard SQL query statement',
    },
    {
      label: 'create_table',
      insertText: 'CREATE TABLE IF NOT EXISTS ${1:users} (\n\tid INTEGER PRIMARY KEY AUTOINCREMENT,\n\tname TEXT NOT NULL,\n\tcreated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n);',
      detail: 'CREATE TABLE statement',
      doc: 'Creates a relational database table schema',
    },
  ],
};

/**
 * Registers Smart Code Completion, Go to Definition (`F12`), & Document Symbols Providers on Monaco
 */
export function registerSmartCompletions(monaco: Monaco) {
  if (isRegistered) return;
  isRegistered = true;

  const supportedLanguages = [
    'python',
    'javascript',
    'typescript',
    'cpp',
    'c',
    'java',
    'rust',
    'go',
    'sql',
    'html',
    'css',
    'json',
    'shell',
    'markdown',
  ];

  supportedLanguages.forEach((lang) => {
    // 1. Completion Item Provider
    monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: ['.', '(', '[', ':', '"', "'", '@', '/', '>', '<', '_', '$'],

      provideCompletionItems: async (
        model: editor.ITextModel,
        position: { lineNumber: number; column: number }
      ) => {
        const word = model.getWordUntilPosition(position as any);
        const range: languages.CompletionItemRanges = {
          insert: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          },
          replace: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          },
        };

        const suggestions: languages.CompletionItem[] = [];

        // 1. Language Snippets
        const snippets = LANGUAGE_SNIPPETS[lang] || [];
        for (const s of snippets) {
          suggestions.push({
            label: s.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: s.doc,
            detail: `⚡ Snippet: ${s.detail}`,
            insertText: s.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            sortText: '00_' + s.label,
          });
        }

        // 2. Extract Workspace & Current File Symbols
        const currentText = model.getValue();
        const currentSymbols = extractSymbolsFromCode(currentText, lang);

        // Add function symbols
        for (const fn of currentSymbols.functions) {
          if (fn !== word.word) {
            suggestions.push({
              label: fn,
              kind: monaco.languages.CompletionItemKind.Function,
              detail: `Function in ${model.uri.path.split('/').pop()}`,
              insertText: `${fn}($0)`,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              sortText: '01_' + fn,
            });
          }
        }

        // Add identifiers / variables
        for (const id of currentSymbols.identifiers) {
          if (id !== word.word && !currentSymbols.functions.includes(id)) {
            suggestions.push({
              label: id,
              kind: monaco.languages.CompletionItemKind.Variable,
              detail: `Identifier in current file`,
              insertText: id,
              range,
              sortText: '02_' + id,
            });
          }
        }

        // Also check open workspace files for cross-file imports / symbols
        if (workspaceFilesRef && workspaceFilesRef.length > 0) {
          for (const wf of workspaceFilesRef.slice(0, 10)) {
            if (wf.content && wf.path !== model.uri.path) {
              const fileSymbols = extractSymbolsFromCode(wf.content, wf.language);
              for (const fn of fileSymbols.functions.slice(0, 15)) {
                suggestions.push({
                  label: fn,
                  kind: monaco.languages.CompletionItemKind.Method,
                  detail: `Exported from ${wf.name}`,
                  insertText: fn,
                  range,
                  sortText: '03_' + fn,
                });
              }
            }
          }
        }

        // 3. Fast server AI suggestions (if cursor has non-empty context and user paused)
        if (word.word.length >= 2 || (position.column > 3 && snippets.length > 0)) {
          try {
            const aiSuggestions = await fetchSmartAiSuggestions(model, position, lang);
            aiSuggestions.forEach((aiText, idx) => {
              suggestions.push({
                label: `✨ ${aiText.slice(0, 30)}${aiText.length > 30 ? '...' : ''}`,
                kind: monaco.languages.CompletionItemKind.Event,
                detail: `AI Smart Completion (${idx + 1})`,
                documentation: aiText,
                insertText: aiText,
                range,
                sortText: '000_' + idx,
              });
            });
          } catch {
            // fallback
          }
        }

        return {
          suggestions,
        };
      },
    });

    // 2. Go to Definition (`F12` / `Ctrl+Click`) Provider across workspace files
    monaco.languages.registerDefinitionProvider(lang, {
      provideDefinition(model: editor.ITextModel, position: any) {
        const word = model.getWordAtPosition(position);
        if (!word) return null;
        const symbol = word.word;

        // Search across workspaceFilesRef for definition
        const allFiles: FileNode[] = [];
        const collect = (nodes: FileNode[]) => {
          for (const n of nodes) {
            if (n.type === 'file') allFiles.push(n);
            if (n.children) collect(n.children);
          }
        };
        collect(workspaceFilesRef);

        for (const wf of allFiles) {
          if (!wf.content) continue;
          const lines = wf.content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const regex = new RegExp(`\\b(function|def|class|const|let|var|interface|type|func|fn)\\s+${symbol}\\b`);
            if (regex.test(line) || line.includes(`${symbol} =`) || line.includes(`${symbol}:`)) {
              return {
                uri: monaco.Uri.parse(`file://${wf.path}`),
                range: {
                  startLineNumber: i + 1,
                  startColumn: 1,
                  endLineNumber: i + 1,
                  endColumn: line.length + 1,
                },
              };
            }
          }
        }

        // Fallback: search current file if not found in workspaceFilesRef
        const currentLines = model.getValue().split('\n');
        for (let i = 0; i < currentLines.length; i++) {
          if (currentLines[i].includes(symbol)) {
            return {
              uri: model.uri,
              range: {
                startLineNumber: i + 1,
                startColumn: 1,
                endLineNumber: i + 1,
                endColumn: currentLines[i].length + 1,
              },
            };
          }
        }

        return null;
      },
    });

    // 3. Document Symbol Provider (`Ctrl+Shift+O`)
    monaco.languages.registerDocumentSymbolProvider(lang, {
      provideDocumentSymbols(model: editor.ITextModel) {
        const text = model.getValue();
        const lines = text.split('\n');
        const symbols: languages.DocumentSymbol[] = [];

        lines.forEach((line: string, idx: number) => {
          const fnMatch = line.match(/(?:function|def|class|const|let|var|interface|type|func|fn)\s+([A-Za-z_][A-Za-z0-9_]*)/);
          if (fnMatch && fnMatch[1]) {
            const name = fnMatch[1];
            symbols.push({
              name,
              detail: line.trim(),
              kind: line.includes('class')
                ? monaco.languages.SymbolKind.Class
                : line.includes('interface') || line.includes('type')
                ? monaco.languages.SymbolKind.Interface
                : monaco.languages.SymbolKind.Function,
              tags: [],
              range: {
                startLineNumber: idx + 1,
                startColumn: 1,
                endLineNumber: idx + 1,
                endColumn: line.length + 1,
              },
              selectionRange: {
                startLineNumber: idx + 1,
                startColumn: 1,
                endLineNumber: idx + 1,
                endColumn: line.length + 1,
              },
            });
          }
        });

        return symbols;
      },
    });
  });
}
