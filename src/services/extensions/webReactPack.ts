import { DiagnosticItem } from '../../types';
import { PluginContext } from '../../types/plugin';

export function activateTailwindSorter(context: PluginContext) {
  const classRank = (cls: string) => {
    if (/^(flex|grid|block|inline|hidden|relative|absolute|fixed|sticky)/.test(cls)) return 1;
    if (/^(w-|h-|min-|max-|p-|px-|py-|pt-|pb-|pl-|pr-|m-|mx-|my-|gap-|space-)/.test(cls)) return 2;
    if (/^(text-|font-|leading-|tracking-)/.test(cls)) return 3;
    if (/^(bg-|border-|rounded|shadow|ring-)/.test(cls)) return 4;
    return 5;
  };

  context.commands.registerCommand('tailwind.sortClasses', () => {
    const cur = context.editor.getActiveFile();
    if (!cur) return;
    const content = context.editor.getActiveContent();
    let updatedAttrs = 0;
    const next = content.replace(/(className|class)=["']([^"']+)["']/g, (_full: string, attr: string, raw: string) => {
      const tokens = Array.from(new Set<string>(raw.trim().split(/\s+/).filter(Boolean)));
      const sorted = tokens.sort((a, b) => classRank(a) - classRank(b) || a.localeCompare(b));
      if (sorted.join(' ') !== raw.trim()) updatedAttrs++;
      return `${attr}="${sorted.join(' ')}"`;
    });

    if (updatedAttrs > 0) {
      context.editor.setActiveContent(next);
      context.notifications.show(`Sorted & deduplicated ${updatedAttrs} Tailwind class attribute(s).`, 'info');
    } else {
      context.notifications.show('Tailwind classes are already clean and sorted.', 'info');
    }
  });
}

export function activateHtmlTagChecker(context: PluginContext) {
  const validate = () => {
    const file = context.editor.getActiveFile();
    if (!file) return;
    if (!/\.(html|jsx|tsx|xml|svg)$/i.test(file.name)) {
      context.notifications.show('Open an HTML/JSX/TSX/SVG file to validate tags.', 'warning');
      return;
    }

    const content = context.editor.getActiveContent();
    const diags: DiagnosticItem[] = [];
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      if (/<img\b(?![^>]*\balt=)[^>]*>/i.test(line)) {
        diags.push({
          id: `a11y-img-${file.id}-${idx + 1}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line: idx + 1,
          column: 1,
          message: 'Accessibility: <img> element should include an "alt" attribute.',
          severity: 'warning',
          source: 'html-a11y',
        });
      }
      if (/<button\b(?![^>]*(type=|onClick|onclick))[^>]*>/i.test(line)) {
        diags.push({
          id: `a11y-btn-${file.id}-${idx + 1}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line: idx + 1,
          column: 1,
          message: 'HTML Hint: Specify explicit type="button" or click handler on <button>.',
          severity: 'info',
          source: 'html-a11y',
        });
      }
    });

    context.problems.setDiagnostics(file.id, diags);
    context.notifications.show(
      diags.length === 0
        ? `HTML/JSX audit passed cleanly on ${file.name}.`
        : `Found ${diags.length} HTML/A11y note(s) in ${file.name}.`,
      diags.length === 0 ? 'info' : 'warning'
    );
  };

  context.commands.registerCommand('htmlChecker.validateTags', validate);
}

export function activatePackageDepInspector(context: PluginContext) {
  context.commands.registerCommand('deps.auditPackageJson', () => {
    const file = context.editor.getActiveFile();
    if (!file) return;
    const content = context.editor.getActiveContent();
    try {
      const pkg = JSON.parse(content);
      const deps = Object.keys(pkg.dependencies || {});
      const devDeps = Object.keys(pkg.devDependencies || {});
      const scripts = Object.keys(pkg.scripts || {});
      const overlap = deps.filter((d) => devDeps.includes(d));

      context.output.clear('Tasks');
      context.output.appendLine(
        'Tasks',
        `[Package Inspector] ${pkg.name || file.name}@${pkg.version || '0.0.0'}`,
        'info'
      );
      context.output.appendLine(
        'Tasks',
        `Dependencies (${deps.length}): ${deps.join(', ') || 'none'}`,
        'log'
      );
      context.output.appendLine(
        'Tasks',
        `DevDependencies (${devDeps.length}): ${devDeps.join(', ') || 'none'}`,
        'log'
      );
      context.output.appendLine(
        'Tasks',
        `Scripts (${scripts.length}): ${scripts.join(', ') || 'none'}`,
        'info'
      );

      if (overlap.length > 0) {
        context.output.appendLine(
          'Tasks',
          `Warning: Duplicate entries in both dependencies and devDependencies: ${overlap.join(', ')}`,
          'error'
        );
      }

      context.notifications.show(
        `${deps.length} prod, ${devDeps.length} dev packages (${overlap.length} duplicates).`,
        overlap.length > 0 ? 'warning' : 'info'
      );
    } catch {
      context.notifications.show('Open a valid package.json file to inspect dependencies.', 'warning');
    }
  });
}
