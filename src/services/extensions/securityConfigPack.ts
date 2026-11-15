import { DiagnosticItem, FileNode } from '../../types';
import { PluginContext } from '../../types/plugin';

export function activateSonarSecurity(context: PluginContext) {
  const secretPatterns: Array<{ regex: RegExp; message: string; severity: 'error' | 'warning' }> = [
    {
      regex: /AIzaSy[0-9A-Za-z\-_]{20,}/,
      message: 'Security: Possible hardcoded Google/Gemini API key detected. Move secrets to server .env variables.',
      severity: 'error',
    },
    {
      regex: /\bsk-(?:proj-)?[A-Za-z0-9\-_]{20,}/,
      message: 'Security: Possible hardcoded API secret token ("sk-..."). Use Key Vault or .env instead.',
      severity: 'error',
    },
    {
      regex: /\b(?:ghp|gho|github_pat)_[A-Za-z0-9_]{20,}/,
      message: 'Security: Hardcoded GitHub token detected. Remove before committing.',
      severity: 'error',
    },
    {
      regex: /AKIA[0-9A-Z]{16}/,
      message: 'Security: Hardcoded AWS Access Key ID detected.',
      severity: 'error',
    },
    {
      regex: /dangerouslySetInnerHTML|\.innerHTML\s*=/,
      message: 'XSS Risk: Unsanitized HTML injection sink. Sanitize or render safe JSX nodes.',
      severity: 'warning',
    },
    {
      regex: /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\$\{[^}]+\}/i,
      message: 'SQL Injection Risk: Interpolated variable inside SQL query. Use parameterized queries ($1 / ?).',
      severity: 'warning',
    },
  ];

  const statusItem = context.statusBar.createItem('sonar-sec-status', {
    text: 'SecAudit',
    tooltip: 'SonarLint Security Scanner: Click to scan active file',
    command: 'sonarlint.scanActiveFile',
    alignment: 'right',
    priority: 40,
  });

  const scanFile = (content: string, file: FileNode | null) => {
    if (!file) return [];
    const lines = content.split('\n');
    const diags: DiagnosticItem[] = [];

    lines.forEach((line, idx) => {
      if (file.name.endsWith('.md')) return;
      secretPatterns.forEach((p, patIdx) => {
        if (p.regex.test(line)) {
          diags.push({
            id: `sonar-${file.id}-${idx + 1}-${patIdx}`,
            fileId: file.id,
            filePath: file.path,
            fileName: file.name,
            line: idx + 1,
            column: 1,
            message: p.message,
            severity: p.severity,
            source: 'sonarlint-sec',
          });
        }
      });
    });

    context.problems.setDiagnostics(file.id, diags);
    statusItem.update(
      diags.length > 0 ? `SecAudit ${diags.length}!` : 'SecAudit OK',
      `SonarLint Security found ${diags.length} security issue(s) in ${file.name}`
    );
    return diags;
  };

  context.commands.registerCommand('sonarlint.scanActiveFile', () => {
    const file = context.editor.getActiveFile();
    if (!file) return;
    const diags = scanFile(context.editor.getActiveContent(), file);
    context.notifications.show(
      diags.length === 0
        ? `SonarLint Security: Zero exposed secrets or XSS/SQL sinks in ${file.name}.`
        : `SonarLint flagged ${diags.length} security warning(s) in Problems.`,
      diags.length === 0 ? 'info' : 'warning'
    );
  });

  context.editor.onContentChange((content, file) => scanFile(content, file));
  const cur = context.editor.getActiveFile();
  if (cur) scanFile(cur.content || '', cur);
}

export function activateEnvVaultGuard(context: PluginContext) {
  context.commands.registerCommand('envGuard.generateExample', () => {
    const file = context.editor.getActiveFile();
    if (!file) return;
    const content = context.editor.getActiveContent();
    const lines = content.split('\n');
    const keys: string[] = [];

    const masked = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      const eq = line.indexOf('=');
      if (eq === -1) return line;
      const key = line.slice(0, eq).trim();
      keys.push(key);
      return `${key}=your_${key.toLowerCase()}_here`;
    });

    context.output.clear('Tasks');
    context.output.appendLine('Tasks', `[.env Guard] Masked ${keys.length} key(s) from ${file.name}:`, 'info');
    context.output.appendLine('Tasks', masked.join('\n'), 'log');
    context.notifications.show(`Generated safe .env.example template for ${keys.length} variable(s).`, 'info');
  });
}
