import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Globe,
  Play,
  Send,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { WebsiteThemeTokens } from './WebsitePageTheme';

interface ApiSecurityBetaPageProps {
  tokens: WebsiteThemeTokens;
}

type LabMode = 'code-audit' | 'site-audit' | 'http-tester';
type AuditLang = 'python' | 'javascript' | 'html' | 'cpp';

interface AuditFinding {
  line: number;
  severity: 'critical' | 'warning' | 'info';
  rule: string;
  message: string;
  fixHint: string;
}

interface SiteAuditCheck {
  name: string;
  passed: boolean;
  detail: string;
}

const CODE_SAMPLES: Record<AuditLang, { label: string; code: string }> = {
  python: {
    label: 'Python Risky Sample',
    code: `import os

API_SECRET = "sk-liveExampleSecretKey1234567890"

def add_item(item, bucket=[]):
    bucket.append(item)
    return bucket

def run_user_expr(expr):
    try:
        return eval(expr)
    except:
        return None
`,
  },
  javascript: {
    label: 'JavaScript XSS Sample',
    code: `function renderGreeting(nameInput) {
  const box = document.getElementById("greeting");
  box.innerHTML = "Welcome " + nameInput;
}

function pollForever() {
  while (true) {
    console.log("polling...");
  }
}
`,
  },
  html: {
    label: 'HTML Audit Sample',
    code: `<html>
<body>
  <a href="javascript:alert('xss')">Click here</a>
  <script src="http://cdn.example.com/legacy.js"></script>
  <button onclick="submitForm()">Submit</button>
</body>
</html>`,
  },
  cpp: {
    label: 'C++ Memory Sample',
    code: `#include <cstdio>
#include <cstring>

struct Node { int val; Node* next; };

void printNode(Node* head, const char* input) {
    char buf[32];
    strcpy(buf, input);
    printf("%d %s\\n", head->val, buf);
}`,
  },
};

export const ApiSecurityBetaPage: React.FC<ApiSecurityBetaPageProps> = ({ tokens }) => {
  const [mode, setMode] = useState<LabMode>('code-audit');

  // 1. Code Crash & Security Audit State
  const [language, setLanguage] = useState<AuditLang>('python');
  const [code, setCode] = useState(CODE_SAMPLES.python.code);
  const [auditingCode, setAuditingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeResult, setCodeResult] = useState<{
    score: number;
    lineCount: number;
    criticalCount: number;
    warningCount: number;
    findings: AuditFinding[];
  } | null>(null);

  // 2. Hosted Site Audit State
  const [siteSlug, setSiteSlug] = useState('ishant-calculator');
  const [auditingSite, setAuditingSite] = useState(false);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [siteResult, setSiteResult] = useState<{
    slug: string;
    livePath: string;
    status: number;
    latencyMs: number;
    sizeBytes: number;
    healthScore: number;
    title: string;
    checks: SiteAuditCheck[];
  } | null>(null);

  // 3. Local HTTP Endpoint Tester State
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [httpPath, setHttpPath] = useState('/api/health');
  const [httpBody, setHttpBody] = useState(
    JSON.stringify(
      {
        sessionId: 'beta_http_check',
        preset: 'university',
        sql: 'SELECT roll_no, full_name, department FROM students;',
      },
      null,
      2
    )
  );
  const [sendingHttp, setSendingHttp] = useState(false);
  const [httpError, setHttpError] = useState<string | null>(null);
  const [httpResult, setHttpResult] = useState<{
    status: number;
    statusText: string;
    latencyMs: number;
    sizeBytes: number;
    headers: Record<string, string>;
    body: string;
  } | null>(null);

  const runCodeAudit = async () => {
    setAuditingCode(true);
    setCodeError(null);
    try {
      const res = await fetch('/api/beta/code-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setCodeError(data.error || 'Static audit failed');
      } else {
        setCodeResult(data);
      }
    } catch (err: any) {
      setCodeError(err?.message || 'Unable to reach audit server');
    } finally {
      setAuditingCode(false);
    }
  };

  const runSiteAudit = async (overrideSlug?: string) => {
    const targetSlug = (overrideSlug ?? siteSlug).trim();
    if (!targetSlug) return;
    setSiteSlug(targetSlug);
    setAuditingSite(true);
    setSiteError(null);
    try {
      const res = await fetch('/api/beta/site-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: targetSlug }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSiteError(data.error || 'Site audit failed');
      } else {
        setSiteResult(data);
      }
    } catch (err: any) {
      setSiteError(err?.message || 'Unable to reach site audit server');
    } finally {
      setAuditingSite(false);
    }
  };

  const runHttpTest = async (
    overrideMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE',
    overridePath?: string,
    overrideBody?: string
  ) => {
    const m = overrideMethod ?? httpMethod;
    const p = (overridePath ?? httpPath).trim();
    const b = overrideBody ?? httpBody;
    if (overrideMethod) setHttpMethod(overrideMethod);
    if (overridePath) setHttpPath(overridePath);
    if (overrideBody !== undefined) setHttpBody(overrideBody);

    setSendingHttp(true);
    setHttpError(null);
    try {
      const res = await fetch('/api/beta/http-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: m,
          path: p,
          body: m === 'POST' || m === 'PUT' ? b : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setHttpError(data.error || 'HTTP request failed');
      } else {
        setHttpResult(data);
      }
    } catch (err: any) {
      setHttpError(err?.message || 'Unable to reach HTTP tester');
    } finally {
      setSendingHttp(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header & Segmented Mode Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b pb-6" style={{ borderColor: tokens.borderColor }}>
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-medium" style={{ color: tokens.fgMuted }}>
            Beta Labs · Security &amp; Diagnostics
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
            API Tester, Site Audit &amp; Code Crash Scanner
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: tokens.fgMuted }}>
            Scan Python, JS, HTML, or C++ snippets for crash and security hazards, inspect live hosted pages, or test local Compillo endpoints before shipping.
          </p>
        </div>

        <div
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg border shrink-0"
          style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg }}
          role="tablist"
        >
          {[
            { id: 'code-audit' as const, label: 'Code Security Scanner' },
            { id: 'site-audit' as const, label: 'Hosted Site Audit' },
            { id: 'http-tester' as const, label: 'Endpoint HTTP Tester' },
          ].map((tab) => {
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(tab.id)}
                className="px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer"
                style={
                  active
                    ? { backgroundColor: tokens.accent, color: tokens.accentText }
                    : { color: tokens.fgMuted }
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode 1: Code Crash & Security Scanner */}
      {mode === 'code-audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div
            className="lg:col-span-6 p-5 rounded-xl border space-y-4"
            style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {(['python', 'javascript', 'html', 'cpp'] as AuditLang[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      setLanguage(lang);
                      setCode(CODE_SAMPLES[lang].code);
                      setCodeResult(null);
                      setCodeError(null);
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold border cursor-pointer"
                    style={
                      language === lang
                        ? { backgroundColor: tokens.accent, color: tokens.accentText, borderColor: tokens.accent }
                        : { backgroundColor: tokens.pageBg, color: tokens.fgMuted, borderColor: tokens.borderColor }
                    }
                  >
                    {lang === 'python' ? 'Python AST' : lang === 'javascript' ? 'JavaScript' : lang === 'html' ? 'HTML' : 'C++'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={auditingCode}
                onClick={runCodeAudit}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
              >
                <Play size={13} />
                <span>{auditingCode ? 'Scanning...' : 'Run Static Audit'}</span>
              </button>
            </div>

            <textarea
              rows={14}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="w-full p-3.5 rounded-lg border font-mono text-xs leading-relaxed outline-none resize-y"
              style={{
                backgroundColor: tokens.pageBg,
                borderColor: tokens.borderColor,
                color: tokens.fgPrimary,
              }}
            />
          </div>

          <div
            className="lg:col-span-6 p-5 rounded-xl border space-y-4"
            style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: tokens.borderColor }}>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} style={{ color: tokens.accent }} />
                <span className="text-sm font-bold">Static Audit Report</span>
              </div>
              {codeResult && (
                <div className="text-xs font-mono tabular-nums">
                  Safety Score: <strong style={{ color: codeResult.score >= 80 ? '#10b981' : codeResult.score >= 50 ? '#f59e0b' : '#f87171' }}>{codeResult.score}/100</strong>
                  <span style={{ color: tokens.fgMuted }}> · {codeResult.lineCount} lines</span>
                </div>
              )}
            </div>

            {codeError && (
              <div className="p-3 rounded-lg border border-rose-500/40 text-xs text-rose-400">
                {codeError}
              </div>
            )}

            {!codeResult ? (
              <div className="py-12 text-center space-y-2 text-xs" style={{ color: tokens.fgMuted }}>
                <p>Click <strong>Run Static Audit</strong> to inspect the selected snippet with Python AST / structural safety rules.</p>
              </div>
            ) : codeResult.findings.length === 0 ? (
              <div className="p-5 rounded-lg border border-emerald-500/40 flex items-center gap-3 text-xs text-emerald-400">
                <CheckCircle2 size={18} />
                <div>
                  <div className="font-bold">Zero crash or security findings detected</div>
                  <div style={{ color: tokens.fgMuted }}>Code passed AST, unbounded loop, unsafe sink, and hardcoded secret checks.</div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {codeResult.findings.map((finding, idx) => (
                  <div
                    key={`${finding.rule}-${finding.line}-${idx}`}
                    className="p-3.5 rounded-lg border space-y-1.5 text-xs"
                    style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 font-semibold"
                        style={{
                          color:
                            finding.severity === 'critical'
                              ? '#f87171'
                              : finding.severity === 'warning'
                              ? '#fbbf24'
                              : tokens.accent,
                        }}
                      >
                        <ShieldAlert size={13} />
                        <span>{finding.severity.toUpperCase()} · {finding.rule}</span>
                      </span>
                      <span className="font-mono tabular-nums text-[11px]" style={{ color: tokens.fgMuted }}>
                        Line {finding.line}
                      </span>
                    </div>
                    <p style={{ color: tokens.fgPrimary }}>{finding.message}</p>
                    <p className="text-[11px]" style={{ color: tokens.fgMuted }}>
                      Fix: {finding.fixHint}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: Hosted Site Health Audit */}
      {mode === 'site-audit' && (
        <div className="space-y-6">
          <div
            className="p-5 rounded-xl border flex flex-col sm:flex-row sm:items-end justify-between gap-4"
            style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
          >
            <div className="flex-1 space-y-2">
              <label htmlFor="site-audit-slug" className="text-xs font-semibold block">
                Hosted App Route Slug
              </label>
              <div className="flex items-center rounded-lg border overflow-hidden max-w-md" style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}>
                <span className="px-3 py-2 text-xs font-mono border-r shrink-0" style={{ borderColor: tokens.borderColor, color: tokens.fgMuted }}>
                  /hosted/
                </span>
                <input
                  id="site-audit-slug"
                  type="text"
                  value={siteSlug}
                  onChange={(e) => setSiteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="flex-1 min-w-0 px-3 py-2 text-xs font-mono outline-none"
                  style={{ backgroundColor: tokens.pageBg, color: tokens.fgPrimary }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs pt-1" style={{ color: tokens.fgMuted }}>
                <span>Presets:</span>
                {['ishant-calculator', 'pycalc'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => runSiteAudit(preset)}
                    className="underline cursor-pointer hover:opacity-80"
                    style={{ color: tokens.accent }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={auditingSite}
              onClick={() => runSiteAudit()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
              style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
            >
              <Globe size={14} />
              <span>{auditingSite ? 'Auditing Route...' : 'Run Site Audit'}</span>
            </button>
          </div>

          {siteError && (
            <div className="p-3.5 rounded-lg border border-rose-500/40 text-xs text-rose-400">
              {siteError}
            </div>
          )}

          {siteResult && (
            <div
              className="p-6 rounded-xl border space-y-5"
              style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4" style={{ borderColor: tokens.borderColor }}>
                <div className="space-y-1">
                  <div className="text-sm font-bold">{siteResult.title || siteResult.livePath}</div>
                  <div className="text-xs font-mono tabular-nums" style={{ color: tokens.fgMuted }}>
                    HTTP {siteResult.status} · {siteResult.latencyMs} ms · {(siteResult.sizeBytes / 1024).toFixed(1)} KB · Health Score {siteResult.healthScore}%
                  </div>
                </div>
                <a
                  href={siteResult.livePath}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold"
                  style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.accent }}
                >
                  <ExternalLink size={13} />
                  <span>Open Live Route</span>
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {siteResult.checks.map((chk) => (
                  <div
                    key={chk.name}
                    className="p-3.5 rounded-lg border flex items-start gap-3 text-xs"
                    style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor }}
                  >
                    {chk.passed ? (
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <div className="font-semibold">{chk.name}</div>
                      <div style={{ color: tokens.fgMuted }}>{chk.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 3: Local Endpoint HTTP Tester */}
      {mode === 'http-tester' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div
            className="lg:col-span-5 p-5 rounded-xl border space-y-4"
            style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold block">Target Compillo Endpoint</label>
              <div className="flex items-center gap-2">
                <select
                  value={httpMethod}
                  onChange={(e) => setHttpMethod(e.target.value as any)}
                  className="px-3 py-2 rounded-lg border text-xs font-mono font-bold outline-none cursor-pointer"
                  style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor, color: tokens.fgPrimary }}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <input
                  type="text"
                  value={httpPath}
                  onChange={(e) => setHttpPath(e.target.value)}
                  placeholder="/hosted/ishant-calculator/"
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border text-xs font-mono outline-none"
                  style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor, color: tokens.fgPrimary }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs pt-1" style={{ color: tokens.fgMuted }}>
                <span>Quick targets:</span>
                <button
                  type="button"
                  onClick={() => runHttpTest('GET', '/api/health')}
                  className="underline cursor-pointer"
                  style={{ color: tokens.accent }}
                >
                  GET /api/health
                </button>
                <button
                  type="button"
                  onClick={() => runHttpTest('GET', '/hosted/ishant-calculator/')}
                  className="underline cursor-pointer"
                  style={{ color: tokens.accent }}
                >
                  GET /hosted/ishant-calculator/
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runHttpTest(
                      'POST',
                      '/api/sql/run',
                      JSON.stringify(
                        {
                          sessionId: 'beta_http_check',
                          preset: 'university',
                          sql: 'SELECT roll_no, full_name, department FROM students;',
                        },
                        null,
                        2
                      )
                    )
                  }
                  className="underline cursor-pointer"
                  style={{ color: tokens.accent }}
                >
                  POST /api/sql/run
                </button>
              </div>
            </div>

            {(httpMethod === 'POST' || httpMethod === 'PUT') && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold block">JSON Request Body</label>
                <textarea
                  rows={7}
                  value={httpBody}
                  onChange={(e) => setHttpBody(e.target.value)}
                  spellCheck={false}
                  className="w-full p-3 rounded-lg border font-mono text-xs outline-none resize-y"
                  style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor, color: tokens.fgPrimary }}
                />
              </div>
            )}

            <button
              type="button"
              disabled={sendingHttp}
              onClick={() => runHttpTest()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer"
              style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
            >
              <Send size={13} />
              <span>{sendingHttp ? 'Sending Request...' : 'Send Request'}</span>
            </button>
          </div>

          <div
            className="lg:col-span-7 p-5 rounded-xl border space-y-4"
            style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: tokens.borderColor }}>
              <span className="text-sm font-bold">HTTP Response Inspector</span>
              {httpResult && (
                <span className="text-xs font-mono tabular-nums" style={{ color: httpResult.status < 400 ? '#10b981' : '#f87171' }}>
                  {httpResult.status} {httpResult.statusText} · {httpResult.latencyMs} ms · {(httpResult.sizeBytes / 1024).toFixed(1)} KB
                </span>
              )}
            </div>

            {httpError && (
              <div className="p-3 rounded-lg border border-rose-500/40 text-xs text-rose-400">
                {httpError}
              </div>
            )}

            {!httpResult ? (
              <div className="py-14 text-center text-xs" style={{ color: tokens.fgMuted }}>
                Send a request to inspect real HTTP status codes, response latency, headers, and formatted JSON/HTML bodies.
              </div>
            ) : (
              <div className="space-y-3">
                <pre
                  className="p-3.5 rounded-lg border font-mono text-xs overflow-auto max-h-[380px] whitespace-pre-wrap break-all"
                  style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor, color: tokens.fgPrimary }}
                >
                  {httpResult.body}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
