import { PluginContext } from '../../types/plugin';

export function activateMermaidDiagram(context: PluginContext) {
  context.commands.registerCommand('mermaid.generateFlowchart', () => {
    const file = context.editor.getActiveFile();
    if (!file) return;
    const content = context.editor.getActiveContent();

    const fnNames = Array.from(
      new Set(
        Array.from(content.matchAll(/(?:function|def|async\s+function)\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(/g))
          .map((m) => m[1] || m[2])
          .filter(Boolean)
      )
    );

    const edges: string[] = [];
    fnNames.slice(0, 12).forEach((fn, i) => {
      if (i < fnNames.length - 1) {
        edges.push(`  ${fn}[${fn}] --> ${fnNames[i + 1]}[${fnNames[i + 1]}]`);
      } else if (fnNames.length === 1) {
        edges.push(`  Start((Start)) --> ${fn}[${fn}]`);
      }
    });

    const mermaidCode = `\`\`\`mermaid\nflowchart TD\n${edges.join('\n') || '  A[No functions detected] --> B[Add functions to map]'}\n\`\`\``;
    context.output.clear('Tasks');
    context.output.appendLine('Tasks', `[Mermaid Generator] Generated flowchart for ${file.name}:`, 'info');
    context.output.appendLine('Tasks', mermaidCode, 'log');
    context.notifications.show(`Generated Mermaid flowchart with ${fnNames.length} node(s) in Output > Tasks.`, 'info');
  });
}

export function activateRegexInspector(context: PluginContext) {
  const explain = (pattern: string) => {
    const parts: string[] = [];
    if (pattern.includes('^')) parts.push('^ start anchor');
    if (pattern.includes('$')) parts.push('$ end anchor');
    if (pattern.includes('\\d')) parts.push('\\d digits [0-9]');
    if (pattern.includes('\\w')) parts.push('\\w word chars');
    if (pattern.includes('\\s')) parts.push('\\s whitespace');
    if (pattern.includes('+')) parts.push('+ 1 or more');
    if (pattern.includes('*')) parts.push('* 0 or more');
    if (pattern.includes('?')) parts.push('? optional');
    if (/\([^)]+\)/.test(pattern)) parts.push('(...) capture/group');
    if (/\[[^\]]+\]/.test(pattern)) parts.push('[...] char class');
    return parts.length ? parts.join(', ') : 'literal character sequence';
  };

  context.commands.registerCommand('regex.inspectFile', () => {
    const file = context.editor.getActiveFile();
    if (!file) return;
    const content = context.editor.getActiveContent();
    const matches = Array.from(content.matchAll(/\/(?![/*])((?:[^/\\\n]|\\.)+)\/([gimsuy]*)/g));

    context.output.clear('Tasks');
    context.output.appendLine('Tasks', `Regex101 Inspector found ${matches.length} regex literal(s) in ${file.name}:`, 'info');
    matches.slice(0, 20).forEach((m, idx) => {
      context.output.appendLine('Tasks', `  #${idx + 1} /${m[1]}/${m[2]} -> ${explain(m[1])}`, 'log');
    });
    context.notifications.show(`Inspected ${matches.length} regex pattern(s) in ${file.name}.`, 'info');
  });
}

export function activateRestCompanion(context: PluginContext) {
  context.commands.registerCommand('restClient.extractUrls', () => {
    const file = context.editor.getActiveFile();
    if (!file) return;
    const content = context.editor.getActiveContent();
    const urls = Array.from(
      new Set([
        ...(content.match(/https?:\/\/[^\s"'`<>)]+/g) || []),
        ...(content.match(/["'`](\/api\/[a-zA-Z0-9_\-/:]+)["'`]/g) || []).map((s) =>
          s.slice(1, -1)
        ),
      ])
    );

    context.output.clear('Tasks');
    if (urls.length === 0) {
      context.output.appendLine('Tasks', `No URLs or /api endpoints found in ${file.name}.`, 'info');
    } else {
      context.output.appendLine('Tasks', `Found ${urls.length} API/URL endpoint(s) in ${file.name}:`, 'info');
      urls.forEach((u) => {
        const full = u.startsWith('/') ? `http://localhost:3000${u}` : u;
        context.output.appendLine('Tasks', `curl -i "${full}"`, 'log');
      });
    }
    context.notifications.show(`Extracted ${urls.length} endpoint(s) to Output > Tasks.`, 'info');
  });
}
