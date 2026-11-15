import type { Request, Response } from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const SQL_SESSIONS_DIR = path.join(os.tmpdir(), 'compillo_sql_sessions');
fs.mkdirSync(SQL_SESSIONS_DIR, { recursive: true });

const MAX_SQL_BYTES = 32 * 1024;
const SQL_TIMEOUT_MS = 5000;
const MAX_ROWS = 500;
const MAX_SESSIONS = 40;

const UNIVERSITY_SEED_SQL = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS students (
  student_id INTEGER PRIMARY KEY AUTOINCREMENT,
  roll_no TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  department TEXT NOT NULL,
  semester INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS courses (
  course_id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  credits INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS enrollments (
  enrollment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  grade TEXT NOT NULL,
  score INTEGER NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);
INSERT OR IGNORE INTO students (student_id, roll_no, full_name, department, semester) VALUES
  (1, '23CS014', 'Aarav Sharma', 'Computer Science', 5),
  (2, '23CS029', 'Priya Singh', 'Computer Science', 5),
  (3, '23IT008', 'Rohan Verma', 'Information Tech', 5),
  (4, '23CS041', 'Ananya Patel', 'Computer Science', 3);
INSERT OR IGNORE INTO courses (course_id, code, title, credits) VALUES
  (1, 'CS501', 'Database Management Systems', 4),
  (2, 'CS502', 'Operating Systems Lab', 3),
  (3, 'CS503', 'Data Structures & Algorithms', 4);
INSERT OR IGNORE INTO enrollments (enrollment_id, student_id, course_id, grade, score) VALUES
  (1, 1, 1, 'A+', 96),
  (2, 1, 3, 'A', 91),
  (3, 2, 1, 'A+', 98),
  (4, 2, 2, 'A', 89),
  (5, 3, 2, 'B+', 82),
  (6, 4, 3, 'A', 90);
`;

const ECOMMERCE_SEED_SQL = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS customers (
  customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  tier TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
  product_id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  order_id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);
INSERT OR IGNORE INTO customers (customer_id, name, city, tier) VALUES
  (1, 'Ishant Saraogi', 'Jaipur', 'Pro'),
  (2, 'Neha Kulkarni', 'Pune', 'Enterprise'),
  (3, 'Kabir Mehta', 'Bengaluru', 'Standard');
INSERT OR IGNORE INTO products (product_id, sku, name, price, stock) VALUES
  (1, 'DEV-KB01', 'Mechanical Dev Keyboard', 129.0, 24),
  (2, 'DEV-MS02', 'Precision Track Mouse', 79.5, 42),
  (3, 'DEV-MN03', '4K USB-C Coding Display', 499.0, 9);
INSERT OR IGNORE INTO orders (order_id, customer_id, product_id, qty, status) VALUES
  (1, 1, 1, 2, 'Delivered'),
  (2, 2, 3, 1, 'Shipped'),
  (3, 1, 2, 1, 'Delivered'),
  (4, 3, 1, 1, 'Processing');
`;

const PYTHON_SQL_HARNESS = `
import json, sqlite3, sys, time

payload = json.loads(sys.stdin.read())
db_path = payload["db_path"]
sql = payload["sql"]
seed_sql = payload.get("seed_sql", "")
max_rows = int(payload.get("max_rows", 500))

conn = sqlite3.connect(db_path, timeout=4.0)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

result_columns = []
result_rows = []
affected_rows = 0
statement_count = 0
error_msg = None

t0 = time.perf_counter()
try:
    cur.execute("PRAGMA foreign_keys = ON;")
    if seed_sql:
        cur.executescript(seed_sql)
        conn.commit()

    if sql.strip():
        # Split statements safely using sqlite3.complete_statement
        buf = ""
        statements = []
        for line in sql.splitlines(True):
            buf += line
            if sqlite3.complete_statement(buf):
                s = buf.strip()
                if s:
                    statements.append(s)
                buf = ""
        if buf.strip():
            statements.append(buf.strip())

        for stmt in statements:
            cur.execute(stmt)
            statement_count += 1
            if cur.description:
                result_columns = [d[0] for d in cur.description]
                fetched = cur.fetchmany(max_rows)
                result_rows = [[row[i] for i in range(len(result_columns))] for row in fetched]
            else:
                if cur.rowcount and cur.rowcount > 0:
                    affected_rows += cur.rowcount
        conn.commit()
except Exception as e:
    error_msg = str(e)

elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)

# Always inspect live schema so UI table explorer updates after DDL
tables = []
try:
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
    table_names = [r[0] for r in cur.fetchall()]
    for tname in table_names:
        safe_t = '"' + tname.replace('"', '""') + '"'
        cur.execute(f"PRAGMA table_info({safe_t});")
        cols = [
            {
                "name": r[1],
                "type": r[2] or "TEXT",
                "notnull": bool(r[3]),
                "pk": bool(r[5]),
            }
            for r in cur.fetchall()
        ]
        cur.execute(f"PRAGMA foreign_key_list({safe_t});")
        fks = [
            {"from": r[3], "table": r[2], "to": r[4]}
            for r in cur.fetchall()
        ]
        cur.execute(f"SELECT COUNT(*) FROM {safe_t};")
        row_count = int(cur.fetchone()[0])
        tables.append({
            "name": tname,
            "rowCount": row_count,
            "columns": cols,
            "foreignKeys": fks,
        })
except Exception:
    pass

conn.close()
print(json.dumps({
    "ok": error_msg is None,
    "error": error_msg,
    "columns": result_columns,
    "rows": result_rows,
    "rowCount": len(result_rows),
    "affectedRows": affected_rows,
    "statementCount": statement_count,
    "executionMs": elapsed_ms,
    "tables": tables,
}))
`;

function cleanupOldSqlSessions() {
  try {
    const entries = fs
      .readdirSync(SQL_SESSIONS_DIR)
      .filter((f) => f.endsWith('.db'))
      .map((f) => {
        const full = path.join(SQL_SESSIONS_DIR, f);
        return { full, mtime: fs.statSync(full).mtimeMs };
      })
      .sort((a, b) => a.mtime - b.mtime);

    while (entries.length > MAX_SESSIONS) {
      const oldest = entries.shift();
      if (oldest) {
        try {
          fs.unlinkSync(oldest.full);
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore cleanup errors
  }
}

export async function handleSqlExecution(req: Request, res: Response) {
  const rawSession = typeof req.body?.sessionId === 'string' ? req.body.sessionId : 'default';
  const sessionId = rawSession.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'default';
  const sql = typeof req.body?.sql === 'string' ? req.body.sql : '';
  const preset = typeof req.body?.preset === 'string' ? req.body.preset : '';
  const reset = Boolean(req.body?.reset);

  if (Buffer.byteLength(sql, 'utf-8') > MAX_SQL_BYTES) {
    res.status(400).json({ ok: false, error: 'SQL script exceeds 32 KB limit.' });
    return;
  }

  cleanupOldSqlSessions();
  const dbPath = path.join(SQL_SESSIONS_DIR, `${sessionId}.db`);
  if (reset && fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
    } catch {
      // ignore
    }
  }

  const isFresh = !fs.existsSync(dbPath);
  let seedSql = '';
  if (isFresh || reset) {
    if (preset === 'ecommerce') seedSql = ECOMMERCE_SEED_SQL;
    else if (preset === 'university' || !preset) seedSql = UNIVERSITY_SEED_SQL;
  }

  const child = spawn('python3', ['-c', PYTHON_SQL_HARNESS], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  let settled = false;

  const timer = setTimeout(() => {
    if (!settled) {
      settled = true;
      try {
        child.kill('SIGKILL');
      } catch {
        // ignore
      }
      res.status(408).json({ ok: false, error: 'SQL execution timed out (5s limit).' });
    }
  }, SQL_TIMEOUT_MS);

  child.stdout.on('data', (chunk) => {
    if (stdout.length < 1024 * 1024) stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    if (stderr.length < 64 * 1024) stderr += chunk.toString();
  });

  child.on('error', (err) => {
    clearTimeout(timer);
    if (settled) return;
    settled = true;
    res.status(500).json({ ok: false, error: err.message || 'SQLite engine failed to start.' });
  });

  child.on('close', () => {
    clearTimeout(timer);
    if (settled) return;
    settled = true;
    try {
      const parsed = JSON.parse(stdout.trim() || '{}');
      res.json(parsed);
    } catch {
      res.status(500).json({
        ok: false,
        error: stderr.trim() || 'Failed to parse SQL output.',
      });
    }
  });

  child.stdin.write(
    JSON.stringify({
      db_path: dbPath,
      sql,
      seed_sql: seedSql,
      max_rows: MAX_ROWS,
    })
  );
  child.stdin.end();
}
