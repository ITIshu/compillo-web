import JSZip from 'jszip';
import { FileNode } from '../types';
import { detectLanguage } from './fileSystem';

export async function exportWorkspaceAsZip(
  files: FileNode[],
  zipFilename = 'compillo-workspace.zip'
): Promise<void> {
  if (!files || files.length === 0) {
    throw new Error('Workspace has no files to export. Create or open files first.');
  }

  const zip = new JSZip();

  function addNodes(currentZip: JSZip, nodes: FileNode[]) {
    for (const node of nodes) {
      if (node.type === 'file') {
        currentZip.file(node.name, node.content ?? '');
      } else if (node.type === 'folder') {
        const folderZip = currentZip.folder(node.name);
        if (folderZip && node.children && node.children.length > 0) {
          addNodes(folderZip, node.children);
        }
      }
    }
  }

  addNodes(zip, files);

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importZipArchive(file: File): Promise<FileNode[]> {
  const zip = await JSZip.loadAsync(file);
  const resultNodes: FileNode[] = [];
  const folderMap = new Map<string, FileNode>();

  const entries: { path: string; isDir: boolean; file: JSZip.JSZipObject }[] = [];
  zip.forEach((relativePath, zipEntry) => {
    // Ignore macOS metadata and hidden system files
    if (relativePath.startsWith('__MACOSX') || relativePath.includes('/.DS_Store')) {
      return;
    }
    entries.push({
      path: relativePath.replace(/\/$/, ''),
      isDir: zipEntry.dir,
      file: zipEntry,
    });
  });

  // Sort by shallowest path first so parents exist before children
  entries.sort((a, b) => a.path.split('/').length - b.path.split('/').length);

  for (const entry of entries) {
    const parts = entry.path.split('/');
    const name = parts[parts.length - 1];
    if (!name) continue;

    const parentPath = parts.slice(0, -1).join('/');

    if (entry.isDir) {
      const folderNode: FileNode = {
        id: 'folder-' + Math.random().toString(36).substring(2, 9),
        name,
        path: '/' + entry.path,
        type: 'folder',
        language: '',
        isOpen: true,
        children: [],
      };
      folderMap.set(entry.path, folderNode);

      if (parentPath && folderMap.has(parentPath)) {
        folderMap.get(parentPath)!.children?.push(folderNode);
      } else {
        resultNodes.push(folderNode);
      }
    } else {
      const content = await entry.file.async('string');
      const fileNode: FileNode = {
        id: 'file-' + Math.random().toString(36).substring(2, 9),
        name,
        path: '/' + entry.path,
        type: 'file',
        language: detectLanguage(name),
        content,
        isDirty: false,
      };

      if (parentPath && folderMap.has(parentPath)) {
        folderMap.get(parentPath)!.children?.push(fileNode);
      } else {
        resultNodes.push(fileNode);
      }
    }
  }

  return resultNodes;
}
