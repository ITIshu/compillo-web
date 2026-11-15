import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  FileCode,
  FilePlus,
  Folder,
  Search,
  Check,
  Code,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { CompilloThemeDefinition } from '../../services/themes';
import { FILE_TYPE_PRESETS, FileTypePreset, findPresetByExtension } from '../../services/fileTemplates';
import { FileNode } from '../../types';

interface NewFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFile: (folderId: string | null, filename: string, initialContent?: string) => void;
  currentTheme: CompilloThemeDefinition;
  files: FileNode[];
  initialFolderId?: string | null;
}

export const NewFileModal: React.FC<NewFileModalProps> = ({
  isOpen,
  onClose,
  onCreateFile,
  currentTheme,
  files,
  initialFolderId = null,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPreset, setSelectedPreset] = useState<FileTypePreset>(FILE_TYPE_PRESETS[0]); // Python by default
  const [filename, setFilename] = useState<string>(FILE_TYPE_PRESETS[0].defaultFilename);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(initialFolderId);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Extract all available folders in workspace
  const folderList = useMemo(() => {
    const list: Array<{ id: string | null; path: string; name: string }> = [
      { id: null, path: '/', name: 'Workspace Root (/)' },
    ];

    const traverse = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'folder') {
          list.push({ id: node.id, path: node.path, name: node.path });
          if (node.children) traverse(node.children);
        }
      }
    };
    traverse(files);
    return list;
  }, [files]);

  useEffect(() => {
    if (isOpen) {
      setTargetFolderId(initialFolderId);
      setSelectedCategory('all');
      // Default to Python preset as prominent option
      const defaultPreset = FILE_TYPE_PRESETS.find((p) => p.id === 'python') || FILE_TYPE_PRESETS[0];
      setSelectedPreset(defaultPreset);
      setFilename(defaultPreset.defaultFilename);
      setSearchQuery('');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, initialFolderId]);

  // When user types a filename, auto-detect extension if matching a preset
  const handleFilenameChange = (val: string) => {
    setFilename(val);
    const dotIndex = val.lastIndexOf('.');
    if (dotIndex > 0) {
      const ext = val.substring(dotIndex + 1);
      const matched = findPresetByExtension(ext);
      if (matched) {
        setSelectedPreset(matched);
      }
    }
  };

  // When user clicks a preset card
  const handleSelectPreset = (preset: FileTypePreset) => {
    setSelectedPreset(preset);
    // If filename has an extension, replace it with preset's extension
    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex > 0) {
      const base = filename.substring(0, dotIndex);
      setFilename(`${base}.${preset.extension}`);
    } else if (filename.trim().length > 0) {
      setFilename(`${filename.trim()}.${preset.extension}`);
    } else {
      setFilename(preset.defaultFilename);
    }
    inputRef.current?.focus();
  };

  const handleCreateWithPreset = (presetToUse: FileTypePreset = selectedPreset) => {
    let finalName = filename.trim();
    if (!finalName) {
      finalName = presetToUse.defaultFilename;
    }

    // Ensure extension exists
    if (!finalName.includes('.')) {
      finalName = `${finalName}.${presetToUse.extension}`;
    }

    const starterContent = presetToUse.getStarterContent(finalName);
    onCreateFile(targetFolderId, finalName, starterContent);
    onClose();
  };

  const handleCreate = () => {
    handleCreateWithPreset(selectedPreset);
  };

  const filteredPresets = useMemo(() => {
    let list = FILE_TYPE_PRESETS;
    if (selectedCategory === 'python') {
      list = list.filter((p) => p.id === 'python');
    } else if (selectedCategory === 'c_cpp') {
      list = list.filter((p) => p.id === 'cpp' || p.id === 'c');
    } else if (selectedCategory === 'java') {
      list = list.filter((p) => p.id === 'java');
    } else if (selectedCategory === 'web') {
      list = list.filter((p) => ['typescript', 'javascript', 'html', 'css'].includes(p.id));
    } else if (selectedCategory === 'data_docs') {
      list = list.filter((p) => ['json', 'sql', 'markdown', 'shell', 'plaintext', 'rust', 'go'].includes(p.id));
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.extension.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  const isLight = currentTheme.type === 'light';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="compillo-new-file-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] transition-all"
        style={{
          backgroundColor: currentTheme.ui.sideBarBg,
          borderColor: currentTheme.ui.sideBarBorder,
          color: currentTheme.ui.sideBarFg,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3.5 sm:px-5 py-3 border-b shrink-0"
          style={{
            borderColor: currentTheme.ui.sideBarBorder,
            backgroundColor: currentTheme.ui.titleBarBg,
          }}
        >
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div
              className="p-1.5 rounded-md"
              style={{ backgroundColor: `${currentTheme.ui.accent}20` }}
            >
              <FilePlus size={18} style={{ color: currentTheme.ui.accent }} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-[13px] sm:text-[14px] leading-tight">Create New File</h3>
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  FREE RUNTIME
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] opacity-70">
                Choose from 15 programming languages with free execution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-md transition-colors ${
              isLight ? 'hover:bg-black/10 text-gray-600' : 'hover:bg-white/10 text-gray-300'
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3 sm:space-y-4 flex-1">
          {/* File Name & Location Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[11px] font-medium tracking-wide uppercase opacity-75 flex items-center gap-1.5">
                <FileCode size={12} />
                File Name
              </label>
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={filename}
                  onChange={(e) => handleFilenameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                    if (e.key === 'Escape') onClose();
                  }}
                  placeholder="e.g. main.py, App.java, script.ts"
                  className={`w-full px-3 py-2 text-[13px] font-mono rounded-lg outline-none border transition-all ${
                    isLight
                      ? 'bg-white border-gray-300 text-gray-900 focus:border-[#005fb8] focus:ring-2 focus:ring-[#005fb8]/20'
                      : 'bg-black/30 border-white/15 text-white focus:border-[#007acc] focus:ring-2 focus:ring-[#007acc]/30'
                  }`}
                />
                <span
                  className="absolute right-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded font-mono"
                  style={{
                    backgroundColor: selectedPreset.badgeColor,
                    color: '#ffffff',
                  }}
                >
                  .{selectedPreset.extension}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium tracking-wide uppercase opacity-75 flex items-center gap-1.5">
                <Folder size={12} />
                Location
              </label>
              <select
                value={targetFolderId || ''}
                onChange={(e) => setTargetFolderId(e.target.value ? e.target.value : null)}
                className={`w-full px-3 py-2 text-[12px] rounded-lg outline-none border transition-all ${
                  isLight
                    ? 'bg-white border-gray-300 text-gray-900 focus:border-[#005fb8]'
                    : 'bg-black/30 border-white/15 text-white focus:border-[#007acc]'
                }`}
              >
                {folderList.map((f) => (
                  <option key={f.id || 'root'} value={f.id || ''}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Type Selection Header & Filter */}
          <div className="space-y-2.5 pt-1">
            {/* Zero Cost Banner */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] ${
                isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <Sparkles size={14} className="text-emerald-500 shrink-0" />
              <span>
                <strong>100% Free Execution:</strong> Every language runs with zero API keys or costs (CPython, GCC/G++, OpenJDK 22, Rust Playground, Go, SQLite3, Bash, TSX).
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] font-medium tracking-wide uppercase opacity-75 flex items-center gap-1.5">
                <Code size={12} />
                Select File Type (15 Languages Supported)
              </span>
              <div className="relative w-full sm:w-48">
                <Search size={12} className="absolute left-2.5 top-2 opacity-50" />
                <input
                  type="text"
                  placeholder="Filter languages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-7 pr-2 py-1 text-[11px] rounded-md outline-none border ${
                    isLight
                      ? 'bg-white border-gray-300 text-gray-900'
                      : 'bg-black/20 border-white/10 text-white'
                  }`}
                />
              </div>
            </div>

            {/* Quick Category / Language Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
              {[
                { id: 'all', label: 'All' },
                { id: 'python', label: '🐍 Python (.py)' },
                { id: 'c_cpp', label: '⚡ C / C++ (.c, .cpp)' },
                { id: 'java', label: '☕ Java (.java)' },
                { id: 'web', label: '🌐 Web (TS/JS/HTML)' },
                { id: 'data_docs', label: '📄 Data & Others' },
              ].map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      if (cat.id === 'python') {
                        const py = FILE_TYPE_PRESETS.find((p) => p.id === 'python');
                        if (py) handleSelectPreset(py);
                      } else if (cat.id === 'c_cpp') {
                        const cpp = FILE_TYPE_PRESETS.find((p) => p.id === 'cpp');
                        if (cpp) handleSelectPreset(cpp);
                      } else if (cat.id === 'java') {
                        const java = FILE_TYPE_PRESETS.find((p) => p.id === 'java');
                        if (java) handleSelectPreset(java);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-full border transition-all ${
                      isActive
                        ? isLight
                          ? 'bg-[#005fb8] text-white border-[#005fb8] shadow-sm font-medium'
                          : 'bg-[#007acc] text-white border-[#007acc] shadow-sm font-medium'
                        : isLight
                        ? 'border-gray-200 bg-black/[0.03] hover:bg-black/[0.07] text-gray-700'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredPresets.map((preset) => {
                const isSelected = selectedPreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    onDoubleClick={() => {
                      handleSelectPreset(preset);
                      handleCreateWithPreset(preset);
                    }}
                    title={`Click to select ${preset.name}, double-click to create immediately`}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all relative ${
                      isSelected
                        ? isLight
                          ? 'border-[#005fb8] bg-[#005fb8]/10 ring-1 ring-[#005fb8]'
                          : 'border-[#007acc] bg-[#007acc]/20 ring-1 ring-[#007acc]'
                        : isLight
                        ? 'border-gray-200 hover:border-gray-300 hover:bg-black/5 bg-white/60'
                        : 'border-white/10 hover:border-white/20 hover:bg-white/5 bg-black/20'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] text-white shrink-0 font-mono shadow-sm"
                      style={{ backgroundColor: preset.badgeColor }}
                    >
                      {preset.extension.toUpperCase().slice(0, 3)}
                    </div>

                    <div className="truncate flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-semibold text-[12px] truncate">{preset.name}</span>
                          <span className="px-1 py-0.2 rounded text-[8.5px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 shrink-0">
                            FREE
                          </span>
                        </div>
                        {isSelected && (
                          <Check size={13} className="text-emerald-500 shrink-0 ml-1" />
                        )}
                      </div>
                      <p className="text-[10px] opacity-70 truncate mt-0.5">
                        .{preset.extension} • {preset.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Starter Code Preview Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                isLight ? 'text-gray-700 hover:text-black' : 'text-gray-300 hover:text-white'
              }`}
            >
              <ChevronRight
                size={14}
                className={`transition-transform ${showPreview ? 'rotate-90' : ''}`}
              />
              <span>Preview starter code for {selectedPreset.name}</span>
            </button>

            {showPreview && (
              <div
                className={`mt-2 p-3 rounded-lg border font-mono text-[11px] max-h-40 overflow-y-auto ${
                  isLight
                    ? 'bg-gray-50 border-gray-200 text-gray-800'
                    : 'bg-black/40 border-white/10 text-gray-200'
                }`}
              >
                <pre className="whitespace-pre-wrap">
                  {selectedPreset.getStarterContent(filename || selectedPreset.defaultFilename)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t shrink-0"
          style={{
            borderColor: currentTheme.ui.sideBarBorder,
            backgroundColor: currentTheme.ui.titleBarBg,
          }}
        >
          <div className="flex items-center gap-1.5 text-[11px] opacity-70">
            <Sparkles size={13} style={{ color: currentTheme.ui.accent }} />
            <span>Includes idiomatic {selectedPreset.name} boilerplate</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-3 py-1.5 text-[12px] rounded-md transition-colors ${
                isLight ? 'hover:bg-black/10 text-gray-700' : 'hover:bg-white/10 text-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-medium rounded-md text-white transition-all shadow-md active:scale-95"
              style={{ backgroundColor: currentTheme.ui.accent }}
            >
              <FilePlus size={14} />
              Create File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
