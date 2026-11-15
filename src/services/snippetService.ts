export interface CodeSnippet {
  id: string;
  title: string;
  language: string;
  category: 'React & TS' | 'Python' | 'C / C++' | 'Backend / API' | 'SQL & Data' | 'Custom';
  description: string;
  code: string;
  isCustom?: boolean;
}

const CUSTOM_SNIPPETS_KEY = 'compillo_custom_snippets_v1';

export const BUILTIN_SNIPPETS: CodeSnippet[] = [
  {
    id: 'ts-async-fetch',
    title: 'Typed Fetch Wrapper with Abort Timeout',
    language: 'typescript',
    category: 'React & TS',
    description: 'Type-safe JSON fetch with AbortController timeout handling',
    code: `async function fetchJson<T>(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(\`HTTP \${res.status}: \${res.statusText}\`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
`,
  },
  {
    id: 'react-fc-component',
    title: 'React Functional Component + Props',
    language: 'typescript',
    category: 'React & TS',
    description: 'Clean typed React component scaffold',
    code: `import React, { useState } from 'react';

interface PanelCardProps {
  title: string;
  initialCount?: number;
}

export const PanelCard: React.FC<PanelCardProps> = ({ title, initialCount = 0 }) => {
  const [count, setCount] = useState(initialCount);

  return (
    <div className="p-4 rounded-lg border border-white/10 bg-white/5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <button
        onClick={() => setCount((c) => c + 1)}
        className="mt-2 px-3 py-1 rounded bg-sky-600 text-white text-xs"
      >
        Count: {count}
      </button>
    </div>
  );
};
`,
  },
  {
    id: 'py-cli-script',
    title: 'Python CLI with Argparse & Logging',
    language: 'python',
    category: 'Python',
    description: 'Structured Python script entrypoint with CLI arguments',
    code: `import argparse
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

def main():
    parser = argparse.ArgumentParser(description="Process workspace data")
    parser.add_argument("--input", required=True, help="Input file path")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logs")
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    logging.info("Running task on %s", args.input)

if __name__ == "__main__":
    main()
`,
  },
  {
    id: 'py-matplotlib-grid',
    title: 'Matplotlib Dual Plot Dark Grid',
    language: 'python',
    category: 'Python',
    description: 'Quick chart script compatible with Compillo inline plots',
    code: `import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 2 * np.pi, 200)
fig, ax = plt.subplots(figsize=(7, 4), dpi=100)
ax.plot(x, np.sin(x), label="sin(x)", linewidth=2)
ax.plot(x, np.cos(x), label="cos(x)", linestyle="--", linewidth=2)
ax.set_title("Signal Comparison")
ax.grid(True, alpha=0.3)
ax.legend()
plt.tight_layout()
plt.show()
`,
  },
  {
    id: 'cpp-fast-io',
    title: 'C++ Competitive / Fast I/O Main',
    language: 'cpp',
    category: 'C / C++',
    description: 'Standard C++17 template with fast I/O and vectors',
    code: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n = 5;
    vector<int> nums = {42, 7, 19, 3, 25};
    sort(nums.begin(), nums.end());

    for (int x : nums) cout << x << " ";
    cout << "\\n";
    return 0;
}
`,
  },
  {
    id: 'express-route',
    title: 'Express REST Route with Validation',
    language: 'typescript',
    category: 'Backend / API',
    description: 'Clean Express GET/POST handler with try/catch error safety',
    code: `app.post('/api/items', async (req, res) => {
  try {
    const { name, value } = req.body || {};
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Valid name is required' });
      return;
    }
    res.status(201).json({ id: Date.now(), name: name.trim(), value });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Internal server error' });
  }
});
`,
  },
  {
    id: 'sql-analytics-cte',
    title: 'SQL CTE & Window Function Query',
    language: 'sql',
    category: 'SQL & Data',
    description: 'Common Table Expression with ranking for SQLite/PostgreSQL',
    code: `WITH ranked_orders AS (
  SELECT
    customer_id,
    total_amount,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY total_amount DESC) AS rn
  FROM orders
)
SELECT customer_id, total_amount AS top_order
FROM ranked_orders
WHERE rn = 1;
`,
  },
];

export function getAllSnippets(): CodeSnippet[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SNIPPETS_KEY);
    const custom: CodeSnippet[] = raw ? JSON.parse(raw) : [];
    return [...(Array.isArray(custom) ? custom : []), ...BUILTIN_SNIPPETS];
  } catch {
    return BUILTIN_SNIPPETS;
  }
}

export function saveCustomSnippet(
  snippet: Omit<CodeSnippet, 'id' | 'isCustom' | 'category'>
): CodeSnippet {
  const newSnippet: CodeSnippet = {
    ...snippet,
    id: `custom-${Date.now()}`,
    category: 'Custom',
    isCustom: true,
  };
  try {
    const raw = localStorage.getItem(CUSTOM_SNIPPETS_KEY);
    const custom: CodeSnippet[] = raw ? JSON.parse(raw) : [];
    const updated = [newSnippet, ...(Array.isArray(custom) ? custom : [])];
    localStorage.setItem(CUSTOM_SNIPPETS_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
  return newSnippet;
}

export function deleteCustomSnippet(id: string): void {
  try {
    const raw = localStorage.getItem(CUSTOM_SNIPPETS_KEY);
    const custom: CodeSnippet[] = raw ? JSON.parse(raw) : [];
    const filtered = (Array.isArray(custom) ? custom : []).filter((s) => s.id !== id);
    localStorage.setItem(CUSTOM_SNIPPETS_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}
