import { PluginContext } from '../../types/plugin';

const SQL_KEYWORDS = [
  'select', 'from', 'where', 'inner join', 'left join', 'right join', 'join', 'on',
  'group by', 'order by', 'having', 'limit', 'offset', 'insert into', 'values',
  'update', 'set', 'delete from', 'create table', 'alter table', 'and', 'or', 'as',
];

function formatSqlQuery(raw: string): string {
  let out = raw.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
  const majorClauses = [
    'SELECT', 'FROM', 'WHERE', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'JOIN',
    'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'VALUES', 'SET',
  ];

  SQL_KEYWORDS.forEach((kw) => {
    const re = new RegExp(`\\b${kw}\\b`, 'gi');
    out = out.replace(re, kw.toUpperCase());
  });

  majorClauses.forEach((clause) => {
    const re = new RegExp(`\\s+(${clause})\\b`, 'g');
    out = out.replace(re, `\n$1`);
  });

  return out.replace(/,\s*/g, ',\n  ') + '\n';
}

export function activateSqlSchemaStudio(context: PluginContext) {
  context.commands.registerCommand('sql.formatDocument', () => {
    const file = context.editor.getActiveFile();
    if (!file) return;
    const formatted = formatSqlQuery(context.editor.getActiveContent());
    context.editor.setActiveContent(formatted);
    context.notifications.show(`Formatted SQL clauses in ${file.name}.`, 'info');
  });

  context.commands.registerCommand('sql.inspectSchema', () => {
    const file = context.editor.getActiveFile();
    if (!file) return;
    const content = context.editor.getActiveContent();
    const tables: Array<{ name: string; columns: string[] }> = [];
    const tableRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([a-zA-Z0-9_.]+)[`"']?\s*\(([\s\S]*?)\);/gi;

    let m: RegExpExecArray | null;
    while ((m = tableRe.exec(content)) !== null) {
      const cols = m[2]
        .split('\n')
        .map((c) => c.trim().replace(/,$/, ''))
        .filter((c) => c && !/^(PRIMARY|FOREIGN|UNIQUE|CONSTRAINT|CHECK)/i.test(c));
      tables.push({ name: m[1], columns: cols });
    }

    context.output.clear('Tasks');
    context.output.appendLine('Tasks', `[SQL Schema Explorer] Found ${tables.length} table(s) in ${file.name}:`, 'info');
    tables.forEach((t) => {
      context.output.appendLine('Tasks', `TABLE ${t.name} (${t.columns.length} columns)\n  - ${t.columns.join('\n  - ')}`, 'log');
    });
    context.notifications.show(`Extracted ${tables.length} SQL table definition(s) to Output > Tasks.`, 'info');
  });
}

export function activateJsonToolkit(context: PluginContext) {
  const sortObjDeep = (val: unknown): unknown => {
    if (Array.isArray(val)) return val.map(sortObjDeep);
    if (val && typeof val === 'object') {
      const sorted: Record<string, unknown> = {};
      Object.keys(val as Record<string, unknown>)
        .sort()
        .forEach((k) => {
          sorted[k] = sortObjDeep((val as Record<string, unknown>)[k]);
        });
      return sorted;
    }
    return val;
  };

  context.commands.registerCommand('jsonTools.sortKeys', () => {
    const cur = context.editor.getActiveFile();
    if (!cur) return;
    try {
      const parsed = JSON.parse(context.editor.getActiveContent());
      context.editor.setActiveContent(JSON.stringify(sortObjDeep(parsed), null, 2));
      context.notifications.show(`Sorted JSON keys alphabetically in ${cur.name}.`, 'info');
    } catch {
      context.notifications.show('Invalid JSON document. Fix syntax errors before sorting keys.', 'error');
    }
  });

  context.commands.registerCommand('jsonTools.minify', () => {
    const cur = context.editor.getActiveFile();
    if (!cur) return;
    try {
      const parsed = JSON.parse(context.editor.getActiveContent());
      context.editor.setActiveContent(JSON.stringify(parsed));
      context.notifications.show(`Minified ${cur.name}.`, 'info');
    } catch {
      context.notifications.show('Invalid JSON document.', 'error');
    }
  });
}
