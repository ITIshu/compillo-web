import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Layers } from 'lucide-react';
import { WebsiteThemeTokens } from './WebsitePageTheme';

interface SystemDesignBetaPageProps {
  tokens: WebsiteThemeTokens;
}

interface PresetTopology {
  id: string;
  name: string;
  description: string;
  qps: number;
  payloadKb: number;
  cacheEnabled: boolean;
  cacheHitPct: number;
  cdnEnabled: boolean;
  cdnOffloadPct: number;
  queueEnabled: boolean;
  apiReplicas: number;
  dbReplicas: number;
  dbLatencyMs: number;
}

const PRESETS: PresetTopology[] = [
  {
    id: 'url-shortener',
    name: 'URL Shortener (Read-Heavy)',
    description: 'High read-to-write ratio leveraging edge CDN and Redis lookup caching.',
    qps: 18000,
    payloadKb: 1.5,
    cacheEnabled: true,
    cacheHitPct: 88,
    cdnEnabled: true,
    cdnOffloadPct: 35,
    queueEnabled: false,
    apiReplicas: 6,
    dbReplicas: 3,
    dbLatencyMs: 14,
  },
  {
    id: 'checkout',
    name: 'E-Commerce Checkout (Write-Heavy)',
    description: 'Strong consistency transactions hitting primary SQL with async receipt queue.',
    qps: 4200,
    payloadKb: 6,
    cacheEnabled: true,
    cacheHitPct: 40,
    cdnEnabled: false,
    cdnOffloadPct: 0,
    queueEnabled: true,
    apiReplicas: 4,
    dbReplicas: 2,
    dbLatencyMs: 28,
  },
  {
    id: 'telemetry',
    name: 'IoT Telemetry Ingestion',
    description: 'Burst ingestion buffered through Kafka partitions before batch DB writes.',
    qps: 32000,
    payloadKb: 2,
    cacheEnabled: false,
    cacheHitPct: 0,
    cdnEnabled: false,
    cdnOffloadPct: 0,
    queueEnabled: true,
    apiReplicas: 8,
    dbReplicas: 3,
    dbLatencyMs: 20,
  },
];

export const SystemDesignBetaPage: React.FC<SystemDesignBetaPageProps> = ({ tokens }) => {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [qps, setQps] = useState(PRESETS[0].qps);
  const [payloadKb, setPayloadKb] = useState(PRESETS[0].payloadKb);
  const [cacheEnabled, setCacheEnabled] = useState(PRESETS[0].cacheEnabled);
  const [cacheHitPct, setCacheHitPct] = useState(PRESETS[0].cacheHitPct);
  const [cdnEnabled, setCdnEnabled] = useState(PRESETS[0].cdnEnabled);
  const [cdnOffloadPct, setCdnOffloadPct] = useState(PRESETS[0].cdnOffloadPct);
  const [queueEnabled, setQueueEnabled] = useState(PRESETS[0].queueEnabled);
  const [apiReplicas, setApiReplicas] = useState(PRESETS[0].apiReplicas);
  const [dbReplicas, setDbReplicas] = useState(PRESETS[0].dbReplicas);
  const [dbLatencyMs, setDbLatencyMs] = useState(PRESETS[0].dbLatencyMs);

  const applyPreset = (p: PresetTopology) => {
    setPresetId(p.id);
    setQps(p.qps);
    setPayloadKb(p.payloadKb);
    setCacheEnabled(p.cacheEnabled);
    setCacheHitPct(p.cacheHitPct);
    setCdnEnabled(p.cdnEnabled);
    setCdnOffloadPct(p.cdnOffloadPct);
    setQueueEnabled(p.queueEnabled);
    setApiReplicas(p.apiReplicas);
    setDbReplicas(p.dbReplicas);
    setDbLatencyMs(p.dbLatencyMs);
  };

  const sim = useMemo(() => {
    const cdnQps = cdnEnabled ? Math.round(qps * (cdnOffloadPct / 100)) : 0;
    const originQps = Math.max(0, qps - cdnQps);
    const apiCapacityPerNode = 2600;
    const apiUtilPct = Math.round((originQps / (apiReplicas * apiCapacityPerNode)) * 100);

    const effectiveHit = cacheEnabled ? cacheHitPct / 100 : 0;
    const cacheQps = cacheEnabled ? originQps : 0;
    const cacheUtilPct = cacheEnabled ? Math.round((cacheQps / 65000) * 100) : 0;

    const rawDbQps = Math.round(originQps * (1 - effectiveHit));
    const dbQps = queueEnabled ? Math.round(rawDbQps * 0.45) : rawDbQps;
    const dbCapPerNode = Math.max(400, Math.round((1000 / dbLatencyMs) * 42));
    const dbUtilPct = Math.round((dbQps / (dbReplicas * dbCapPerNode)) * 100);

    // Queueing theory approximation M/M/1 tail factor
    const dbQueueFactor = dbUtilPct >= 95 ? 4.2 : dbUtilPct >= 75 ? 1.8 : 1.15;
    const apiQueueFactor = apiUtilPct >= 95 ? 3.1 : apiUtilPct >= 75 ? 1.5 : 1.1;

    const cacheHitLatency = cacheEnabled ? 2.5 : dbLatencyMs;
    const avgOriginMs =
      5 * apiQueueFactor +
      effectiveHit * cacheHitLatency +
      (1 - effectiveHit) * (dbLatencyMs * dbQueueFactor);
    const p50Ms = Math.round((cdnEnabled ? (1 - cdnOffloadPct / 100) * avgOriginMs + (cdnOffloadPct / 100) * 8 : avgOriginMs) * 10) / 10;
    const p95Ms = Math.round(p50Ms * (dbUtilPct >= 85 || apiUtilPct >= 85 ? 2.9 : 1.75) * 10) / 10;

    const bandwidthMbps = Math.round(((qps * payloadKb * 8) / 1000) * 10) / 10;

    const warnings: string[] = [];
    if (apiUtilPct > 85) warnings.push(`API Fleet saturated (${apiUtilPct}% capacity) — increase API replicas.`);
    if (dbUtilPct > 85) warnings.push(`Database cluster overloaded (${dbUtilPct}% at ${dbQps} QPS) — enable Redis cache, add read replicas, or buffer writes via Queue.`);
    if (cacheEnabled && cacheHitPct < 50 && qps > 8000) warnings.push('Low Cache Hit Rate (<50%) shifts heavy load directly onto Database nodes.');
    if (dbReplicas === 1) warnings.push('Single Database instance creates a Single Point of Failure (SPOF).');

    return {
      cdnQps,
      originQps,
      cacheQps,
      dbQps,
      apiUtilPct,
      cacheUtilPct,
      dbUtilPct,
      p50Ms,
      p95Ms,
      bandwidthMbps,
      warnings,
    };
  }, [qps, payloadKb, cacheEnabled, cacheHitPct, cdnEnabled, cdnOffloadPct, queueEnabled, apiReplicas, dbReplicas, dbLatencyMs]);

  const utilColor = (pct: number) =>
    pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6"
        style={{ borderColor: tokens.borderColor }}
      >
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-medium" style={{ color: tokens.fgMuted }}>
            Beta Labs · Distributed Architecture Simulator
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
            System Design Topology &amp; Bottleneck Lab
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: tokens.fgMuted }}>
            Model CDN offload, Redis cache hit ratios, async Kafka buffering, API autoscaling, and database read replicas against real queueing and throughput math.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
              style={
                presetId === p.id
                  ? { backgroundColor: tokens.accent, color: tokens.accentText, borderColor: tokens.accent }
                  : { backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }
              }
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column */}
        <div
          className="lg:col-span-4 p-5 rounded-xl border space-y-4 text-xs"
          style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
        >
          <div className="text-sm font-bold flex items-center gap-2">
            <Layers size={15} style={{ color: tokens.accent }} />
            <span>Workload &amp; Cluster Controls</span>
          </div>

          <label className="block space-y-1">
            <div className="flex justify-between">
              <span style={{ color: tokens.fgMuted }}>Incoming Traffic</span>
              <span className="font-mono font-bold tabular-nums">{qps.toLocaleString()} req/s</span>
            </div>
            <input
              type="range"
              min={500}
              max={50000}
              step={500}
              value={qps}
              onChange={(e) => setQps(Number(e.target.value))}
              className="w-full"
            />
          </label>

          <label className="block space-y-1">
            <div className="flex justify-between">
              <span style={{ color: tokens.fgMuted }}>Avg Response Payload</span>
              <span className="font-mono font-bold tabular-nums">{payloadKb} KB</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={25}
              step={0.5}
              value={payloadKb}
              onChange={(e) => setPayloadKb(Number(e.target.value))}
              className="w-full"
            />
          </label>

          <div className="pt-2 border-t space-y-3" style={{ borderColor: tokens.borderColor }}>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-semibold">Edge CDN Layer</span>
              <input
                type="checkbox"
                checked={cdnEnabled}
                onChange={(e) => setCdnEnabled(e.target.checked)}
              />
            </label>
            {cdnEnabled && (
              <label className="block space-y-1">
                <div className="flex justify-between" style={{ color: tokens.fgMuted }}>
                  <span>CDN Cache Offload</span>
                  <span className="font-mono tabular-nums">{cdnOffloadPct}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={85}
                  value={cdnOffloadPct}
                  onChange={(e) => setCdnOffloadPct(Number(e.target.value))}
                  className="w-full"
                />
              </label>
            )}

            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-semibold">Redis In-Memory Cache</span>
              <input
                type="checkbox"
                checked={cacheEnabled}
                onChange={(e) => setCacheEnabled(e.target.checked)}
              />
            </label>
            {cacheEnabled && (
              <label className="block space-y-1">
                <div className="flex justify-between" style={{ color: tokens.fgMuted }}>
                  <span>Redis Hit Ratio</span>
                  <span className="font-mono tabular-nums">{cacheHitPct}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={98}
                  value={cacheHitPct}
                  onChange={(e) => setCacheHitPct(Number(e.target.value))}
                  className="w-full"
                />
              </label>
            )}

            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-semibold">Async Message Queue (Batch Writes)</span>
              <input
                type="checkbox"
                checked={queueEnabled}
                onChange={(e) => setQueueEnabled(e.target.checked)}
              />
            </label>
          </div>

          <div className="pt-2 border-t space-y-3" style={{ borderColor: tokens.borderColor }}>
            <label className="block space-y-1">
              <div className="flex justify-between">
                <span style={{ color: tokens.fgMuted }}>API Service Replicas</span>
                <span className="font-mono font-bold tabular-nums">{apiReplicas} nodes</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={apiReplicas}
                onChange={(e) => setApiReplicas(Number(e.target.value))}
                className="w-full"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between">
                <span style={{ color: tokens.fgMuted }}>Database Nodes (Primary + Replicas)</span>
                <span className="font-mono font-bold tabular-nums">{dbReplicas} nodes</span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                value={dbReplicas}
                onChange={(e) => setDbReplicas(Number(e.target.value))}
                className="w-full"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between">
                <span style={{ color: tokens.fgMuted }}>DB Query Latency</span>
                <span className="font-mono font-bold tabular-nums">{dbLatencyMs} ms</span>
              </div>
              <input
                type="range"
                min={3}
                max={80}
                value={dbLatencyMs}
                onChange={(e) => setDbLatencyMs(Number(e.target.value))}
                className="w-full"
              />
            </label>
          </div>
        </div>

        {/* Visual Topology & Telemetry */}
        <div className="lg:col-span-8 space-y-5">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Est. P50 Latency', value: `${sim.p50Ms} ms` },
              { label: 'Est. P95 Latency', value: `${sim.p95Ms} ms` },
              { label: 'Egress Bandwidth', value: `${sim.bandwidthMbps} Mbps` },
              { label: 'DB Origin Load', value: `${sim.dbQps.toLocaleString()} QPS` },
            ].map((m) => (
              <div
                key={m.label}
                className="p-4 rounded-xl border"
                style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
              >
                <div className="text-xs" style={{ color: tokens.fgMuted }}>
                  {m.label}
                </div>
                <div className="text-xl font-bold font-mono tabular-nums mt-1">{m.value}</div>
              </div>
            ))}
          </div>

          {/* Interactive SVG Flow Topology */}
          <div
            className="p-5 rounded-xl border overflow-x-auto"
            style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
          >
            <svg viewBox="0 0 760 230" className="w-full min-w-[620px] h-56">
              {/* Connectors */}
              <line x1={115} y1={115} x2={195} y2={115} stroke={tokens.accent} strokeWidth={2.5} />
              <line x1={325} y1={115} x2={405} y2={115} stroke={tokens.accent} strokeWidth={2.5} />
              <line x1={535} y1={115} x2={615} y2={115} stroke={utilColor(sim.dbUtilPct)} strokeWidth={2.5} />

              {/* Node 1: Clients / CDN */}
              <rect x={15} y={65} width={105} height={100} rx={10} fill={tokens.pageBg} stroke={tokens.borderColor} strokeWidth={1.5} />
              <text x={67} y={92} textAnchor="middle" fontSize={11} fontWeight="bold" fill={tokens.fgPrimary}>
                {cdnEnabled ? 'Clients + CDN' : 'Direct Clients'}
              </text>
              <text x={67} y={114} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={tokens.fgMuted}>
                {qps.toLocaleString()} req/s
              </text>
              <text x={67} y={136} textAnchor="middle" fontSize={10} fontFamily="monospace" fill="#10b981">
                {cdnEnabled ? `Offload ${sim.cdnQps}` : 'No CDN'}
              </text>

              {/* Node 2: LB + API Fleet */}
              <rect x={195} y={65} width={130} height={100} rx={10} fill={tokens.pageBg} stroke={utilColor(sim.apiUtilPct)} strokeWidth={2} />
              <text x={260} y={92} textAnchor="middle" fontSize={11} fontWeight="bold" fill={tokens.fgPrimary}>
                API Fleet (x{apiReplicas})
              </text>
              <text x={260} y={114} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={tokens.fgMuted}>
                {sim.originQps.toLocaleString()} req/s
              </text>
              <text x={260} y={136} textAnchor="middle" fontSize={11} fontFamily="monospace" fontWeight="bold" fill={utilColor(sim.apiUtilPct)}>
                Load {sim.apiUtilPct}%
              </text>

              {/* Node 3: Cache + Queue */}
              <rect x={405} y={65} width={130} height={100} rx={10} fill={tokens.pageBg} stroke={cacheEnabled ? '#10b981' : tokens.borderColor} strokeWidth={1.75} />
              <text x={470} y={92} textAnchor="middle" fontSize={11} fontWeight="bold" fill={tokens.fgPrimary}>
                {cacheEnabled ? 'Redis + ' : 'Bypass / '}
                {queueEnabled ? 'Queue' : 'Sync'}
              </text>
              <text x={470} y={114} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={tokens.fgMuted}>
                {cacheEnabled ? `Hit ${cacheHitPct}%` : '0% Cache'}
              </text>
              <text x={470} y={136} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={tokens.fgPrimary}>
                {queueEnabled ? 'Async Buffered' : 'Direct Pass'}
              </text>

              {/* Node 4: Database Cluster */}
              <rect x={615} y={65} width={130} height={100} rx={10} fill={tokens.pageBg} stroke={utilColor(sim.dbUtilPct)} strokeWidth={2} />
              <text x={680} y={92} textAnchor="middle" fontSize={11} fontWeight="bold" fill={tokens.fgPrimary}>
                DB Cluster (x{dbReplicas})
              </text>
              <text x={680} y={114} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={tokens.fgMuted}>
                {sim.dbQps.toLocaleString()} req/s
              </text>
              <text x={680} y={136} textAnchor="middle" fontSize={11} fontFamily="monospace" fontWeight="bold" fill={utilColor(sim.dbUtilPct)}>
                Load {sim.dbUtilPct}%
              </text>
            </svg>
          </div>

          {/* Bottleneck & Diagnostics */}
          <div
            className="p-5 rounded-xl border space-y-3"
            style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
          >
            <div className="text-sm font-bold">Bottleneck &amp; Reliability Diagnostics</div>
            {sim.warnings.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle2 size={15} />
                <span>Topology is balanced and resilient under {qps.toLocaleString()} QPS with redundant database nodes.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {sim.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-400">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
