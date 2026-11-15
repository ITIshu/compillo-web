export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  language: string;
  children?: FileNode[];
  isOpen?: boolean;
  isDirty?: boolean;
}

export interface TabItem {
  fileId: string;
  path: string;
  title: string;
  language: string;
  isDirty: boolean;
}

export interface EditorSettings {
  theme: string;
  fontSize: number;
  tabSize: number;
  wordWrap: 'on' | 'off';
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative';
  autoSave: boolean;
  formatOnSave: boolean;
  bracketPairColorization: boolean;
}

export interface DiagnosticItem {
  id: string;
  fileId: string;
  filePath: string;
  fileName: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source: string;
}

export interface OutputMessage {
  id: string;
  timestamp: string;
  channel: string;
  text: string;
  type?: 'log' | 'info' | 'error' | 'success';
}

export type ActiveSideBarView =
  | 'explorer'
  | 'search'
  | 'git'
  | 'extensions'
  | 'ai-assistant'
  | 'rest-client'
  | 'code-radar'
  | 'game'
  | 'master-panel'
  | 'settings'
  | 'edu';
export type ActivePanelView = 'problems' | 'output' | 'terminal' | 'debug' | 'ports' | 'python';

export interface ForwardedPort {
  id: string;
  port: number;
  localAddress: string;
  proxyUrl?: string;
  runningProcess: string;
  privacy: 'Public' | 'Private';
  origin: 'Auto' | 'User';
  status?: 'listening' | 'inactive';
}

// ==========================================
// AI Multi-Agent Workspace & Inline Diff Review
// ==========================================

export type AgentRole = 'planner' | 'coder' | 'reviewer' | 'tester';

export type AgentWorkflowType = 'feature' | 'bugfix' | 'refactor' | 'security' | 'custom';

export interface AgentWorkspaceStep {
  id: string;
  title: string;
  agent: AgentRole;
  status: 'pending' | 'running' | 'completed' | 'error';
  details: string;
  timestamp: string;
}

export interface FilePatchProposal {
  id: string;
  path: string;
  fileName: string;
  language: string;
  diff: string;
  oldContent: string;
  newContent: string;
  additions: number;
  deletions: number;
  reviewNotes: string;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'pending' | 'accepted' | 'rejected';
}

export interface AgentRunResult {
  summary: string;
  workflowType: AgentWorkflowType;
  steps: AgentWorkspaceStep[];
  files: FilePatchProposal[];
  testsGenerated?: string;
  tokensUsed?: number;
  durationMs?: number;
}
