import React from 'react';
import {
  FolderTree,
  Search,
  Play,
  Terminal,
  MoreVertical,
  Code2,
  Sparkles,
} from 'lucide-react';
import { CompilloThemeDefinition } from '../../services/themes';
import { ActiveSideBarView } from '../../types';

interface MobileNavBarProps {
  currentTheme: CompilloThemeDefinition;
  isSidebarOpen: boolean;
  activeSideBarView: ActiveSideBarView | null;
  onToggleSidebar: () => void;
  onSelectSideBarView: (view: ActiveSideBarView) => void;
  isPanelOpen: boolean;
  onTogglePanel: () => void;
  onRunCode: () => void;
  onOpenMenu: () => void;
  isMenuOpen: boolean;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  currentTheme,
  isSidebarOpen,
  activeSideBarView,
  onToggleSidebar,
  onSelectSideBarView,
  isPanelOpen,
  onTogglePanel,
  onRunCode,
  onOpenMenu,
  isMenuOpen,
}) => {
  const isLight = currentTheme.type === 'light';

  return (
    <div
      id="compillo-mobile-bottom-nav"
      className="md:hidden flex items-center justify-around h-12 px-2 border-t select-none shrink-0 z-40"
      style={{
        backgroundColor: currentTheme.ui.activityBarBg,
        borderColor: currentTheme.ui.sideBarBorder,
      }}
    >
      {/* Explorer / Files button */}
      <button
        onClick={() => {
          if (isSidebarOpen && activeSideBarView === 'explorer') {
            onToggleSidebar();
          } else {
            onSelectSideBarView('explorer');
          }
        }}
        className={`flex flex-col items-center justify-center flex-1 py-1 rounded transition-colors ${
          isSidebarOpen && activeSideBarView === 'explorer'
            ? isLight
              ? 'text-[#005fb8] font-bold'
              : 'text-sky-400 font-bold'
            : isLight
            ? 'text-gray-600 hover:text-gray-900'
            : 'text-[#888888] hover:text-white'
        }`}
      >
        <FolderTree size={18} />
        <span className="text-[10px] mt-0.5 leading-none">Files</span>
      </button>

      {/* Search button */}
      <button
        onClick={() => {
          if (isSidebarOpen && activeSideBarView === 'search') {
            onToggleSidebar();
          } else {
            onSelectSideBarView('search');
          }
        }}
        className={`flex flex-col items-center justify-center flex-1 py-1 rounded transition-colors ${
          isSidebarOpen && activeSideBarView === 'search'
            ? isLight
              ? 'text-[#005fb8] font-bold'
              : 'text-sky-400 font-bold'
            : isLight
            ? 'text-gray-600 hover:text-gray-900'
            : 'text-[#888888] hover:text-white'
        }`}
      >
        <Search size={18} />
        <span className="text-[10px] mt-0.5 leading-none">Search</span>
      </button>

      {/* Primary Center Action: RUN CODE (Highlight button) */}
      <button
        onClick={onRunCode}
        className="flex items-center justify-center -mt-3.5 w-11 h-11 rounded-full shadow-lg transition-transform active:scale-95 bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
        title="Run Code"
      >
        <Play size={18} fill="currentColor" className="ml-0.5" />
      </button>

      {/* Terminal / Panel button */}
      <button
        onClick={onTogglePanel}
        className={`flex flex-col items-center justify-center flex-1 py-1 rounded transition-colors ${
          isPanelOpen
            ? isLight
              ? 'text-[#005fb8] font-bold'
              : 'text-sky-400 font-bold'
            : isLight
            ? 'text-gray-600 hover:text-gray-900'
            : 'text-[#888888] hover:text-white'
        }`}
      >
        <Terminal size={18} />
        <span className="text-[10px] mt-0.5 leading-none">Terminal</span>
      </button>

      {/* More / Menu Drawer button */}
      <button
        onClick={onOpenMenu}
        className={`flex flex-col items-center justify-center flex-1 py-1 rounded transition-colors ${
          isMenuOpen
            ? isLight
              ? 'text-[#005fb8] font-bold'
              : 'text-sky-400 font-bold'
            : isLight
            ? 'text-gray-600 hover:text-gray-900'
            : 'text-[#888888] hover:text-white'
        }`}
      >
        <MoreVertical size={18} />
        <span className="text-[10px] mt-0.5 leading-none">Menu</span>
      </button>
    </div>
  );
};
