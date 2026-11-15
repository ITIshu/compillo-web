import React from 'react';
import { CompilloThemeDefinition } from '../../services/themes';
import { editorService } from '../../services/editorService';
import { Undo2, Redo2, Sparkles, CornerDownLeft } from 'lucide-react';

interface MobileCodingBarProps {
  currentTheme: CompilloThemeDefinition;
  onFormatDocument?: () => void;
  onRunCode?: () => void;
}

export const MobileCodingBar: React.FC<MobileCodingBarProps> = ({
  currentTheme,
  onFormatDocument,
}) => {
  const insertText = (text: string, cursorOffsetFromEnd = 0) => {
    const editor = editorService.getEditor();
    if (!editor) return;

    const selection = editor.getSelection();
    if (!selection) return;

    editor.executeEdits('mobile-bar', [
      {
        range: selection,
        text: text,
        forceMoveMarkers: true,
      },
    ]);

    if (cursorOffsetFromEnd !== 0) {
      const position = editor.getPosition();
      if (position) {
        editor.setPosition({
          lineNumber: position.lineNumber,
          column: Math.max(1, position.column - cursorOffsetFromEnd),
        });
      }
    }

    editor.focus();
  };

  const handleTab = () => {
    insertText('  ');
  };

  const handleUndo = () => {
    const editor = editorService.getEditor();
    editor?.trigger('mobile-bar', 'undo', null);
  };

  const handleRedo = () => {
    const editor = editorService.getEditor();
    editor?.trigger('mobile-bar', 'redo', null);
  };

  const isLight = currentTheme.type === 'light';

  const keys: Array<{
    label: React.ReactNode;
    action: () => void;
    title: string;
    isSpecial?: boolean;
  }> = [
    { label: 'Tab', action: handleTab, title: 'Insert Tab / Indent', isSpecial: true },
    { label: '{ }', action: () => insertText('{}', 1), title: 'Curly Brackets' },
    { label: '( )', action: () => insertText('()', 1), title: 'Parentheses' },
    { label: '[ ]', action: () => insertText('[]', 1), title: 'Square Brackets' },
    { label: '" "', action: () => insertText('""', 1), title: 'Double Quotes' },
    { label: "' '", action: () => insertText("''", 1), title: 'Single Quotes' },
    { label: '` `', action: () => insertText('``', 1), title: 'Backticks' },
    { label: ':', action: () => insertText(':'), title: 'Colon' },
    { label: ';', action: () => insertText(';'), title: 'Semicolon' },
    { label: '=', action: () => insertText(' = '), title: 'Equals with spaces' },
    { label: '==', action: () => insertText(' == '), title: 'Strict Equals' },
    { label: '=>', action: () => insertText(' => '), title: 'Arrow function' },
    { label: '<', action: () => insertText('<'), title: 'Less Than' },
    { label: '>', action: () => insertText('>'), title: 'Greater Than' },
    { label: '+', action: () => insertText('+'), title: 'Plus' },
    { label: '-', action: () => insertText('-'), title: 'Minus' },
    { label: '*', action: () => insertText('*'), title: 'Multiply' },
    { label: '/', action: () => insertText('/'), title: 'Forward Slash' },
    { label: '_', action: () => insertText('_'), title: 'Underscore' },
    { label: '.', action: () => insertText('.'), title: 'Dot' },
    { label: ',', action: () => insertText(', '), title: 'Comma' },
    { label: '#', action: () => insertText('# '), title: 'Python comment' },
    { label: '//', action: () => insertText('// '), title: 'JS/C comment' },
  ];

  return (
    <div
      id="mobile-coding-accessory-bar"
      className="md:hidden flex items-center h-9 px-1.5 border-t border-b overflow-x-auto no-scrollbar shrink-0 select-none z-20 gap-1 touch-pan-x"
      style={{
        backgroundColor: currentTheme.ui.tabBarBg,
        borderColor: currentTheme.ui.sideBarBorder,
      }}
    >
      {/* Quick Action: Undo */}
      <button
        onClick={handleUndo}
        title="Undo"
        className={`flex items-center justify-center h-7 w-7 rounded shrink-0 transition-colors ${
          isLight
            ? 'bg-black/5 hover:bg-black/10 text-gray-800'
            : 'bg-white/10 hover:bg-white/15 text-gray-200'
        }`}
      >
        <Undo2 size={13} />
      </button>

      {/* Quick Action: Redo */}
      <button
        onClick={handleRedo}
        title="Redo"
        className={`flex items-center justify-center h-7 w-7 rounded shrink-0 transition-colors ${
          isLight
            ? 'bg-black/5 hover:bg-black/10 text-gray-800'
            : 'bg-white/10 hover:bg-white/15 text-gray-200'
        }`}
      >
        <Redo2 size={13} />
      </button>

      {/* Quick Action: Format */}
      {onFormatDocument && (
        <button
          onClick={onFormatDocument}
          title="Format Code"
          className={`flex items-center justify-center h-7 px-2 rounded shrink-0 transition-colors text-[11px] gap-1 font-medium ${
            isLight
              ? 'bg-black/5 hover:bg-black/10 text-gray-800'
              : 'bg-white/10 hover:bg-white/15 text-gray-200'
          }`}
        >
          <Sparkles size={12} className="text-amber-400" />
          <span>Format</span>
        </button>
      )}

      <div className="h-4 w-[1px] bg-white/20 shrink-0 mx-0.5" />

      {/* Virtual Key Buttons */}
      {keys.map((k, idx) => (
        <button
          key={idx}
          onClick={k.action}
          title={k.title}
          className={`h-7 px-2 min-w-7 flex items-center justify-center rounded font-mono text-[12px] font-medium shrink-0 active:scale-95 transition-all ${
            k.isSpecial
              ? isLight
                ? 'bg-[#005fb8]/15 text-[#005fb8] font-bold'
                : 'bg-[#007acc]/30 text-white font-bold'
              : isLight
              ? 'bg-black/5 hover:bg-black/10 text-gray-800'
              : 'bg-white/10 hover:bg-white/15 text-gray-200'
          }`}
        >
          {k.label}
        </button>
      ))}
    </div>
  );
};
