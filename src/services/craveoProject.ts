import { FileNode } from '../types';

import readmeMd from '../../projects/craveo/README.md?raw';
import appPy from '../../projects/craveo/app.py?raw';
import seedDataPy from '../../projects/craveo/seed_data.py?raw';
import craveoRuntimePy from '../../projects/craveo/craveo_runtime.py?raw';
import serverPy from '../../projects/craveo/server.py?raw';
import requirementsTxt from '../../projects/craveo/requirements.txt?raw';
import runBat from '../../projects/craveo/run.bat?raw';

const gitignoreContent = `__pycache__/
*.py[cod]
venv/
.venv/
env/
database/*.db
*.sqlite3
.DS_Store
.idea/
.vscode/
`;

export function getCraveoProject(): FileNode[] {
  return [
    {
      id: 'craveo-readme',
      name: 'README.md',
      path: '/README.md',
      type: 'file',
      language: 'markdown',
      isOpen: true,
      isDirty: false,
      content: readmeMd,
    },
    {
      id: 'craveo-app-py',
      name: 'app.py',
      path: '/app.py',
      type: 'file',
      language: 'python',
      isOpen: true,
      isDirty: false,
      content: appPy,
    },
    {
      id: 'craveo-seed-data-py',
      name: 'seed_data.py',
      path: '/seed_data.py',
      type: 'file',
      language: 'python',
      isOpen: false,
      isDirty: false,
      content: seedDataPy,
    },
    {
      id: 'craveo-runtime-py',
      name: 'craveo_runtime.py',
      path: '/craveo_runtime.py',
      type: 'file',
      language: 'python',
      isOpen: false,
      isDirty: false,
      content: craveoRuntimePy,
    },
    {
      id: 'craveo-server-py',
      name: 'server.py',
      path: '/server.py',
      type: 'file',
      language: 'python',
      isOpen: false,
      isDirty: false,
      content: serverPy,
    },
    {
      id: 'craveo-requirements-txt',
      name: 'requirements.txt',
      path: '/requirements.txt',
      type: 'file',
      language: 'plaintext',
      isOpen: false,
      isDirty: false,
      content: requirementsTxt,
    },
    {
      id: 'craveo-run-bat',
      name: 'run.bat',
      path: '/run.bat',
      type: 'file',
      language: 'plaintext',
      isOpen: false,
      isDirty: false,
      content: runBat,
    },
    {
      id: 'craveo-gitignore',
      name: '.gitignore',
      path: '/.gitignore',
      type: 'file',
      language: 'plaintext',
      isOpen: false,
      isDirty: false,
      content: gitignoreContent,
    },
  ];
}
