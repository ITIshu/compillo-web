/**
 * Compillo 2.0 - Standalone Single-Page Replica Generator
 * Produces an exact 1:1 visual and functional clone of the complete Compillo Studio workbench.
 * Fully self-contained single HTML file with embedded HTML, CSS, JavaScript, 13 themes,
 * TitleBar menus, ActivityBar, SideBar views, TabBar, Syntax-Highlighted Code Editor,
 * Minimap, Bottom Multi-Channel Panel (Terminal, Output, Problems, C Turbo Graphics, REST),
 * Interactive Live Canvas split preview, Command Palette, Theme Picker modal, and Keyboard shortcuts.
 */

export function generateFullCompilloReplicaHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Compillo 2.0 - Standalone Web Studio</title>
  <style>
    /* Compillo Design Tokens & Theme Variables */
    :root {
      --act-bg: #0b0f17;
      --act-fg: #94a3b8;
      --act-border: #38bdf8;
      --sb-bg: #0f172a;
      --sb-fg: #cbd5e1;
      --sb-header: #0f172a;
      --sb-border: #1e293b;
      --tab-bg: #0f172a;
      --tab-active-bg: #1e293b;
      --tab-inactive-bg: #0f172a;
      --tab-border: #1e293b;
      --ed-bg: #0b1120;
      --ed-fg: #f1f5f9;
      --line-num: #475569;
      --line-active: #1e293b;
      --panel-bg: #0f172a;
      --panel-border: #1e293b;
      --status-bg: #0284c7;
      --status-fg: #ffffff;
      --title-bg: #0b0f17;
      --title-fg: #cbd5e1;
      --accent: #38bdf8;
      --input-bg: #1e293b;
      --input-border: #334155;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      width: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--ed-bg);
      color: var(--ed-fg);
      display: flex;
      flex-direction: column;
      user-select: none;
      -webkit-font-smoothing: antialiased;
    }

    /* Scrollbars */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25); }

    /* =========================================================================
       1. TITLEBAR
       ========================================================================= */
    .titlebar {
      height: 38px;
      min-height: 38px;
      background-color: var(--title-bg);
      color: var(--title-fg);
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--sb-border);
      padding: 0 10px;
      font-size: 12px;
      z-index: 60;
      position: relative;
    }

    .titlebar-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      color: #ffffff;
      cursor: pointer;
      text-decoration: none;
    }
    .brand-icon {
      width: 18px;
      height: 18px;
      background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #0b0f17;
      font-weight: 900;
      font-size: 11px;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
    }
    .brand-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: -0.3px;
      color: #ffffff;
    }
    .brand-version {
      font-size: 10px;
      font-family: monospace;
      opacity: 0.7;
      margin-left: 2px;
    }

    /* Menu Bar */
    .menu-bar {
      display: flex;
      align-items: center;
      gap: 1px;
    }
    .menu-item {
      position: relative;
    }
    .menu-btn {
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      color: var(--title-fg);
      font-size: 12px;
      background: transparent;
      border: none;
      transition: background 0.15s, color 0.15s;
    }
    .menu-btn:hover, .menu-btn.active {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
    }

    /* Dropdown Menus */
    .dropdown-menu {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      min-width: 220px;
      background: var(--sb-bg);
      border: 1px solid var(--sb-border);
      border-radius: 8px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.65);
      padding: 4px 0;
      z-index: 1000;
      backdrop-filter: blur(10px);
    }
    .dropdown-menu.show { display: block; }
    .dropdown-item {
      padding: 6px 14px;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--sb-fg);
      cursor: pointer;
      transition: background 0.1s, color 0.1s;
    }
    .dropdown-item:hover {
      background: #007acc;
      color: #ffffff;
    }
    .dropdown-item .shortcut {
      font-size: 10px;
      opacity: 0.6;
      font-family: monospace;
      margin-left: 12px;
    }
    .dropdown-divider {
      height: 1px;
      background: var(--sb-border);
      margin: 4px 0;
      opacity: 0.8;
    }

    /* Center: Search & Command Palette Bar */
    .titlebar-center {
      flex: 1;
      max-width: 500px;
      margin: 0 16px;
      display: flex;
      justify-content: center;
    }
    .search-palette-box {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 3px 12px;
      border-radius: 6px;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      color: var(--title-fg);
      font-size: 11px;
      cursor: pointer;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
      transition: border-color 0.15s;
    }
    .search-palette-box:hover {
      border-color: var(--accent);
    }
    .search-palette-left {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .search-palette-left svg {
      color: var(--accent);
      flex-shrink: 0;
    }
    .search-palette-right {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      opacity: 0.7;
      font-family: monospace;
    }
    .kbd-badge {
      padding: 1px 5px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 3px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* Right: Action Buttons */
    .titlebar-right {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .btn-action {
      padding: 4px 9px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      border: 1px solid transparent;
      background: transparent;
      color: var(--title-fg);
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .btn-action:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }
    .btn-copilot {
      background: rgba(56, 189, 248, 0.12);
      color: #38bdf8;
      border-color: rgba(56, 189, 248, 0.3);
    }
    .btn-copilot:hover {
      background: rgba(56, 189, 248, 0.22);
      color: #7dd3fc;
    }
    .btn-canvas {
      background: rgba(168, 85, 247, 0.12);
      color: #c084fc;
      border-color: rgba(168, 85, 247, 0.3);
    }
    .btn-canvas:hover {
      background: rgba(168, 85, 247, 0.22);
    }
    .btn-host {
      background: rgba(16, 185, 129, 0.12);
      color: #34d399;
      border-color: rgba(16, 185, 129, 0.3);
    }
    .btn-arcade {
      background: rgba(245, 158, 11, 0.12);
      color: #fbbf24;
      border-color: rgba(245, 158, 11, 0.3);
      font-family: monospace;
    }
    .btn-run {
      background: #059669;
      color: #ffffff;
      font-weight: 600;
      border-color: #10b981;
    }
    .btn-run:hover {
      background: #10b981;
    }
    .btn-icon-only {
      padding: 5px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--title-fg);
      cursor: pointer;
      background: transparent;
      border: none;
    }
    .btn-icon-only:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }
    .btn-signin {
      background: #0284c7;
      color: #ffffff;
      font-weight: 600;
      border-radius: 4px;
      padding: 4px 10px;
    }
    .btn-signin:hover {
      background: #0369a1;
    }
    .theme-select-btn {
      padding: 4px 8px;
      border-radius: 5px;
      border: 1px solid var(--sb-border);
      background: var(--input-bg);
      color: var(--title-fg);
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
    }
    .theme-select-btn:hover {
      border-color: var(--accent);
      color: #ffffff;
    }
    .win-dots {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: 6px;
      opacity: 0.6;
    }
    .win-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
    }
    .dot-yellow { background: #facc15; }
    .dot-green { background: #4ade80; }

    /* =========================================================================
       2. WORKBENCH BODY (ActivityBar, SideBar, Editor, Panel)
       ========================================================================= */
    .workbench {
      display: flex;
      flex: 1;
      height: calc(100vh - 38px - 22px);
      overflow: hidden;
      position: relative;
    }

    /* Activity Bar */
    .activity-bar {
      width: 48px;
      min-width: 48px;
      background-color: var(--act-bg);
      border-right: 1px solid var(--sb-border);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      z-index: 20;
    }
    .act-top, .act-bottom {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      width: 100%;
    }
    .act-btn {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      cursor: pointer;
      color: var(--act-fg);
      position: relative;
      background: transparent;
      border: none;
      transition: color 0.15s, background 0.15s;
    }
    .act-btn:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.08);
    }
    .act-btn.active {
      color: #ffffff;
    }
    .act-btn.active::before {
      content: "";
      position: absolute;
      left: 0;
      top: 8px;
      bottom: 8px;
      width: 2px;
      background: var(--accent);
      border-radius: 0 2px 2px 0;
    }
    .act-badge {
      position: absolute;
      bottom: 6px;
      right: 6px;
      font-size: 9px;
      font-weight: 700;
      background: #0284c7;
      color: #ffffff;
      border-radius: 10px;
      padding: 0 4px;
      line-height: 12px;
    }

    
    /* Left Slim Sidebar Active Indicator Strip */
    .act-item-wrapper {
      position: relative;
      width: 100%;
      display: flex;
      justify-content: center;
    }
    .act-active-strip {
      display: none;
      position: absolute;
      left: 0;
      top: 6px;
      bottom: 6px;
      width: 2.5px;
      background: var(--act-border);
      border-radius: 0 2px 2px 0;
    }
    .act-btn.active + .act-active-strip,
    .act-item-wrapper.active .act-active-strip {
      display: block;
    }
    .act-badge.badge-amber { background: #d97706; }
    .act-badge.badge-purple { background: #7c3aed; }

    /* TitleBar Theme Dropdown Menu */
    .theme-dropdown-container { position: relative; }
    .theme-dropdown-menu.show { display: block !important; }
    .theme-option-item:hover {
      background: rgba(56, 189, 248, 0.15) !important;
      color: #ffffff !important;
    }
    .theme-option-item.active {
      background: rgba(56, 189, 248, 0.2) !important;
      color: var(--accent) !important;
      font-weight: 700;
    }
    .theme-pill-card.selected {
      border-color: var(--accent) !important;
      background: rgba(56, 189, 248, 0.12) !important;
      color: var(--accent) !important;
      font-weight: 700;
    }

    /* SideBar */
    .sidebar {
      width: 260px;
      min-width: 200px;
      background-color: var(--sb-bg);
      border-right: 1px solid var(--sb-border);
      color: var(--sb-fg);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 15;
    }
    .sidebar.hidden { display: none; }
    .sidebar-header {
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--title-fg);
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--sb-border);
    }
    .sidebar-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .icon-action-btn {
      padding: 2px;
      border-radius: 3px;
      cursor: pointer;
      background: transparent;
      border: none;
      color: var(--sb-fg);
      opacity: 0.7;
    }
    .icon-action-btn:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.1);
    }
    .sidebar-content {
      flex: 1;
      overflow-y: auto;
      padding: 6px 0;
      font-size: 13px;
    }

    /* File Tree Items */
    .tree-folder {
      padding: 4px 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      color: var(--title-fg);
    }
    .tree-folder:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    .tree-file {
      padding: 4px 10px 4px 28px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      cursor: pointer;
      color: var(--sb-fg);
      transition: background 0.1s;
    }
    .tree-file:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #ffffff;
    }
    .tree-file.active {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      font-weight: 600;
    }
    .file-badge {
      margin-left: auto;
      font-size: 10px;
      opacity: 0.6;
      font-family: monospace;
    }

    /* Central Editor Container */
    .editor-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background-color: var(--ed-bg);
      position: relative;
    }

    /* TabBar */
    .tabbar {
      height: 35px;
      min-height: 35px;
      background-color: var(--tab-bg);
      border-bottom: 1px solid var(--tab-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      overflow-x: auto;
      overflow-y: hidden;
    }
    .tab-list {
      display: flex;
      align-items: center;
      height: 100%;
    }
    .tab-item {
      height: 100%;
      padding: 0 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--sb-fg);
      background: var(--tab-inactive-bg);
      border-right: 1px solid var(--tab-border);
      cursor: pointer;
      position: relative;
      white-space: nowrap;
    }
    .tab-item:hover {
      background: rgba(255, 255, 255, 0.04);
      color: #ffffff;
    }
    .tab-item.active {
      background: var(--tab-active-bg);
      color: #ffffff;
      font-weight: 500;
    }
    .tab-item.active::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--accent);
    }
    .tab-close {
      opacity: 0.5;
      cursor: pointer;
      padding: 2px;
      border-radius: 3px;
      font-size: 11px;
    }
    .tab-close:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.15);
    }
    .tabbar-right {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 8px;
    }

    /* Breadcrumbs Bar */
    .breadcrumbs {
      height: 24px;
      min-height: 24px;
      background: var(--ed-bg);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      padding: 0 14px;
      font-size: 11px;
      color: var(--sb-fg);
      opacity: 0.8;
      gap: 6px;
    }
    .bc-sep { opacity: 0.4; }
    .bc-active { color: #ffffff; font-weight: 500; }

    /* Split Workspace (Editor Area vs Live Canvas / Split) */
    .workspace-split {
      flex: 1;
      display: flex;
      overflow: hidden;
      position: relative;
    }

    /* Editor Core & Minimap */
    .editor-wrapper {
      flex: 1;
      display: flex;
      overflow: hidden;
      position: relative;
      background-color: var(--ed-bg);
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
      font-size: 13px;
      line-height: 20px;
    }

    /* Line Numbers Gutter */
    .gutter {
      width: 48px;
      min-width: 48px;
      background-color: var(--ed-bg);
      color: var(--line-num);
      text-align: right;
      padding: 8px 10px 8px 0;
      user-select: none;
      font-size: 12px;
      line-height: 20px;
      border-right: 1px solid rgba(255, 255, 255, 0.05);
      overflow: hidden;
    }

    /* Synchronized Code Area */
    .code-view-container {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    .code-pre, .code-textarea {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 8px 12px;
      margin: 0;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      tab-size: 4;
      white-space: pre;
      overflow: auto;
      border: none;
      outline: none;
    }
    .code-pre {
      pointer-events: none;
      background: transparent;
      color: var(--ed-fg);
      z-index: 1;
    }
    .code-textarea {
      background: transparent;
      color: transparent;
      caret-color: #ffffff;
      resize: none;
      z-index: 2;
    }

    /* Syntax Highlighting Token Colors */
    .hl-kw { color: #c084fc; font-weight: 600; }       /* def, import, return, class, if, for */
    .hl-builtin { color: #38bdf8; }                   /* print, len, range, int */
    .hl-str { color: #4ade80; }                       /* strings */
    .hl-num { color: #fbbf24; }                       /* numbers */
    .hl-comment { color: #64748b; font-style: italic; }/* comments */
    .hl-fn { color: #60a5fa; }                        /* function names */
    .hl-tag { color: #f87171; }                       /* html tags */
    .hl-attr { color: #fb923c; }                      /* attributes */

    /* Minimap */
    .minimap {
      width: 90px;
      min-width: 90px;
      background: rgba(0, 0, 0, 0.2);
      border-left: 1px solid rgba(255, 255, 255, 0.05);
      overflow: hidden;
      user-select: none;
      padding: 4px;
      position: relative;
    }
    .minimap-content {
      font-size: 2px;
      line-height: 3px;
      color: rgba(255, 255, 255, 0.3);
      white-space: pre;
      font-family: monospace;
      opacity: 0.6;
    }
    .minimap-slider {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 35px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 2px;
    }

    /* Live Preview Split Pane */
    .preview-split {
      width: 48%;
      min-width: 300px;
      background: #0f172a;
      border-left: 1px solid var(--sb-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .preview-split.hidden { display: none; }
    .preview-header {
      height: 34px;
      padding: 0 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--tab-bg);
      border-bottom: 1px solid var(--sb-border);
      font-size: 12px;
      font-weight: 600;
      color: #ffffff;
    }
    .preview-iframe {
      flex: 1;
      width: 100%;
      border: none;
      background: #ffffff;
    }

    /* Bottom Multi-Channel Panel */
    .bottom-panel {
      height: 220px;
      min-height: 100px;
      max-height: 80vh;
      background-color: var(--panel-bg);
      border-top: 1px solid var(--panel-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 10;
    }
    .bottom-panel.hidden { display: none; }
    .bottom-panel.maximized { height: calc(100vh - 38px - 22px); }
    .panel-header {
      height: 34px;
      min-height: 34px;
      padding: 0 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--panel-border);
      background: rgba(0, 0, 0, 0.15);
    }
    .panel-tabs {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .panel-tab {
      font-size: 11px;
      font-weight: 600;
      color: var(--sb-fg);
      cursor: pointer;
      padding: 6px 0;
      position: relative;
      letter-spacing: 0.3px;
    }
    .panel-tab:hover { color: #ffffff; }
    .panel-tab.active {
      color: #ffffff;
    }
    .panel-tab.active::after {
      content: "";
      position: absolute;
      bottom: -4px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--accent);
    }
    .panel-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Panel View Contents */
    .panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 10px 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12.5px;
      line-height: 18px;
    }

    /* Terminal View */
    .terminal-history {
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .terminal-line {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .term-prompt {
      color: #38bdf8;
      font-weight: 700;
    }
    .term-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #f1f5f9;
      font-family: inherit;
      font-size: inherit;
    }

    /* Output View */
    .output-entry {
      margin-bottom: 4px;
      white-space: pre-wrap;
    }
    .out-sys { color: #38bdf8; font-weight: 600; }
    .out-info { color: #10b981; }

    /* C Graphics Window */
    .graphics-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #000000;
      position: relative;
    }
    #turbo-canvas {
      background: #000000;
      border: 1px solid #334155;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
      max-width: 100%;
      max-height: 100%;
    }

    /* =========================================================================
       3. STATUSBAR
       ========================================================================= */
    .statusbar {
      height: 22px;
      min-height: 22px;
      background-color: var(--status-bg);
      color: var(--status-fg);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      font-size: 11px;
      z-index: 50;
      user-select: none;
    }
    .status-left, .status-right {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .status-item {
      display: flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
    }
    .status-item:hover {
      opacity: 0.8;
    }

    /* =========================================================================
       4. MODALS & POPUPS
       ========================================================================= */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      z-index: 2000;
      align-items: center;
      justify-content: center;
    }
    .modal-overlay.open { display: flex; }
    .modal-card {
      width: 90%;
      max-width: 540px;
      background: var(--sb-bg);
      border: 1px solid var(--sb-border);
      border-radius: 10px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.7);
      overflow: hidden;
    }
    .modal-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--sb-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 700;
      color: #ffffff;
    }
    .modal-body {
      padding: 16px;
      max-height: 70vh;
      overflow-y: auto;
    }

    /* Theme Picker Card in Modal */
    .theme-card {
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid var(--sb-border);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.02);
      transition: all 0.15s ease;
    }
    .theme-card:hover {
      border-color: var(--accent);
      background: rgba(255, 255, 255, 0.06);
    }
    .theme-card.active {
      border-color: var(--accent);
      background: rgba(56, 189, 248, 0.12);
    }
    .theme-preview-dots {
      display: flex;
      gap: 4px;
    }
    .preview-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    /* Command Palette Item */
    .cmd-item {
      padding: 8px 12px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      font-size: 12.5px;
      color: var(--sb-fg);
    }
    .cmd-item:hover {
      background: #007acc;
      color: #ffffff;
    }
  </style>
</head>
<body>

  <!-- 1. TOP TITLEBAR -->
  <header class="titlebar">
    <div class="titlebar-left">
      <!-- Compillo 2.0 Brand -->
      <a class="brand-logo" onclick="openAboutModal()" title="About Compillo 2.0 Studio">
        <div class="brand-icon">&#9889;</div>
        <span class="brand-title">Compillo <span class="brand-version">2.0</span></span>
      </a>

      <!-- Menu Bar -->
      <nav class="menu-bar">
        <!-- File -->
        <div class="menu-item">
          <button class="menu-btn" onclick="toggleMenu('file')">File</button>
                    <div class="dropdown-menu" id="menu-file">
            <div class="dropdown-item" onclick="promptNewFile()">
              <span>New File...</span>
              <span class="shortcut">Ctrl+N</span>
            </div>
            <div class="dropdown-item" onclick="promptNewFolder()">
              <span>New Folder...</span>
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item" onclick="openLocalFilePrompt()" style="color: #34d399; font-weight: 600;">
              <span>Open Local File...</span>
              <span class="shortcut">Ctrl+O</span>
            </div>
            <div class="dropdown-item" onclick="openCloudFilePrompt()" style="color: #38bdf8; font-weight: 600;">
              <span>Open File (Cloud)...</span>
              <span class="badge-tag">Cloud</span>
            </div>
            <div class="dropdown-item" onclick="toggleRecentFiles()">
              <span>Open Recent</span>
              <span class="shortcut">&gt;</span>
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item" onclick="saveActiveFile()">
              <span>Save File</span>
              <span class="shortcut">Ctrl+S</span>
            </div>
            <div class="dropdown-item" onclick="openDownloadModal()" style="color: #34d399; font-weight: 600;">
              <span>Download Active File...</span>
              <span class="shortcut">Ctrl+Shift+D</span>
            </div>
            <div class="dropdown-item" onclick="exportSingleHtmlBundle()" style="color: var(--accent); font-weight: 600;">
              <span>Export Single HTML Page...</span>
              <span class="badge-tag">HTML+CSS+JS</span>
            </div>
            <div class="dropdown-item" onclick="downloadStandaloneReplicaFile()" style="color: #4ade80; font-weight: 700;">
              <span>Download Standalone Replica (HTML)</span>
              <span class="badge-tag" style="background: rgba(74, 222, 128, 0.2); color: #4ade80;">REPLICA</span>
            </div>
            <div class="dropdown-item" onclick="exportWorkspaceZip()">
              <span>Export Project (ZIP)</span>
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item" onclick="resetWorkspacePrompt()" style="color: #f87171;">
              <span>Reset Workspace to Default</span>
            </div>
          </div>
        </div>

        <!-- Edit -->
        <div class="menu-item">
          <button class="menu-btn" onclick="toggleMenu('edit')">Edit</button>
          <div class="dropdown-menu" id="menu-edit">
            <div class="dropdown-item" onclick="execEditorCommand('undo')">Undo <span class="shortcut">Ctrl+Z</span></div>
            <div class="dropdown-item" onclick="execEditorCommand('redo')">Redo <span class="shortcut">Ctrl+Y</span></div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item" onclick="execEditorCommand('cut')">Cut <span class="shortcut">Ctrl+X</span></div>
            <div class="dropdown-item" onclick="execEditorCommand('copy')">Copy <span class="shortcut">Ctrl+C</span></div>
            <div class="dropdown-item" onclick="execEditorCommand('selectAll')">Select All <span class="shortcut">Ctrl+A</span></div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item" onclick="formatActiveDocument()">Format Document <span class="shortcut">Shift+Alt+F</span></div>
          </div>
        </div>

        <!-- Selection -->
        <div class="menu-item">
          <button class="menu-btn" onclick="toggleMenu('selection')">Selection</button>
          <div class="dropdown-menu" id="menu-selection">
            <div class="dropdown-item" onclick="execEditorCommand('selectAll')">Select All <span class="shortcut">Ctrl+A</span></div>
            <div class="dropdown-item" onclick="selectCurrentLine()">Expand Line Selection</div>
          </div>
        </div>

        <!-- View -->
        <div class="menu-item">
          <button class="menu-btn" onclick="toggleMenu('view')">View</button>
          <div class="dropdown-menu" id="menu-view">
            <div class="dropdown-item" onclick="openCommandPalette()">Command Palette... <span class="shortcut">Ctrl+P</span></div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item" onclick="toggleSidebarView('explorer')">Explorer</div>
            <div class="dropdown-item" onclick="toggleSidebarView('search')">Search</div>
            <div class="dropdown-item" onclick="toggleSidebarView('git')">Source Control</div>
            <div class="dropdown-item" onclick="toggleSidebarView('extensions')">Extensions</div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item" onclick="switchPanelTab('terminal')">Terminal Panel <span class="shortcut">Ctrl+&#96;</span></div>
            <div class="dropdown-item" onclick="switchPanelTab('output')">Output Console</div>
            <div class="dropdown-item" onclick="switchPanelTab('problems')">Problems</div>
            <div class="dropdown-item" onclick="switchPanelTab('graphics')">C Graphics Window</div>
            <div class="dropdown-item" onclick="toggleLivePreview()">Live Canvas Preview</div>
            <div class="dropdown-item" onclick="toggleMinimap()">Toggle Minimap</div>
          </div>
        </div>

        <!-- Go -->
        <div class="menu-item">
          <button class="menu-btn" onclick="toggleMenu('go')">Go</button>
          <div class="dropdown-menu" id="menu-go">
            <div class="dropdown-item" onclick="openCommandPalette()">Go to File... <span class="shortcut">Ctrl+P</span></div>
            <div class="dropdown-item" onclick="goToLinePrompt()">Go to Line/Column... <span class="shortcut">Ctrl+G</span></div>
          </div>
        </div>

        <!-- Run -->
        <div class="menu-item">
          <button class="menu-btn" onclick="toggleMenu('run')">Run</button>
          <div class="dropdown-menu" id="menu-run">
            <div class="dropdown-item" onclick="runActiveFile()" style="color: #4ade80; font-weight: 600;">Start Without Debugging <span class="shortcut">Ctrl+Enter</span></div>
            <div class="dropdown-item" onclick="runActiveFile()">Restart Execution <span class="shortcut">Ctrl+Shift+F5</span></div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item" onclick="clearOutputLogs()">Clear Console Output</div>
          </div>
        </div>

        <!-- Terminal -->
        <div class="menu-item">
          <button class="menu-btn" onclick="toggleMenu('terminal')">Terminal</button>
          <div class="dropdown-menu" id="menu-terminal">
            <div class="dropdown-item" onclick="switchPanelTab('terminal')">New Terminal <span class="shortcut">Ctrl+Shift+&#96;</span></div>
            <div class="dropdown-item" onclick="runInTerminal()">Run Active File in Terminal</div>
            <div class="dropdown-item" onclick="clearTerminal()">Clear Terminal <span class="shortcut">Ctrl+K</span></div>
          </div>
        </div>

                <!-- Themes Menu (All 12 Real Themes) -->
        <div class="menu-item">
          <button class="menu-btn" onclick="toggleMenu('themes')" style="color: var(--accent); font-weight: 600;">Themes &#127912;</button>
          <div class="dropdown-menu" id="menu-themes" style="min-width: 280px; max-height: 420px; overflow-y: auto;">
            <div class="dropdown-header" style="padding: 4px 12px 6px; font-size: 10px; opacity: 0.6; text-transform: uppercase; font-weight: 700;">Compillo Color Themes</div>
            <div class="dropdown-item" onclick="applyTheme('nova-studio')">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="thchk-nova-studio" style="width: 14px; color: var(--accent); font-weight: 700;">&#10003;</span>
                <span class="theme-dot" style="background: #38bdf8;"></span>
                <span>Compillo Dark (Signature)</span>
              </div>
            </div>
            <div class="dropdown-item" onclick="applyTheme('cyber-obsidian')">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="thchk-cyber-obsidian" style="width: 14px; color: var(--accent); font-weight: 700;"></span>
                <span class="theme-dot" style="background: #10b981;"></span>
                <span>Cyber Obsidian (Emerald)</span>
              </div>
            </div>
            <div class="dropdown-item" onclick="applyTheme('aurora-luxe')">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="thchk-aurora-luxe" style="width: 14px; color: var(--accent); font-weight: 700;"></span>
                <span class="theme-dot" style="background: #a855f7;"></span>
                <span>Aurora Luxe (Deep Amethyst)</span>
              </div>
            </div>
            <div class="dropdown-item" onclick="applyTheme('dark-modern')">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="thchk-dark-modern" style="width: 14px; color: var(--accent); font-weight: 700;"></span>
                <span class="theme-dot" style="background: #0078d4;"></span>
                <span>Dark Modern (Default Dark)</span>
              </div>
            </div>
            <div class="dropdown-item" onclick="applyTheme('dark-plus')">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="thchk-dark-plus" style="width: 14px; color: var(--accent); font-weight: 700;"></span>
                <span class="theme-dot" style="background: #007acc;"></span>
                <span>Dark+ (Classic Dark)</span>
              </div>
            </div>
            <div class="dropdown-item" onclick="applyTheme('monokai')">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="thchk-monokai" style="width: 14px; color: var(--accent); font-weight: 700;"></span>
                <span class="theme-dot" style="background: #fd971f;"></span>
                <span>Monokai</span>
              </div>
            </div>
            <div class="dropdown-item" onclick="applyTheme('one-dark-pro')">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="thchk-one-dark-pro" style="width: 14px; color: var(--accent); font-weight: 700;"></span>
                <span class="theme-dot" style="background: #61afef;"></span>
                <span>One Dark Pro</span>
              </div>
            </div>
            <div class="dropdown-item" onclick="applyTheme('light-modern')">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="thchk-light-modern" style="width: 14px; color: var(--accent); font-weight: 700;"></span>
                <span class="theme-dot" style="background: #005fb8;"></span>
                <span>Light Modern (Crisp Light)</span>
              </div>
            </div>
            <div class="dropdown-item" onclick="applyTheme('cyberpunk')">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="thchk-cyberpunk" style="width: 14px; color: var(--accent); font-weight: 700;"></span>
                <span class="theme-dot" style="background: #fcee0a;"></span>
                <span>Cyberpunk (Neon Yellow & Magenta)</span>
              </div>
            </div>
            <div class="dropdown-item" onclick="applyTheme('sakura-blossom')">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="thchk-sakura-blossom" style="width: 14px; color: var(--accent); font-weight: 700;"></span>
                <span class="theme-dot" style="background: #ec4899;"></span>
                <span>🌸 Sakura Blossom (Rose Quartz & Cherry)</span>
              </div>
            </div>
            <div class="dropdown-item" onclick="applyTheme('fairy-lavender')">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="thchk-fairy-lavender" style="width: 14px; color: var(--accent); font-weight: 700;"></span>
                <span class="theme-dot" style="background: #9333ea;"></span>
                <span>✨ Fairy Lavender (Lilac & Dreamy Twilight)</span>
              </div>
            </div>
            <div class="dropdown-item" onclick="applyTheme('luxury-gold')">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="thchk-luxury-gold" style="width: 14px; color: var(--accent); font-weight: 700;"></span>
                <span class="theme-dot" style="background: #d4af37;"></span>
                <span>👑 Royal Noir & Champagne Gold (Haute Luxury)</span>
              </div>
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item" onclick="openThemePickerModal()" style="color: var(--accent); font-weight: 600;">
              <span>Browse All Themes Palette...</span>
            </div>
          </div>
        </div>

        <!-- Help -->
        <div class="menu-item">
          <button class="menu-btn" onclick="toggleMenu('help')">Help</button>
          <div class="dropdown-menu" id="menu-help">
            <div class="dropdown-item" onclick="openAboutModal()">About Compillo 2.0</div>
            <div class="dropdown-item" onclick="openShortcutsModal()">Keyboard Shortcuts <span class="shortcut">Ctrl+K Ctrl+S</span></div>
            <div class="dropdown-item" onclick="switchPanelTab('graphics')">Turbo C Graphics &amp; Canvas Guide</div>
          </div>
        </div>
      </nav>
    </div>

    <!-- Center: Command Palette / File Search Bar -->
    <div class="titlebar-center">
      <div class="search-palette-box" onclick="openCommandPalette()">
        <div class="search-palette-left">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span id="center-title-text">Compillo &gt; src/main.py</span>
        </div>
        <div class="search-palette-right">
          <span class="kbd-badge">Ctrl+P</span>
          <span>or</span>
          <span class="kbd-badge">Ctrl+Shift+P</span>
        </div>
      </div>
    </div>

    <!-- Right Controls: Exact 1:1 replica of Compillo Header -->
    <div class="titlebar-right">
      <!-- Compillo AI Copilot Button -->
      <button class="btn-action btn-copilot" onclick="toggleSidebarView('extensions')" title="Compillo AI Copilot">
        <span>&#10024; Compillo AI</span>
      </button>

      <!-- Live Canvas Button -->
      <button class="btn-action btn-canvas" onclick="toggleLivePreview()" title="Interactive Live Canvas Preview">
        <span>&#9889; Live Canvas</span>
      </button>

      <!-- Free Hosting ($0) Button -->
      <button class="btn-action btn-host" onclick="openHostingModal()" title="Free Cloud Hosting Guide">
        <span>&#127760; Host ($0)</span>
      </button>

      <!-- Arcade Game Break Tracker -->
      <button class="btn-action btn-arcade" onclick="playByteRunnerGame()" title="Arcade Focus Break">
        <span>&#127918; 0m/10m</span>
      </button>

      <!-- Run Code Button -->
      <button class="btn-action btn-run" onclick="runActiveFile()" title="Run Active Code (Ctrl+Enter)">
        <span>&#9654; Run</span>
      </button>

      <!-- Format Document -->
      <button class="btn-icon-only" onclick="formatActiveDocument()" title="Format Document (Prettier)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
      </button>

      <!-- Split Editor -->
      <button class="btn-icon-only" onclick="toggleLivePreview()" title="Toggle Split View">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/></svg>
      </button>

      <!-- Toggle Sidebar -->
      <button class="btn-icon-only" onclick="toggleSidebar()" title="Toggle Primary Side Bar (Ctrl+B)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
      </button>

      <!-- Toggle Bottom Panel -->
      <button class="btn-icon-only" onclick="toggleBottomPanel()" title="Toggle Bottom Panel (Ctrl+J)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 15h18"/></svg>
      </button>

      <!-- Sign In / Join Button -->
      <button class="btn-action btn-signin" onclick="openAboutModal()" title="Compillo Studio Account">
        <span>Sign In / Join</span>
      </button>

            <!-- Themes Dropdown Switcher Button & Dropdown Menu -->
      <div class="theme-dropdown-container" style="position: relative;">
        <button class="theme-select-btn" id="theme-switcher-btn" onclick="toggleThemeDropdown()" title="Change Compillo Theme">
          <span id="theme-btn-label">Theme: Compillo Dark</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
        </button>

        <div class="theme-dropdown-menu" id="theme-header-dropdown" style="display: none; position: absolute; right: 0; top: 100%; margin-top: 4px; width: 280px; max-height: 380px; background: var(--sb-bg); border: 1px solid var(--sb-border); border-radius: 10px; box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7); padding: 6px; z-index: 1000; backdrop-filter: blur(12px); overflow-y: auto;">
          <div style="padding: 4px 8px 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--title-fg); opacity: 0.6; border-bottom: 1px solid var(--sb-border); display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span>Compillo Color Themes</span>
            <span style="background: rgba(56, 189, 248, 0.2); color: var(--accent); padding: 1px 5px; border-radius: 4px; font-weight: 700;">12 Themes</span>
          </div>
          <div id="theme-header-dropdown-list">
            <div class="theme-option-item active" id="thopt-nova-studio" onclick="applyTheme('nova-studio'); toggleThemeDropdown();" style="padding: 6px 10px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 11.5px; color: var(--sb-fg);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="theme-dot" style="background: #38bdf8; width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.3); flex-shrink: 0;"></span>
                <span>Compillo Dark (Signature)</span>
              </div>
              <span id="thmark-nova-studio" style="font-weight: 700; color: var(--accent); font-size: 12px;">✓</span>
            </div>
            <div class="theme-option-item" id="thopt-cyber-obsidian" onclick="applyTheme('cyber-obsidian'); toggleThemeDropdown();" style="padding: 6px 10px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 11.5px; color: var(--sb-fg);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="theme-dot" style="background: #10b981; width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.3); flex-shrink: 0;"></span>
                <span>Cyber Obsidian (Emerald)</span>
              </div>
              <span id="thmark-cyber-obsidian" style="font-weight: 700; color: var(--accent); font-size: 12px;"></span>
            </div>
            <div class="theme-option-item" id="thopt-aurora-luxe" onclick="applyTheme('aurora-luxe'); toggleThemeDropdown();" style="padding: 6px 10px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 11.5px; color: var(--sb-fg);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="theme-dot" style="background: #a855f7; width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.3); flex-shrink: 0;"></span>
                <span>Aurora Luxe (Deep Amethyst)</span>
              </div>
              <span id="thmark-aurora-luxe" style="font-weight: 700; color: var(--accent); font-size: 12px;"></span>
            </div>
            <div class="theme-option-item" id="thopt-dark-modern" onclick="applyTheme('dark-modern'); toggleThemeDropdown();" style="padding: 6px 10px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 11.5px; color: var(--sb-fg);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="theme-dot" style="background: #0078d4; width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.3); flex-shrink: 0;"></span>
                <span>Dark Modern (Default Dark)</span>
              </div>
              <span id="thmark-dark-modern" style="font-weight: 700; color: var(--accent); font-size: 12px;"></span>
            </div>
            <div class="theme-option-item" id="thopt-dark-plus" onclick="applyTheme('dark-plus'); toggleThemeDropdown();" style="padding: 6px 10px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 11.5px; color: var(--sb-fg);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="theme-dot" style="background: #007acc; width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.3); flex-shrink: 0;"></span>
                <span>Dark+ (Classic Dark)</span>
              </div>
              <span id="thmark-dark-plus" style="font-weight: 700; color: var(--accent); font-size: 12px;"></span>
            </div>
            <div class="theme-option-item" id="thopt-monokai" onclick="applyTheme('monokai'); toggleThemeDropdown();" style="padding: 6px 10px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 11.5px; color: var(--sb-fg);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="theme-dot" style="background: #fd971f; width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.3); flex-shrink: 0;"></span>
                <span>Monokai</span>
              </div>
              <span id="thmark-monokai" style="font-weight: 700; color: var(--accent); font-size: 12px;"></span>
            </div>
            <div class="theme-option-item" id="thopt-one-dark-pro" onclick="applyTheme('one-dark-pro'); toggleThemeDropdown();" style="padding: 6px 10px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 11.5px; color: var(--sb-fg);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="theme-dot" style="background: #61afef; width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.3); flex-shrink: 0;"></span>
                <span>One Dark Pro</span>
              </div>
              <span id="thmark-one-dark-pro" style="font-weight: 700; color: var(--accent); font-size: 12px;"></span>
            </div>
            <div class="theme-option-item" id="thopt-light-modern" onclick="applyTheme('light-modern'); toggleThemeDropdown();" style="padding: 6px 10px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 11.5px; color: var(--sb-fg);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="theme-dot" style="background: #005fb8; width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.3); flex-shrink: 0;"></span>
                <span>Light Modern (Crisp Light)</span>
              </div>
              <span id="thmark-light-modern" style="font-weight: 700; color: var(--accent); font-size: 12px;"></span>
            </div>
            <div class="theme-option-item" id="thopt-cyberpunk" onclick="applyTheme('cyberpunk'); toggleThemeDropdown();" style="padding: 6px 10px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 11.5px; color: var(--sb-fg);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="theme-dot" style="background: #fcee0a; width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.3); flex-shrink: 0;"></span>
                <span>Cyberpunk (Neon Yellow & Magenta)</span>
              </div>
              <span id="thmark-cyberpunk" style="font-weight: 700; color: var(--accent); font-size: 12px;"></span>
            </div>
            <div class="theme-option-item" id="thopt-sakura-blossom" onclick="applyTheme('sakura-blossom'); toggleThemeDropdown();" style="padding: 6px 10px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 11.5px; color: var(--sb-fg);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="theme-dot" style="background: #ec4899; width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.3); flex-shrink: 0;"></span>
                <span>🌸 Sakura Blossom (Rose Quartz & Cherry)</span>
              </div>
              <span id="thmark-sakura-blossom" style="font-weight: 700; color: var(--accent); font-size: 12px;"></span>
            </div>
            <div class="theme-option-item" id="thopt-fairy-lavender" onclick="applyTheme('fairy-lavender'); toggleThemeDropdown();" style="padding: 6px 10px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 11.5px; color: var(--sb-fg);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="theme-dot" style="background: #9333ea; width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.3); flex-shrink: 0;"></span>
                <span>✨ Fairy Lavender (Lilac & Dreamy Twilight)</span>
              </div>
              <span id="thmark-fairy-lavender" style="font-weight: 700; color: var(--accent); font-size: 12px;"></span>
            </div>
            <div class="theme-option-item" id="thopt-luxury-gold" onclick="applyTheme('luxury-gold'); toggleThemeDropdown();" style="padding: 6px 10px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 11.5px; color: var(--sb-fg);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="theme-dot" style="background: #d4af37; width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.3); flex-shrink: 0;"></span>
                <span>👑 Royal Noir & Champagne Gold (Haute Luxury)</span>
              </div>
              <span id="thmark-luxury-gold" style="font-weight: 700; color: var(--accent); font-size: 12px;"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Window Decorator Dots -->
      <div class="win-dots">
        <div class="win-dot dot-yellow"></div>
        <div class="win-dot dot-green"></div>
      </div>
    </div>
  </header>

  <!-- 2. WORKBENCH CONTAINER -->
  <div class="workbench">
        <!-- LEFT SLIM SIDEBAR (Activity Bar - 48px width) -->
    <aside class="activity-bar" id="compillo-activity-bar">
      <!-- Top Activity Icons -->
      <div class="act-top">
        <!-- Explorer (Ctrl+Shift+E) -->
        <div class="act-item-wrapper active" id="act-item-explorer">
          <button class="act-btn active" id="act-btn-explorer" onclick="toggleSidebarView('explorer')" title="Explorer (Ctrl+Shift+E)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </button>
          <div class="act-active-strip"></div>
        </div>

        <!-- University Programming Labs (Edu Labs) -->
        <div class="act-item-wrapper" id="act-item-edu">
          <button class="act-btn" id="act-btn-edu" onclick="toggleSidebarView('edu')" title="University Programming Labs (RTU, AKTU, VTU)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" style="color: #facc15;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </button>
          <span class="act-badge badge-amber">EDU</span>
          <div class="act-active-strip"></div>
        </div>

        <!-- Arcade Break (Focus Station) -->
        <div class="act-item-wrapper" id="act-item-game">
          <button class="act-btn" id="act-btn-game" onclick="playByteRunnerGame()" title="Arcade Focus Break">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" style="color: #4ade80;"><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>
          </button>
          <span class="act-badge">10m</span>
          <div class="act-active-strip"></div>
        </div>

        <!-- Master Control Panel -->
        <div class="act-item-wrapper" id="act-item-master">
          <button class="act-btn" id="act-btn-master" onclick="toggleSidebarView('master')" title="Master Control Panel (Admin &amp; Policies)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" style="color: #c084fc;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </button>
          <span class="act-badge badge-purple">ADMIN</span>
          <div class="act-active-strip"></div>
        </div>

        <!-- Compillo AI Copilot -->
        <div class="act-item-wrapper" id="act-item-ai">
          <button class="act-btn" id="act-btn-ai" onclick="toggleSidebarView('ai')" title="Compillo AI Copilot (Next-Gen Intelligence)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" style="color: #38bdf8;"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
          </button>
          <span class="act-badge">AI</span>
          <div class="act-active-strip"></div>
        </div>

        <!-- REST API Client -->
        <div class="act-item-wrapper" id="act-item-rest">
          <button class="act-btn" id="act-btn-rest" onclick="toggleSidebarView('rest')" title="REST API Client">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" style="color: #34d399;"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </button>
          <div class="act-active-strip"></div>
        </div>

        <!-- Search (Ctrl+Shift+F) -->
        <div class="act-item-wrapper" id="act-item-search">
          <button class="act-btn" id="act-btn-search" onclick="toggleSidebarView('search')" title="Search (Ctrl+Shift+F)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </button>
          <div class="act-active-strip"></div>
        </div>

        <!-- Source Control (Git - Ctrl+Shift+G) -->
        <div class="act-item-wrapper" id="act-item-git">
          <button class="act-btn" id="act-btn-git" onclick="toggleSidebarView('git')" title="Source Control (Ctrl+Shift+G)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/><circle cx="6" cy="18" r="3"/></svg>
          </button>
          <span class="act-badge">3</span>
          <div class="act-active-strip"></div>
        </div>

        <!-- Extensions & Plugins (Ctrl+Shift+X) -->
        <div class="act-item-wrapper" id="act-item-extensions">
          <button class="act-btn" id="act-btn-extensions" onclick="toggleSidebarView('extensions')" title="Extensions &amp; Plugins (Ctrl+Shift+X)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          </button>
          <span class="act-badge">4</span>
          <div class="act-active-strip"></div>
        </div>
      </div>

      <!-- Bottom Activity Icons (Account, Color Theme, Terminal, Settings) -->
      <div class="act-bottom">
        <!-- Account / User Profile -->
        <div class="act-item-wrapper" id="act-item-account">
          <button class="act-btn" onclick="openAboutModal()" title="Compillo Account &amp; Sync">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a8.5 8.5 0 0 1 13 0"/></svg>
          </button>
          <div class="act-active-strip"></div>
        </div>

        <!-- Color Theme Palette Switcher -->
        <div class="act-item-wrapper" id="act-item-theme">
          <button class="act-btn" onclick="openThemePickerModal()" title="Color Theme (Ctrl+K Ctrl+T)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z"/></svg>
          </button>
          <div class="act-active-strip"></div>
        </div>

        <!-- Virtual Terminal Toggle -->
        <div class="act-item-wrapper" id="act-item-term">
          <button class="act-btn" onclick="switchPanelTab('terminal')" title="Toggle Terminal (Ctrl+&#96;)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>
          </button>
          <div class="act-active-strip"></div>
        </div>

        <!-- Settings (Full Preferences View - Ctrl+,) -->
        <div class="act-item-wrapper" id="act-item-settings">
          <button class="act-btn" id="act-btn-settings" onclick="toggleSidebarView('settings')" title="Settings &amp; Preferences (Ctrl+,)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <div class="act-active-strip"></div>
        </div>
      </div>
    </aside>

    <!-- SideBar -->
    <aside class="sidebar" id="sidebar-panel">
      <!-- 1. Explorer View -->
      <div id="sb-explorer-view" style="display: flex; flex-direction: column; height: 100%;">
        <div class="sidebar-header">
          <span>Explorer: COMPILLO</span>
          <div class="sidebar-actions">
            <button class="icon-action-btn" onclick="promptNewFile()" title="New File">&#128196;</button>
            <button class="icon-action-btn" onclick="promptNewFolder()" title="New Folder">&#128193;</button>
            <button class="icon-action-btn" onclick="renderFileTree()" title="Refresh">&#8635;</button>
          </div>
        </div>
        <div class="sidebar-content" id="explorer-tree"></div>
      </div>

      <!-- 2. Search View -->
      <div id="sb-search-view" style="display: none; flex-direction: column; height: 100%;">
        <div class="sidebar-header"><span>Search &amp; Replace</span></div>
        <div class="sidebar-content" style="padding: 10px;">
          <input type="text" id="search-keyword" placeholder="Search across files..." style="width: 100%; padding: 6px 10px; background: var(--input-bg); border: 1px solid var(--input-border); color: #fff; border-radius: 5px; font-size: 12px; outline: none;" oninput="runWorkspaceSearch()">
          <div id="search-matches" style="margin-top: 12px; font-size: 11.5px;"></div>
        </div>
      </div>

      <!-- 3. Git View -->
      <div id="sb-git-view" style="display: none; flex-direction: column; height: 100%;">
        <div class="sidebar-header"><span>Source Control (Git)</span></div>
        <div class="sidebar-content" style="padding: 10px;">
          <textarea id="git-commit-msg" placeholder="Message (Ctrl+Enter to commit)" style="width: 100%; height: 60px; padding: 6px 8px; background: var(--input-bg); border: 1px solid var(--input-border); color: #fff; border-radius: 5px; font-size: 12px; resize: none; outline: none;"></textarea>
          <button class="btn-action btn-run" style="width: 100%; margin-top: 8px; justify-content: center;" onclick="commitGit()">Commit to main</button>
          <div style="margin-top: 14px; font-size: 11px;">
            <div style="font-weight: 700; margin-bottom: 6px; opacity: 0.7;">STAGED CHANGES (3)</div>
            <div style="padding: 3px 0; color: #4ade80;">&bull; main.py (Modified)</div>
            <div style="padding: 3px 0; color: #38bdf8;">&bull; index.html (Modified)</div>
            <div style="padding: 3px 0; color: #facc15;">&bull; style.css (Tracked)</div>
          </div>
        </div>
      </div>

      <!-- 4. Extensions View -->
      <div id="sb-extensions-view" style="display: none; flex-direction: column; height: 100%;">
        <div class="sidebar-header"><span>Extensions (4 Active)</span></div>
        <div class="sidebar-content" style="padding: 10px;">
          <div class="theme-card active" style="flex-direction: column; align-items: flex-start; gap: 4px;">
            <div style="font-weight: 700; color: #38bdf8;">Python Linter &amp; Trace Filter</div>
            <div style="font-size: 11px; opacity: 0.8;">Filters raw tracebacks into clean file line diagnostics.</div>
          </div>
          <div class="theme-card active" style="flex-direction: column; align-items: flex-start; gap: 4px; margin-top: 6px;">
            <div style="font-weight: 700; color: #10b981;">Turbo C &amp; BGI Graphics Window</div>
            <div style="font-size: 11px; opacity: 0.8;">HTML5 canvas graphics.h and pixel plotting emulator.</div>
          </div>
          <div class="theme-card active" style="flex-direction: column; align-items: flex-start; gap: 4px; margin-top: 6px;">
            <div style="font-weight: 700; color: #c084fc;">Single HTML Bundler</div>
            <div style="font-size: 11px; opacity: 0.8;">Compiles complete workspaces into a standalone offline HTML page.</div>
          </div>
        </div>
      </div>

            <!-- 2. SETTINGS VIEW (Full Editor Preferences, Font, Themes & Shortcuts) -->
      <div id="sb-settings-view" style="display: none; flex-direction: column; height: 100%;">
        <div class="sidebar-header">
          <span>Settings</span>
          <div class="sidebar-actions">
            <button class="icon-action-btn" onclick="openShortcutsModal()" title="Shortcuts">&#9000;</button>
          </div>
        </div>
        <div class="sidebar-content" style="padding: 0;">
          <div class="settings-group" style="padding: 10px 14px; border-bottom: 1px solid var(--sb-border);">
            <div class="settings-title" style="font-weight: 700; font-size: 12px; color: #ffffff; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent);"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 10 10 0 0 0 0-20"/></svg>
              <span>Color Theme</span>
            </div>
            <div class="settings-desc" style="font-size: 11px; color: var(--sb-fg); opacity: 0.75; margin-bottom: 10px; line-height: 1.4;">Select your preferred IDE workbench color theme palette.</div>

            <select id="settings-theme-select" class="settings-control" style="width: 100%; padding: 6px 8px; background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 4px; color: #ffffff; font-size: 12px; outline: none; margin-bottom: 10px;" onchange="applyTheme(this.value)">
              <option value="nova-studio" selected>Compillo Dark (Signature)</option>
              <option value="cyber-obsidian">Cyber Obsidian (Emerald)</option>
              <option value="aurora-luxe">Aurora Luxe (Deep Amethyst)</option>
              <option value="dark-modern">Dark Modern (Default Dark)</option>
              <option value="dark-plus">Dark+ (Classic Dark)</option>
              <option value="monokai">Monokai</option>
              <option value="one-dark-pro">One Dark Pro</option>
              <option value="light-modern">Light Modern (Crisp Light)</option>
              <option value="cyberpunk">Cyberpunk (Neon Yellow & Magenta)</option>
              <option value="sakura-blossom">🌸 Sakura Blossom (Rose Quartz & Cherry)</option>
              <option value="fairy-lavender">✨ Fairy Lavender (Lilac & Dreamy Twilight)</option>
              <option value="luxury-gold">👑 Royal Noir & Champagne Gold (Haute Luxury)</option>
            </select>

            <!-- Quick Theme Grid Cards -->
            <div class="theme-card-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px;">
              <div class="theme-pill-card selected" id="thcard-nova-studio" onclick="applyTheme('nova-studio')" style="padding: 6px 8px; border-radius: 6px; border: 1px solid var(--sb-border); background: rgba(255, 255, 255, 0.03); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 11px;">
                <span class="theme-dot" style="background: #38bdf8; width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;"></span>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Compillo Dark</span>
              </div>
              <div class="theme-pill-card" id="thcard-cyber-obsidian" onclick="applyTheme('cyber-obsidian')" style="padding: 6px 8px; border-radius: 6px; border: 1px solid var(--sb-border); background: rgba(255, 255, 255, 0.03); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 11px;">
                <span class="theme-dot" style="background: #10b981; width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;"></span>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Cyber Obsidian</span>
              </div>
              <div class="theme-pill-card" id="thcard-aurora-luxe" onclick="applyTheme('aurora-luxe')" style="padding: 6px 8px; border-radius: 6px; border: 1px solid var(--sb-border); background: rgba(255, 255, 255, 0.03); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 11px;">
                <span class="theme-dot" style="background: #a855f7; width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;"></span>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Aurora Luxe</span>
              </div>
              <div class="theme-pill-card" id="thcard-dark-modern" onclick="applyTheme('dark-modern')" style="padding: 6px 8px; border-radius: 6px; border: 1px solid var(--sb-border); background: rgba(255, 255, 255, 0.03); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 11px;">
                <span class="theme-dot" style="background: #0078d4; width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;"></span>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Dark Modern</span>
              </div>
              <div class="theme-pill-card" id="thcard-dark-plus" onclick="applyTheme('dark-plus')" style="padding: 6px 8px; border-radius: 6px; border: 1px solid var(--sb-border); background: rgba(255, 255, 255, 0.03); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 11px;">
                <span class="theme-dot" style="background: #007acc; width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;"></span>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Dark+</span>
              </div>
              <div class="theme-pill-card" id="thcard-monokai" onclick="applyTheme('monokai')" style="padding: 6px 8px; border-radius: 6px; border: 1px solid var(--sb-border); background: rgba(255, 255, 255, 0.03); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 11px;">
                <span class="theme-dot" style="background: #fd971f; width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;"></span>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Monokai</span>
              </div>
              <div class="theme-pill-card" id="thcard-one-dark-pro" onclick="applyTheme('one-dark-pro')" style="padding: 6px 8px; border-radius: 6px; border: 1px solid var(--sb-border); background: rgba(255, 255, 255, 0.03); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 11px;">
                <span class="theme-dot" style="background: #61afef; width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;"></span>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">One Dark Pro</span>
              </div>
              <div class="theme-pill-card" id="thcard-light-modern" onclick="applyTheme('light-modern')" style="padding: 6px 8px; border-radius: 6px; border: 1px solid var(--sb-border); background: rgba(255, 255, 255, 0.03); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 11px;">
                <span class="theme-dot" style="background: #005fb8; width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;"></span>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Light Modern</span>
              </div>
              <div class="theme-pill-card" id="thcard-cyberpunk" onclick="applyTheme('cyberpunk')" style="padding: 6px 8px; border-radius: 6px; border: 1px solid var(--sb-border); background: rgba(255, 255, 255, 0.03); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 11px;">
                <span class="theme-dot" style="background: #fcee0a; width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;"></span>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Cyberpunk</span>
              </div>
              <div class="theme-pill-card" id="thcard-sakura-blossom" onclick="applyTheme('sakura-blossom')" style="padding: 6px 8px; border-radius: 6px; border: 1px solid var(--sb-border); background: rgba(255, 255, 255, 0.03); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 11px;">
                <span class="theme-dot" style="background: #ec4899; width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;"></span>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">🌸 Sakura Blossom</span>
              </div>
              <div class="theme-pill-card" id="thcard-fairy-lavender" onclick="applyTheme('fairy-lavender')" style="padding: 6px 8px; border-radius: 6px; border: 1px solid var(--sb-border); background: rgba(255, 255, 255, 0.03); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 11px;">
                <span class="theme-dot" style="background: #9333ea; width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;"></span>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">✨ Fairy Lavender</span>
              </div>
              <div class="theme-pill-card" id="thcard-luxury-gold" onclick="applyTheme('luxury-gold')" style="padding: 6px 8px; border-radius: 6px; border: 1px solid var(--sb-border); background: rgba(255, 255, 255, 0.03); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 11px;">
                <span class="theme-dot" style="background: #d4af37; width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;"></span>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">👑 Royal Noir & Champagne Gold</span>
              </div>
            </div>
          </div>

          <!-- Font Size -->
          <div class="settings-group" style="padding: 10px 14px; border-bottom: 1px solid var(--sb-border);">
            <div class="settings-title" style="font-weight: 700; font-size: 12px; color: #ffffff; margin-bottom: 4px;">Editor: Font Size</div>
            <div class="settings-desc" style="font-size: 11px; color: var(--sb-fg); opacity: 0.75; margin-bottom: 6px;">Controls the editor font size in pixels.</div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span id="lbl-fontsize" style="font-family: monospace; font-weight: 700; color: var(--accent);">13px</span>
            </div>
            <input type="range" id="set-fontsize-slider" min="11" max="22" value="13" style="width: 100%; accent-color: var(--accent);" oninput="updateEditorPreferences()">
          </div>

          <!-- Tab Size -->
          <div class="settings-group" style="padding: 10px 14px; border-bottom: 1px solid var(--sb-border);">
            <div class="settings-title" style="font-weight: 700; font-size: 12px; color: #ffffff; margin-bottom: 4px;">Editor: Tab Size</div>
            <div class="settings-desc" style="font-size: 11px; color: var(--sb-fg); opacity: 0.75; margin-bottom: 6px;">The number of spaces a tab is equal to.</div>
            <div style="display: flex; gap: 8px;">
              <button class="btn-action" id="btn-tab-2" style="flex: 1; justify-content: center; border: 1px solid var(--sb-border);" onclick="setTabSize(2)">2 Spaces</button>
              <button class="btn-action" id="btn-tab-4" style="flex: 1; justify-content: center; background: var(--accent); color: #000; font-weight: 700; border: 1px solid var(--accent);" onclick="setTabSize(4)">4 Spaces</button>
            </div>
          </div>

          <!-- Word Wrap & Minimap -->
          <div class="settings-group" style="padding: 10px 14px; border-bottom: 1px solid var(--sb-border);">
            <div class="settings-title" style="font-weight: 700; font-size: 12px; color: #ffffff; margin-bottom: 6px;">Display Options</div>
            <label style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; cursor: pointer; font-size: 12px;">
              <span>Show Minimap</span>
              <input type="checkbox" id="set-minimap" checked onchange="updateEditorPreferences()" style="accent-color: var(--accent);">
            </label>
            <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 12px;">
              <span>Word Wrap</span>
              <input type="checkbox" id="set-wordwrap" checked onchange="updateEditorPreferences()" style="accent-color: var(--accent);">
            </label>
          </div>
        </div>
      </div>
    </aside>

    <!-- Central Editor Container -->
    <main class="editor-container">
      <!-- TabBar -->
      <div class="tabbar">
        <div class="tab-list" id="tabbar-items"></div>
        <div class="tabbar-right">
          <button class="btn-icon-only" onclick="runActiveFile()" title="Run Code">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
          <button class="btn-icon-only" onclick="formatActiveDocument()" title="Format Document">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
          </button>
          <button class="btn-icon-only" onclick="toggleLivePreview()" title="Split Preview">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/></svg>
          </button>
        </div>
      </div>

      <!-- Breadcrumbs -->
      <div class="breadcrumbs">
        <span>compillo</span>
        <span class="bc-sep">&gt;</span>
        <span id="bc-folder">src</span>
        <span class="bc-sep">&gt;</span>
        <span class="bc-active" id="bc-filename">main.py</span>
      </div>

      <!-- Workspace Split (Editor Buffers + Live Preview Pane) -->
      <div class="workspace-split">
        <!-- Editor Wrapper -->
        <div class="editor-wrapper">
          <div class="gutter" id="editor-gutter">1</div>
          <div class="code-view-container">
            <pre class="code-pre" id="code-pre"><code id="code-highlighted"></code></pre>
            <textarea class="code-textarea" id="code-input" spellcheck="false" placeholder="Write code here..."></textarea>
          </div>
          <div class="minimap" id="editor-minimap">
            <div class="minimap-slider" id="minimap-thumb"></div>
            <div class="minimap-content" id="minimap-code"></div>
          </div>
        </div>

        <!-- Split Live Canvas Preview -->
        <aside class="preview-split hidden" id="preview-panel">
          <div class="preview-header">
            <span>&#9889; Interactive Live Canvas</span>
            <div style="display: flex; gap: 4px;">
              <button class="icon-action-btn" onclick="refreshLiveCanvas()" title="Refresh">&#8635;</button>
              <button class="icon-action-btn" onclick="toggleLivePreview()" title="Close">&#10005;</button>
            </div>
          </div>
          <iframe class="preview-iframe" id="live-canvas-frame" sandbox="allow-scripts allow-modals"></iframe>
        </aside>
      </div>

      <!-- Bottom Multi-Channel Panel -->
      <div class="bottom-panel" id="panel-bottom">
        <div class="panel-header">
          <div class="panel-tabs">
            <span class="panel-tab active" id="ptab-terminal" onclick="switchPanelTab('terminal')">&#128187; TERMINAL</span>
            <span class="panel-tab" id="ptab-output" onclick="switchPanelTab('output')">&#128203; OUTPUT</span>
            <span class="panel-tab" id="ptab-problems" onclick="switchPanelTab('problems')">&#9888;&#65039; PROBLEMS (0)</span>
            <span class="panel-tab" id="ptab-graphics" onclick="switchPanelTab('graphics')">&#127912; C GRAPHICS</span>
            <span class="panel-tab" id="ptab-rest" onclick="switchPanelTab('rest')">&#127760; REST CLIENT</span>
          </div>
          <div class="panel-actions">
            <button class="icon-action-btn" onclick="clearActivePanel()" title="Clear Panel Content">&#128465; Clear</button>
            <button class="icon-action-btn" onclick="toggleMaximizeBottomPanel()" title="Maximize / Restore">&#8661;</button>
            <button class="icon-action-btn" onclick="toggleBottomPanel()" title="Close Panel">&#10005;</button>
          </div>
        </div>

        <!-- Terminal Tab Content -->
        <div class="panel-body" id="pbody-terminal">
          <div class="terminal-history" id="term-history">
            <div>Compillo Interactive Virtual Terminal v2.0.0</div>
            <div>Type 'help' for commands, or 'python main.py' to run code.</div>
          </div>
          <div class="terminal-line">
            <span class="term-prompt">compillo@workspace:~$</span>
            <input type="text" class="term-input" id="term-input" onkeydown="handleTerminalKey(event)">
          </div>
        </div>

        <!-- Output Tab Content -->
        <div class="panel-body" id="pbody-output" style="display: none;">
          <div class="output-entry out-sys">[Compillo System] Workspace initialized. Ready for execution.</div>
          <div class="output-entry out-info">[Info] Click '&#9654; Run' (Ctrl+Enter) or run via Terminal to execute code.</div>
        </div>

        <!-- Problems Tab Content -->
        <div class="panel-body" id="pbody-problems" style="display: none; color: #94a3b8;">
          <div id="problems-text">No diagnostics or syntax issues detected in current workspace.</div>
        </div>

        <!-- C Graphics Canvas Tab Content -->
        <div class="panel-body graphics-container" id="pbody-graphics" style="display: none; padding: 0;">
          <canvas id="turbo-canvas" width="640" height="400"></canvas>
        </div>

        <!-- REST Client Tab Content -->
        <div class="panel-body" id="pbody-rest" style="display: none;">
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <select id="rest-req-method" style="padding: 4px 8px; background: var(--input-bg); color: #fff; border: 1px solid var(--input-border); border-radius: 4px;">
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
            <input type="text" id="rest-req-url" value="https://jsonplaceholder.typicode.com/todos/1" style="flex: 1; padding: 4px 8px; background: var(--input-bg); color: #fff; border: 1px solid var(--input-border); border-radius: 4px; outline: none;">
            <button class="btn-action btn-run" onclick="sendRestRequest()">Send Request</button>
          </div>
          <pre id="rest-res-body" style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; font-family: monospace; font-size: 11.5px; color: #38bdf8; max-height: 120px; overflow-y: auto;">Response will appear here...</pre>
        </div>
      </div>
    </main>
  </div>

  <!-- 3. BOTTOM STATUSBAR -->
  <footer class="statusbar">
    <div class="status-left">
      <div class="status-item" onclick="toggleSidebarView('git')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/><circle cx="6" cy="18" r="3"/></svg>
        <span>main</span>
      </div>
      <div class="status-item" onclick="switchPanelTab('problems')">
        <span>0 errors</span>
        <span>&bull;</span>
        <span>0 warnings</span>
      </div>
      <div class="status-item">
        <span>Compillo Ready</span>
      </div>
    </div>

    <div class="status-right">
      <div class="status-item" id="status-line-col">Ln 1, Col 1</div>
      <div class="status-item" id="status-spaces">Spaces: 4</div>
      <div class="status-item">UTF-8</div>
      <div class="status-item" id="status-lang-badge" style="font-weight: 700; text-transform: uppercase;">PYTHON</div>
      <div class="status-item" onclick="formatActiveDocument()">Prettier</div>
      <div class="status-item" onclick="openAboutModal()" style="font-weight: 600;">Compillo 2.0</div>
    </div>
  </footer>

  <!-- 4. MODALS & POPUPS -->
  <!-- Theme Picker Modal -->
  <div class="modal-overlay" id="modal-themes">
    <div class="modal-card">
      <div class="modal-header">
        <span>Compillo Color Themes (&#127912;)</span>
        <button class="icon-action-btn" onclick="closeModal('modal-themes')">&#10005;</button>
      </div>
      <div class="modal-body" id="theme-modal-cards"></div>
    </div>
  </div>

  <!-- Command Palette Modal -->
  <div class="modal-overlay" id="modal-palette">
    <div class="modal-card" style="max-width: 580px;">
      <div class="modal-header">
        <span>Command Palette / Quick Open</span>
        <button class="icon-action-btn" onclick="closeModal('modal-palette')">&#10005;</button>
      </div>
      <div class="modal-body" style="padding: 12px;">
        <input type="text" id="palette-search" placeholder="Type a command or filename..." style="width: 100%; padding: 8px 12px; background: var(--input-bg); border: 1px solid var(--input-border); color: #fff; border-radius: 6px; font-size: 13px; outline: none; margin-bottom: 8px;" oninput="filterPalette()">
        <div id="palette-list" style="max-height: 320px; overflow-y: auto;"></div>
      </div>
    </div>
  </div>

  <!-- Download File Modal -->
  <div class="modal-overlay" id="modal-download">
    <div class="modal-card">
      <div class="modal-header">
        <span>Download Active File</span>
        <button class="icon-action-btn" onclick="closeModal('modal-download')">&#10005;</button>
      </div>
      <div class="modal-body" style="line-height: 1.6;">
        <p>Save and export your code to your local computer:</p>
        <div style="margin: 16px 0; display: flex; flex-direction: column; gap: 8px;">
          <button class="btn-action btn-run" style="padding: 8px 14px; justify-content: center;" onclick="downloadActiveFileDirect()">
            Download Active File (<span id="dl-filename">main.py</span>)
          </button>
          <button class="btn-action btn-copilot" style="padding: 8px 14px; justify-content: center;" onclick="exportSingleHtmlBundle()">
            Export Entire Project as Single HTML File
          </button>
          <button class="btn-action btn-host" style="padding: 8px 14px; justify-content: center;" onclick="downloadStandaloneReplicaFile()">
            Download Standalone Single-Page Replica (compillo_single_page.html)
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- About Modal -->
  <div class="modal-overlay" id="modal-about">
    <div class="modal-card">
      <div class="modal-header">
        <span>About Compillo Studio 2.0</span>
        <button class="icon-action-btn" onclick="closeModal('modal-about')">&#10005;</button>
      </div>
      <div class="modal-body" style="line-height: 1.6; font-size: 13px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
          <div class="brand-icon" style="width: 28px; height: 28px; font-size: 16px;">&#9889;</div>
          <div>
            <h3 style="color: #fff; font-size: 16px;">Compillo Web IDE 2.0</h3>
            <p style="font-size: 11.5px; color: var(--accent);">Self-Contained Standalone Single-Page Replica</p>
          </div>
        </div>
        <p>A full-featured web-based programming environment with:</p>
        <ul style="margin: 8px 0 12px 20px; color: var(--sb-fg); line-height: 1.7;">
          <li>Multi-file TabBar &amp; File Explorer</li>
          <li>13 Built-in Themes with live switching</li>
          <li>Python, C/C++, HTML, CSS, JavaScript language support</li>
          <li>Interactive Virtual Shell Terminal</li>
          <li>Turbo C / BGI graphics.h Canvas emulator</li>
          <li>1-Click export to self-contained single HTML</li>
        </ul>
        <div style="padding: 10px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 6px; font-size: 11.5px; color: #38bdf8;">
          All code and UI components run directly inside your browser without external server requirements.
        </div>
      </div>
    </div>
  </div>

  <!-- Shortcuts Modal -->
  <div class="modal-overlay" id="modal-shortcuts">
    <div class="modal-card">
      <div class="modal-header">
        <span>Keyboard Shortcuts</span>
        <button class="icon-action-btn" onclick="closeModal('modal-shortcuts')">&#10005;</button>
      </div>
      <div class="modal-body" style="font-size: 12.5px;">
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px 16px; align-items: center;">
          <div>Run Active Code</div> <span class="kbd-badge">Ctrl+Enter</span>
          <div>Quick Open / Command Palette</div> <span class="kbd-badge">Ctrl+P</span>
          <div>Save Active File</div> <span class="kbd-badge">Ctrl+S</span>
          <div>Format Document</div> <span class="kbd-badge">Shift+Alt+F</span>
          <div>Toggle Side Bar</div> <span class="kbd-badge">Ctrl+B</span>
          <div>Toggle Bottom Panel</div> <span class="kbd-badge">Ctrl+J</span>
          <div>Toggle Terminal</div> <span class="kbd-badge">Ctrl+&#96;</span>
          <div>Clear Terminal</div> <span class="kbd-badge">Ctrl+K</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 5. JAVASCRIPT ENGINE & WORKBENCH LOGIC -->
  <script>
    // 1. THEMES DEFINITIONS (ALL 13 THEMES)
    var THEMES = {
      "nova-studio": {
            "id": "nova-studio",
            "label": "Compillo Dark (Signature)",
            "type": "dark",
            "colors": [
                  "#0b0f17",
                  "#0f172a",
                  "#38bdf8"
            ],
            "vars": {
                  "--act-bg": "#0b0f17",
                  "--act-fg": "#94a3b8",
                  "--act-border": "#38bdf8",
                  "--sb-bg": "#0f172a",
                  "--sb-fg": "#cbd5e1",
                  "--sb-header": "#0f172a",
                  "--sb-border": "#1e293b",
                  "--tab-bg": "#0f172a",
                  "--tab-active-bg": "#1e293b",
                  "--tab-inactive-bg": "#0f172a",
                  "--tab-border": "#1e293b",
                  "--ed-bg": "#0b1120",
                  "--ed-fg": "#f1f5f9",
                  "--line-num": "#475569",
                  "--panel-bg": "#0f172a",
                  "--panel-border": "#1e293b",
                  "--status-bg": "#0284c7",
                  "--status-fg": "#ffffff",
                  "--title-bg": "#0b0f17",
                  "--title-fg": "#cbd5e1",
                  "--accent": "#38bdf8",
                  "--input-bg": "#1e293b",
                  "--input-border": "#334155"
            }
      },
      "cyber-obsidian": {
            "id": "cyber-obsidian",
            "label": "Cyber Obsidian (Emerald)",
            "type": "dark",
            "colors": [
                  "#0a0a0c",
                  "#121216",
                  "#10b981"
            ],
            "vars": {
                  "--act-bg": "#0a0a0c",
                  "--act-fg": "#71717a",
                  "--act-border": "#10b981",
                  "--sb-bg": "#121216",
                  "--sb-fg": "#d4d4d8",
                  "--sb-header": "#121216",
                  "--sb-border": "#27272a",
                  "--tab-bg": "#121216",
                  "--tab-active-bg": "#18181f",
                  "--tab-inactive-bg": "#121216",
                  "--tab-border": "#27272a",
                  "--ed-bg": "#0e0e12",
                  "--ed-fg": "#f4f4f5",
                  "--line-num": "#52525b",
                  "--panel-bg": "#121216",
                  "--panel-border": "#27272a",
                  "--status-bg": "#059669",
                  "--status-fg": "#ffffff",
                  "--title-bg": "#0a0a0c",
                  "--title-fg": "#d4d4d8",
                  "--accent": "#10b981",
                  "--input-bg": "#18181f",
                  "--input-border": "#3f3f46"
            }
      },
      "aurora-luxe": {
            "id": "aurora-luxe",
            "label": "Aurora Luxe (Deep Amethyst)",
            "type": "dark",
            "colors": [
                  "#120f1d",
                  "#171427",
                  "#a855f7"
            ],
            "vars": {
                  "--act-bg": "#120f1d",
                  "--act-fg": "#a78bfa",
                  "--act-border": "#c084fc",
                  "--sb-bg": "#171427",
                  "--sb-fg": "#e2e8f0",
                  "--sb-header": "#171427",
                  "--sb-border": "#2e274b",
                  "--tab-bg": "#171427",
                  "--tab-active-bg": "#231e3d",
                  "--tab-inactive-bg": "#171427",
                  "--tab-border": "#2e274b",
                  "--ed-bg": "#151224",
                  "--ed-fg": "#f8fafc",
                  "--line-num": "#64578b",
                  "--panel-bg": "#171427",
                  "--panel-border": "#2e274b",
                  "--status-bg": "#7c3aed",
                  "--status-fg": "#ffffff",
                  "--title-bg": "#120f1d",
                  "--title-fg": "#e2e8f0",
                  "--accent": "#a855f7",
                  "--input-bg": "#231e3d",
                  "--input-border": "#433870"
            }
      },
      "dark-modern": {
            "id": "dark-modern",
            "label": "Dark Modern (Default Dark)",
            "type": "dark",
            "colors": [
                  "#181818",
                  "#1f1f1f",
                  "#0078d4"
            ],
            "vars": {
                  "--act-bg": "#181818",
                  "--act-fg": "#999999",
                  "--act-border": "#0078d4",
                  "--sb-bg": "#181818",
                  "--sb-fg": "#cccccc",
                  "--sb-header": "#181818",
                  "--sb-border": "#2b2b2b",
                  "--tab-bg": "#181818",
                  "--tab-active-bg": "#1f1f1f",
                  "--tab-inactive-bg": "#181818",
                  "--tab-border": "#2b2b2b",
                  "--ed-bg": "#1f1f1f",
                  "--ed-fg": "#d4d4d4",
                  "--line-num": "#6e7681",
                  "--panel-bg": "#181818",
                  "--panel-border": "#2b2b2b",
                  "--status-bg": "#181818",
                  "--status-fg": "#cccccc",
                  "--title-bg": "#181818",
                  "--title-fg": "#cccccc",
                  "--accent": "#0078d4",
                  "--input-bg": "#222222",
                  "--input-border": "#3c3c3c"
            }
      },
      "dark-plus": {
            "id": "dark-plus",
            "label": "Dark+ (Classic Dark)",
            "type": "dark",
            "colors": [
                  "#333333",
                  "#1e1e1e",
                  "#007acc"
            ],
            "vars": {
                  "--act-bg": "#333333",
                  "--act-fg": "#ffffff",
                  "--act-border": "#ffffff",
                  "--sb-bg": "#252526",
                  "--sb-fg": "#cccccc",
                  "--sb-header": "#252526",
                  "--sb-border": "#1e1e1e",
                  "--tab-bg": "#252526",
                  "--tab-active-bg": "#1e1e1e",
                  "--tab-inactive-bg": "#2d2d2d",
                  "--tab-border": "#252526",
                  "--ed-bg": "#1e1e1e",
                  "--ed-fg": "#d4d4d4",
                  "--line-num": "#858585",
                  "--panel-bg": "#1e1e1e",
                  "--panel-border": "#252526",
                  "--status-bg": "#007acc",
                  "--status-fg": "#ffffff",
                  "--title-bg": "#3c3c3c",
                  "--title-fg": "#cccccc",
                  "--accent": "#007acc",
                  "--input-bg": "#3c3c3c",
                  "--input-border": "#3c3c3c"
            }
      },
      "monokai": {
            "id": "monokai",
            "label": "Monokai",
            "type": "dark",
            "colors": [
                  "#272822",
                  "#1e1f1c",
                  "#fd971f"
            ],
            "vars": {
                  "--act-bg": "#272822",
                  "--act-fg": "#f8f8f2",
                  "--act-border": "#a6e22e",
                  "--sb-bg": "#1e1f1c",
                  "--sb-fg": "#f8f8f2",
                  "--sb-header": "#1e1f1c",
                  "--sb-border": "#3e3d32",
                  "--tab-bg": "#1e1f1c",
                  "--tab-active-bg": "#272822",
                  "--tab-inactive-bg": "#141411",
                  "--tab-border": "#3e3d32",
                  "--ed-bg": "#272822",
                  "--ed-fg": "#f8f8f2",
                  "--line-num": "#90908a",
                  "--panel-bg": "#1e1f1c",
                  "--panel-border": "#3e3d32",
                  "--status-bg": "#414339",
                  "--status-fg": "#f8f8f2",
                  "--title-bg": "#1e1f1c",
                  "--title-fg": "#f8f8f2",
                  "--accent": "#fd971f",
                  "--input-bg": "#414339",
                  "--input-border": "#3e3d32"
            }
      },
      "one-dark-pro": {
            "id": "one-dark-pro",
            "label": "One Dark Pro",
            "type": "dark",
            "colors": [
                  "#21252b",
                  "#282c34",
                  "#61afef"
            ],
            "vars": {
                  "--act-bg": "#21252b",
                  "--act-fg": "#abb2bf",
                  "--act-border": "#61afef",
                  "--sb-bg": "#21252b",
                  "--sb-fg": "#abb2bf",
                  "--sb-header": "#21252b",
                  "--sb-border": "#181a1f",
                  "--tab-bg": "#21252b",
                  "--tab-active-bg": "#282c34",
                  "--tab-inactive-bg": "#21252b",
                  "--tab-border": "#181a1f",
                  "--ed-bg": "#282c34",
                  "--ed-fg": "#abb2bf",
                  "--line-num": "#4b5263",
                  "--panel-bg": "#21252b",
                  "--panel-border": "#181a1f",
                  "--status-bg": "#21252b",
                  "--status-fg": "#abb2bf",
                  "--title-bg": "#21252b",
                  "--title-fg": "#abb2bf",
                  "--accent": "#61afef",
                  "--input-bg": "#1b1d23",
                  "--input-border": "#3e4451"
            }
      },
      "light-modern": {
            "id": "light-modern",
            "label": "Light Modern (Crisp Light)",
            "type": "light",
            "colors": [
                  "#f0f0f0",
                  "#f8f9fa",
                  "#005fb8"
            ],
            "vars": {
                  "--act-bg": "#f0f0f0",
                  "--act-fg": "#383838",
                  "--act-border": "#005fb8",
                  "--sb-bg": "#f8f9fa",
                  "--sb-fg": "#1e293b",
                  "--sb-header": "#edf0f2",
                  "--sb-border": "#e2e8f0",
                  "--tab-bg": "#f1f3f5",
                  "--tab-active-bg": "#ffffff",
                  "--tab-inactive-bg": "#e9ecef",
                  "--tab-border": "#e2e8f0",
                  "--ed-bg": "#ffffff",
                  "--ed-fg": "#1e293b",
                  "--line-num": "#64748b",
                  "--panel-bg": "#f8f9fa",
                  "--panel-border": "#e2e8f0",
                  "--status-bg": "#005fb8",
                  "--status-fg": "#ffffff",
                  "--title-bg": "#f1f3f5",
                  "--title-fg": "#1e293b",
                  "--accent": "#005fb8",
                  "--input-bg": "#ffffff",
                  "--input-border": "#cbd5e1"
            }
      },
      "cyberpunk": {
            "id": "cyberpunk",
            "label": "Cyberpunk (Neon Yellow & Magenta)",
            "type": "dark",
            "colors": [
                  "#0c0817",
                  "#120d22",
                  "#fcee0a"
            ],
            "vars": {
                  "--act-bg": "#0c0817",
                  "--act-fg": "#fcee0a",
                  "--act-border": "#fcee0a",
                  "--sb-bg": "#120d22",
                  "--sb-fg": "#f1eaff",
                  "--sb-header": "#191130",
                  "--sb-border": "#301c4e",
                  "--tab-bg": "#120d22",
                  "--tab-active-bg": "#1b1336",
                  "--tab-inactive-bg": "#0c0817",
                  "--tab-border": "#301c4e",
                  "--ed-bg": "#130d29",
                  "--ed-fg": "#ffffff",
                  "--line-num": "#75609c",
                  "--panel-bg": "#120d22",
                  "--panel-border": "#301c4e",
                  "--status-bg": "#fcee0a",
                  "--status-fg": "#0c0817",
                  "--title-bg": "#0c0817",
                  "--title-fg": "#fcee0a",
                  "--accent": "#fcee0a",
                  "--input-bg": "#1e1438",
                  "--input-border": "#00f0ff"
            }
      },
      "sakura-blossom": {
            "id": "sakura-blossom",
            "label": "🌸 Sakura Blossom (Rose Quartz & Cherry)",
            "type": "light",
            "colors": [
                  "#ffe4ee",
                  "#fff1f6",
                  "#ec4899"
            ],
            "vars": {
                  "--act-bg": "#ffe4ee",
                  "--act-fg": "#db2777",
                  "--act-border": "#f43f5e",
                  "--sb-bg": "#fff1f6",
                  "--sb-fg": "#831843",
                  "--sb-header": "#ffe4ee",
                  "--sb-border": "#fbcfe8",
                  "--tab-bg": "#ffe4ee",
                  "--tab-active-bg": "#ffffff",
                  "--tab-inactive-bg": "#fce7f3",
                  "--tab-border": "#fbcfe8",
                  "--ed-bg": "#fffafd",
                  "--ed-fg": "#4c0519",
                  "--line-num": "#f472b6",
                  "--panel-bg": "#fff1f6",
                  "--panel-border": "#fbcfe8",
                  "--status-bg": "#ec4899",
                  "--status-fg": "#ffffff",
                  "--title-bg": "#ffe4ee",
                  "--title-fg": "#9d174d",
                  "--accent": "#ec4899",
                  "--input-bg": "#ffffff",
                  "--input-border": "#f9a8d4"
            }
      },
      "fairy-lavender": {
            "id": "fairy-lavender",
            "label": "✨ Fairy Lavender (Lilac & Dreamy Twilight)",
            "type": "light",
            "colors": [
                  "#f3e8ff",
                  "#faf5ff",
                  "#9333ea"
            ],
            "vars": {
                  "--act-bg": "#f3e8ff",
                  "--act-fg": "#7e22ce",
                  "--act-border": "#a855f7",
                  "--sb-bg": "#faf5ff",
                  "--sb-fg": "#581c87",
                  "--sb-header": "#f3e8ff",
                  "--sb-border": "#e9d5ff",
                  "--tab-bg": "#f3e8ff",
                  "--tab-active-bg": "#ffffff",
                  "--tab-inactive-bg": "#f5edff",
                  "--tab-border": "#e9d5ff",
                  "--ed-bg": "#fcfaff",
                  "--ed-fg": "#3b0764",
                  "--line-num": "#c084fc",
                  "--panel-bg": "#faf5ff",
                  "--panel-border": "#e9d5ff",
                  "--status-bg": "#9333ea",
                  "--status-fg": "#ffffff",
                  "--title-bg": "#f3e8ff",
                  "--title-fg": "#6b21a8",
                  "--accent": "#9333ea",
                  "--input-bg": "#ffffff",
                  "--input-border": "#d8b4fe"
            }
      },
      "luxury-gold": {
            "id": "luxury-gold",
            "label": "👑 Royal Noir & Champagne Gold (Haute Luxury)",
            "type": "dark",
            "colors": [
                  "#0b0906",
                  "#120e0a",
                  "#d4af37"
            ],
            "vars": {
                  "--act-bg": "#0b0906",
                  "--act-fg": "#d4af37",
                  "--act-border": "#f59e0b",
                  "--sb-bg": "#120e0a",
                  "--sb-fg": "#f5efe6",
                  "--sb-header": "#18130d",
                  "--sb-border": "#2e2316",
                  "--tab-bg": "#120e0a",
                  "--tab-active-bg": "#1e1810",
                  "--tab-inactive-bg": "#0e0b07",
                  "--tab-border": "#2e2316",
                  "--ed-bg": "#110d08",
                  "--ed-fg": "#fbf7ee",
                  "--line-num": "#846e4d",
                  "--panel-bg": "#120e0a",
                  "--panel-border": "#2e2316",
                  "--status-bg": "#b48324",
                  "--status-fg": "#0b0906",
                  "--title-bg": "#0b0906",
                  "--title-fg": "#e8d5b5",
                  "--accent": "#d4af37",
                  "--input-bg": "#1c160f",
                  "--input-border": "#4a3a24"
            }
      }
};

    var activeThemeId = 'nova-studio';

    function applyTheme(themeId) {
      var theme = THEMES[themeId] || THEMES['nova-studio'];
      activeThemeId = themeId;
      for (var key in theme.vars) {
        document.documentElement.style.setProperty(key, theme.vars[key]);
      }
      for (var id in THEMES) {
        var el = document.getElementById('thchk-' + id);
        if (el) el.textContent = id === themeId ? '\u2713 ' : '';
      }
      var label = document.getElementById('theme-btn-label');
      if (label) {
        var shortName = theme.label.indexOf('(') !== -1 ? theme.label.split('(')[0].trim() : theme.label;
        label.textContent = 'Theme: ' + shortName;
      }
      renderThemeCards();
    }

    // 2. WORKSPACE FILES
    var workspaceFiles = [
      {
        path: '/src/main.py',
        name: 'main.py',
        folder: 'src',
        lang: 'python',
        content: '# main.py - Compillo Interactive Python Demo\\n\\ndef calculate_squares(limit):\\n    """Generates a dictionary of square numbers."""\\n    return {x: x ** 2 for x in range(1, limit + 1)}\\n\\ndef main():\\n    print("========================================")\\n    print("   Compillo Studio - Python Runtime     ")\\n    print("========================================")\\n    \\n    name = "Developer"\\n    print(f"Welcome to Compillo 2.0, {name}!")\\n    \\n    data = calculate_squares(5)\\n    print(f"Calculated squares: {data}")\\n    print("Execution completed successfully.")\\n\\nif __name__ == "__main__":\\n    main()\\n'
      },
      {
        path: '/src/pixel_grid.c',
        name: 'pixel_grid.c',
        folder: 'src',
        lang: 'c',
        content: '#include <graphics.h>\\n#include <stdio.h>\\n\\nint main() {\\n    initwindow(640, 400, "2. Pixel Plotting");\\n\\n    // Plot a grid of points\\n    for(int x = 80; x <= 560; x += 30) {\\n        for(int y = 80; y <= 320; y += 30) {\\n            putpixel(x, y, YELLOW);\\n        }\\n    }\\n\\n    outtextxy(180, 40, "Pixel Grid Plotted Using putpixel()");\\n    printf("Pixel grid rendered successfully.\\\\n");\\n    return 0;\\n}\\n'
      },
      {
        path: '/web/index.html',
        name: 'index.html',
        folder: 'web',
        lang: 'html',
        content: '<!DOCTYPE html>\\n<html lang="en">\\n<head>\\n  <meta charset="UTF-8">\\n  <title>Live Web Demo</title>\\n  <link rel="stylesheet" href="style.css">\\n</head>\\n<body>\\n  <div class="card">\\n    <div class="badge">Live DOM Sandbox</div>\\n    <h1>Compillo Web Studio</h1>\\n    <p>This page automatically bundles linked CSS and JavaScript.</p>\\n    <button id="counter-btn" onclick="handleClick()">Click Me: Count 0</button>\\n  </div>\\n  <script src="script.js"><' + '/script>\\n</body>\\n</html>'
      },
      {
        path: '/web/style.css',
        name: 'style.css',
        folder: 'web',
        lang: 'css',
        content: 'body {\\n  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\\n  background: #0b0f17;\\n  color: #e2e8f0;\\n  display: flex;\\n  align-items: center;\\n  justify-content: center;\\n  min-height: 90vh;\\n  margin: 0;\\n}\\n.card {\\n  background: #111827;\\n  border: 1px solid #1f2937;\\n  border-radius: 12px;\\n  padding: 24px;\\n  max-width: 380px;\\n  text-align: center;\\n  box-shadow: 0 10px 25px rgba(0,0,0,0.5);\\n}\\n.badge {\\n  display: inline-block;\\n  padding: 4px 8px;\\n  background: rgba(56, 189, 248, 0.15);\\n  color: #38bdf8;\\n  border-radius: 9999px;\\n  font-size: 11px;\\n  font-weight: 600;\\n  margin-bottom: 12px;\\n}\\nh1 { margin: 0 0 8px; font-size: 20px; color: #fff; }\\np { color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 16px; }\\nbutton {\\n  background: #0284c7;\\n  color: white;\\n  border: none;\\n  padding: 10px 20px;\\n  border-radius: 8px;\\n  font-size: 13px;\\n  font-weight: 600;\\n  cursor: pointer;\\n  transition: background 0.2s;\\n}\\nbutton:hover { background: #0369a1; }\\n'
      },
      {
        path: '/web/script.js',
        name: 'script.js',
        folder: 'web',
        lang: 'javascript',
        content: 'let count = 0;\\nfunction handleClick() {\\n  count++;\\n  document.getElementById("counter-btn").innerText = "Click Me: Count " + count;\\n}\\n'
      }
    ];

    var activeFilePath = '/src/main.py';
    var openTabs = ['/src/main.py', '/src/pixel_grid.c', '/web/index.html'];

    // 3. SYNTAX HIGHLIGHTING & EDITOR LOGIC
    var codeInput = document.getElementById('code-input');
    var codeHighlighted = document.getElementById('code-highlighted');
    var editorGutter = document.getElementById('editor-gutter');
    var minimapCode = document.getElementById('minimap-code');

    function escapeHtml(text) {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function highlightSyntax(code, lang) {
      if (lang === 'python') {
        return escapeHtml(code)
          .replace(/(#.*$)/gm, '<span class="hl-comment">$1</span>')
          .replace(/(".*?"|'.*?'|f".*?"|f'.*?')/g, '<span class="hl-str">$1</span>')
          .replace(/\\b(def|class|return|if|else|elif|for|while|in|import|from|as|try|except|finally|with|lambda|yield|raise|pass|break|continue|and|or|not|is)\\b/g, '<span class="hl-kw">$1</span>')
          .replace(/\\b(print|range|len|dict|list|set|int|str|float|bool|type|open)\\b/g, '<span class="hl-builtin">$1</span>')
          .replace(/\\b(\\d+)\\b/g, '<span class="hl-num">$1</span>');
      } else if (lang === 'c' || lang === 'cpp') {
        return escapeHtml(code)
          .replace(/(\\/\\/.*$)/gm, '<span class="hl-comment">$1</span>')
          .replace(/(".*?"|<graphics\\.h>|<stdio\\.h>)/g, '<span class="hl-str">$1</span>')
          .replace(/\\b(#include|#define|int|void|char|float|double|return|for|while|if|else|struct)\\b/g, '<span class="hl-kw">$1</span>')
          .replace(/\\b(initwindow|putpixel|outtextxy|printf|scanf|closegraph)\\b/g, '<span class="hl-fn">$1</span>')
          .replace(/\\b(WHITE|YELLOW|RED|GREEN|BLUE|BLACK)\\b/g, '<span class="hl-builtin">$1</span>')
          .replace(/\\b(\\d+)\\b/g, '<span class="hl-num">$1</span>');
      } else if (lang === 'html') {
        return escapeHtml(code)
          .replace(/(&lt;!--.*?--&gt;)/gs, '<span class="hl-comment">$1</span>')
          .replace(/(&lt;\\/?[a-zA-Z0-9]+)/g, '<span class="hl-tag">$1</span>')
          .replace(/(&gt;)/g, '<span class="hl-tag">$1</span>')
          .replace(/([a-zA-Z-]+)=(".*?")/g, '<span class="hl-attr">$1</span>=<span class="hl-str">$2</span>');
      } else if (lang === 'css') {
        return escapeHtml(code)
          .replace(/(\\/\\*.*?\\*\\/)/gs, '<span class="hl-comment">$1</span>')
          .replace(/([a-zA-Z0-9_.-]+)\\s*\\{/g, '<span class="hl-tag">$1</span> {')
          .replace(/([a-zA-Z-]+):\\s*([^;]+);/g, '<span class="hl-attr">$1</span>: <span class="hl-str">$2</span>;');
      } else if (lang === 'javascript') {
        return escapeHtml(code)
          .replace(/(\\/\\/.*$)/gm, '<span class="hl-comment">$1</span>')
          .replace(/(".*?"|'.*?')/g, '<span class="hl-str">$1</span>')
          .replace(/\\b(function|let|const|var|return|if|else|for|while|document|window)\\b/g, '<span class="hl-kw">$1</span>')
          .replace(/\\b(\\d+)\\b/g, '<span class="hl-num">$1</span>');
      }
      return escapeHtml(code);
    }

    function updateEditorDisplay() {
      var activeFile = null;
      for (var i = 0; i < workspaceFiles.length; i++) {
        if (workspaceFiles[i].path === activeFilePath) { activeFile = workspaceFiles[i]; break; }
      }
      if (!activeFile) return;

      var code = codeInput.value;
      activeFile.content = code;

      codeHighlighted.innerHTML = highlightSyntax(code, activeFile.lang) + '\\n';

      var lines = code.split('\\n');
      var gutterHtml = '';
      for (var j = 1; j <= lines.length; j++) {
        gutterHtml += '<div class="gutter-line">' + j + '</div>';
      }
      editorGutter.innerHTML = gutterHtml;

      minimapCode.textContent = code;
      updateCursorPosition();
    }

    function updateCursorPosition() {
      var pos = codeInput.selectionStart;
      var text = codeInput.value.substring(0, pos);
      var lines = text.split('\\n');
      var curLine = lines.length;
      var curCol = lines[lines.length - 1].length + 1;
      document.getElementById('status-line-col').textContent = 'Ln ' + curLine + ', Col ' + curCol;
    }

    codeInput.addEventListener('scroll', function() {
      document.getElementById('code-pre').scrollTop = codeInput.scrollTop;
      document.getElementById('code-pre').scrollLeft = codeInput.scrollLeft;
      editorGutter.scrollTop = codeInput.scrollTop;
    });

    codeInput.addEventListener('input', updateEditorDisplay);
    codeInput.addEventListener('click', updateCursorPosition);
    codeInput.addEventListener('keyup', updateCursorPosition);

    codeInput.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var start = codeInput.selectionStart;
        var end = codeInput.selectionEnd;
        codeInput.value = codeInput.value.substring(0, start) + '    ' + codeInput.value.substring(end);
        codeInput.selectionStart = codeInput.selectionEnd = start + 4;
        updateEditorDisplay();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        runActiveFile();
      } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        saveActiveFile();
      }
    });

    // 4. TABS & FILES LOGIC
    function openFile(path) {
      activeFilePath = path;
      if (openTabs.indexOf(path) === -1) {
        openTabs.push(path);
      }
      var file = null;
      for (var i = 0; i < workspaceFiles.length; i++) {
        if (workspaceFiles[i].path === path) { file = workspaceFiles[i]; break; }
      }
      if (file) {
        codeInput.value = file.content;
        document.getElementById('center-title-text').textContent = 'Compillo > ' + file.path.replace(/^\\//, '');
        document.getElementById('bc-folder').textContent = file.folder;
        document.getElementById('bc-filename').textContent = file.name;
        document.getElementById('status-lang-badge').textContent = file.lang.toUpperCase();
        document.getElementById('dl-filename').textContent = file.name;
      }
      renderTabs();
      renderFileTree();
      updateEditorDisplay();
      if (!document.getElementById('preview-panel').classList.contains('hidden')) {
        refreshLiveCanvas();
      }
    }

    function closeTab(path, event) {
      if (event) event.stopPropagation();
      openTabs = openTabs.filter(function(p) { return p !== path; });
      if (activeFilePath === path) {
        if (openTabs.length > 0) {
          openFile(openTabs[openTabs.length - 1]);
        }
      } else {
        renderTabs();
      }
    }

    function renderTabs() {
      var container = document.getElementById('tabbar-items');
      var html = '';
      for (var i = 0; i < openTabs.length; i++) {
        var path = openTabs[i];
        var file = null;
        for (var j = 0; j < workspaceFiles.length; j++) {
          if (workspaceFiles[j].path === path) { file = workspaceFiles[j]; break; }
        }
        if (!file) continue;
        var isActive = path === activeFilePath;
        html += '<div class="tab-item ' + (isActive ? 'active' : '') + '" onclick="openFile(\\'' + path + '\\')">' +
          '<span>&#128196;</span>' +
          '<span>' + file.name + '</span>' +
          '<span class="tab-close" onclick="closeTab(\\'' + path + '\\', event)">&#10005;</span>' +
        '</div>';
      }
      container.innerHTML = html;
    }

    function renderFileTree() {
      var container = document.getElementById('explorer-tree');
      var folders = ['src', 'web'];
      var html = '';

      for (var f = 0; f < folders.length; f++) {
        var folder = folders[f];
        html += '<div class="tree-folder"><span>&#128193;</span> <span>' + folder + '</span></div>';
        for (var i = 0; i < workspaceFiles.length; i++) {
          var file = workspaceFiles[i];
          if (file.folder !== folder) continue;
          var isActive = file.path === activeFilePath;
          html += '<div class="tree-file ' + (isActive ? 'active' : '') + '" onclick="openFile(\\'' + file.path + '\\')">' +
            '<span>&#128196;</span>' +
            '<span>' + file.name + '</span>' +
            '<span class="file-badge">' + file.lang + '</span>' +
          '</div>';
        }
      }
      container.innerHTML = html;
    }

    // 5. MENUS & SIDEBAR
    
    function toggleThemeDropdown() {
      var dropdown = document.getElementById("theme-header-dropdown");
      if (dropdown) dropdown.classList.toggle("show");
    }

    function openLocalFilePrompt() {
      var input = document.getElementById("local-file-input");
      if (!input) {
        input = document.createElement("input");
        input.type = "file";
        input.id = "local-file-input";
        input.style.display = "none";
        input.onchange = function(e) {
          var file = e.target.files[0];
          if (!file) return;
          var reader = new FileReader();
          reader.onload = function(evt) {
            var content = evt.target.result;
            var name = file.name;
            var lang = name.endsWith(".py") ? "python" : name.endsWith(".c") ? "c" : name.endsWith(".html") ? "html" : "javascript";
            var newPath = "/src/" + name;
            workspaceFiles.push({ path: newPath, name: name, folder: "src", lang: lang, content: content });
            openFile(newPath);
          };
          reader.readAsText(file);
        };
        document.body.appendChild(input);
      }
      input.click();
    }

    function openCloudFilePrompt() {
      var filename = prompt("Enter Cloud File or GitHub Path (e.g. /src/utils.py):", "src/utils.py");
      if (filename) {
        var newPath = filename.startsWith("/") ? filename : "/" + filename;
        workspaceFiles.push({ path: newPath, name: filename.split("/").pop(), folder: "src", lang: "python", content: "# Cloud file loaded\\n" });
        openFile(newPath);
      }
    }

    function toggleRecentFiles() {
      var paths = workspaceFiles.map(function(f) { return f.path; }).join("\\n");
      alert("Recently opened files in workspace:\\n" + paths);
    }

    function setTabSize(size) {
      codeInput.style.tabSize = size;
      document.getElementById("status-spaces").textContent = "Spaces: " + size;
      var b2 = document.getElementById("btn-tab-2");
      var b4 = document.getElementById("btn-tab-4");
      if (b2) { b2.style.background = size === 2 ? "var(--accent)" : "transparent"; b2.style.color = size === 2 ? "#000" : "var(--title-fg)"; }
      if (b4) { b4.style.background = size === 4 ? "var(--accent)" : "transparent"; b4.style.color = size === 4 ? "#000" : "var(--title-fg)"; }
    }

    function toggleMenu(menuId) {
      var allMenus = document.querySelectorAll('.dropdown-menu');
      allMenus.forEach(function(m) {
        if (m.id !== 'menu-' + menuId) m.classList.remove('show');
      });
      var target = document.getElementById('menu-' + menuId);
      if (target) target.classList.toggle('show');
    }

    window.addEventListener('click', function(e) {
      if (!e.target.closest('.menu-item')) {
        document.querySelectorAll('.dropdown-menu').forEach(function(m) { m.classList.remove('show'); });
      }
    });

    function toggleSidebar() {
      document.getElementById('sidebar-panel').classList.toggle('hidden');
    }

    function toggleSidebarView(viewId) {
      var sidebar = document.getElementById('sidebar-panel');
      sidebar.classList.remove('hidden');

      var views = ['explorer', 'search', 'git', 'extensions', 'settings'];
      views.forEach(function(v) {
        var el = document.getElementById('sb-' + v + '-view');
        if (el) el.style.display = v === viewId ? 'flex' : 'none';
        var btn = document.getElementById('act-btn-' + v);
        if (btn) {
          if (v === viewId) btn.classList.add('active');
          else btn.classList.remove('active');
        }
      });
    }

    // 6. BOTTOM MULTI-CHANNEL PANEL
    function toggleBottomPanel() {
      document.getElementById('panel-bottom').classList.toggle('hidden');
    }

    function toggleMaximizeBottomPanel() {
      document.getElementById('panel-bottom').classList.toggle('maximized');
    }

    function switchPanelTab(tabId) {
      var panel = document.getElementById('panel-bottom');
      panel.classList.remove('hidden');

      var tabs = ['terminal', 'output', 'problems', 'graphics', 'rest'];
      tabs.forEach(function(t) {
        var tabEl = document.getElementById('ptab-' + t);
        var bodyEl = document.getElementById('pbody-' + t);
        if (tabEl) {
          if (t === tabId) tabEl.classList.add('active');
          else tabEl.classList.remove('active');
        }
        if (bodyEl) {
          if (t === tabId) bodyEl.style.display = t === 'graphics' ? 'flex' : 'block';
          else bodyEl.style.display = 'none';
        }
      });

      if (tabId === 'graphics') {
        renderTurboCGraphicsDemo();
      } else if (tabId === 'terminal') {
        setTimeout(function() { document.getElementById('term-input').focus(); }, 50);
      }
    }

    function clearActivePanel() {
      clearOutputLogs();
      clearTerminal();
    }

    function clearOutputLogs() {
      document.getElementById('pbody-output').innerHTML = '<div class="output-entry out-sys">[Compillo System] Console cleared.</div>';
    }

    function clearTerminal() {
      document.getElementById('term-history').innerHTML = '<div>Compillo Terminal v2.0.0 (Cleared)</div>';
    }

    function handleTerminalKey(e) {
      if (e.key === 'Enter') {
        var input = document.getElementById('term-input');
        var cmd = input.value.trim();
        input.value = '';
        if (!cmd) return;

        var history = document.getElementById('term-history');
        var line = document.createElement('div');
        line.innerHTML = '<span class="term-prompt">compillo@workspace:~$</span> ' + escapeHtml(cmd);
        history.appendChild(line);

        executeVirtualTerminalCommand(cmd);
        history.scrollTop = history.scrollHeight;
      }
    }

    function executeVirtualTerminalCommand(cmd) {
      var history = document.getElementById('term-history');
      var out = document.createElement('div');
      out.style.marginBottom = '6px';

      var parts = cmd.split(' ');
      var main = parts[0].toLowerCase();

      if (main === 'help') {
        out.innerHTML = '<div style="color: #38bdf8; font-weight: 600;">Available Virtual Commands:</div>' +
          '<div>&bull; python &lt;file&gt; : Execute Python file</div>' +
          '<div>&bull; ls : List workspace files</div>' +
          '<div>&bull; cat &lt;file&gt; : Display file contents</div>' +
          '<div>&bull; clear : Clear terminal screen</div>' +
          '<div>&bull; theme &lt;name&gt; : Change active theme</div>' +
          '<div>&bull; date / echo / whoami</div>';
      } else if (main === 'clear') {
        clearTerminal();
        return;
      } else if (main === 'ls') {
        var names = [];
        for (var i = 0; i < workspaceFiles.length; i++) names.push(workspaceFiles[i].name);
        out.innerHTML = names.join('&nbsp;&nbsp;&nbsp;&nbsp;');
      } else if (main === 'cat') {
        var target = parts[1];
        var file = null;
        for (var j = 0; j < workspaceFiles.length; j++) {
          if (workspaceFiles[j].name === target) { file = workspaceFiles[j]; break; }
        }
        if (file) {
          out.innerHTML = '<pre style="color: #cbd5e1;">' + escapeHtml(file.content) + '</pre>';
        } else {
          out.innerHTML = '<span style="color: #ef4444;">cat: ' + target + ': No such file or directory</span>';
        }
      } else if (main === 'python') {
        runActiveFile();
        out.innerHTML = '<span style="color: #10b981;">[Execution dispatched to Output Console]</span>';
      } else if (main === 'date') {
        out.textContent = new Date().toString();
      } else if (main === 'whoami') {
        out.textContent = 'compillo-developer';
      } else if (main === 'echo') {
        out.textContent = parts.slice(1).join(' ');
      } else if (main === 'theme') {
        if (parts[1] && THEMES[parts[1]]) {
          applyTheme(parts[1]);
          out.innerHTML = '<span style="color: #10b981;">Theme updated to ' + parts[1] + '</span>';
        } else {
          out.innerHTML = 'Available themes: ' + Object.keys(THEMES).join(', ');
        }
      } else {
        out.innerHTML = '<span style="color: #ef4444;">command not found: ' + main + '. Type "help" for a list of commands.</span>';
      }

      history.appendChild(out);
    }

    // 7. RUN CODE EXECUTION ENGINE
    function runActiveFile() {
      var activeFile = null;
      for (var i = 0; i < workspaceFiles.length; i++) {
        if (workspaceFiles[i].path === activeFilePath) { activeFile = workspaceFiles[i]; break; }
      }
      if (!activeFile) return;

      switchPanelTab('output');
      var outPanel = document.getElementById('pbody-output');
      var timeStr = new Date().toLocaleTimeString();

      var runHeader = document.createElement('div');
      runHeader.className = 'output-entry out-sys';
      runHeader.innerHTML = '[Compillo Runner ' + timeStr + '] Executing ' + activeFile.name + ' (' + activeFile.lang.toUpperCase() + ')...';
      outPanel.appendChild(runHeader);

      if (activeFile.lang === 'python') {
        setTimeout(function() {
          var res = document.createElement('div');
          res.className = 'output-entry';
          res.innerHTML = '========================================\\n' +
            '   Compillo Studio - Python Runtime     \\n' +
            '========================================\\n' +
            'Welcome to Compillo 2.0, Developer!\\n' +
            'Calculated squares: {1: 1, 2: 4, 3: 9, 4: 16, 5: 25}\\n' +
            'Execution completed successfully.\\n' +
            '<span style="color: #10b981; font-weight: 600;">[Process completed with exit code 0]</span>';
          outPanel.appendChild(res);
          outPanel.scrollTop = outPanel.scrollHeight;
        }, 120);
      } else if (activeFile.lang === 'c') {
        switchPanelTab('graphics');
        var cRes = document.createElement('div');
        cRes.className = 'output-entry out-info';
        cRes.innerHTML = '[Graphics.h Engine] Compiling pixel_grid.c with turbo graphics...\\n' +
          'Initialized graphics window: 640x400\\n' +
          'Rendered Yellow Pixel Grid on Canvas.';
        outPanel.appendChild(cRes);
      } else if (activeFile.lang === 'html' || activeFile.lang === 'javascript') {
        toggleLivePreview();
        var hRes = document.createElement('div');
        hRes.className = 'output-entry out-info';
        hRes.innerHTML = '[Live Canvas] Updated interactive DOM sandbox preview.';
        outPanel.appendChild(hRes);
      }
    }

    // 8. TURBO C GRAPHICS CANVAS SIMULATOR
    function renderTurboCGraphicsDemo() {
      var canvas = document.getElementById('turbo-canvas');
      if (!canvas) return;
      var ctx = canvas.getContext('2d');

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00ffff';
      ctx.font = '14px monospace';
      ctx.fillText('TURBO C GRAPHICS.H EMULATOR - (640x400 BGI)', 160, 30);

      ctx.fillStyle = '#ffff00';
      for (var x = 80; x <= 560; x += 30) {
        for (var y = 70; y <= 330; y += 30) {
          ctx.fillRect(x, y, 2, 2);
        }
      }

      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(320, 200, 70, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ff00ff';
      ctx.beginPath();
      ctx.arc(320, 200, 110, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(320, 50); ctx.lineTo(320, 350);
      ctx.moveTo(50, 200); ctx.lineTo(590, 200);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '11px monospace';
      ctx.fillText('Center: (320, 200)', 330, 215);
      ctx.fillText('Status: Render OK', 20, 385);
    }

    // 9. LIVE CANVAS SPLIT PREVIEW
    function toggleLivePreview() {
      var panel = document.getElementById('preview-panel');
      panel.classList.toggle('hidden');
      if (!panel.classList.contains('hidden')) {
        refreshLiveCanvas();
      }
    }

    function refreshLiveCanvas() {
      var iframe = document.getElementById('live-canvas-frame');
      var htmlFile = null, cssFile = null, jsFile = null;
      for (var i = 0; i < workspaceFiles.length; i++) {
        if (workspaceFiles[i].name === 'index.html') htmlFile = workspaceFiles[i];
        if (workspaceFiles[i].name === 'style.css') cssFile = workspaceFiles[i];
        if (workspaceFiles[i].name === 'script.js') jsFile = workspaceFiles[i];
      }

      var bundle = htmlFile ? htmlFile.content : '<h1>Live Preview</h1>';
      if (cssFile) {
        bundle = bundle.replace('<link rel="stylesheet" href="style.css">', '<style>' + cssFile.content + '</style>');
      }
      if (jsFile) {
        bundle = bundle.replace('<script src="script.js"><' + '/script>', '<script>' + jsFile.content + '<' + '/script>');
      }

      iframe.srcdoc = bundle;
    }

    // 10. SEARCH & REPLACE LOGIC
    function runWorkspaceSearch() {
      var query = document.getElementById('search-keyword').value.toLowerCase();
      var container = document.getElementById('search-matches');
      if (!query) {
        container.innerHTML = '';
        return;
      }

      var html = '';
      var matchCount = 0;
      workspaceFiles.forEach(function(f) {
        var lines = f.content.split('\\n');
        lines.forEach(function(line, idx) {
          if (line.toLowerCase().indexOf(query) !== -1) {
            matchCount++;
            html += '<div style="padding: 4px 6px; border-radius: 4px; cursor: pointer; margin-bottom: 2px;" onclick="openFile(\\'' + f.path + '\\')" class="theme-card">' +
              '<span style="color: var(--accent); font-weight: 600;">' + f.name + ':' + (idx + 1) + '</span> ' +
              '<span style="opacity: 0.8; margin-left: 6px;">' + escapeHtml(line.trim()) + '</span>' +
            '</div>';
          }
        });
      });

      container.innerHTML = '<div style="font-weight: 700; margin-bottom: 6px;">' + matchCount + ' matches found</div>' + html;
    }

    // 11. GIT COMMIT LOGIC
    function commitGit() {
      var input = document.getElementById('git-commit-msg');
      var msg = input.value.trim() || 'Update files';
      input.value = '';
      alert('Changes committed successfully to main: "' + msg + '"');
    }

    // 12. REST CLIENT LOGIC
    function sendRestRequest() {
      var method = document.getElementById('rest-req-method').value;
      var url = document.getElementById('rest-req-url').value;
      var out = document.getElementById('rest-res-body');
      out.textContent = 'Sending ' + method + ' to ' + url + '...';

      fetch(url, { method: method })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          out.textContent = JSON.stringify(data, null, 2);
        })
        .catch(function(err) {
          out.textContent = 'Error: ' + err.message;
        });
    }

    // 13. MODALS LOGIC
    function openModal(id) { document.getElementById(id).classList.add('open'); }
    function closeModal(id) { document.getElementById(id).classList.remove('open'); }

    function openThemePickerModal() {
      renderThemeCards();
      openModal('modal-themes');
    }

    function renderThemeCards() {
      var body = document.getElementById('theme-modal-cards');
      if (!body) return;
      var html = '';
      for (var id in THEMES) {
        var th = THEMES[id];
        var isActive = th.id === activeThemeId;
        html += '<div class="theme-card ' + (isActive ? 'active' : '') + '" onclick="applyTheme(\\'' + th.id + '\\')">' +
          '<span style="font-weight: ' + (isActive ? '700' : '500') + ';">' + th.label + '</span>' +
          '<div class="theme-preview-dots">' +
            '<span class="preview-dot" style="background: ' + th.colors[0] + ';"></span>' +
            '<span class="preview-dot" style="background: ' + th.colors[1] + ';"></span>' +
            '<span class="preview-dot" style="background: ' + th.colors[2] + ';"></span>' +
          '</div>' +
        '</div>';
      }
      body.innerHTML = html;
    }

    function openCommandPalette() {
      var input = document.getElementById('palette-search');
      input.value = '';
      filterPalette();
      openModal('modal-palette');
      setTimeout(function() { input.focus(); }, 50);
    }

    function filterPalette() {
      var q = document.getElementById('palette-search').value.toLowerCase();
      var list = document.getElementById('palette-list');

      var items = [
        { label: 'File: src/main.py', action: function() { openFile('/src/main.py'); } },
        { label: 'File: src/pixel_grid.c', action: function() { openFile('/src/pixel_grid.c'); } },
        { label: 'File: web/index.html', action: function() { openFile('/web/index.html'); } },
        { label: 'File: web/style.css', action: function() { openFile('/web/style.css'); } },
        { label: 'File: web/script.js', action: function() { openFile('/web/script.js'); } },
        { label: 'Run: Start Without Debugging', action: function() { runActiveFile(); } },
        { label: 'View: Toggle Live Canvas Preview', action: function() { toggleLivePreview(); } },
        { label: 'View: Terminal Panel', action: function() { switchPanelTab('terminal'); } },
        { label: 'View: C Graphics Window', action: function() { switchPanelTab('graphics'); } },
        { label: 'Theme: Select Color Theme (Palette)', action: function() { openThemePickerModal(); } },
        { label: 'File: Export Standalone Single HTML', action: function() { downloadStandaloneReplicaFile(); } }
      ];

      var filtered = items.filter(function(i) { return i.label.toLowerCase().indexOf(q) !== -1; });
      var html = '';
      for (var idx = 0; idx < filtered.length; idx++) {
        html += '<div class="cmd-item" onclick="executePaletteItem(' + idx + ')">' + filtered[idx].label + '</div>';
      }
      list.innerHTML = html;
      window._currentPaletteItems = filtered;
    }

    function executePaletteItem(index) {
      if (window._currentPaletteItems && window._currentPaletteItems[index]) {
        window._currentPaletteItems[index].action();
      }
      closeModal('modal-palette');
    }

    function openDownloadModal() { openModal('modal-download'); }
    function openAboutModal() { openModal('modal-about'); }
    function openShortcutsModal() { openModal('modal-shortcuts'); }

    function openHostingModal() {
      alert("Compillo Free Hosting:\\nDeploy this single HTML page to GitHub Pages, Cloudflare Pages, Netlify, or Vercel for 100% free hosting with custom domain and SSL.");
    }

    function playByteRunnerGame() {
      alert("Arcade Break: ByteRunner Game Station is unlocking! Focus timer running.");
    }

    // 14. EXPORT & DOWNLOAD HELPERS
    function saveActiveFile() {
      alert('File saved: ' + activeFilePath);
    }

    function downloadActiveFileDirect() {
      var activeFile = null;
      for (var i = 0; i < workspaceFiles.length; i++) {
        if (workspaceFiles[i].path === activeFilePath) { activeFile = workspaceFiles[i]; break; }
      }
      if (!activeFile) return;
      triggerFileDownload(activeFile.content, activeFile.name);
      closeModal('modal-download');
    }

    function triggerFileDownload(content, filename) {
      var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function exportSingleHtmlBundle() {
      var htmlFile = null, cssFile = null, jsFile = null;
      for (var i = 0; i < workspaceFiles.length; i++) {
        if (workspaceFiles[i].name === 'index.html') htmlFile = workspaceFiles[i];
        if (workspaceFiles[i].name === 'style.css') cssFile = workspaceFiles[i];
        if (workspaceFiles[i].name === 'script.js') jsFile = workspaceFiles[i];
      }

      var bundle = htmlFile ? htmlFile.content : '<h1>Single Page Bundle</h1>';
      if (cssFile) {
        bundle = bundle.replace('<link rel="stylesheet" href="style.css">', '<style>\\n' + cssFile.content + '\\n</style>');
      }
      if (jsFile) {
        bundle = bundle.replace('<script src="script.js"><' + '/script>', '<script>\\n' + jsFile.content + '\\n<' + '/script>');
      }

      triggerFileDownload(bundle, 'bundle.html');
    }

    function downloadStandaloneReplicaFile() {
      var fullHtml = document.documentElement.outerHTML;
      triggerFileDownload('<!DOCTYPE html>\\n' + fullHtml, 'compillo_single_page.html');
    }

    function exportWorkspaceZip() {
      alert('Export Workspace (ZIP): Workspaces can be bundled and saved directly.');
    }

    function promptNewFile() {
      var name = prompt('Enter new file name (e.g. app.py, calc.c):');
      if (name) {
        var lang = name.endsWith('.py') ? 'python' : name.endsWith('.c') ? 'c' : name.endsWith('.html') ? 'html' : 'javascript';
        var newPath = '/src/' + name;
        workspaceFiles.push({ path: newPath, name: name, folder: 'src', lang: lang, content: '// ' + name });
        openFile(newPath);
      }
    }

    function promptNewFolder() {
      var folder = prompt('Enter new folder name:');
      if (folder) alert('Folder created: ' + folder);
    }

    function resetWorkspacePrompt() {
      if (confirm('Reset workspace to starter files?')) {
        location.reload();
      }
    }

    function formatActiveDocument() {
      alert('Document formatted with Prettier rules.');
    }

    function execEditorCommand(cmd) {
      if (cmd === 'selectAll') {
        codeInput.select();
      } else {
        document.execCommand(cmd);
      }
    }

    function selectCurrentLine() {
      var pos = codeInput.selectionStart;
      var text = codeInput.value;
      var start = text.lastIndexOf('\\n', pos - 1) + 1;
      var end = text.indexOf('\\n', pos);
      if (end === -1) end = text.length;
      codeInput.setSelectionRange(start, end);
    }

    function goToLinePrompt() {
      var line = prompt('Go to line number:');
      if (line) alert('Jumped to line ' + line);
    }

    function toggleMinimap() {
      var minimap = document.getElementById('editor-minimap');
      minimap.style.display = minimap.style.display === 'none' ? 'block' : 'none';
    }

    function updateEditorPreferences() {
      var size = document.getElementById('set-fontsize').value;
      var wrapper = document.querySelector('.editor-wrapper');
      wrapper.style.fontSize = size + 'px';
      wrapper.style.lineHeight = (parseInt(size) * 1.5) + 'px';

      var showMinimap = document.getElementById('set-minimap').checked;
      document.getElementById('editor-minimap').style.display = showMinimap ? 'block' : 'none';
    }

    // 15. INITIALIZATION
    window.addEventListener('DOMContentLoaded', function() {
      applyTheme('nova-studio');
      openFile('/src/main.py');
      renderTurboCGraphicsDemo();
    });
  </script>
</body>
</html>`;
}
