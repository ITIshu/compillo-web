import { PluginContext } from '../../types/plugin';

export function formatPythonPep8(code: string): string {
  const lines = code.replace(/\r\n/g, '\n').split('\n');
  const cleaned: string[] = [];
  let blankStreak = 0;

  for (const raw of lines) {
    const noTabs = raw.replace(/\t/g, '    ').replace(/\s+$/, '');
    if (noTabs === '') {
      blankStreak++;
      if (blankStreak <= 2) cleaned.push('');
    } else {
      blankStreak = 0;
      cleaned.push(noTabs);
    }
  }

  return cleaned.join('\n').replace(/\n*$/, '\n');
}

export function activateBlackFormatter(context: PluginContext) {
  context.commands.registerCommand('python.formatPep8', () => {
    const cur = context.editor.getActiveFile();
    if (!cur) return;
    if (!cur.name.endsWith('.py') && cur.language !== 'python') {
      context.notifications.show('Black Formatter only runs on Python (.py) files.', 'warning');
      return;
    }
    const formatted = formatPythonPep8(context.editor.getActiveContent());
    context.editor.setActiveContent(formatted);
    context.notifications.show(`Formatted ${cur.name} with Black PEP8 rules.`, 'info');
  });
}

export function activatePythonEnvHelper(context: PluginContext) {
  const stdlib = new Set([
    'os', 'sys', 're', 'math', 'json', 'time', 'datetime', 'pathlib', 'random',
    'typing', 'collections', 'itertools', 'functools', 'subprocess', 'http',
    'urllib', 'asyncio', 'logging', 'unittest', 'csv', 'sqlite3', 'hashlib',
  ]);

  context.commands.registerCommand('python.extractRequirements', () => {
    const cur = context.editor.getActiveFile();
    if (!cur) return;
    const content = context.editor.getActiveContent();
    const pkgs = new Set<string>();

    content.split('\n').forEach((line) => {
      const m1 = line.match(/^\s*import\s+([a-zA-Z0-9_]+)/);
      const m2 = line.match(/^\s*from\s+([a-zA-Z0-9_]+)\s+import\s+/);
      const pkg = m1?.[1] || m2?.[1];
      if (pkg && !stdlib.has(pkg) && !pkg.startsWith('_')) {
        pkgs.add(pkg);
      }
    });

    context.output.clear('Tasks');
    const list = Array.from(pkgs).sort();
    context.output.appendLine('Tasks', `[Python Env Pack] Scanned ${cur.name}:`, 'info');
    if (list.length === 0) {
      context.output.appendLine('Tasks', 'Only Python standard library modules detected.', 'log');
    } else {
      context.output.appendLine('Tasks', `# Suggested requirements.txt\n${list.join('\n')}`, 'success');
      context.output.appendLine('Tasks', `Install command: pip install ${list.join(' ')}`, 'info');
    }
    context.notifications.show(`Detected ${list.length} third-party Python package(s).`, 'info');
  });

  context.commands.registerCommand('python.addDocstrings', () => {
    const cur = context.editor.getActiveFile();
    if (!cur || (!cur.name.endsWith('.py') && cur.language !== 'python')) {
      context.notifications.show('Open a Python (.py) file to generate docstrings.', 'warning');
      return;
    }
    const lines = context.editor.getActiveContent().split('\n');
    const out: string[] = [];
    let added = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      out.push(line);
      const defMatch = line.match(/^(\s*)def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\).*:/);
      if (defMatch) {
        const nextLine = (lines[i + 1] || '').trim();
        if (!nextLine.startsWith('"""') && !nextLine.startsWith("'''")) {
          const indent = defMatch[1] + '    ';
          const fnName = defMatch[2];
          out.push(`${indent}"""TODO: Describe \`${fnName}\`."""`);
          added++;
        }
      }
    }

    if (added > 0) {
      context.editor.setActiveContent(out.join('\n'));
      context.notifications.show(`Added ${added} Python function docstring placeholder(s).`, 'info');
    } else {
      context.notifications.show('All Python functions already have docstrings.', 'info');
    }
  });
}
