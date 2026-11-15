import React, { useState } from 'react';
import { WebsiteThemeTokens } from './WebsitePageTheme';
import { Package, ShieldAlert, CheckCircle2, Download, RefreshCw, Layers } from 'lucide-react';

interface PackageAuditBetaPageProps {
  tokens: WebsiteThemeTokens;
}

interface DependencyItem {
  name: string;
  currentVersion: string;
  latestVersion: string;
  type: 'dependencies' | 'devDependencies';
  vulnerabilityCount: number;
  bundleSizeKB: number;
}

export const PackageAuditBetaPage: React.FC<PackageAuditBetaPageProps> = ({ tokens }) => {
  const [packages, setPackages] = useState<DependencyItem[]>([
    { name: 'react', currentVersion: '^18.3.1', latestVersion: '18.3.1', type: 'dependencies', vulnerabilityCount: 0, bundleSizeKB: 42.4 },
    { name: 'react-dom', currentVersion: '^18.3.1', latestVersion: '18.3.1', type: 'dependencies', vulnerabilityCount: 0, bundleSizeKB: 130.2 },
    { name: 'lucide-react', currentVersion: '^1.16.0', latestVersion: '1.22.0', type: 'dependencies', vulnerabilityCount: 0, bundleSizeKB: 88.5 },
    { name: 'express', currentVersion: '^4.19.2', latestVersion: '4.21.1', type: 'dependencies', vulnerabilityCount: 1, bundleSizeKB: 210.0 },
    { name: 'vite', currentVersion: '^5.3.4', latestVersion: '5.4.2', type: 'devDependencies', vulnerabilityCount: 0, bundleSizeKB: 340.0 },
    { name: 'typescript', currentVersion: '^5.5.3', latestVersion: '5.6.2', type: 'devDependencies', vulnerabilityCount: 0, bundleSizeKB: 110.0 },
  ]);

  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);

  const handleRunAudit = () => {
    setIsAuditing(true);
    setAuditResult(null);
    setTimeout(() => {
      setAuditResult(JSON.stringify({
        auditStatus: "Completed",
        totalPackagesAudited: packages.length,
        vulnerabilitiesFound: packages.reduce((acc, p) => acc + p.vulnerabilityCount, 0),
        advisories: [
          { package: "express", severity: "MODERATE", title: "Path traversal vulnerability in static middleware", patchedIn: ">=4.21.0" }
        ],
        recommendation: "Run `npm audit fix` to automatically patch known vulnerabilities."
      }, null, 2));
      setIsAuditing(false);
    }, 400);
  };

  const totalBundleSize = packages.reduce((acc, p) => acc + p.bundleSizeKB, 0).toFixed(1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b" style={{ borderColor: tokens.borderColor }}>
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
              Essential Dev Lab
            </span>
            <span className="text-xs text-gray-400 font-mono">Package Audit v1.1</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: tokens.fgPrimary }}>
            Project Dependency & Package Audit Lab
          </h1>
          <p className="text-sm mt-1" style={{ color: tokens.fgMuted }}>
            Audit `package.json` dependencies, check for security vulnerabilities, inspect bundle sizes, and manage updates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium shadow transition-all disabled:opacity-50"
          >
            {isAuditing ? <RefreshCw size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
            Run Security Audit
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl border flex items-center justify-between" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
          <div>
            <span className="text-xs text-gray-400 uppercase font-mono">Total Dependencies</span>
            <div className="text-2xl font-bold font-mono text-violet-400 mt-1">{packages.length} Packages</div>
          </div>
          <Package size={24} className="text-violet-400 opacity-60" />
        </div>
        <div className="p-4 rounded-xl border flex items-center justify-between" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
          <div>
            <span className="text-xs text-gray-400 uppercase font-mono">Estimated Bundle Weight</span>
            <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{totalBundleSize} KB</div>
          </div>
          <Layers size={24} className="text-cyan-400 opacity-60" />
        </div>
        <div className="p-4 rounded-xl border flex items-center justify-between" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
          <div>
            <span className="text-xs text-gray-400 uppercase font-mono">Security Vulnerabilities</span>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {packages.reduce((acc, p) => acc + p.vulnerabilityCount, 0)} Found
            </div>
          </div>
          <ShieldAlert size={24} className="text-amber-400 opacity-60" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Package Table */}
        <div className="lg:col-span-2 rounded-xl border overflow-hidden" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
          <div className="px-4 py-3 border-b bg-black/20 flex items-center justify-between" style={{ borderColor: tokens.borderColor }}>
            <span className="text-xs font-semibold font-mono uppercase tracking-wider" style={{ color: tokens.fgPrimary }}>Dependencies Manifest</span>
            <span className="text-xs font-mono text-gray-400">package.json</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/30 border-b text-gray-400" style={{ borderColor: tokens.borderColor }}>
                <tr>
                  <th className="px-4 py-3">Package Name</th>
                  <th className="px-4 py-3">Installed</th>
                  <th className="px-4 py-3">Latest</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: tokens.borderColor }}>
                {packages.map((pkg, idx) => {
                  const isOutdated = pkg.currentVersion !== pkg.latestVersion;
                  return (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-semibold text-violet-300">{pkg.name}</td>
                      <td className="px-4 py-3 text-gray-300">{pkg.currentVersion}</td>
                      <td className="px-4 py-3 text-cyan-300">{pkg.latestVersion}</td>
                      <td className="px-4 py-3 text-gray-400">{pkg.bundleSizeKB} KB</td>
                      <td className="px-4 py-3">
                        {pkg.vulnerabilityCount > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                            ⚠️ Vuln
                          </span>
                        ) : isOutdated ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                            Outdated
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            Secure
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right / Audit Output */}
        <div className="rounded-xl border flex flex-col overflow-hidden" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
          <div className="px-4 py-3 border-b bg-black/20 flex items-center justify-between" style={{ borderColor: tokens.borderColor }}>
            <span className="text-xs font-semibold font-mono uppercase tracking-wider" style={{ color: tokens.fgPrimary }}>Audit Log & Report</span>
            <span className="text-xs font-mono text-violet-400">npm audit</span>
          </div>

          <div className="flex-1 p-4 font-mono text-xs bg-black/40 overflow-auto max-h-[400px]">
            {auditResult ? (
              <pre className="text-violet-200">{auditResult}</pre>
            ) : (
              <div className="text-center py-24 text-gray-500">
                Click <span className="text-violet-400 font-semibold">Run Security Audit</span> to analyze vulnerabilities and advisories.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
