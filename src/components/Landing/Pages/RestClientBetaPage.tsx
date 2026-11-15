import React, { useState } from 'react';
import { WebsiteThemeTokens } from './WebsitePageTheme';
import { Send, Globe, CheckCircle2, Clock, Shield, Plus, Trash2 } from 'lucide-react';

interface RestClientBetaPageProps {
  tokens: WebsiteThemeTokens;
}

interface HeaderKV {
  key: string;
  value: string;
}

export const RestClientBetaPage: React.FC<RestClientBetaPageProps> = ({ tokens }) => {
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [url, setUrl] = useState('https://api.compillo.dev/v1/health');
  const [headers, setHeaders] = useState<HeaderKV[]>([
    { key: 'Authorization', value: 'Bearer cp_live_998124a' },
    { key: 'Content-Type', value: 'application/json' }
  ]);
  const [requestBody, setRequestBody] = useState('{\n  "service": "compillo-runner",\n  "action": "ping"\n}');
  const [response, setResponse] = useState<{
    status: number;
    statusText: string;
    latencyMs: number;
    sizeBytes: number;
    headers: Record<string, string>;
    body: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const handleHeaderChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...headers];
    updated[index][field] = val;
    setHeaders(updated);
  };

  const handleDeleteHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const handleSendRequest = () => {
    setIsLoading(true);
    setResponse(null);
    setTimeout(() => {
      const startTime = performance.now();
      const mockLatency = Math.floor(Math.random() * 45) + 12;
      const mockStatus = method === 'POST' ? 201 : 200;
      
      const resObj = {
        status: mockStatus,
        statusText: mockStatus === 201 ? 'Created' : 'OK',
        latencyMs: mockLatency,
        sizeBytes: 342,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-cache',
          'x-ratelimit-remaining': '998',
          'server': 'Compillo-Edge/1.4'
        },
        body: JSON.stringify({
          success: true,
          methodUsed: method,
          requestedUrl: url,
          timestamp: new Date().toISOString(),
          data: {
            message: "Request executed successfully through Compillo REST Client Gateway",
            echoedBody: method !== 'GET' ? JSON.parse(requestBody || '{}') : null,
            headersReceivedCount: headers.length
          }
        }, null, 2)
      };

      setResponse(resObj);
      setIsLoading(false);
    }, 350);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b" style={{ borderColor: tokens.borderColor }}>
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Essential Dev Lab
            </span>
            <span className="text-xs text-gray-400 font-mono">REST Client v1.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: tokens.fgPrimary }}>
            API Endpoint & REST Client Debugger
          </h1>
          <p className="text-sm mt-1" style={{ color: tokens.fgMuted }}>
            Test REST APIs, configure custom auth headers, and inspect response payloads, latency, and headers in real-time.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left / Request Builder */}
        <div className="space-y-4">
          <div className="rounded-xl border p-4 space-y-4" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
            <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: tokens.borderColor }}>
              <Globe size={16} className="text-cyan-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider font-mono" style={{ color: tokens.fgPrimary }}>Request Builder</h2>
            </div>

            {/* URL & Method Bar */}
            <div className="flex gap-2">
              <select
                value={method}
                onChange={(e: any) => setMethod(e.target.value)}
                className="px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-xs font-mono font-bold text-cyan-300 focus:outline-none"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>

              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/v1/resource"
                className="flex-1 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500"
              />

              <button
                onClick={handleSendRequest}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium shadow transition-all disabled:opacity-50"
              >
                <Send size={14} />
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </div>

            {/* Headers Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-gray-400 uppercase">Request Headers</span>
                <button
                  onClick={handleAddHeader}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:underline"
                >
                  <Plus size={12} /> Add Header
                </button>
              </div>
              <div className="space-y-2">
                {headers.map((h, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Header Key"
                      value={h.key}
                      onChange={(e) => handleHeaderChange(idx, 'key', e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded bg-black/30 border border-white/10 text-xs font-mono text-gray-200 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Header Value"
                      value={h.value}
                      onChange={(e) => handleHeaderChange(idx, 'value', e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded bg-black/30 border border-white/10 text-xs font-mono text-gray-200 focus:outline-none"
                    />
                    <button
                      onClick={() => handleDeleteHeader(idx)}
                      className="p-1 rounded hover:bg-rose-500/20 text-rose-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Request Body */}
            {method !== 'GET' && (
              <div>
                <span className="block text-xs font-mono text-gray-400 uppercase mb-1">Request Body (JSON)</span>
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  rows={5}
                  className="w-full p-3 rounded-lg bg-black/30 border border-white/10 text-xs font-mono text-cyan-200 resize-none focus:outline-none focus:border-cyan-500"
                  spellCheck={false}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right / Response Panel */}
        <div className="rounded-xl border flex flex-col overflow-hidden" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
          <div className="flex items-center justify-between px-4 py-3 border-b bg-black/20" style={{ borderColor: tokens.borderColor }}>
            <span className="text-xs font-semibold font-mono uppercase tracking-wider" style={{ color: tokens.fgPrimary }}>Response Output</span>
            {response && (
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 size={12} /> {response.status} {response.statusText}
                </span>
                <span className="flex items-center gap-1 text-cyan-300">
                  <Clock size={12} /> {response.latencyMs} ms
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 p-4 font-mono text-xs bg-black/40 overflow-auto max-h-[520px]">
            {response ? (
              <div className="space-y-4">
                <div>
                  <span className="text-gray-400 text-[10px] uppercase block mb-1">Response Headers</span>
                  <div className="p-2 rounded bg-black/30 border border-white/5 space-y-1 text-gray-300">
                    {Object.entries(response.headers).map(([k, v]) => (
                      <div key={k}><span className="text-cyan-400">{k}:</span> {v}</div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-gray-400 text-[10px] uppercase block mb-1">Response Body</span>
                  <pre className="text-cyan-200">{response.body}</pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-28 text-gray-500">
                Configure your request and click <span className="text-cyan-400 font-semibold">Send</span> to inspect API response.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
