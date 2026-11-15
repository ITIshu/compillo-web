import type { editor } from 'monaco-editor';

class EditorService {
  private editor: editor.IStandaloneCodeEditor | null = null;

  public register(editorInstance: editor.IStandaloneCodeEditor | null) {
    this.editor = editorInstance;
  }

  public getEditor(): editor.IStandaloneCodeEditor | null {
    return this.editor;
  }

  public undo(): void {
    if (!this.editor) return;
    this.editor.focus();
    this.editor.trigger('menu', 'undo', null);
  }

  public redo(): void {
    if (!this.editor) return;
    this.editor.focus();
    this.editor.trigger('menu', 'redo', null);
  }

  public async cut(): Promise<void> {
    if (!this.editor) return;
    this.editor.focus();
    const selection = this.editor.getSelection();
    if (!selection || selection.isEmpty()) return;
    const model = this.editor.getModel();
    if (!model) return;
    const selectedText = model.getValueInRange(selection);
    try {
      await navigator.clipboard.writeText(selectedText);
      this.editor.executeEdits('menu-cut', [
        {
          range: selection,
          text: '',
          forceMoveMarkers: true,
        },
      ]);
    } catch {
      document.execCommand('cut');
    }
  }

  public async copy(): Promise<void> {
    if (!this.editor) return;
    this.editor.focus();
    const selection = this.editor.getSelection();
    if (!selection || selection.isEmpty()) return;
    const model = this.editor.getModel();
    if (!model) return;
    const selectedText = model.getValueInRange(selection);
    try {
      await navigator.clipboard.writeText(selectedText);
    } catch {
      document.execCommand('copy');
    }
  }

  public async paste(): Promise<void> {
    if (!this.editor) return;
    this.editor.focus();
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const selection = this.editor.getSelection();
        if (selection) {
          this.editor.executeEdits('menu-paste', [
            {
              range: selection,
              text,
              forceMoveMarkers: true,
            },
          ]);
        }
      }
    } catch {
      document.execCommand('paste');
    }
  }

  public selectAll(): void {
    if (!this.editor) return;
    this.editor.focus();
    const model = this.editor.getModel();
    if (model) {
      this.editor.setSelection(model.getFullModelRange());
    }
  }

  public find(): void {
    if (!this.editor) return;
    this.editor.focus();
    this.editor.getAction('actions.find')?.run();
  }

  public replace(): void {
    if (!this.editor) return;
    this.editor.focus();
    this.editor.getAction('editor.action.startFindReplaceAction')?.run();
  }

  public format(): void {
    if (!this.editor) return;
    this.editor.focus();
    this.editor.getAction('editor.action.formatDocument')?.run();
  }

  public revealLine(line: number, column = 1): void {
    if (!this.editor) return;
    const model = this.editor.getModel();
    const safeLine = model
      ? Math.max(1, Math.min(line, model.getLineCount()))
      : Math.max(1, line);
    const safeCol = Math.max(1, column);
    this.editor.revealLineInCenter(safeLine);
    this.editor.setPosition({ lineNumber: safeLine, column: safeCol });
    this.editor.focus();
  }

  public insertAtCursor(text: string): boolean {
    if (!this.editor) return false;
    this.editor.focus();
    const selection = this.editor.getSelection();
    const position = this.editor.getPosition();
    const range = selection
      ? selection
      : position
      ? {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        }
      : null;
    if (!range) return false;
    this.editor.executeEdits('insert-snippet', [
      {
        range,
        text,
        forceMoveMarkers: true,
      },
    ]);
    return true;
  }
}

export const editorService = new EditorService();
