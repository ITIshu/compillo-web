import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  FilePlus2,
  Lock,
  Play,
  Send,
  Unlock,
  Users,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { WebsiteThemeTokens } from './WebsitePageTheme';
import { saveCollabRoomMetadata } from '../../../services/firestorePlatformService';
import { runPythonSnippet } from './ssePythonHelper';

interface PairCodingBetaPageProps {
  tokens: WebsiteThemeTokens;
  firebaseUser: User | null;
  initialRoomId?: string;
}

interface PeerInfo {
  peerId: string;
  name: string;
  color: string;
  filePath: string;
  line: number;
  col: number;
  isHost: boolean;
}

interface ChatMessage {
  id: string;
  peerId: string;
  name: string;
  color: string;
  text: string;
  timestamp: string;
}

function generateRoomId() {
  return 'pair-' + Math.random().toString(36).slice(2, 8);
}

export const PairCodingBetaPage: React.FC<PairCodingBetaPageProps> = ({
  tokens,
  firebaseUser,
  initialRoomId,
}) => {
  const [roomId, setRoomId] = useState(
    () => (initialRoomId && initialRoomId.trim()) || generateRoomId()
  );
  const [joinRoomInput, setJoinRoomInput] = useState(roomId);
  const [displayName, setDisplayName] = useState(
    firebaseUser?.displayName || 'Developer-' + Math.floor(100 + Math.random() * 900)
  );
  const [peerId] = useState(() => 'p_' + Math.random().toString(36).slice(2, 10));

  const [connStatus, setConnStatus] = useState<'connecting' | 'connected' | 'reconnecting'>('connecting');
  const [hostPeerId, setHostPeerId] = useState('');
  const [mode, setMode] = useState<'edit' | 'readonly'>('edit');
  const [files, setFiles] = useState<Record<string, { content: string; language: string }>>({
    'main.py': { content: '# Connecting to pair room...', language: 'python' },
  });
  const [activeFile, setActiveFile] = useState('main.py');
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [isRunningCode, setIsRunningCode] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const isRemoteUpdateRef = useRef(false);
  const debounceEmitRef = useRef<number | null>(null);

  useEffect(() => {
    if (firebaseUser?.displayName) {
      setDisplayName(firebaseUser.displayName);
    }
  }, [firebaseUser]);

  const connectRoom = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnStatus('connecting');
    setRoomError(null);

    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProto}//${window.location.host}/ws/collab?room=${encodeURIComponent(roomId)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnStatus('connected');
      ws.send(
        JSON.stringify({
          type: 'room:join',
          roomId,
          peerId,
          name: displayName,
        })
      );
      if (firebaseUser) {
        void saveCollabRoomMetadata({
          roomId,
          mode,
          activeFilePath: activeFile,
        });
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'room:state') {
          isRemoteUpdateRef.current = true;
          setHostPeerId(msg.hostPeerId || '');
          setMode(msg.mode === 'readonly' ? 'readonly' : 'edit');
          if (msg.files && typeof msg.files === 'object') {
            setFiles(msg.files);
            if (!msg.files[activeFile]) {
              const firstKey = Object.keys(msg.files)[0];
              if (firstKey) setActiveFile(firstKey);
            }
          }
          setPeers(Array.isArray(msg.peers) ? msg.peers : []);
          setChat(Array.isArray(msg.chat) ? msg.chat : []);
          window.setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 0);
        } else if (msg.type === 'file:update') {
          isRemoteUpdateRef.current = true;
          setFiles((prev) => ({
            ...prev,
            [msg.filePath]: {
              content: msg.content,
              language: msg.language || prev[msg.filePath]?.language || 'plaintext',
            },
          }));
          window.setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 0);
        } else if (msg.type === 'file:create') {
          setFiles((prev) => ({ ...prev, [msg.filePath]: msg.file }));
        } else if (msg.type === 'user:joined' || msg.type === 'user:left') {
          if (msg.hostPeerId) setHostPeerId(msg.hostPeerId);
          setPeers(Array.isArray(msg.peers) ? msg.peers : []);
        } else if (msg.type === 'cursor:move') {
          setPeers((prev) =>
            prev.map((p) =>
              p.peerId === msg.peerId
                ? { ...p, filePath: msg.filePath, line: msg.line, col: msg.col }
                : p
            )
          );
        } else if (msg.type === 'chat:message') {
          setChat((prev) => [...prev.slice(-49), msg.message]);
        } else if (msg.type === 'room:permissions') {
          setMode(msg.mode === 'readonly' ? 'readonly' : 'edit');
        } else if (msg.type === 'room:error') {
          setRoomError(msg.message || 'Room action rejected');
        }
      } catch {
        // ignore invalid frames
      }
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        setConnStatus('reconnecting');
        reconnectTimerRef.current = window.setTimeout(() => {
          connectRoom();
        }, 2500);
      }
    };
  }, [roomId, peerId, displayName, firebaseUser]);

  useEffect(() => {
    connectRoom();
    return () => {
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        const sock = wsRef.current;
        wsRef.current = null;
        sock.close();
      }
    };
  }, [connectRoom]);

  const isHost = peerId === hostPeerId;
  const isReadOnlyBlocked = mode === 'readonly' && !isHost;
  const activeContent = files[activeFile]?.content || '';

  const handleCodeChange = (nextVal: string) => {
    if (isReadOnlyBlocked) return;
    setFiles((prev) => ({
      ...prev,
      [activeFile]: {
        content: nextVal,
        language: prev[activeFile]?.language || 'python',
      },
    }));

    if (isRemoteUpdateRef.current) return;
    if (debounceEmitRef.current) window.clearTimeout(debounceEmitRef.current);
    debounceEmitRef.current = window.setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'file:update',
            filePath: activeFile,
            content: nextVal,
            language: files[activeFile]?.language || 'python',
          })
        );
      }
    }, 45);
  };

  const handleCursorUpdate = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const before = el.value.slice(0, el.selectionStart || 0);
    const lines = before.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'cursor:move',
          filePath: activeFile,
          line,
          col,
        })
      );
    }
  };

  const handleTogglePermissions = () => {
    if (!isHost || wsRef.current?.readyState !== WebSocket.OPEN) return;
    const nextMode = mode === 'edit' ? 'readonly' : 'edit';
    wsRef.current.send(JSON.stringify({ type: 'room:permissions', mode: nextMode }));
    if (firebaseUser) {
      void saveCollabRoomMetadata({ roomId, mode: nextMode, activeFilePath: activeFile });
    }
  };

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFileName.trim().replace(/^\/+/, '').replace(/\.\./g, '');
    if (!clean || files[clean] || isReadOnlyBlocked) return;
    setFiles((prev) => ({ ...prev, [clean]: { content: '', language: 'plaintext' } }));
    setActiveFile(clean);
    setNewFileName('');
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'file:create', filePath: clean }));
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatDraft.trim();
    if (!text || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'chat:send', text }));
    setChatDraft('');
  };

  const handleCopyInvite = () => {
    const shareUrl = `${window.location.origin}/?page=pair-coding&room=${encodeURIComponent(roomId)}`;
    void navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRunRoomPython = async () => {
    setIsRunningCode(true);
    setRunOutput(null);
    const res = await runPythonSnippet(activeContent, activeFile);
    const combined = [res.stdout, res.stderr].filter(Boolean).join('\n').trim();
    setRunOutput(combined || `Exited with code ${res.exitCode} (${res.elapsedMs}ms)`);
    setIsRunningCode(false);
  };

  const handleJoinDifferentRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinRoomInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!clean) return;
    setRoomId(clean);
    const url = new URL(window.location.href);
    url.searchParams.set('page', 'pair-coding');
    url.searchParams.set('room', clean);
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-medium flex items-center gap-2" style={{ color: tokens.fgMuted }}>
            <span>Website Beta Sandbox</span>
            <span aria-hidden="true">·</span>
            <span>Real WebSocket Sync</span>
            <span aria-hidden="true">·</span>
            <span>
              {connStatus === 'connected'
                ? `Connected (${peers.length} peer${peers.length === 1 ? '' : 's'})`
                : connStatus === 'connecting'
                  ? 'Connecting...'
                  : 'Reconnecting...'}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
            Real-Time Pair Coding Room (Beta)
          </h1>
          <p className="text-sm sm:text-base leading-relaxed" style={{ color: tokens.fgMuted }}>
            Test live multi-cursor collaboration right on the Compillo Website before graduation to the main editor. Share the room link with teammates to edit code and chat in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyInvite}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
          >
            {copiedLink ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedLink ? 'Room Invite Copied!' : 'Copy Room Link'}</span>
          </button>

          {isHost && (
            <button
              type="button"
              onClick={handleTogglePermissions}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg }}
            >
              {mode === 'edit' ? <Unlock size={13} className="text-emerald-400" /> : <Lock size={13} className="text-amber-400" />}
              <span>{mode === 'edit' ? 'Mode: Read/Write' : 'Mode: Read-Only'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Room Switcher Bar */}
      <form
        onSubmit={handleJoinDifferentRoom}
        className="p-4 rounded-xl border flex flex-wrap items-center gap-3"
        style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
      >
        <label className="text-xs font-semibold" htmlFor="pair-name">Your Name</label>
        <input
          id="pair-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="px-3 py-1.5 rounded-lg border text-xs outline-none w-40"
          style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.fgPrimary }}
        />
        <label className="text-xs font-semibold" htmlFor="pair-room-id">Room ID</label>
        <input
          id="pair-room-id"
          type="text"
          value={joinRoomInput}
          onChange={(e) => setJoinRoomInput(e.target.value)}
          className="px-3 py-1.5 rounded-lg border text-xs font-mono outline-none w-44"
          style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.fgPrimary }}
        />
        <button
          type="submit"
          className="px-3.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
          style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
        >
          Switch / Join Room
        </button>
        <button
          type="button"
          onClick={() => {
            const fresh = generateRoomId();
            setJoinRoomInput(fresh);
            setRoomId(fresh);
          }}
          className="px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer"
          style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.fgMuted }}
        >
          New Random Room
        </button>
      </form>

      {roomError && <div className="text-xs text-rose-400">{roomError}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Synchronized Code Workspace */}
        <div
          className="lg:col-span-8 rounded-2xl border overflow-hidden"
          style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
        >
          <div
            className="px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-3"
            style={{ borderColor: tokens.borderColor, backgroundColor: tokens.titleBarBg }}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {Object.keys(files).map((fp) => (
                <button
                  key={fp}
                  type="button"
                  onClick={() => setActiveFile(fp)}
                  className="px-3 py-1 rounded-md text-xs font-mono font-semibold cursor-pointer"
                  style={
                    activeFile === fp
                      ? { backgroundColor: tokens.accent, color: tokens.accentText }
                      : { color: tokens.fgMuted }
                  }
                >
                  {fp}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <form onSubmit={handleCreateFile} className="flex items-center gap-1">
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="helper.py"
                  className="w-24 px-2 py-1 rounded border text-[11px] font-mono outline-none"
                  style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.fgPrimary }}
                />
                <button
                  type="submit"
                  className="p-1.5 rounded border cursor-pointer"
                  style={{ borderColor: tokens.borderColor }}
                  title="Add shared file"
                >
                  <FilePlus2 size={13} />
                </button>
              </form>

              <button
                type="button"
                onClick={handleRunRoomPython}
                disabled={isRunningCode || !activeFile.endsWith('.py')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
              >
                <Play size={12} />
                <span>{isRunningCode ? 'Running...' : 'Run'}</span>
              </button>
            </div>
          </div>

          <textarea
            rows={15}
            value={activeContent}
            readOnly={isReadOnlyBlocked}
            onChange={(e) => handleCodeChange(e.target.value)}
            onClick={handleCursorUpdate}
            onKeyUp={handleCursorUpdate}
            spellCheck={false}
            className="w-full p-5 font-mono text-xs sm:text-[13px] leading-relaxed outline-none resize-y"
            style={{ backgroundColor: tokens.pageBg, color: tokens.fgPrimary }}
          />

          {runOutput !== null && (
            <div className="p-4 border-t font-mono text-xs whitespace-pre-wrap" style={{ borderColor: tokens.borderColor, backgroundColor: tokens.titleBarBg }}>
              <div className="text-[11px] font-sans font-semibold mb-1" style={{ color: tokens.fgMuted }}>
                Sandbox Output ({activeFile})
              </div>
              {runOutput}
            </div>
          )}
        </div>

        {/* Right 4 Cols: Active Peers + Chat */}
        <div className="lg:col-span-4 space-y-6">
          <div
            className="p-5 rounded-2xl border space-y-3"
            style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
          >
            <div className="flex items-center justify-between text-xs font-bold border-b pb-2.5" style={{ borderColor: tokens.borderColor }}>
              <span className="flex items-center gap-1.5">
                <Users size={14} />
                <span>Active Collaborators ({peers.length})</span>
              </span>
            </div>

            <div className="space-y-2">
              {peers.map((p) => (
                <div
                  key={p.peerId}
                  className="p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs"
                  style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="font-semibold truncate">
                      {p.name}{p.peerId === peerId ? ' (You)' : ''}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums shrink-0" style={{ color: tokens.fgMuted }}>
                    {p.isHost ? 'Host · ' : ''}Ln {p.line}:{p.col}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="p-5 rounded-2xl border space-y-3 flex flex-col"
            style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
          >
            <div className="text-xs font-bold border-b pb-2.5" style={{ borderColor: tokens.borderColor }}>
              Room Chat
            </div>

            <div className="h-52 overflow-y-auto space-y-2 pr-1 text-xs">
              {chat.length === 0 ? (
                <div className="text-center py-10" style={{ color: tokens.fgMuted }}>
                  No messages yet. Say hello to teammates in room {roomId}.
                </div>
              ) : (
                chat.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-lg border space-y-1"
                    style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold" style={{ color: m.color }}>{m.name}</span>
                      <span className="font-mono" style={{ color: tokens.fgMuted }}>{m.timestamp}</span>
                    </div>
                    <div>{m.text}</div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2 pt-1">
              <input
                type="text"
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder="Message teammates..."
                maxLength={400}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg border text-xs outline-none"
                style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.fgPrimary }}
              />
              <button
                type="submit"
                className="p-2 rounded-lg shrink-0 cursor-pointer"
                style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
                title="Send message"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
