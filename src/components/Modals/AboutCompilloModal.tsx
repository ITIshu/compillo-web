import React, { useState } from 'react';
import {
  X,
  Info,
  Sparkles,
  Keyboard,
  Globe,
  Code2,
  Terminal,
  Cpu,
  GraduationCap,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Layers,
  FileCode,
  Zap,
  RotateCcw,
  Palette,
} from 'lucide-react';
import { CompilloThemeDefinition } from '../../services/themes';

interface AboutCompilloModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: CompilloThemeDefinition;
  initialTab?: 'about' | 'graphics' | 'shortcuts' | 'labs' | 'options';
  onOpenKeyboardShortcuts?: () => void;
  onOpenEduLabs?: () => void;
  onOpenFreeHosting?: () => void;
  onResetWorkspace?: () => void;
}

export const AboutCompilloModal: React.FC<AboutCompilloModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  initialTab = 'about',
  onOpenKeyboardShortcuts,
  onOpenEduLabs,
  onOpenFreeHosting,
  onResetWorkspace,
}) => {
  const [activeTab, setActiveTab] = useState<'about' | 'graphics' | 'shortcuts' | 'labs' | 'options'>(initialTab);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCode = (code: string, key: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isLight = currentTheme.type === 'light';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl shadow-2xl border flex flex-col max-h-[92vh] overflow-hidden select-text text-[12px]"
        style={{
          backgroundColor: currentTheme.ui.sideBarBg,
          borderColor: currentTheme.ui.sideBarBorder,
          color: currentTheme.ui.sideBarFg,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Code2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">About Compillo Studio</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-mono font-semibold border border-sky-500/30">
                  v2.5.0
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 hidden sm:inline-block">
                  Universal Edition
                </span>
              </div>
              <p className="text-xs opacity-75">
                Full-stack developer studio, universal code runner & graphics workstation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className="flex items-center overflow-x-auto border-b px-4 gap-1 bg-black/5 dark:bg-white/5 scrollbar-none"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'about'
                ? 'border-sky-500 text-sky-400 bg-sky-500/10'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Info size={14} />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('graphics')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'graphics'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Palette size={14} className="text-emerald-400" />
            <span>C/C++ Graphics & OpenGL</span>
          </button>

          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'shortcuts'
                ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Keyboard size={14} />
            <span>Key Shortcuts</span>
          </button>

          <button
            onClick={() => setActiveTab('labs')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'labs'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <GraduationCap size={14} />
            <span>University Labs</span>
          </button>

          <button
            onClick={() => setActiveTab('options')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'options'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Zap size={14} />
            <span>Other Options & Tools</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              {/* Hero Banner */}
              <div className="p-4 rounded-xl border bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border-sky-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-sky-400 flex items-center gap-1.5">
                    <Sparkles size={16} className="text-amber-400" />
                    Compillo Studio Architecture
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                    Production Grade
                  </span>
                </div>
                <p className="opacity-85 text-xs leading-relaxed">
                  <strong>Compillo Studio</strong> is a modern, zero-install, cloud-native developer studio built for students, university scholars, and professional software engineers. It integrates Monaco editor technology, an in-browser universal multi-language execution engine, live graphics and OpenGL rendering, Git version control, offline PWA capabilities, and an arcade break focus system.
                </p>
              </div>

              {/* Creator & Scholar Information */}
              <div
                className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 space-y-2"
                style={{ borderColor: currentTheme.ui.sideBarBorder }}
              >
                <h3 className="font-bold text-xs flex items-center gap-2 text-amber-400">
                  <GraduationCap size={15} />
                  <span>Academic Origins & Creator</span>
                </h3>
                <p className="opacity-80">
                  Authored and curated by <strong>K. Lavania</strong> (<span className="font-mono text-sky-300">k@lavania.in</span>), Scholar at <strong>Rajasthan Technical University (RTU)</strong>. Designed specifically to empower university students with free, instant access to complete compiler toolchains without complex local configuration.
                </p>
              </div>

              {/* Core Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 rounded-lg border bg-black/10 dark:bg-white/5 border-white/10 space-y-1">
                  <span className="font-bold text-sky-400 flex items-center gap-1.5">
                    <Cpu size={14} /> 15+ Language Universal Runner
                  </span>
                  <p className="text-[11px] opacity-75">
                    Zero-cost compilation and execution for C, C++, Python 3, Java, Rust, Go, TypeScript, JavaScript, SQL, Bash, HTML, CSS, JSON, and Markdown.
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-black/10 dark:bg-white/5 border-white/10 space-y-1">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Palette size={14} /> C/C++ Graphics Framebuffer Window
                  </span>
                  <p className="text-[11px] opacity-75">
                    Interactive canvas & virtual framebuffer supporting both classic BGI <code>&lt;graphics.h&gt;</code> and modern <code>&lt;GL/glut.h&gt;</code> OpenGL programs!
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-black/10 dark:bg-white/5 border-white/10 space-y-1">
                  <span className="font-bold text-purple-400 flex items-center gap-1.5">
                    <GraduationCap size={14} /> University Lab Experiments
                  </span>
                  <p className="text-[11px] opacity-75">
                    Built-in RTU Kota / AKTU / VTU computer science lab syllabi with 1-click loading, automated test runner, and lab badge achievements.
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-black/10 dark:bg-white/5 border-white/10 space-y-1">
                  <span className="font-bold text-teal-400 flex items-center gap-1.5">
                    <ShieldCheck size={14} /> Cloud Profile & Google OAuth
                  </span>
                  <p className="text-[11px] opacity-75">
                    Secure client-side Google OAuth 2.0 authentication and Firebase persistence to sync workspace settings and coding statistics.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: C/C++ GRAPHICS & OPENGL */}
          {activeTab === 'graphics' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
                    <Palette size={16} /> C/C++ Graphics & OpenGL Framebuffer Engine
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    Live Canvas Window
                  </span>
                </div>
                <p className="opacity-85 text-xs leading-relaxed">
                  Compillo Studio features a built-in virtual framebuffer and graphics pipeline. When you run C or C++ programs using <strong><code>&lt;graphics.h&gt;</code></strong> or <strong><code>&lt;GL/glut.h&gt;</code></strong>, Compillo automatically opens a dedicated <strong>Graphics Framebuffer Window</strong> and renders the output in real time.
                </p>
              </div>

              {/* Example 1: BGI graphics.h */}
              <div className="p-3.5 rounded-xl border bg-black/20 border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">1. Borland BGI &lt;graphics.h&gt; Program</span>
                  <button
                    onClick={() =>
                      copyCode(
                        `#include <graphics.h>\n#include <stdio.h>\n\nint main() {\n    int gd = DETECT, gm;\n    initgraph(&gd, &gm, "");\n\n    setcolor(RED);\n    circle(200, 150, 70);\n\n    setcolor(CYAN);\n    rectangle(80, 80, 320, 220);\n\n    setcolor(YELLOW);\n    line(50, 50, 350, 250);\n\n    setcolor(WHITE);\n    outtextxy(100, 270, "Compillo Studio Graphics Window");\n\n    closegraph();\n    return 0;\n}`,
                        'bgi-code'
                      )
                    }
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-semibold flex items-center gap-1"
                  >
                    {copiedKey === 'bgi-code' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedKey === 'bgi-code' ? 'Copied' : 'Copy Sample Code'}</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-black/40 font-mono text-[11px] text-emerald-300 overflow-x-auto border border-white/5">
{`#include <graphics.h>

int main() {
    int gd = DETECT, gm;
    initgraph(&gd, &gm, "");

    setcolor(RED);
    circle(200, 150, 70);

    setcolor(CYAN);
    rectangle(80, 80, 320, 220);

    setcolor(YELLOW);
    line(50, 50, 350, 250);

    outtextxy(100, 270, "Compillo Studio Graphics Window");

    closegraph();
    return 0;
}`}
                </pre>
              </div>

              {/* Example 2: OpenGL / GLUT */}
              <div className="p-3.5 rounded-xl border bg-black/20 border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">2. OpenGL & GLUT &lt;GL/glut.h&gt; Program</span>
                  <button
                    onClick={() =>
                      copyCode(
                        `#include <GL/glut.h>\n\nvoid display() {\n    glClear(GL_COLOR_BUFFER_BIT);\n    glBegin(GL_TRIANGLES);\n        glColor3f(1.0, 0.0, 0.0);\n        glVertex2f(-0.6, -0.6);\n        glColor3f(0.0, 1.0, 0.0);\n        glVertex2f(0.6, -0.6);\n        glColor3f(0.0, 0.0, 1.0);\n        glVertex2f(0.0, 0.6);\n    glEnd();\n    glFlush();\n}\n\nint main(int argc, char** argv) {\n    glutInit(&argc, argv);\n    glutInitWindowSize(500, 400);\n    glutCreateWindow("Compillo OpenGL Window");\n    glutDisplayFunc(display);\n    glutMainLoop();\n    return 0;\n}`,
                        'opengl-code'
                      )
                    }
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-semibold flex items-center gap-1"
                  >
                    {copiedKey === 'opengl-code' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedKey === 'opengl-code' ? 'Copied' : 'Copy Sample Code'}</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-black/40 font-mono text-[11px] text-sky-300 overflow-x-auto border border-white/5">
{`#include <GL/glut.h>

void display() {
    glClear(GL_COLOR_BUFFER_BIT);
    glBegin(GL_TRIANGLES);
        glColor3f(1.0, 0.0, 0.0);
        glVertex2f(-0.6, -0.6);
        glColor3f(0.0, 1.0, 0.0);
        glVertex2f(0.6, -0.6);
        glColor3f(0.0, 0.0, 1.0);
        glVertex2f(0.0, 0.6);
    glEnd();
    glFlush();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitWindowSize(500, 400);\n    glutCreateWindow("Compillo OpenGL Window");\n    glutDisplayFunc(display);\n    glutMainLoop();\n    return 0;\n}`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: KEYBOARD SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Essential Keyboard Shortcuts</span>
                {onOpenKeyboardShortcuts && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenKeyboardShortcuts();
                    }}
                    className="text-xs text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <span>View All 50+ Shortcuts</span>
                    <ExternalLink size={12} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { key: 'Ctrl + Enter', label: 'Run Active Code (Universal Runner)' },
                  { key: 'Ctrl + S', label: 'Save Active File' },
                  { key: 'Ctrl + P', label: 'Quick File Open' },
                  { key: 'Ctrl + Shift + P', label: 'Command Palette' },
                  { key: 'Ctrl + B', label: 'Toggle Primary Sidebar' },
                  { key: 'Ctrl + J', label: 'Toggle Bottom Panel & Terminal' },
                  { key: 'Ctrl + Shift + U', label: 'University Programming Labs' },
                  { key: 'Shift + Alt + F', label: 'Format Document (Prettier)' },
                  { key: 'Ctrl + \\', label: 'Split Editor Window' },
                  { key: 'Ctrl + I', label: 'Import Files or ZIP Archive' },
                ].map((s) => (
                  <div
                    key={s.key}
                    className="p-2.5 rounded-lg border bg-black/10 dark:bg-white/5 border-white/10 flex items-center justify-between"
                  >
                    <span className="opacity-80">{s.label}</span>
                    <kbd className="px-2 py-0.5 rounded font-mono text-[10.5px] bg-white/10 text-white font-semibold">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: UNIVERSITY LABS */}
          {activeTab === 'labs' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-amber-400 flex items-center gap-1.5">
                    <GraduationCap size={16} /> RTU / AKTU / VTU Syllabus Integration
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    B.Tech CSE / IT
                  </span>
                </div>
                <p className="opacity-85 text-xs leading-relaxed">
                  Compillo Studio features the complete official practical lab syllabus for <strong>Rajasthan Technical University (RTU Kota)</strong> and partner state engineering universities.
                </p>
                {onOpenEduLabs && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenEduLabs();
                    }}
                    className="px-3 py-1.5 rounded-lg font-bold text-xs bg-amber-500 hover:bg-amber-600 text-black flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <GraduationCap size={14} />
                    <span>Launch University Lab Experiments</span>
                  </button>
                )}
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="font-semibold text-white block">Covered Lab Experiments:</span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] opacity-80 list-disc pl-5">
                  <li>Exp 1: Fundamental Data Types & Operators</li>
                  <li>Exp 2: Control Flow (Branching & Looping)</li>
                  <li>Exp 3: Functions, Recursion & Lambda</li>
                  <li>Exp 4: String Manipulation & Formatting</li>
                  <li>Exp 5: Lists, Tuples, Dictionaries & Sets</li>
                  <li>Exp 6: OOP (Classes, Objects, Inheritance)</li>
                  <li>Exp 7: File I/O & Exception Handling</li>
                  <li>Exp 8: Numerical Computing & NumPy</li>
                  <li>Exp 9: Data Science & Matplotlib Plots</li>
                  <li>Exp 10: Capstone Project & Lab Exam</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 5: OTHER OPTIONS & TOOLS */}
          {activeTab === 'options' && (
            <div className="space-y-3">
              <span className="font-bold text-white">Workstation Tools & Maintenance Options</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Free Cloud Hosting */}
                <div className="p-3.5 rounded-xl border bg-black/10 dark:bg-white/5 border-white/10 space-y-2 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                      <Globe size={14} /> Free Cloud Hosting ($0)
                    </h4>
                    <p className="text-[11px] opacity-75 mt-1">
                      View your active live public URL and 1-click free deployment configs for Render, Koyeb, Vercel, and Cloud Run.
                    </p>
                  </div>
                  {onOpenFreeHosting && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenFreeHosting();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-[11px] flex items-center gap-1 border border-emerald-500/30"
                    >
                      <Globe size={12} /> Open Hosting Guide
                    </button>
                  )}
                </div>

                {/* Reset Workspace */}
                <div className="p-3.5 rounded-xl border bg-black/10 dark:bg-white/5 border-white/10 space-y-2 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-red-400 flex items-center gap-1.5">
                      <RotateCcw size={14} /> Reset Workspace & Cache
                    </h4>
                    <p className="text-[11px] opacity-75 mt-1">
                      Restore default starter files, clean temporary test files, and reset execution caches.
                    </p>
                  </div>
                  {onResetWorkspace && (
                    <button
                      onClick={() => {
                        onClose();
                        onResetWorkspace();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold text-[11px] flex items-center gap-1 border border-red-500/30"
                    >
                      <RotateCcw size={12} /> Reset Workspace
                    </button>
                  )}
                </div>
              </div>

              {/* License & Environment */}
              <div className="p-3 rounded-lg border bg-black/5 dark:bg-white/5 border-white/10 text-[11px] opacity-75 space-y-1">
                <div className="flex items-center justify-between">
                  <span>License: MIT Open Source</span>
                  <span>Runtime: Node 20 / Vite 8 / WebAssembly</span>
                </div>
                <div>Compillo Studio — Designed with precision for computer science education.</div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t shrink-0 bg-black/5 dark:bg-white/5"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <div className="flex items-center gap-2 text-xs opacity-75">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>Compillo Studio v2.5.0 • Ready & Active</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
