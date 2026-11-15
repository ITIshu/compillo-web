import React, { useState, useMemo } from 'react';
import { X, Search, Code2, Plus, Trash2, Copy, Check, ArrowRightToLine } from 'lucide-react';
import { VSCodeThemeDefinition } from '../../services/themes';
import {
  CodeSnippet,
  getAllSnippets,
  saveCustomSnippet,
  deleteCustomSnippet,
} from '../../services/snippetService';

interface SnippetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: VSCodeThemeDefinition;
  activeLanguage?: string;
  hasActiveFile: boolean;
  onInsertSnippet: (code: string, title: string) => void;
}

export const SnippetsModal: React.FC<SnippetsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  activeLanguage,
  hasActiveFile,
  onInsertSnippet,
}) => {
  const [snippets, setSnippets] = useState<CodeSnippet[]>(() => getAllSnippets());
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedId, setSelectedId] = useState<string>(snippets[0]?.id || '');
  const [copied, setCopied] = useState(false);

  // Create custom snippet form
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLang, setNewLang] = useState(activeLanguage || 'typescript');
  const [newDesc, setNewDesc] = useState('');
  const [newCode, setNewCode] = useState('');

  const isLight = currentTheme.type === 'light';

  const categories = ['All', 'React & TS', 'Python', 'C / C++', 'Backend / API', 'SQL & Data', 'Custom'];

  const filteredSnippets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return snippets.filter((s) => {
      const catOk = selectedCategory === 'All' || s.category === selectedCategory;
      const queryOk =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.language.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q);
      return catOk && queryOk;
    });
  }, [snippets, search, selectedCategory]);

  const activeSnippet =
    filteredSnippets.find((s) => s.id === selectedId) || filteredSnippets[0] || null;

  if (!isOpen) return null;

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCode.trim()) return;
    const created = saveCustomSnippet({
      title: newTitle.trim(),
      language: newLang.trim() || 'plaintext',
      description: newDesc.trim() || 'User saved snippet',
      code: newCode,
    });
    const refreshed = getAllSnippets();
    setSnippets(refreshed);
    setSelectedCategory('All');
    setSelectedId(created.id);
    setIsCreating(false);
    setNewTitle('');
    setNewDesc('');
    setNewCode('');
  };

  const handleDeleteCustom = (id: string) => {
    deleteCustomSnippet(id);
    const refreshed = getAllSnippets();
    setSnippets(refreshed);
    if (selectedId === id) {
      setSelectedId(refreshed[0]?.id || '');
    }
  };

  const handleCopy = async () => {
    if (!activeSnippet) return;
    try {
      await navigator.clipboard.writeText(activeSnippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl h-[540px] max-h-[85vh] rounded-xl border shadow-2xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: currentTheme.ui.sideBarBg,
          borderColor: currentTheme.ui.sideBarBorder,
          color: currentTheme.ui.editorFg,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <div className="flex items-center gap-2">
            <Code2 size={16} style={{ color: currentTheme.ui.accent }} />
            <span className="font-semibold text-[13px]">Code Snippets & Templates Vault</span>
            <span className="text-[11px] opacity-60 font-mono tabular-nums">
              ({filteredSnippets.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: currentTheme.ui.accent }}
            >
              <Plus size={12} />
              <span>{isCreating ? 'Back to Vault' : 'New Custom Snippet'}</span>
            </button>
            <button
              onClick={onClose}
              className={`p-1 rounded transition-colors ${
                isLight ? 'hover:bg-black/10' : 'hover:bg-white/10'
              }`}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        {isCreating ? (
          <form onSubmit={handleSaveCustom} className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium opacity-75 mb-1">Snippet Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. FastAPI Endpoint"
                  className={`w-full px-2.5 py-1.5 rounded border text-[12px] outline-none ${
                    isLight ? 'bg-white border-gray-300 text-gray-900' : 'bg-black/30 border-white/15 text-white'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium opacity-75 mb-1">Language</label>
                <input
                  type="text"
                  value={newLang}
                  onChange={(e) => setNewLang(e.target.value)}
                  placeholder="typescript, python, cpp, sql..."
                  className={`w-full px-2.5 py-1.5 rounded border text-[12px] outline-none ${
                    isLight ? 'bg-white border-gray-300 text-gray-900' : 'bg-black/30 border-white/15 text-white'
                  }`}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium opacity-75 mb-1">Short Description</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What does this template do?"
                className={`w-full px-2.5 py-1.5 rounded border text-[12px] outline-none ${
                  isLight ? 'bg-white border-gray-300 text-gray-900' : 'bg-black/30 border-white/15 text-white'
                }`}
              />
            </div>
            <div className="flex-1 flex flex-col min-h-[180px]">
              <label className="block text-[11px] font-medium opacity-75 mb-1">Code</label>
              <textarea
                required
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="Paste reusable code snippet..."
                className={`flex-1 w-full p-2.5 rounded border font-mono text-[12px] outline-none resize-none ${
                  isLight ? 'bg-white border-gray-300 text-gray-900' : 'bg-black/30 border-white/15 text-white'
                }`}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className={`px-3 py-1.5 rounded text-[12px] border ${
                  isLight ? 'border-gray-300 hover:bg-black/5' : 'border-white/15 hover:bg-white/10'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded text-[12px] font-medium text-white"
                style={{ backgroundColor: currentTheme.ui.accent }}
              >
                Save Snippet
              </button>
            </div>
          </form>
        ) : (
          <div className="flex-1 flex min-h-0">
            {/* Left Sidebar: Search + List */}
            <div
              className="w-72 border-r flex flex-col shrink-0"
              style={{ borderColor: currentTheme.ui.sideBarBorder }}
            >
              <div className="p-2.5 space-y-2 border-b" style={{ borderColor: currentTheme.ui.sideBarBorder }}>
                <div
                  className={`flex items-center gap-1.5 px-2 py-1 rounded border ${
                    isLight ? 'bg-white border-gray-300' : 'bg-black/30 border-white/10'
                  }`}
                >
                  <Search size={13} className="opacity-50 shrink-0" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter snippets..."
                    autoFocus
                    className="w-full bg-transparent outline-none text-[12px]"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`w-full px-2 py-1 rounded border text-[11px] outline-none ${
                    isLight ? 'bg-white border-gray-300 text-gray-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 overflow-y-auto py-1">
                {filteredSnippets.length === 0 ? (
                  <div className="p-4 text-[11px] opacity-60 italic">No snippets match filter.</div>
                ) : (
                  filteredSnippets.map((item) => {
                    const isActive = activeSnippet?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`group px-3 py-2 cursor-pointer border-b transition-colors flex items-start justify-between gap-2 ${
                          isActive
                            ? isLight
                              ? 'bg-[#005fb8]/10 border-l-2'
                              : 'bg-white/10 border-l-2'
                            : isLight
                            ? 'hover:bg-black/5'
                            : 'hover:bg-white/5'
                        }`}
                        style={{
                          borderBottomColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
                          borderLeftColor: isActive ? currentTheme.ui.accent : 'transparent',
                        }}
                      >
                        <div className="min-w-0">
                          <div className="text-[12px] font-medium truncate">{item.title}</div>
                          <div className="text-[10px] opacity-60 font-mono mt-0.5">
                            {item.language} • {item.category}
                          </div>
                        </div>
                        {item.isCustom && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustom(item.id);
                            }}
                            title="Delete Custom Snippet"
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-400 shrink-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Preview & Actions */}
            <div className="flex-1 flex flex-col min-w-0">
              {activeSnippet ? (
                <>
                  <div
                    className="px-4 py-3 border-b flex items-center justify-between gap-3 shrink-0"
                    style={{ borderColor: currentTheme.ui.sideBarBorder }}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[13px] truncate">{activeSnippet.title}</div>
                      <div className="text-[11px] opacity-70 truncate mt-0.5">
                        {activeSnippet.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleCopy}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] border transition-colors ${
                          isLight ? 'border-gray-300 hover:bg-black/5' : 'border-white/15 hover:bg-white/10'
                        }`}
                      >
                        {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        disabled={!hasActiveFile}
                        onClick={() => {
                          onInsertSnippet(activeSnippet.code, activeSnippet.title);
                          onClose();
                        }}
                        title={hasActiveFile ? 'Insert at current cursor position' : 'Open a file first to insert'}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ backgroundColor: currentTheme.ui.accent }}
                      >
                        <ArrowRightToLine size={12} />
                        <span>Insert at Cursor</span>
                      </button>
                    </div>
                  </div>
                  <pre
                    className="flex-1 p-4 overflow-auto font-mono text-[12px] leading-relaxed select-text"
                    style={{ backgroundColor: currentTheme.ui.editorBg }}
                  >
                    <code>{activeSnippet.code}</code>
                  </pre>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[12px] opacity-60">
                  Select a snippet to preview.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
