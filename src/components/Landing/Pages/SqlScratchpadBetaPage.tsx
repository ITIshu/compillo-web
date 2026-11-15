import React, { useEffect, useState } from 'react';
import { Database, Download, Key, Play, RefreshCw, Table } from 'lucide-react';
import { WebsiteThemeTokens } from './WebsitePageTheme';

interface SqlScratchpadBetaPageProps {
  tokens: WebsiteThemeTokens;
}

interface SqlColumnInfo {
  name: string;
  type: string;
  notnull: boolean;
  pk: boolean;
}

interface SqlForeignKeyInfo {
  from: string;
  table: string;
  to: string;
}

interface SqlTableInfo {
  name: string;
  rowCount: number;
  columns: SqlColumnInfo[];
  foreignKeys: SqlForeignKeyInfo[];
}

const SAMPLE_QUERIES: Record<'university' | 'ecommerce', Array<{ label: string; sql: string }>> = {
  university: [
    {
      label: 'Join Students & Grades',
      sql: `SELECT s.roll_no, s.full_name, c.code, c.title, e.grade, e.score\nFROM enrollments e\nJOIN students s ON s.student_id = e.student_id\nJOIN courses c ON c.course_id = e.course_id\nORDER BY e.score DESC;`,
    },
    {
      label: 'Avg Score by Department',
      sql: `SELECT s.department, COUNT(*) AS total_entries, ROUND(AVG(e.score), 1) AS avg_score\nFROM enrollments e\nJOIN students s ON s.student_id = e.student_id\nGROUP BY s.department;`,
    },
    {
      label: 'Create & Insert Example',
      sql: `CREATE TABLE IF NOT EXISTS lab_notes (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  topic TEXT NOT NULL,\n  completed INTEGER DEFAULT 1\n);\nINSERT INTO lab_notes (topic, completed) VALUES ('B-Tree Indexing', 1);\nSELECT * FROM lab_notes;`,
    },
  ],
  ecommerce: [
    {
      label: 'Customer Order Revenue',
      sql: `SELECT c.name, c.city, p.name AS product, o.qty, ROUND(o.qty * p.price, 2) AS total_usd, o.status\nFROM orders o\nJOIN customers c ON c.customer_id = o.customer_id\nJOIN products p ON p.product_id = o.product_id\nORDER BY total_usd DESC;`,
    },
    {
      label: 'Low Stock Products',
      sql: `SELECT sku, name, price, stock\nFROM products\nWHERE stock < 30\nORDER BY stock ASC;`,
    },
  ],
};

export const SqlScratchpadBetaPage: React.FC<SqlScratchpadBetaPageProps> = ({ tokens }) => {
  const [sessionId] = useState(() => 'sql_' + Math.random().toString(36).slice(2, 10));
  const [preset, setPreset] = useState<'university' | 'ecommerce'>('university');
  const [sql, setSql] = useState(SAMPLE_QUERIES.university[0].sql);
  const [tables, setTables] = useState<SqlTableInfo[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [execMs, setExecMs] = useState<number | null>(null);
  const [affectedRows, setAffectedRows] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const executeQuery = async (sqlText: string, nextPreset = preset, reset = false) => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/sql/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          sql: sqlText,
          preset: nextPreset,
          reset,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setError(data?.error || 'SQL execution failed.');
        if (Array.isArray(data.tables)) setTables(data.tables);
        setIsRunning(false);
        return;
      }

      setTables(Array.isArray(data.tables) ? data.tables : []);
      setColumns(Array.isArray(data.columns) ? data.columns : []);
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setExecMs(typeof data.executionMs === 'number' ? data.executionMs : null);
      setAffectedRows(typeof data.affectedRows === 'number' ? data.affectedRows : 0);
    } catch (err: any) {
      setError(err?.message || 'Could not reach SQLite service.');
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    void executeQuery(SAMPLE_QUERIES.university[0].sql, 'university', true);
  }, []);

  const handleSwitchPreset = (next: 'university' | 'ecommerce') => {
    setPreset(next);
    const firstQuery = SAMPLE_QUERIES[next][0].sql;
    setSql(firstQuery);
    void executeQuery(firstQuery, next, true);
  };

  const handleExportCsv = () => {
    if (columns.length === 0) return;
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [columns.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compillo-${preset}-query.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-medium flex items-center gap-2" style={{ color: tokens.fgMuted }}>
            <span>Website Beta Sandbox</span>
            <span aria-hidden="true">·</span>
            <span>SQLite 3 Engine</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{tables.length} Live Tables</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
            Database Schema &amp; SQL Scratchpad (Beta)
          </h1>
          <p className="text-sm sm:text-base leading-relaxed" style={{ color: tokens.fgMuted }}>
            Inspect relational tables, primary keys, and foreign-key joins interactively, then execute real SQL queries against an isolated session database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSwitchPreset('university')}
            className="px-3.5 py-2 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
            style={
              preset === 'university'
                ? { backgroundColor: tokens.accent, color: tokens.accentText, borderColor: tokens.accent }
                : { backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }
            }
          >
            University Lab DB
          </button>
          <button
            type="button"
            onClick={() => handleSwitchPreset('ecommerce')}
            className="px-3.5 py-2 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
            style={
              preset === 'ecommerce'
                ? { backgroundColor: tokens.accent, color: tokens.accentText, borderColor: tokens.accent }
                : { backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }
            }
          >
            E-Commerce DB
          </button>
          <button
            type="button"
            onClick={() => void executeQuery(sql, preset, true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer"
            style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg }}
          >
            <RefreshCw size={12} />
            <span>Reset DB</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 4 Cols: Interactive Schema & ER Explorer */}
        <div
          className="lg:col-span-4 p-5 rounded-2xl border space-y-4"
          style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: tokens.borderColor }}>
            <span className="text-sm font-bold flex items-center gap-2">
              <Database size={15} />
              <span>Schema Inspector</span>
            </span>
            <span className="text-xs font-mono tabular-nums" style={{ color: tokens.fgMuted }}>
              {tables.length} tables
            </span>
          </div>

          <div className="space-y-3">
            {tables.map((t) => (
              <div
                key={t.name}
                className="p-3.5 rounded-xl border space-y-2.5"
                style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const nextSql = `SELECT * FROM ${t.name} LIMIT 25;`;
                      setSql(nextSql);
                      void executeQuery(nextSql);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-bold hover:underline cursor-pointer"
                    style={{ color: tokens.accent }}
                  >
                    <Table size={13} />
                    <span>{t.name}</span>
                  </button>
                  <span className="text-[11px] font-mono tabular-nums" style={{ color: tokens.fgMuted }}>
                    {t.rowCount} rows
                  </span>
                </div>

                <div className="space-y-1 border-t pt-2 text-[11px] font-mono" style={{ borderColor: tokens.borderColor }}>
                  {t.columns.map((col) => {
                    const fk = t.foreignKeys.find((f) => f.from === col.name);
                    return (
                      <div key={col.name} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 truncate">
                          {col.pk && <Key size={10} className="text-amber-400 shrink-0" />}
                          <span>{col.name}</span>
                          {fk && (
                            <span style={{ color: tokens.accent }}>
                              -&gt; {fk.table}.{fk.to}
                            </span>
                          )}
                        </span>
                        <span style={{ color: tokens.fgMuted }}>{col.type}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 8 Cols: SQL Query Editor & Result Grid */}
        <div className="lg:col-span-8 space-y-6">
          <div
            className="p-5 rounded-2xl border space-y-4"
            style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {SAMPLE_QUERIES[preset].map((sq) => (
                  <button
                    key={sq.label}
                    type="button"
                    onClick={() => {
                      setSql(sq.sql);
                      void executeQuery(sq.sql);
                    }}
                    className="px-2.5 py-1 rounded-md border text-xs font-medium cursor-pointer"
                    style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                  >
                    {sq.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void executeQuery(sql)}
                disabled={isRunning}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer shrink-0 disabled:opacity-60"
                style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
              >
                <Play size={13} />
                <span>{isRunning ? 'Executing...' : 'Run SQL Query'}</span>
              </button>
            </div>

            <textarea
              rows={7}
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  void executeQuery(sql);
                }
              }}
              spellCheck={false}
              className="w-full p-4 rounded-xl border text-xs font-mono leading-relaxed outline-none resize-y"
              style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.fgPrimary }}
            />

            {error && (
              <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-950/20 text-xs font-mono text-rose-300">
                {error}
              </div>
            )}
          </div>

          {/* Query Results Table */}
          <div
            className="p-5 rounded-2xl border space-y-4"
            style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3" style={{ borderColor: tokens.borderColor }}>
              <div className="text-xs font-mono tabular-nums" style={{ color: tokens.fgMuted }}>
                {columns.length > 0
                  ? `${rows.length} row(s) returned`
                  : `${affectedRows} row(s) modified`}
                {execMs !== null ? ` · ${execMs} ms` : ''}
              </div>

              {columns.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
                  style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                >
                  <Download size={12} />
                  <span>Export CSV</span>
                </button>
              )}
            </div>

            {columns.length === 0 ? (
              <div className="p-6 text-center text-xs" style={{ color: tokens.fgMuted }}>
                {affectedRows > 0
                  ? 'Statement executed successfully. Run a SELECT query or click any table on the left to inspect rows.'
                  : 'Execute a SQL query above to view live tabular results.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b" style={{ borderColor: tokens.borderColor, color: tokens.fgMuted }}>
                      {columns.map((c) => (
                        <th key={c} className="py-2 px-3 font-semibold whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: tokens.borderColor }}>
                    {rows.map((r, rIdx) => (
                      <tr key={rIdx} className="h-9">
                        {r.map((val, cIdx) => (
                          <td key={cIdx} className="py-1.5 px-3 whitespace-nowrap tabular-nums">
                            {val === null ? <span className="opacity-45">NULL</span> : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
