import type { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

interface RoomFile {
  content: string;
  language: string;
}

interface RoomPeer {
  peerId: string;
  name: string;
  color: string;
  filePath: string;
  line: number;
  col: number;
  isHost: boolean;
  ws: WebSocket;
}

interface RoomChatMessage {
  id: string;
  peerId: string;
  name: string;
  color: string;
  text: string;
  timestamp: string;
}

interface CollabRoom {
  roomId: string;
  hostPeerId: string;
  mode: 'edit' | 'readonly';
  activeFilePath: string;
  files: Record<string, RoomFile>;
  chat: RoomChatMessage[];
  peers: Map<string, RoomPeer>;
  lastActivityAt: number;
}

const MAX_ROOMS = 100;
const MAX_PEERS_PER_ROOM = 25;
const MAX_FILE_BYTES = 128 * 1024;
const PEER_COLORS = ['#38bdf8', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

const DEFAULT_STARTER_FILES: Record<string, RoomFile> = {
  'main.py': {
    language: 'python',
    content: `# Compillo Pair Coding Room (Beta)\n# Share this room link to edit code together in real time.\n\ndef two_sum(nums, target):\n    seen = {}\n    for idx, num in enumerate(nums):\n        need = target - num\n        if need in seen:\n            return [seen[need], idx]\n        seen[num] = idx\n    return []\n\nprint("Pair Coding Result:", two_sum([2, 7, 11, 15], 9))\n`,
  },
  'notes.md': {
    language: 'markdown',
    content: `# Pair Session Scratchpad\n\n- Goal: Solve Two Sum in O(n) time\n- Host can switch room permissions between Read/Write and Read-Only.\n`,
  },
};

function sanitizeRoomId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 48);
}

function sendJson(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

export function attachCollabWebSocket(httpServer: HttpServer) {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 256 * 1024,
  });

  const rooms = new Map<string, CollabRoom>();

  const serializePeers = (room: CollabRoom) =>
    Array.from(room.peers.values()).map((p) => ({
      peerId: p.peerId,
      name: p.name,
      color: p.color,
      filePath: p.filePath,
      line: p.line,
      col: p.col,
      isHost: p.peerId === room.hostPeerId,
    }));

  const broadcast = (room: CollabRoom, payload: unknown, exceptPeerId?: string) => {
    const msg = JSON.stringify(payload);
    for (const peer of room.peers.values()) {
      if (exceptPeerId && peer.peerId === exceptPeerId) continue;
      if (peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(msg);
      }
    }
  };

  // Heartbeat & stale room cleanup
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [id, room] of rooms.entries()) {
      for (const [pid, peer] of room.peers.entries()) {
        if (peer.ws.readyState !== WebSocket.OPEN) {
          room.peers.delete(pid);
        }
      }
      if (room.peers.size === 0 && now - room.lastActivityAt > 30 * 60 * 1000) {
        rooms.delete(id);
      }
    }
  }, 30_000);

  httpServer.on('close', () => clearInterval(interval));

  httpServer.on('upgrade', (req: IncomingMessage, socket, head) => {
    const urlStr = req.url || '';
    if (!urlStr.startsWith('/ws/collab')) {
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    let joinedRoom: CollabRoom | null = null;
    let joinedPeerId = '';

    const url = new URL(req.url || '/ws/collab', 'http://127.0.0.1');
    const queryRoom = sanitizeRoomId(url.searchParams.get('room') || '');

    ws.on('message', (rawData) => {
      let msg: any;
      try {
        msg = JSON.parse(rawData.toString('utf-8'));
      } catch {
        sendJson(ws, { type: 'room:error', message: 'Malformed JSON event' });
        return;
      }

      if (!msg || typeof msg.type !== 'string') return;

      if (msg.type === 'room:join') {
        const roomId = sanitizeRoomId(msg.roomId || queryRoom || '') || 'compillo-lobby';
        const peerId = String(msg.peerId || `peer_${Math.random().toString(36).slice(2, 9)}`).slice(0, 40);
        const name = String(msg.name || 'Developer').trim().slice(0, 40) || 'Developer';

        if (!rooms.has(roomId)) {
          if (rooms.size >= MAX_ROOMS) {
            const firstKey = rooms.keys().next().value;
            if (firstKey) rooms.delete(firstKey);
          }
          rooms.set(roomId, {
            roomId,
            hostPeerId: peerId,
            mode: 'edit',
            activeFilePath: 'main.py',
            files: {
              'main.py': { ...DEFAULT_STARTER_FILES['main.py'] },
              'notes.md': { ...DEFAULT_STARTER_FILES['notes.md'] },
            },
            chat: [],
            peers: new Map(),
            lastActivityAt: Date.now(),
          });
        }

        const room = rooms.get(roomId)!;
        if (!room.peers.has(peerId) && room.peers.size >= MAX_PEERS_PER_ROOM) {
          sendJson(ws, { type: 'room:error', message: 'Room is full (25 peers max).' });
          return;
        }

        // Reassign host if original host left
        if (!room.peers.has(room.hostPeerId) && room.peers.size === 0) {
          room.hostPeerId = peerId;
        }

        const color = PEER_COLORS[room.peers.size % PEER_COLORS.length];
        const peer: RoomPeer = {
          peerId,
          name,
          color,
          filePath: room.activeFilePath,
          line: 1,
          col: 1,
          isHost: peerId === room.hostPeerId,
          ws,
        };

        room.peers.set(peerId, peer);
        room.lastActivityAt = Date.now();
        joinedRoom = room;
        joinedPeerId = peerId;

        // Initial authoritative snapshot
        sendJson(ws, {
          type: 'room:state',
          roomId: room.roomId,
          hostPeerId: room.hostPeerId,
          selfPeerId: peerId,
          mode: room.mode,
          activeFilePath: room.activeFilePath,
          files: room.files,
          chat: room.chat,
          peers: serializePeers(room),
        });

        broadcast(
          room,
          {
            type: 'user:joined',
            peer: {
              peerId: peer.peerId,
              name: peer.name,
              color: peer.color,
              filePath: peer.filePath,
              line: peer.line,
              col: peer.col,
              isHost: peer.isHost,
            },
            peers: serializePeers(room),
          },
          peerId
        );
        return;
      }

      if (!joinedRoom || !joinedPeerId) return;
      const room = joinedRoom;
      const peer = room.peers.get(joinedPeerId);
      if (!peer) return;
      room.lastActivityAt = Date.now();

      if (msg.type === 'file:update') {
        if (room.mode === 'readonly' && peer.peerId !== room.hostPeerId) {
          sendJson(ws, { type: 'room:error', message: 'Room is currently set to Read-Only by the host.' });
          return;
        }
        const filePath = String(msg.filePath || '').slice(0, 120);
        const content = typeof msg.content === 'string' ? msg.content : '';
        if (!filePath || Buffer.byteLength(content, 'utf-8') > MAX_FILE_BYTES) return;
        const existing = room.files[filePath];
        const language = typeof msg.language === 'string' ? msg.language : existing?.language || 'plaintext';
        room.files[filePath] = { content, language };

        broadcast(
          room,
          {
            type: 'file:update',
            filePath,
            content,
            language,
            byPeerId: peer.peerId,
          },
          peer.peerId
        );
        return;
      }

      if (msg.type === 'file:create') {
        if (room.mode === 'readonly' && peer.peerId !== room.hostPeerId) return;
        const filePath = String(msg.filePath || '').trim().replace(/^\/+/, '').slice(0, 80);
        if (!filePath || filePath.includes('..') || Object.keys(room.files).length >= 20) return;
        if (room.files[filePath]) return;
        const language = filePath.endsWith('.py')
          ? 'python'
          : filePath.endsWith('.js')
            ? 'javascript'
            : filePath.endsWith('.html')
              ? 'html'
              : filePath.endsWith('.css')
                ? 'css'
                : 'markdown';
        room.files[filePath] = { content: '', language };
        room.activeFilePath = filePath;

        broadcast(room, {
          type: 'file:create',
          filePath,
          file: room.files[filePath],
          byPeerId: peer.peerId,
        });
        return;
      }

      if (msg.type === 'cursor:move') {
        peer.filePath = String(msg.filePath || peer.filePath).slice(0, 120);
        peer.line = Math.max(1, Math.min(100000, Number(msg.line) || 1));
        peer.col = Math.max(1, Math.min(10000, Number(msg.col) || 1));

        broadcast(
          room,
          {
            type: 'cursor:move',
            peerId: peer.peerId,
            name: peer.name,
            color: peer.color,
            filePath: peer.filePath,
            line: peer.line,
            col: peer.col,
          },
          peer.peerId
        );
        return;
      }

      if (msg.type === 'chat:send') {
        const text = String(msg.text || '').trim().slice(0, 400);
        if (!text) return;
        const chatMsg: RoomChatMessage = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          peerId: peer.peerId,
          name: peer.name,
          color: peer.color,
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        room.chat = [...room.chat.slice(-49), chatMsg];
        broadcast(room, { type: 'chat:message', message: chatMsg });
        return;
      }

      if (msg.type === 'room:permissions') {
        if (peer.peerId !== room.hostPeerId) return;
        const nextMode = msg.mode === 'readonly' ? 'readonly' : 'edit';
        room.mode = nextMode;
        broadcast(room, { type: 'room:permissions', mode: nextMode });
      }
    });

    ws.on('close', () => {
      if (!joinedRoom || !joinedPeerId) return;
      const room = joinedRoom;
      room.peers.delete(joinedPeerId);
      if (room.hostPeerId === joinedPeerId && room.peers.size > 0) {
        const nextHost = room.peers.values().next().value;
        if (nextHost) {
          room.hostPeerId = nextHost.peerId;
          nextHost.isHost = true;
        }
      }
      broadcast(room, {
        type: 'user:left',
        peerId: joinedPeerId,
        hostPeerId: room.hostPeerId,
        peers: serializePeers(room),
      });
    });
  });
}
