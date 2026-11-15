import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Sparkles,
  Bot,
} from 'lucide-react';
import { VSCodeThemeDefinition } from '../../services/themes';
import { keyVaultService, AiProvider, ProviderKeys } from '../../services/keyVaultService';

interface KeyVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: VSCodeThemeDefinition;
}

export const KeyVaultModal: React.FC<KeyVaultModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
}) => {
  const [keys, setKeys] = useState<ProviderKeys>({});
  const [geminiInput, setGeminiInput] = useState('');
  const [openaiInput, setOpenaiInput] = useState('');
  const [claudeInput, setClaudeInput] = useState('');

  const [showGemini, setShowGemini] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [showClaude, setShowClaude] = useState(false);

  const [testStatus, setTestStatus] = useState<
    Record<AiProvider, { loading: boolean; success?: boolean; message?: string }>
  >({
    gemini: { loading: false },
    openai: { loading: false },
    claude: { loading: false },
  });

  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  useEffect(() => {
    const unsub = keyVaultService.subscribe((currentKeys) => {
      setKeys(currentKeys);
      setGeminiInput(currentKeys.gemini || '');
      setOpenaiInput(currentKeys.openai || '');
      setClaudeInput(currentKeys.claude || '');
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (provider: AiProvider, value: string) => {
    const cleaned = value.trim().replace(/^['"]+|['"]+$/g, '').trim();
    keyVaultService.setKey(provider, cleaned || undefined);
    setSavedBanner(
      cleaned
        ? `Saved ${provider.toUpperCase()} API key to Key Vault`
        : `Cleared ${provider.toUpperCase()} API key`
    );
    setTimeout(() => setSavedBanner(null), 3000);
  };

  const handleRemove = (provider: AiProvider) => {
    keyVaultService.setKey(provider, undefined);
    if (provider === 'gemini') setGeminiInput('');
    if (provider === 'openai') setOpenaiInput('');
    if (provider === 'claude') setClaudeInput('');
    setTestStatus((prev) => ({ ...prev, [provider]: { loading: false } }));
    setSavedBanner(`Removed ${provider.toUpperCase()} key`);
    setTimeout(() => setSavedBanner(null), 3000);
  };

  const handleTestKey = async (provider: AiProvider, rawKey: string) => {
    const keyToTest = rawKey.trim().replace(/^['"]+|['"]+$/g, '').trim() || keys[provider];
    if (!keyToTest) {
      setTestStatus((prev) => ({
        ...prev,
        [provider]: { loading: false, success: false, message: 'Please enter a key first' },
      }));
      return;
    }

    setTestStatus((prev) => ({ ...prev, [provider]: { loading: true } }));
    const result = await keyVaultService.testKey(provider, keyToTest);
    setTestStatus((prev) => ({
      ...prev,
      [provider]: { loading: false, success: result.success, message: result.message },
    }));

    if (result.success) {
      handleSave(provider, keyToTest);
    }
  };

  const handleDone = () => {
    if (geminiInput.trim() && geminiInput.trim() !== (keys.gemini || '')) {
      keyVaultService.setKey('gemini', geminiInput);
    }
    if (openaiInput.trim() && openaiInput.trim() !== (keys.openai || '')) {
      keyVaultService.setKey('openai', openaiInput);
    }
    if (claudeInput.trim() && claudeInput.trim() !== (keys.claude || '')) {
      keyVaultService.setKey('claude', claudeInput);
    }
    onClose();
  };

  const isLight = currentTheme.type === 'light';
  const cardBg = isLight ? 'bg-black/[0.03] border-black/10' : 'bg-slate-900/40 border-slate-800';
  const inputCls = isLight
    ? 'w-full px-3 py-2 pr-10 text-xs rounded-lg bg-white border border-gray-300 focus:border-sky-500 focus:outline-none font-mono text-gray-900 placeholder:text-gray-400'
    : 'w-full px-3 py-2 pr-10 text-xs rounded-lg bg-black/40 border border-slate-700 focus:border-sky-500 focus:outline-none font-mono text-slate-200 placeholder:text-slate-500';
  const titleCls = isLight ? 'text-gray-900' : 'text-white';
  const subCls = isLight ? 'text-gray-600' : 'text-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl rounded-xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        style={{
          backgroundColor: currentTheme.ui.editorBg || '#0f172a',
          borderColor: currentTheme.ui.sideBarBorder || '#334155',
          color: currentTheme.ui.sideBarFg || '#f1f5f9',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: currentTheme.ui.sideBarBorder || '#334155' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Key size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-semibold tracking-tight ${titleCls}`}>
                  Compillo AI Key Vault (BYOK)
                </h2>
                <span className="text-[11px] text-sky-500 font-medium">Personal API Keys</span>
              </div>
              <p className={`text-xs ${subCls}`}>
                Configure your own API keys for ChatGPT, Gemini, or Claude · Stored in browser vault
              </p>
            </div>
          </div>
          <button
            onClick={handleDone}
            className={`p-1.5 rounded-lg transition-colors ${
              isLight ? 'text-gray-500 hover:text-gray-900 hover:bg-black/5' : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Status notification */}
        {savedBanner && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2 text-xs text-emerald-500 flex items-center gap-2">
            <CheckCircle2 size={14} />
            <span>{savedBanner}</span>
          </div>
        )}

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Information box */}
          <div className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${isLight ? 'bg-sky-50 border-sky-200 text-gray-700' : 'bg-slate-900/60 border-slate-800 text-slate-300'}`}>
            <div className="flex items-center gap-1.5 text-sky-500 font-medium">
              <ShieldCheck size={14} />
              <span>Zero-Server Persistence</span>
            </div>
            <p className={`${subCls} leading-relaxed`}>
              Your API keys are stored locally in browser storage and forwarded per-request via our server proxy to Google, OpenAI, or Anthropic. Click <strong>Test</strong> to verify &amp; save, or click <strong>Save</strong> directly.
            </p>
          </div>

          {/* 1. Google Gemini */}
          <div className={`p-4 rounded-xl border space-y-3 ${cardBg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                  G
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${titleCls}`}>Google Gemini</span>
                    <span className="text-[10px] text-emerald-500 font-mono">
                      {keys.gemini ? 'Custom Key Active' : 'Built-in / Optional BYOK'}
                    </span>
                  </div>
                  <span className={`text-xs ${subCls}`}>Gemini 4 Hydrogen · Gemini 2.5 Flash · Gemini 4 Argon</span>
                </div>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-sky-500 hover:underline flex items-center gap-1"
              >
                <span>Get Gemini Key</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showGemini ? 'text' : 'password'}
                  placeholder={keys.gemini ? '••••••••••••••••••••••••' : 'AIzaSy... (Paste your Gemini API key)'}
                  value={geminiInput}
                  onChange={(e) => setGeminiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSave('gemini', geminiInput);
                    }
                  }}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowGemini(!showGemini)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-500"
                >
                  {showGemini ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleTestKey('gemini', geminiInput)}
                disabled={testStatus.gemini.loading || (!geminiInput.trim() && !keys.gemini)}
                className={`px-3 py-2 text-xs font-medium rounded-lg disabled:opacity-40 transition-colors flex items-center gap-1.5 ${
                  isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {testStatus.gemini.loading ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                <span>Test</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave('gemini', geminiInput)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors"
              >
                Save
              </button>

              {keys.gemini && (
                <button
                  type="button"
                  onClick={() => handleRemove('gemini')}
                  title="Remove Key (revert to built-in)"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {testStatus.gemini.message && (
              <p
                className={`text-[11px] flex items-center gap-1.5 ${
                  testStatus.gemini.success ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {testStatus.gemini.success ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                <span>{testStatus.gemini.message}</span>
              </p>
            )}
          </div>

          {/* 2. OpenAI (ChatGPT) */}
          <div className={`p-4 rounded-xl border space-y-3 ${cardBg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                  AI
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${titleCls}`}>OpenAI (ChatGPT)</span>
                    <span className={`text-[10px] font-mono ${keys.openai ? 'text-emerald-500' : subCls}`}>
                      {keys.openai ? 'Key Connected' : 'Requires User Key'}
                    </span>
                  </div>
                  <span className={`text-xs ${subCls}`}>GPT-4o · GPT-4o Mini · GPT-4 Turbo</span>
                </div>
              </div>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-sky-500 hover:underline flex items-center gap-1"
              >
                <span>Get OpenAI Key</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showOpenai ? 'text' : 'password'}
                  placeholder={keys.openai ? '••••••••••••••••••••••••' : 'sk-proj-... or sk-...'}
                  value={openaiInput}
                  onChange={(e) => setOpenaiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSave('openai', openaiInput);
                    }
                  }}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowOpenai(!showOpenai)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-500"
                >
                  {showOpenai ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleTestKey('openai', openaiInput)}
                disabled={testStatus.openai.loading || (!openaiInput.trim() && !keys.openai)}
                className={`px-3 py-2 text-xs font-medium rounded-lg disabled:opacity-40 transition-colors flex items-center gap-1.5 ${
                  isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {testStatus.openai.loading ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                <span>Test</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave('openai', openaiInput)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors"
              >
                Save
              </button>

              {keys.openai && (
                <button
                  type="button"
                  onClick={() => handleRemove('openai')}
                  title="Remove Key"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {testStatus.openai.message && (
              <p
                className={`text-[11px] flex items-center gap-1.5 ${
                  testStatus.openai.success ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {testStatus.openai.success ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                <span>{testStatus.openai.message}</span>
              </p>
            )}
          </div>

          {/* 3. Anthropic Claude */}
          <div className={`p-4 rounded-xl border space-y-3 ${cardBg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs">
                  C
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${titleCls}`}>Anthropic Claude</span>
                    <span className={`text-[10px] font-mono ${keys.claude ? 'text-emerald-500' : subCls}`}>
                      {keys.claude ? 'Key Connected' : 'Requires User Key'}
                    </span>
                  </div>
                  <span className={`text-xs ${subCls}`}>Claude 3.5 Sonnet · Claude 3.5 Haiku · Claude 3 Opus</span>
                </div>
              </div>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-sky-500 hover:underline flex items-center gap-1"
              >
                <span>Get Claude Key</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showClaude ? 'text' : 'password'}
                  placeholder={keys.claude ? '••••••••••••••••••••••••' : 'sk-ant-api03-...'}
                  value={claudeInput}
                  onChange={(e) => setClaudeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSave('claude', claudeInput);
                    }
                  }}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowClaude(!showClaude)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-500"
                >
                  {showClaude ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleTestKey('claude', claudeInput)}
                disabled={testStatus.claude.loading || (!claudeInput.trim() && !keys.claude)}
                className={`px-3 py-2 text-xs font-medium rounded-lg disabled:opacity-40 transition-colors flex items-center gap-1.5 ${
                  isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {testStatus.claude.loading ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                <span>Test</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave('claude', claudeInput)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors"
              >
                Save
              </button>

              {keys.claude && (
                <button
                  type="button"
                  onClick={() => handleRemove('claude')}
                  title="Remove Key"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {testStatus.claude.message && (
              <p
                className={`text-[11px] flex items-center gap-1.5 ${
                  testStatus.claude.success ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {testStatus.claude.success ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                <span>{testStatus.claude.message}</span>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-t shrink-0 ${
            isLight ? 'bg-gray-50' : 'bg-slate-950/40'
          }`}
          style={{ borderColor: currentTheme.ui.sideBarBorder || '#334155' }}
        >
          <div className={`flex items-center gap-2 text-xs ${subCls}`}>
            <Bot size={14} className="text-sky-500" />
            <span>Select active model directly from the Compillo AI header anytime.</span>
          </div>
          <button
            onClick={handleDone}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
              isLight ? 'bg-gray-900 hover:bg-gray-800 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
