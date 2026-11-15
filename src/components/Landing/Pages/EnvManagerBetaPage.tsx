import React, { useState } from 'react';
import { WebsiteThemeTokens } from './WebsitePageTheme';
import { Key, Lock, Copy, Check, Eye, EyeOff, Plus, Trash2, FileText, Shield } from 'lucide-react';

interface EnvManagerBetaPageProps {
  tokens: WebsiteThemeTokens;
}

interface EnvVar {
  id: string;
  key: string;
  value: string;
  env: 'development' | 'production' | 'staging';
  isSecret: boolean;
}

export const EnvManagerBetaPage: React.FC<EnvManagerBetaPageProps> = ({ tokens }) => {
  const [vars, setVars] = useState<EnvVar[]>([
    { id: '1', key: 'VITE_API_BASE_URL', value: 'https://api.compillo.dev/v1', env: 'production', isSecret: false },
    { id: '2', key: 'DATABASE_URL', value: 'postgres://user:secr3t@cluster.gcp.db:5432/prod', env: 'production', isSecret: true },
    { id: '3', key: 'JWT_SECRET_KEY', value: 'cf8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c', env: 'development', isSecret: true },
    { id: '4', key: 'PORT', value: '3000', env: 'development', isSecret: false },
  ]);

  const [activeEnv, setActiveEnv] = useState<'all' | 'development' | 'production' | 'staging'>('all');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newEnv, setNewEnv] = useState<'development' | 'production' | 'staging'>('development');
  const [newIsSecret, setNewIsSecret] = useState(false);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [copiedEnvFile, setCopiedEnvFile] = useState(false);
  const [jwtToken, setJwtToken] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFleGVyIEZhbiIsImlhdCI6MTc0MDAwMDAwMH0.signature_test');
  const [jwtDecoded, setJwtDecoded] = useState<string | null>(null);

  const handleAddVar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    const item: EnvVar = {
      id: `env_${Date.now()}`,
      key: newKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
      value: newValue,
      env: newEnv,
      isSecret: newIsSecret,
    };
    setVars([item, ...vars]);
    setNewKey('');
    setNewValue('');
  };

  const handleDelete = (id: string) => {
    setVars(vars.filter(v => v.id !== id));
  };

  const toggleShow = (id: string) => {
    setShowValues(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredVars = activeEnv === 'all' ? vars : vars.filter(v => v.env === activeEnv);

  const generateEnvFileContent = () => {
    return filteredVars.map(v => `${v.key}=${v.value}`).join('\n');
  };

  const handleCopyEnvFile = () => {
    navigator.clipboard.writeText(generateEnvFileContent());
    setCopiedEnvFile(true);
    setTimeout(() => setCopiedEnvFile(false), 2000);
  };

  const decodeJwt = () => {
    try {
      const parts = jwtToken.split('.');
      if (parts.length !== 3) {
        setJwtDecoded(JSON.stringify({ error: "Invalid JWT structure (must have 3 parts separated by dots)" }, null, 2));
        return;
      }
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      setJwtDecoded(JSON.stringify({ header, payload, signatureStatus: "Valid format (signature unverified)" }, null, 2));
    } catch (err: any) {
      setJwtDecoded(JSON.stringify({ error: "Failed to decode JWT base64: " + err.message }, null, 2));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b" style={{ borderColor: tokens.borderColor }}>
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Essential Dev Lab
            </span>
            <span className="text-xs text-gray-400 font-mono">v1.2.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: tokens.fgPrimary }}>
            Environment Variables & Secrets Manager
          </h1>
          <p className="text-sm mt-1" style={{ color: tokens.fgMuted }}>
            Securely configure environment variables, generate .env files, and inspect JWT auth tokens for your projects.
          </p>
        </div>

        {/* Environment Filter */}
        <div className="flex items-center p-1 rounded-xl border" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
          {(['all', 'development', 'production', 'staging'] as const).map(env => (
            <button
              key={env}
              onClick={() => setActiveEnv(env)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                activeEnv === env ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              {env}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left / Add Variable Form */}
        <div className="rounded-xl border p-4 space-y-4" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
          <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: tokens.borderColor }}>
            <Key size={16} className="text-emerald-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider font-mono" style={{ color: tokens.fgPrimary }}>Add Environment Variable</h2>
          </div>

          <form onSubmit={handleAddVar} className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Variable Key</label>
              <input
                type="text"
                placeholder="VITE_API_KEY"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Value</label>
              <input
                type="text"
                placeholder="your_secret_value_here"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-xs font-mono text-gray-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Environment</label>
                <select
                  value={newEnv}
                  onChange={(e: any) => setNewEnv(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-xs font-mono text-gray-200 focus:outline-none"
                >
                  <option value="development">Development</option>
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                </select>
              </div>
              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={newIsSecret}
                    onChange={(e) => setNewIsSecret(e.target.checked)}
                    className="rounded bg-black/40 border-white/20 text-emerald-600 focus:ring-0"
                  />
                  <Lock size={12} className="text-amber-400" /> Mark as Secret
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow transition-all"
            >
              <Plus size={14} /> Add Variable
            </button>
          </form>
        </div>

        {/* Right / Environment Variables List & .env Export */}
        <div className="lg:col-span-2 rounded-xl border flex flex-col overflow-hidden" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
          <div className="flex items-center justify-between px-4 py-3 border-b bg-black/20" style={{ borderColor: tokens.borderColor }}>
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-emerald-400" />
              <span className="text-xs font-semibold font-mono" style={{ color: tokens.fgPrimary }}>Configured Environment Variables</span>
            </div>
            <button
              onClick={handleCopyEnvFile}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-emerald-300 border border-white/10 text-xs font-mono transition-colors"
            >
              {copiedEnvFile ? <Check size={12} /> : <Copy size={12} />}
              {copiedEnvFile ? 'Copied .env' : 'Copy .env File'}
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/30 border-b text-gray-400" style={{ borderColor: tokens.borderColor }}>
                <tr>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Environment</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: tokens.borderColor }}>
                {filteredVars.map(v => {
                  const isHidden = v.isSecret && !showValues[v.id];
                  return (
                    <tr key={v.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-bold text-emerald-400 flex items-center gap-1.5">
                        {v.isSecret && <Lock size={12} className="text-amber-400 shrink-0" />}
                        {v.key}
                      </td>
                      <td className="px-4 py-3 text-gray-300 font-mono">
                        {isHidden ? '••••••••••••••••' : v.value}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase bg-white/5 text-gray-300 border border-white/10">
                          {v.env}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {v.isSecret && (
                          <button
                            onClick={() => toggleShow(v.id)}
                            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            title={isHidden ? 'Reveal value' : 'Hide value'}
                          >
                            {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="p-1.5 rounded hover:bg-rose-500/20 text-rose-400 transition-colors"
                          title="Delete variable"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* JWT Debugger Section */}
      <div className="rounded-xl border p-6" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
        <div className="flex items-center gap-2 mb-4 pb-2 border-b" style={{ borderColor: tokens.borderColor }}>
          <Shield size={16} className="text-emerald-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider font-mono" style={{ color: tokens.fgPrimary }}>JWT Token Inspector & Decoder</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block text-xs font-mono text-gray-400">Paste JWT Token String</label>
            <textarea
              value={jwtToken}
              onChange={(e) => setJwtToken(e.target.value)}
              rows={4}
              className="w-full p-3 font-mono text-xs rounded-lg bg-black/30 border border-white/10 text-emerald-300 resize-none focus:outline-none focus:border-emerald-500"
              spellCheck={false}
            />
            <button
              onClick={decodeJwt}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow transition-all"
            >
              Decode JWT Payload
            </button>
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">Decoded Header & Payload Result</label>
            <div className="p-4 rounded-lg bg-black/40 border border-white/10 font-mono text-xs text-emerald-200 h-[140px] overflow-auto">
              {jwtDecoded ? (
                <pre>{jwtDecoded}</pre>
              ) : (
                <span className="text-gray-500">Click decode to inspect claims and header.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
