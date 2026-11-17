import React, { useState, useRef } from 'react';
import { Upload, FolderArchive, FolderOpen, FileCode, X, CheckCircle } from 'lucide-react';
import { CompilloThemeDefinition } from '../../services/themes';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: CompilloThemeDefinition;
  onImportFiles: (files: FileList | File[]) => void;
  onImportZip: (file: File) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onImportFiles,
  onImportZip,
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'folder' | 'zip'>('folder');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedList = Array.from(e.dataTransfer.files);
      const zipFile = droppedList.find((f) => f.name.endsWith('.zip'));
      if (zipFile) {
        onImportZip(zipFile);
        onClose();
        return;
      }
      setSelectedFiles(droppedList);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const list = Array.from(e.target.files).filter((f) => {
        const rel = (f as any).webkitRelativePath || f.name;
        return (
          !rel.includes('/node_modules/') &&
          !rel.includes('/venv/') &&
          !rel.includes('/.venv/') &&
          !rel.includes('/__pycache__/') &&
          !rel.includes('/.git/')
        );
      });
      if (list.length > 0) {
        onImportFiles(list);
        setSelectedFiles([]);
        onClose();
      }
    }
    e.target.value = '';
  };

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportZip(file);
      onClose();
    }
  };

  const handleConfirmImportFiles = () => {
    if (selectedFiles.length > 0) {
      onImportFiles(selectedFiles);
      setSelectedFiles([]);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: currentTheme.ui.sideBarBg,
          borderColor: currentTheme.ui.sideBarBorder,
          color: currentTheme.ui.sideBarFg,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <div className="flex items-center gap-2 font-medium text-[13px]">
            <Upload size={16} className="text-[#007acc]" />
            <span>Import Project into Compillo Workspace</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab switch */}
        <div
          className="flex border-b text-[12px]"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <button
            onClick={() => setActiveTab('folder')}
            className={`flex-1 py-2.5 text-center font-medium transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'folder'
                ? 'border-[#007acc] text-white'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <FolderOpen size={14} />
            <span>Project Folder</span>
          </button>
          <button
            onClick={() => setActiveTab('zip')}
            className={`flex-1 py-2.5 text-center font-medium transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'zip'
                ? 'border-[#007acc] text-white'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <FolderArchive size={14} />
            <span>ZIP Archive</span>
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 py-2.5 text-center font-medium transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'files'
                ? 'border-[#007acc] text-white'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <FileCode size={14} />
            <span>Files</span>
          </button>
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error webkitdirectory is standard in Chromium/Firefox/Safari folder pickers
          webkitdirectory=""
          directory=""
          multiple
          onChange={handleFolderChange}
          className="hidden"
        />
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip"
          onChange={handleZipChange}
          className="hidden"
        />

        {/* Content Body */}
        <div className="p-5 text-[12px] space-y-4">
          {activeTab === 'folder' ? (
            <>
              <div
                onClick={() => folderInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  currentTheme.type === 'light'
                    ? 'border-gray-300 hover:border-[#007acc] hover:bg-blue-50/30'
                    : 'border-white/15 hover:border-[#007acc] hover:bg-[#007acc]/10'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-[#007acc]/20 text-[#38bdf8] flex items-center justify-center mb-3">
                  <FolderOpen size={22} />
                </div>
                <div className="font-semibold text-[13px]">
                  Select a local project folder
                </div>
                <p className="text-[11px] opacity-65 mt-1 max-w-sm">
                  Imports all source files and subfolders (`templates/`, `static/`, `src/`, etc.) directly into Compillo, ready to run via Terminal (`serve 8000` or `python3 app.py &amp;`).
                </p>
                <button
                  type="button"
                  className="mt-4 px-4 py-1.5 rounded-lg bg-[#007acc] hover:bg-[#0069b3] text-white font-medium text-[12px] flex items-center gap-2 shadow-sm transition-colors"
                >
                  <FolderOpen size={14} />
                  <span>Choose Project Folder</span>
                </button>
              </div>
              <div className="flex items-center justify-end pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 rounded-lg transition-colors text-[12px] ${
                    currentTheme.type === 'light'
                      ? 'hover:bg-gray-200 text-gray-700'
                      : 'hover:bg-white/10 text-gray-300'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : activeTab === 'files' ? (
            <>
              {/* Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#007acc] bg-[#007acc]/10 scale-99'
                    : currentTheme.type === 'light'
                    ? 'border-gray-300 hover:border-[#007acc] hover:bg-black/[0.02]'
                    : 'border-white/15 hover:border-[#007acc] hover:bg-white/[0.02]'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-[#007acc]/20 text-[#007acc] flex items-center justify-center mb-3">
                  <Upload size={22} />
                </div>
                <div className="font-semibold text-[13px]">
                  Drop files here or click to browse
                </div>
                <p className="text-[11px] opacity-60 mt-1">
                  Supports code files (Python, Node.js, HTML, CSS, C/C++, Java, JSON, etc.)
                </p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  <div className="text-[11px] font-semibold opacity-70">
                    Selected Files ({selectedFiles.length}):
                  </div>
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded bg-black/20 text-[11px]"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileCode size={13} className="text-[#007acc] shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </div>
                      <span className="text-[10px] opacity-60 shrink-0">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 rounded-lg transition-colors text-[12px] ${
                    currentTheme.type === 'light'
                      ? 'hover:bg-gray-200 text-gray-700'
                      : 'hover:bg-white/10 text-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  disabled={selectedFiles.length === 0}
                  onClick={handleConfirmImportFiles}
                  className="px-4 py-2 rounded-lg text-white font-medium text-[12px] flex items-center gap-2 shadow-md disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 transition-all"
                  style={{ backgroundColor: currentTheme.ui.accent }}
                >
                  <CheckCircle size={14} />
                  <span>Import {selectedFiles.length} File(s)</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* ZIP Import Card */}
              <div
                onClick={() => zipInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  currentTheme.type === 'light'
                    ? 'border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/20'
                    : 'border-white/15 hover:border-emerald-500 hover:bg-emerald-500/5'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                  <FolderArchive size={22} />
                </div>
                <div className="font-semibold text-[13px]">
                  Select a .zip project file to unpack
                </div>
                <p className="text-[11px] opacity-60 mt-1 max-w-xs">
                  All folders, sub-directories, and files inside the ZIP will be extracted directly
                  into your workspace.
                </p>
                <button
                  type="button"
                  className="mt-4 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[12px] flex items-center gap-2 shadow-sm transition-colors"
                >
                  <FolderArchive size={14} />
                  <span>Choose .ZIP File</span>
                </button>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 rounded-lg transition-colors text-[12px] ${
                    currentTheme.type === 'light'
                      ? 'hover:bg-gray-200 text-gray-700'
                      : 'hover:bg-white/10 text-gray-300'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
