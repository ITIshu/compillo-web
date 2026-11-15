import React, { useRef, useEffect } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { DiagnosticItem, EditorSettings, FileNode } from '../../types';
import { VSCodeThemeDefinition } from '../../services/themes';
import { FileCode, Sparkles, Command, FolderPlus, FilePlus, FolderX, FolderCheck, Upload } from 'lucide-react';
import { editorService } from '../../services/editorService';
import { registerSmartCompletions, setWorkspaceFilesForCompletions } from '../../services/smartCompletionService';
import { customizationService, useCustomization } from '../../services/customizationService';
import { pluginManager } from '../../services/pluginSystem';

interface CodeEditorProps {
  activeFile: FileNode | null;
  currentTheme: VSCodeThemeDefinition;
  settings: EditorSettings;
  diagnostics: DiagnosticItem[];
  files?: FileNode[];
  isWorkspaceOpen?: boolean;
  onOpenWorkspace?: () => void;
  onImport?: () => void;
  onChangeContent: (newContent: string) => void;
  onCursorChange: (line: number, column: number) => void;
  onSave: () => void;
  onNewFile: () => void;
  onOpenCommandPalette: () => void;
  onOpenFilePalette: () => void;
  onLoadSampleProject?: (projectType: 'calculator') => void;
  registerAsPrimary?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  activeFile,
  currentTheme,
  settings,
  diagnostics,
  files = [],
  isWorkspaceOpen = true,
  onOpenWorkspace,
  onImport,
  onChangeContent,
  onCursorChange,
  onSave,
  onNewFile,
  onOpenCommandPalette,
  onOpenFilePalette,
  onLoadSampleProject,
  registerAsPrimary = true,
}) => {
  const customization = useCustomization();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const onSaveRef = useRef(onSave);
  const onCursorChangeRef = useRef(onCursorChange);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    onCursorChangeRef.current = onCursorChange;
  }, [onCursorChange]);

  useEffect(() => {
    setWorkspaceFilesForCompletions(files);
  }, [files]);

  useEffect(() => {
    return () => {
      if (registerAsPrimary) {
        editorService.register(null);
      }
    };
  }, [registerAsPrimary]);

  // Sync Diagnostics / Linting markers into Monaco Editor
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !activeFile) return;

    const monaco = monacoRef.current;
    const model = editorRef.current.getModel();
    if (!model) return;

    const markers: editor.IMarkerData[] = diagnostics
      .filter((d) => d.fileId === activeFile.id)
      .map((d) => {
        let severity = monaco.MarkerSeverity.Info;
        if (d.severity === 'error') severity = monaco.MarkerSeverity.Error;
        if (d.severity === 'warning') severity = monaco.MarkerSeverity.Warning;

        return {
          startLineNumber: d.line,
          startColumn: d.column || 1,
          endLineNumber: d.endLine || d.line,
          endColumn: d.endColumn || (d.column ? d.column + 10 : 100),
          message: d.message,
          severity,
          source: d.source,
        };
      });

    monaco.editor.setModelMarkers(model, 'linter', markers);
  }, [diagnostics, activeFile]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    if (registerAsPrimary) {
      editorService.register(editor);
    }

    // Register Cyberpunk theme
    monaco.editor.defineTheme('cyberpunk', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '75609c', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff007f', fontStyle: 'bold' },
        { token: 'string', foreground: '00f0ff' },
        { token: 'number', foreground: 'fcee0a' },
        { token: 'regexp', foreground: 'ff007f' },
        { token: 'type', foreground: 'ffe600' },
        { token: 'class', foreground: 'ffe600' },
        { token: 'function', foreground: '00ff9f' },
        { token: 'variable', foreground: 'f1eaff' },
        { token: 'constant', foreground: 'fcee0a' },
        { token: 'delimiter', foreground: '00f0ff' },
      ],
      colors: {
        'editor.background': '#130d29',
        'editor.foreground': '#ffffff',
        'editorLineNumber.foreground': '#75609c',
        'editorLineNumber.activeForeground': '#fcee0a',
        'editorCursor.foreground': '#fcee0a',
        'editor.selectionBackground': '#4a157a88',
        'editor.lineHighlightBackground': '#1c133a',
        'editorWhitespace.foreground': '#38225e',
        'editorBracketMatch.background': '#ff007f33',
        'editorBracketMatch.border': '#ff007f',
      },
    });

    // Register Sakura Blossom Theme (Loved by girls/females)
    monaco.editor.defineTheme('sakura-blossom', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '9d8189', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'e11d48', fontStyle: 'bold' },
        { token: 'string', foreground: 'db2777' },
        { token: 'number', foreground: 'ea580c' },
        { token: 'regexp', foreground: 'be185d' },
        { token: 'type', foreground: 'c026d3' },
        { token: 'class', foreground: 'b91c1c' },
        { token: 'function', foreground: 'be185d' },
        { token: 'variable', foreground: '4c0519' },
        { token: 'constant', foreground: 'e11d48' },
        { token: 'delimiter', foreground: 'f472b6' },
      ],
      colors: {
        'editor.background': '#fffafd',
        'editor.foreground': '#4c0519',
        'editorLineNumber.foreground': '#f472b6',
        'editorLineNumber.activeForeground': '#e11d48',
        'editorCursor.foreground': '#e11d48',
        'editor.selectionBackground': '#fce7f3cc',
        'editor.lineHighlightBackground': '#fff1f688',
        'editorWhitespace.foreground': '#fbcfe8',
        'editorBracketMatch.background': '#fbcfe855',
        'editorBracketMatch.border': '#f43f5e',
      },
    });

    // Register Fairy Lavender Theme (Loved by girls/females)
    monaco.editor.defineTheme('fairy-lavender', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '9381ff', fontStyle: 'italic' },
        { token: 'keyword', foreground: '7e22ce', fontStyle: 'bold' },
        { token: 'string', foreground: '9333ea' },
        { token: 'number', foreground: 'd946ef' },
        { token: 'regexp', foreground: 'a855f7' },
        { token: 'type', foreground: '6b21a8' },
        { token: 'class', foreground: '581c87' },
        { token: 'function', foreground: 'a855f7' },
        { token: 'variable', foreground: '3b0764' },
        { token: 'constant', foreground: '7c3aed' },
        { token: 'delimiter', foreground: 'c084fc' },
      ],
      colors: {
        'editor.background': '#fcfaff',
        'editor.foreground': '#3b0764',
        'editorLineNumber.foreground': '#c084fc',
        'editorLineNumber.activeForeground': '#7e22ce',
        'editorCursor.foreground': '#9333ea',
        'editor.selectionBackground': '#e9d5ffaa',
        'editor.lineHighlightBackground': '#f5edff88',
        'editorWhitespace.foreground': '#e9d5ff',
        'editorBracketMatch.background': '#d8b4fe55',
        'editorBracketMatch.border': '#a855f7',
      },
    });

    // Register Luxury Royal Gold Theme
    monaco.editor.defineTheme('luxury-gold', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '786851', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'd4af37', fontStyle: 'bold' },
        { token: 'string', foreground: 'e5c158' },
        { token: 'number', foreground: 'f59e0b' },
        { token: 'regexp', foreground: 'e6b800' },
        { token: 'type', foreground: 'ffd700' },
        { token: 'class', foreground: 'fef08a' },
        { token: 'function', foreground: 'e6b800' },
        { token: 'variable', foreground: 'f5efe6' },
        { token: 'constant', foreground: 'd4af37' },
        { token: 'delimiter', foreground: 'b48324' },
      ],
      colors: {
        'editor.background': '#110d08',
        'editor.foreground': '#fbf7ee',
        'editorLineNumber.foreground': '#846e4d',
        'editorLineNumber.activeForeground': '#f59e0b',
        'editorCursor.foreground': '#f59e0b',
        'editor.selectionBackground': '#b4832444',
        'editor.lineHighlightBackground': '#1e1810',
        'editorWhitespace.foreground': '#2e2316',
        'editorBracketMatch.background': '#d4af3733',
        'editorBracketMatch.border': '#d4af37',
      },
    });

    const stripHash = (hex: string) => hex.replace(/^#/, '');

    const applyCustomOrBaseTheme = (monacoInstance: Monaco) => {
      const resolveBaseMonaco = (themeId: string, themeType: string) => {
        if (['cyberpunk', 'sakura-blossom', 'fairy-lavender', 'luxury-gold'].includes(themeId)) {
          return themeId;
        }
        return themeType === 'light' ? 'vs' : 'vs-dark';
      };

      if (customizationService.hasActiveCustomSyntax()) {
        const t = customizationService.getResolvedSyntaxTokens();
        monacoInstance.editor.defineTheme('compillo-custom-syntax', {
          base: currentTheme.type === 'light' ? 'vs' : 'vs-dark',
          inherit: true,
          rules: [
            { token: 'comment', foreground: stripHash(t.comment), fontStyle: 'italic' },
            { token: 'keyword', foreground: stripHash(t.keyword), fontStyle: 'bold' },
            { token: 'keyword.operator', foreground: stripHash(t.keyword) },
            { token: 'string', foreground: stripHash(t.string) },
            { token: 'number', foreground: stripHash(t.number) },
            { token: 'regexp', foreground: stripHash(t.string) },
            { token: 'type', foreground: stripHash(t.type) },
            { token: 'type.identifier', foreground: stripHash(t.type) },
            { token: 'class', foreground: stripHash(t.type) },
            { token: 'function', foreground: stripHash(t.function) },
            { token: 'identifier', foreground: stripHash(t.variable) },
            { token: 'variable', foreground: stripHash(t.variable) },
            { token: 'constant', foreground: stripHash(t.number) },
            { token: 'delimiter', foreground: stripHash(t.delimiter) },
            { token: 'operator', foreground: stripHash(t.delimiter) },
            { token: 'tag', foreground: stripHash(t.keyword) },
            { token: 'attribute.name', foreground: stripHash(t.type) },
            { token: 'attribute.value', foreground: stripHash(t.string) },
          ],
          colors: {
            'editor.background': currentTheme.ui.editorBg,
            'editor.foreground': currentTheme.ui.editorFg,
            'editorLineNumber.foreground': currentTheme.ui.lineNumbers,
            'editorLineNumber.activeForeground': currentTheme.ui.accent,
            'editorCursor.foreground': currentTheme.ui.accent,
          },
        });
        monacoInstance.editor.setTheme('compillo-custom-syntax');
        return;
      }

      monacoInstance.editor.setTheme(
        resolveBaseMonaco(currentTheme.monacoTheme, currentTheme.type)
      );
    };

    applyCustomOrBaseTheme(monaco);

    // Cursor position listener
    editor.onDidChangeCursorPosition((e) => {
      onCursorChangeRef.current(e.position.lineNumber, e.position.column);
    });

    // Save keybinding: Ctrl+S or Cmd+S
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSaveRef.current();
    });

    // Format keybinding: Shift+Alt+F
    editor.addCommand(
      monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
      () => {
        editor.getAction('editor.action.formatDocument')?.run();
      }
    );

    // Register intelligent multi-language completions & symbol providers
    registerSmartCompletions(monaco);

    // Smart Code Completion keybinding: Ctrl+Space / Cmd+Space
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
    });

    // Go to Line keybinding: Ctrl+G / Cmd+G
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG, () => {
      editor.getAction('editor.action.gotoLine')?.run();
    });

    // Editor Font Zoom: Ctrl+=, Ctrl+-, Ctrl+0
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal, () => {
      editor.trigger('keyboard', 'editor.action.fontZoomIn', {});
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus, () => {
      editor.trigger('keyboard', 'editor.action.fontZoomOut', {});
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit0, () => {
      editor.trigger('keyboard', 'editor.action.fontZoomReset', {});
    });

    // Right-click Monaco Context Menu: Instant Extension Actions (auto-load on demand)
    const contextActions: Array<{ id: string; label: string; cmdId: string; order: number }> = [
      { id: 'compillo.ctx.mermaid', label: 'Compillo: Generate Mermaid Flowchart', cmdId: 'mermaid.generateFlowchart', order: 1 },
      { id: 'compillo.ctx.imports', label: 'Compillo: Organize & Sort Imports', cmdId: 'imports.organize', order: 2 },
      { id: 'compillo.ctx.rest', label: 'Compillo: Extract API URLs -> Curl', cmdId: 'restClient.extractUrls', order: 3 },
      { id: 'compillo.ctx.security', label: 'Compillo: Security & Secret Audit', cmdId: 'sonarlint.scanActiveFile', order: 4 },
      { id: 'compillo.ctx.codeColors', label: 'Compillo: Customize Code Syntax Colours...', cmdId: 'codeColor.openPicker', order: 5 },
    ];
    contextActions.forEach((act) => {
      editor.addAction({
        id: act.id,
        label: act.label,
        contextMenuGroupId: 'compillo_extensions',
        contextMenuOrder: act.order,
        run: () => {
          pluginManager.executeCommand(act.cmdId);
        },
      });
    });
  };

  // Keep Monaco theme and syntax palette in sync when user toggles themes or syntax colors
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;

    if (customizationService.hasActiveCustomSyntax()) {
      const stripHash = (hex: string) => hex.replace(/^#/, '');
      const t = customizationService.getResolvedSyntaxTokens();
      monaco.editor.defineTheme('compillo-custom-syntax', {
        base: currentTheme.type === 'light' ? 'vs' : 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: stripHash(t.comment), fontStyle: 'italic' },
          { token: 'keyword', foreground: stripHash(t.keyword), fontStyle: 'bold' },
          { token: 'keyword.operator', foreground: stripHash(t.keyword) },
          { token: 'string', foreground: stripHash(t.string) },
          { token: 'number', foreground: stripHash(t.number) },
          { token: 'regexp', foreground: stripHash(t.string) },
          { token: 'type', foreground: stripHash(t.type) },
          { token: 'type.identifier', foreground: stripHash(t.type) },
          { token: 'class', foreground: stripHash(t.type) },
          { token: 'function', foreground: stripHash(t.function) },
          { token: 'identifier', foreground: stripHash(t.variable) },
          { token: 'variable', foreground: stripHash(t.variable) },
          { token: 'constant', foreground: stripHash(t.number) },
          { token: 'delimiter', foreground: stripHash(t.delimiter) },
          { token: 'operator', foreground: stripHash(t.delimiter) },
          { token: 'tag', foreground: stripHash(t.keyword) },
          { token: 'attribute.name', foreground: stripHash(t.type) },
          { token: 'attribute.value', foreground: stripHash(t.string) },
        ],
        colors: {
          'editor.background': currentTheme.ui.editorBg,
          'editor.foreground': currentTheme.ui.editorFg,
          'editorLineNumber.foreground': currentTheme.ui.lineNumbers,
          'editorLineNumber.activeForeground': currentTheme.ui.accent,
          'editorCursor.foreground': currentTheme.ui.accent,
        },
      });
      monaco.editor.setTheme('compillo-custom-syntax');
      return;
    }

    const activeMonacoTheme = ['cyberpunk', 'sakura-blossom', 'fairy-lavender', 'luxury-gold'].includes(
      currentTheme.monacoTheme
    )
      ? currentTheme.monacoTheme
      : currentTheme.type === 'light'
      ? 'vs'
      : 'vs-dark';
    monaco.editor.setTheme(activeMonacoTheme);
  }, [currentTheme, customization]);

  // If workspace is closed and no file is actively opened, show workspace closed state
  if (!isWorkspaceOpen && !activeFile) {
    return (
      <div
        id="compillo-workspace-closed-screen"
        className="flex-1 h-full flex flex-col items-center justify-center p-8 select-none overflow-y-auto"
        style={{
          backgroundColor: currentTheme.ui.editorBg,
          color: currentTheme.ui.editorFg,
        }}
      >
        <div className="max-w-md w-full space-y-6 text-center">
          <div
            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-lg"
            style={{ backgroundColor: `${currentTheme.ui.accent}20` }}
          >
            <FolderX size={32} style={{ color: currentTheme.ui.accent }} />
          </div>
          <div>
            <h1 className="text-xl font-medium tracking-wide">Workspace Closed</h1>
            <p
              className={`text-xs mt-2 ${
                currentTheme.type === 'light' ? 'text-gray-500' : 'text-[#888888]'
              }`}
            >
              No workspace or project folder is currently open.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenWorkspace}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-white font-medium text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
              style={{ backgroundColor: currentTheme.ui.accent }}
            >
              <FolderCheck size={15} />
              <span>Open Workspace</span>
            </button>
            <button
              onClick={onNewFile}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition-colors ${
                currentTheme.type === 'light'
                  ? 'bg-white hover:bg-gray-100 text-gray-800 border-gray-300'
                  : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
              }`}
            >
              <FilePlus size={15} />
              <span>New File</span>
            </button>
            {onImport && (
              <button
                onClick={onImport}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition-colors ${
                  currentTheme.type === 'light'
                    ? 'bg-white hover:bg-gray-100 text-gray-800 border-gray-300'
                    : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                }`}
              >
                <Upload size={15} />
                <span>Import</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If no file is open, render the authentic Compillo Studio Welcome Screen
  if (!activeFile) {
    return (
      <div
        id="compillo-welcome-screen"
        className="flex-1 h-full flex flex-col items-center justify-center p-8 select-none overflow-y-auto"
        style={{
          backgroundColor: currentTheme.ui.editorBg,
          color: currentTheme.ui.editorFg,
        }}
      >
        <div className="max-w-md w-full space-y-8 text-center">
          {/* Logo */}
          <div className="flex flex-col items-center space-y-3">
            <img
              src="/compillo-logo.png"
              alt="Compillo Logo"
              className="h-14 w-auto object-contain drop-shadow-sm select-none"
            />
            <h1
              className="text-2xl font-light tracking-wide"
              style={{ color: currentTheme.ui.editorFg }}
            >
              Compillo Studio
            </h1>
            <p
              className={`text-xs ${
                currentTheme.type === 'light' ? 'text-gray-500' : 'text-[#888888]'
              }`}
            >
              High-performance web development studio with extensions, live canvas, and AI copilot.
            </p>
          </div>

          {/* Quick Start Buttons */}
          <div
            className={`space-y-2 text-left p-4 rounded-lg border ${
              currentTheme.type === 'light'
                ? 'bg-black/[0.02] border-gray-200'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div
              className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${
                currentTheme.type === 'light' ? 'text-gray-600' : 'text-[#888888]'
              }`}
            >
              Start
            </div>
            {onLoadSampleProject && (
              <button
                onClick={() => onLoadSampleProject('calculator')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all text-xs border ${
                  currentTheme.type === 'light'
                    ? 'border-cyan-500/40 hover:bg-cyan-50 bg-cyan-50/20 text-cyan-900'
                    : 'border-cyan-500/40 hover:bg-cyan-950/30 bg-cyan-950/15 text-cyan-300 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Sparkles size={14} className="text-cyan-400 shrink-0" />
                  <span className="font-semibold">Load PyCalc Python Calculator</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  PORT :5050
                </span>
              </button>
            )}
            <button
              onClick={onNewFile}
              className={`w-full flex items-center justify-between p-2 rounded transition-colors text-xs ${
                currentTheme.type === 'light'
                  ? 'hover:bg-black/5 text-gray-800'
                  : 'hover:bg-[#007acc]/20 text-[#cccccc] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <FilePlus size={14} className="text-[#007acc]" /> New File... (Python, C/C++, Java, etc.)
              </span>
              <kbd
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  currentTheme.type === 'light'
                    ? 'bg-black/5 text-gray-700'
                    : 'bg-black/30 text-[#cccccc]'
                }`}
              >
                Ctrl+N
              </kbd>
            </button>
            <button
              onClick={onOpenFilePalette}
              className={`w-full flex items-center justify-between p-2 rounded transition-colors text-xs ${
                currentTheme.type === 'light'
                  ? 'hover:bg-black/5 text-gray-800'
                  : 'hover:bg-[#007acc]/20 text-[#cccccc] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Command size={14} className="text-emerald-500" /> Open File...
              </span>
              <kbd
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  currentTheme.type === 'light'
                    ? 'bg-black/5 text-gray-700'
                    : 'bg-black/30 text-[#cccccc]'
                }`}
              >
                Ctrl+P
              </kbd>
            </button>
            <button
              onClick={onOpenCommandPalette}
              className={`w-full flex items-center justify-between p-2 rounded transition-colors text-xs ${
                currentTheme.type === 'light'
                  ? 'hover:bg-black/5 text-gray-800'
                  : 'hover:bg-[#007acc]/20 text-[#cccccc] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500" /> Show All Commands...
              </span>
              <kbd
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  currentTheme.type === 'light'
                    ? 'bg-black/5 text-gray-700'
                    : 'bg-black/30 text-[#cccccc]'
                }`}
              >
                Ctrl+Shift+P
              </kbd>
            </button>
          </div>

          {/* Keyboard Shortcuts Table */}
          <div
            className={`text-left text-[11px] space-y-1.5 ${
              currentTheme.type === 'light' ? 'text-gray-600' : 'text-[#888888]'
            }`}
          >
            <div className="flex justify-between py-0.5">
              <span>Show All Commands</span>
              <kbd className="font-mono font-medium">Ctrl+Shift+P</kbd>
            </div>
            <div className="flex justify-between py-0.5">
              <span>Go to File</span>
              <kbd className="font-mono font-medium">Ctrl+P</kbd>
            </div>
            <div className="flex justify-between py-0.5">
              <span>Format Document</span>
              <kbd className="font-mono font-medium">Shift+Alt+F</kbd>
            </div>
            <div className="flex justify-between py-0.5">
              <span>Toggle Side Bar</span>
              <kbd className="font-mono font-medium">Ctrl+B</kbd>
            </div>
            <div className="flex justify-between py-0.5">
              <span>Toggle Terminal</span>
              <kbd className="font-mono font-medium">Ctrl+`</kbd>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="monaco-container" className="flex-1 w-full h-full relative overflow-hidden">
      <Editor
        key={activeFile.id}
        height="100%"
        width="100%"
        path={activeFile.path}
        language={activeFile.language || 'plaintext'}
        value={activeFile.content || ''}
        theme={
          customizationService.hasActiveCustomSyntax()
            ? 'compillo-custom-syntax'
            : ['cyberpunk', 'sakura-blossom', 'fairy-lavender', 'luxury-gold'].includes(
                currentTheme.monacoTheme
              )
            ? currentTheme.monacoTheme
            : currentTheme.type === 'light'
            ? 'vs'
            : 'vs-dark'
        }
        onChange={(value) => {
          onChangeContent(value || '');
        }}
        onMount={handleEditorDidMount}
        loading={
          <div
            className="flex flex-col items-center justify-center h-full text-xs text-[#888888] space-y-2"
            style={{ backgroundColor: currentTheme.ui.editorBg }}
          >
            <div className="w-5 h-5 border-2 border-[#007acc] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading editor...</span>
          </div>
        }
        options={{
          fontSize:
            typeof window !== 'undefined' && window.innerWidth < 768
              ? Math.max(12, settings.fontSize - 1)
              : settings.fontSize,
          tabSize: settings.tabSize,
          wordWrap:
            typeof window !== 'undefined' && window.innerWidth < 768
              ? 'on'
              : settings.wordWrap,
          lineNumbers: settings.lineNumbers,
          lineNumbersMinChars:
            typeof window !== 'undefined' && window.innerWidth < 768 ? 3 : 5,
          minimap: {
            enabled:
              typeof window !== 'undefined' && window.innerWidth < 768
                ? false
                : settings.minimap,
          },
          bracketPairColorization: { enabled: settings.bracketPairColorization },
          stickyScroll: { enabled: true },
          automaticLayout: true,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', monospace",
          fontLigatures: true,
          padding: { top: 8, bottom: 8 },
          renderWhitespace: 'selection',
          renderLineHighlight: 'all',
          renderLineHighlightOnlyWhenFocus: false,
          folding: true,
          foldingHighlight: true,
          showFoldingControls:
            typeof window !== 'undefined' && window.innerWidth < 768
              ? 'never'
              : 'always',
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
          suggestOnTriggerCharacters: true,
          tabCompletion: 'on',
          snippetSuggestions: 'top',
          wordBasedSuggestions: 'allDocuments',
        }}
      />

      {/* Floating Smart Suggest Trigger Pill */}
      <button
        onClick={() => {
          if (editorRef.current) {
            editorRef.current.focus();
            editorRef.current.trigger('toolbar', 'editor.action.triggerSuggest', {});
          }
        }}
        title="Trigger Smart Code Completion (Ctrl+Space)"
        className="hidden sm:flex absolute bottom-3 right-5 z-10 items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 bg-black/60 hover:bg-black/80 text-white/90 border border-white/10 backdrop-blur-md shadow-md transition-colors"
      >
        <Sparkles size={12} className="text-amber-400" />
        <span>Smart Suggest</span>
        <kbd className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-gray-300 ml-0.5">
          Ctrl+Space
        </kbd>
      </button>
    </div>
  );
};
