import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { WebsiteThemeTokens } from './WebsitePageTheme';

interface CsSimulatorsBetaPageProps {
  tokens: WebsiteThemeTokens;
}

type SimMode = 'cpu' | 'paging' | 'cidr';
type CpuAlgo = 'fcfs' | 'sjf' | 'srtf' | 'rr';

interface ProcessSpec {
  pid: string;
  arrival: number;
  burst: number;
  priority: number;
}

interface GanttSlice {
  pid: string;
  start: number;
  end: number;
}

interface ScheduledRow extends ProcessSpec {
  completion: number;
  turnaround: number;
  waiting: number;
}

const PROC_COLORS = ['#38bdf8', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

function simulateCpu(
  procs: ProcessSpec[],
  algo: CpuAlgo,
  quantum: number
): { slices: GanttSlice[]; rows: ScheduledRow[]; avgWait: number; avgTat: number; utilPct: number } {
  if (procs.length === 0) {
    return { slices: [], rows: [], avgWait: 0, avgTat: 0, utilPct: 0 };
  }

  const remaining = new Map<string, number>();
  procs.forEach((p) => remaining.set(p.pid, Math.max(1, p.burst)));
  const completion = new Map<string, number>();
  const slices: GanttSlice[] = [];

  let time = Math.min(...procs.map((p) => p.arrival));
  let finished = 0;
  let totalBusy = 0;

  if (algo === 'fcfs' || algo === 'sjf') {
    const done = new Set<string>();
    while (finished < procs.length) {
      const ready = procs.filter((p) => !done.has(p.pid) && p.arrival <= time);
      if (ready.length === 0) {
        const nextArrival = Math.min(...procs.filter((p) => !done.has(p.pid)).map((p) => p.arrival));
        slices.push({ pid: 'IDLE', start: time, end: nextArrival });
        time = nextArrival;
        continue;
      }
      ready.sort((a, b) =>
        algo === 'sjf' ? a.burst - b.burst || a.arrival - b.arrival : a.arrival - b.arrival
      );
      const chosen = ready[0];
      const dur = Math.max(1, chosen.burst);
      slices.push({ pid: chosen.pid, start: time, end: time + dur });
      time += dur;
      totalBusy += dur;
      completion.set(chosen.pid, time);
      done.add(chosen.pid);
      finished++;
    }
  } else if (algo === 'srtf') {
    let guard = 0;
    while (finished < procs.length && guard < 1000) {
      guard++;
      const ready = procs.filter((p) => (remaining.get(p.pid) || 0) > 0 && p.arrival <= time);
      if (ready.length === 0) {
        const nextArrival = Math.min(
          ...procs.filter((p) => (remaining.get(p.pid) || 0) > 0).map((p) => p.arrival)
        );
        slices.push({ pid: 'IDLE', start: time, end: nextArrival });
        time = nextArrival;
        continue;
      }
      ready.sort(
        (a, b) =>
          (remaining.get(a.pid) || 0) - (remaining.get(b.pid) || 0) || a.arrival - b.arrival
      );
      const chosen = ready[0];
      const prev = slices[slices.length - 1];
      if (prev && prev.pid === chosen.pid && prev.end === time) {
        prev.end += 1;
      } else {
        slices.push({ pid: chosen.pid, start: time, end: time + 1 });
      }
      time += 1;
      totalBusy += 1;
      const rem = (remaining.get(chosen.pid) || 0) - 1;
      remaining.set(chosen.pid, rem);
      if (rem === 0) {
        completion.set(chosen.pid, time);
        finished++;
      }
    }
  } else {
    // Round Robin
    const q = Math.max(1, quantum);
    const queue: ProcessSpec[] = [];
    const added = new Set<string>();
    const enqueueArrived = (upTo: number) => {
      procs
        .filter((p) => !added.has(p.pid) && p.arrival <= upTo)
        .sort((a, b) => a.arrival - b.arrival)
        .forEach((p) => {
          added.add(p.pid);
          queue.push(p);
        });
    };
    enqueueArrived(time);

    let guard = 0;
    while (finished < procs.length && guard < 1000) {
      guard++;
      if (queue.length === 0) {
        const nextArrival = Math.min(...procs.filter((p) => !added.has(p.pid)).map((p) => p.arrival));
        slices.push({ pid: 'IDLE', start: time, end: nextArrival });
        time = nextArrival;
        enqueueArrived(time);
        continue;
      }
      const chosen = queue.shift()!;
      const rem = remaining.get(chosen.pid) || 0;
      const step = Math.min(q, rem);
      slices.push({ pid: chosen.pid, start: time, end: time + step });
      time += step;
      totalBusy += step;
      const newRem = rem - step;
      remaining.set(chosen.pid, newRem);
      enqueueArrived(time);
      if (newRem > 0) {
        queue.push(chosen);
      } else {
        completion.set(chosen.pid, time);
        finished++;
      }
    }
  }

  const rows: ScheduledRow[] = procs.map((p) => {
    const comp = completion.get(p.pid) ?? time;
    const tat = comp - p.arrival;
    const wait = tat - p.burst;
    return { ...p, completion: comp, turnaround: tat, waiting: wait };
  });

  const avgWait = Math.round((rows.reduce((s, r) => s + r.waiting, 0) / rows.length) * 100) / 100;
  const avgTat = Math.round((rows.reduce((s, r) => s + r.turnaround, 0) / rows.length) * 100) / 100;
  const span = Math.max(1, time - Math.min(...procs.map((p) => p.arrival)));
  const utilPct = Math.round((totalBusy / span) * 1000) / 10;

  return { slices, rows, avgWait, avgTat, utilPct };
}

function simulatePaging(refs: number[], frameCount: number, algo: 'fifo' | 'lru') {
  const frames: number[] = [];
  const lastUsed = new Map<number, number>();
  let fifoIdx = 0;
  let hits = 0;
  let faults = 0;
  const steps: Array<{ page: number; frames: Array<number | null>; hit: boolean }> = [];

  refs.forEach((page, idx) => {
    const hit = frames.includes(page);
    if (hit) {
      hits++;
      lastUsed.set(page, idx);
    } else {
      faults++;
      if (frames.length < frameCount) {
        frames.push(page);
      } else if (algo === 'fifo') {
        frames[fifoIdx] = page;
        fifoIdx = (fifoIdx + 1) % frameCount;
      } else {
        let lruSlot = 0;
        let oldest = Infinity;
        frames.forEach((f, slot) => {
          const usedAt = lastUsed.get(f) ?? -1;
          if (usedAt < oldest) {
            oldest = usedAt;
            lruSlot = slot;
          }
        });
        frames[lruSlot] = page;
      }
      lastUsed.set(page, idx);
    }
    const padded: Array<number | null> = Array.from({ length: frameCount }, (_, i) =>
      i < frames.length ? frames[i] : null
    );
    steps.push({ page, frames: padded, hit });
  });

  const hitRatio = refs.length ? Math.round((hits / refs.length) * 1000) / 10 : 0;
  return { steps, hits, faults, hitRatio };
}

function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

function intToBin(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
    .map((o) => o.toString(2).padStart(8, '0'))
    .join('.');
}

function analyzeCidr(input: string) {
  const m = input.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
  if (!m) return null;
  const octets = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  const prefix = Number(m[5]);
  if (octets.some((o) => o < 0 || o > 255) || prefix < 0 || prefix > 32) return null;

  const ipInt = (((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0);
  const maskInt = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
  const wildcardInt = (~maskInt) >>> 0;
  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | wildcardInt) >>> 0;

  const totalAddresses = Math.pow(2, 32 - prefix);
  const usableHosts = prefix >= 31 ? (prefix === 32 ? 1 : 2) : Math.max(0, totalAddresses - 2);
  const firstUsable = prefix >= 31 ? networkInt : (networkInt + 1) >>> 0;
  const lastUsable = prefix >= 31 ? broadcastInt : (broadcastInt - 1) >>> 0;

  return {
    cidr: `${intToIp(networkInt)}/${prefix}`,
    ip: intToIp(ipInt),
    mask: intToIp(maskInt),
    wildcard: intToIp(wildcardInt),
    network: intToIp(networkInt),
    broadcast: intToIp(broadcastInt),
    firstUsable: intToIp(firstUsable),
    lastUsable: intToIp(lastUsable),
    totalAddresses: totalAddresses.toLocaleString(),
    usableHosts: usableHosts.toLocaleString(),
    ipBin: intToBin(ipInt),
    maskBin: intToBin(maskInt),
  };
}

export const CsSimulatorsBetaPage: React.FC<CsSimulatorsBetaPageProps> = ({ tokens }) => {
  const [mode, setMode] = useState<SimMode>('cpu');

  // CPU Scheduling state
  const [cpuAlgo, setCpuAlgo] = useState<CpuAlgo>('rr');
  const [quantum, setQuantum] = useState(2);
  const [procs, setProcs] = useState<ProcessSpec[]>([
    { pid: 'P1', arrival: 0, burst: 5, priority: 2 },
    { pid: 'P2', arrival: 1, burst: 3, priority: 1 },
    { pid: 'P3', arrival: 2, burst: 6, priority: 3 },
    { pid: 'P4', arrival: 3, burst: 2, priority: 2 },
  ]);

  // Paging state
  const [refInput, setRefInput] = useState('7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2');
  const [frameCount, setFrameCount] = useState(3);
  const [pagingAlgo, setPagingAlgo] = useState<'fifo' | 'lru'>('lru');

  // CIDR state
  const [cidrInput, setCidrInput] = useState('192.168.10.42/26');

  const cpuResult = useMemo(() => simulateCpu(procs, cpuAlgo, quantum), [procs, cpuAlgo, quantum]);
  const totalCpuSpan = Math.max(
    1,
    cpuResult.slices.length ? cpuResult.slices[cpuResult.slices.length - 1].end - cpuResult.slices[0].start : 1
  );

  const parsedRefs = useMemo(
    () =>
      refInput
        .split(/[\s,]+/)
        .map((x) => Number(x))
        .filter((n) => Number.isInteger(n) && n >= 0)
        .slice(0, 40),
    [refInput]
  );
  const pagingResult = useMemo(
    () => simulatePaging(parsedRefs, frameCount, pagingAlgo),
    [parsedRefs, frameCount, pagingAlgo]
  );
  const cidrResult = useMemo(() => analyzeCidr(cidrInput), [cidrInput]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b pb-6" style={{ borderColor: tokens.borderColor }}>
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-medium" style={{ color: tokens.fgMuted }}>
            Beta Labs · Computer Science Simulators
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
            OS Scheduling, Memory Paging &amp; CIDR Subnet Lab
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: tokens.fgMuted }}>
            Interactive coursework simulators for operating systems scheduling algorithms, virtual memory page faults, and IPv4 subnetting.
          </p>
        </div>

        <div
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg border shrink-0"
          style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg }}
        >
          {[
            { id: 'cpu' as const, label: 'CPU Scheduling' },
            { id: 'paging' as const, label: 'Page Replacement' },
            { id: 'cidr' as const, label: 'CIDR Subnet Calculator' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className="px-3.5 py-2 rounded-md text-xs font-semibold cursor-pointer"
              style={
                mode === item.id
                  ? { backgroundColor: tokens.accent, color: tokens.accentText }
                  : { color: tokens.fgMuted }
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. CPU Scheduling */}
      {mode === 'cpu' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl border space-y-4" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: 'fcfs', label: 'FCFS' },
                    { id: 'sjf', label: 'SJF (Non-Preemptive)' },
                    { id: 'srtf', label: 'SRTF (Preemptive)' },
                    { id: 'rr', label: 'Round Robin' },
                  ] as Array<{ id: CpuAlgo; label: string }>
                ).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setCpuAlgo(a.id)}
                    className="px-3 py-1.5 rounded-md border text-xs font-semibold cursor-pointer"
                    style={
                      cpuAlgo === a.id
                        ? { backgroundColor: tokens.accent, color: tokens.accentText, borderColor: tokens.accent }
                        : { backgroundColor: tokens.pageBg, color: tokens.fgMuted, borderColor: tokens.borderColor }
                    }
                  >
                    {a.label}
                  </button>
                ))}
                {cpuAlgo === 'rr' && (
                  <label className="text-xs font-medium flex items-center gap-1.5 ml-2">
                    <span style={{ color: tokens.fgMuted }}>Quantum:</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={quantum}
                      onChange={(e) => setQuantum(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                      className="w-14 px-2 py-1 rounded border text-xs font-mono"
                      style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor, color: tokens.fgPrimary }}
                    />
                  </label>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  setProcs((prev) => [
                    ...prev,
                    { pid: `P${prev.length + 1}`, arrival: prev.length, burst: 4, priority: 1 },
                  ])
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
                style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.fgPrimary }}
              >
                <Plus size={13} />
                <span>Add Process</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: tokens.borderColor, color: tokens.fgMuted }}>
                    <th className="py-2 pr-4">PID</th>
                    <th className="py-2 pr-4">Arrival Time</th>
                    <th className="py-2 pr-4">Burst Time</th>
                    <th className="py-2 pr-4">Completion</th>
                    <th className="py-2 pr-4">Turnaround</th>
                    <th className="py-2 pr-4">Waiting</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono tabular-nums" style={{ borderColor: tokens.borderColor }}>
                  {cpuResult.rows.map((r, idx) => (
                    <tr key={r.pid} style={{ borderColor: tokens.borderColor }}>
                      <td className="py-2 pr-4 font-bold">{r.pid}</td>
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={r.arrival}
                          onChange={(e) => {
                            const v = Math.max(0, Number(e.target.value) || 0);
                            setProcs((prev) => prev.map((p, i) => (i === idx ? { ...p, arrival: v } : p)));
                          }}
                          className="w-16 px-2 py-1 rounded border text-xs"
                          style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor, color: tokens.fgPrimary }}
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          min={1}
                          max={40}
                          value={r.burst}
                          onChange={(e) => {
                            const v = Math.max(1, Number(e.target.value) || 1);
                            setProcs((prev) => prev.map((p, i) => (i === idx ? { ...p, burst: v } : p)));
                          }}
                          className="w-16 px-2 py-1 rounded border text-xs"
                          style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor, color: tokens.fgPrimary }}
                        />
                      </td>
                      <td className="py-2 pr-4">{r.completion}</td>
                      <td className="py-2 pr-4">{r.turnaround}</td>
                      <td className="py-2 pr-4">{r.waiting}</td>
                      <td className="py-2">
                        {procs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setProcs((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-rose-400 hover:opacity-80 cursor-pointer"
                            title="Remove process"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gantt Timeline */}
          <div className="p-5 rounded-xl border space-y-4" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm font-bold">CPU Gantt Timeline</div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
                <span>Avg Waiting: <strong>{cpuResult.avgWait}</strong></span>
                <span>Avg Turnaround: <strong>{cpuResult.avgTat}</strong></span>
                <span>CPU Utilization: <strong>{cpuResult.utilPct}%</strong></span>
              </div>
            </div>

            <div className="flex w-full rounded-lg overflow-hidden border" style={{ borderColor: tokens.borderColor }}>
              {cpuResult.slices.map((s, idx) => {
                const widthPct = ((s.end - s.start) / totalCpuSpan) * 100;
                const procIndex = Math.max(0, procs.findIndex((p) => p.pid === s.pid));
                const bg = s.pid === 'IDLE' ? tokens.pageBg : PROC_COLORS[procIndex % PROC_COLORS.length];
                return (
                  <div
                    key={idx}
                    style={{ width: `${widthPct}%`, backgroundColor: bg, color: s.pid === 'IDLE' ? tokens.fgMuted : '#ffffff' }}
                    className="py-3 px-1 text-center text-xs font-mono font-bold border-r last:border-r-0 truncate"
                    title={`${s.pid}: ${s.start} → ${s.end}`}
                  >
                    <div>{s.pid}</div>
                    <div className="text-[10px] opacity-85 font-normal">
                      {s.start}–{s.end}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. Page Replacement */}
      {mode === 'paging' && (
        <div className="p-6 rounded-xl border space-y-6" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-6 space-y-1.5">
              <label className="text-xs font-semibold block">Page Reference String (comma or space separated)</label>
              <input
                type="text"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-xs font-mono outline-none"
                style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor, color: tokens.fgPrimary }}
              />
            </div>
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold block">Frame Count</label>
              <select
                value={frameCount}
                onChange={(e) => setFrameCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border text-xs font-mono"
                style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor, color: tokens.fgPrimary }}
              >
                <option value={2}>2 Frames</option>
                <option value={3}>3 Frames</option>
                <option value={4}>4 Frames</option>
                <option value={5}>5 Frames</option>
              </select>
            </div>
            <div className="md:col-span-3 flex gap-2">
              {(['lru', 'fifo'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setPagingAlgo(a)}
                  className="flex-1 py-2 rounded-lg border text-xs font-semibold uppercase cursor-pointer"
                  style={
                    pagingAlgo === a
                      ? { backgroundColor: tokens.accent, color: tokens.accentText, borderColor: tokens.accent }
                      : { backgroundColor: tokens.pageBg, color: tokens.fgMuted, borderColor: tokens.borderColor }
                  }
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-mono tabular-nums pt-2">
            <span>Total References: <strong>{parsedRefs.length}</strong></span>
            <span className="text-rose-400">Page Faults: <strong>{pagingResult.faults}</strong></span>
            <span className="text-emerald-400">Page Hits: <strong>{pagingResult.hits}</strong></span>
            <span>Hit Ratio: <strong>{pagingResult.hitRatio}%</strong></span>
          </div>

          <div className="overflow-x-auto">
            <div className="inline-flex gap-2 pb-2">
              {pagingResult.steps.map((st, idx) => (
                <div
                  key={idx}
                  className="w-12 rounded-lg border text-center font-mono text-xs overflow-hidden shrink-0"
                  style={{ borderColor: st.hit ? '#10b981' : tokens.borderColor, backgroundColor: tokens.pageBg }}
                >
                  <div className="py-1 font-bold border-b" style={{ borderColor: tokens.borderColor }}>
                    {st.page}
                  </div>
                  {st.frames.map((f, fIdx) => (
                    <div key={fIdx} className="py-1 text-[11px]" style={{ color: f === null ? tokens.fgMuted : tokens.fgPrimary }}>
                      {f === null ? '–' : f}
                    </div>
                  ))}
                  <div className={`py-1 text-[10px] font-bold ${st.hit ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {st.hit ? 'HIT' : 'FLT'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. CIDR Subnet Calculator */}
      {mode === 'cidr' && (
        <div className="p-6 rounded-xl border space-y-6" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5 flex-1 max-w-md">
              <label className="text-xs font-semibold block">IPv4 Address &amp; Prefix (CIDR)</label>
              <input
                type="text"
                value={cidrInput}
                onChange={(e) => setCidrInput(e.target.value)}
                placeholder="192.168.10.42/26"
                className="w-full px-3.5 py-2 rounded-lg border text-sm font-mono outline-none"
                style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor, color: tokens.fgPrimary }}
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {['192.168.10.42/26', '10.0.4.15/22', '172.16.0.1/16'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCidrInput(preset)}
                  className="px-3 py-1.5 rounded-lg border font-mono cursor-pointer"
                  style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.accent }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {!cidrResult ? (
            <div className="text-xs text-rose-400">
              Enter a valid IPv4 CIDR block such as 192.168.1.10/24.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono tabular-nums text-xs">
              {[
                { label: 'Canonical Subnet', val: cidrResult.cidr },
                { label: 'Network Address', val: cidrResult.network },
                { label: 'Broadcast Address', val: cidrResult.broadcast },
                { label: 'Subnet Mask', val: cidrResult.mask },
                { label: 'First Usable Host', val: cidrResult.firstUsable },
                { label: 'Last Usable Host', val: cidrResult.lastUsable },
                { label: 'Usable Hosts', val: cidrResult.usableHosts },
                { label: 'Wildcard Mask', val: cidrResult.wildcard },
              ].map((cell) => (
                <div
                  key={cell.label}
                  className="p-3.5 rounded-lg border space-y-1"
                  style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor }}
                >
                  <div className="font-sans text-[11px]" style={{ color: tokens.fgMuted }}>
                    {cell.label}
                  </div>
                  <div className="text-sm font-bold">{cell.val}</div>
                </div>
              ))}
              <div
                className="md:col-span-2 lg:col-span-4 p-3.5 rounded-lg border space-y-1"
                style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor }}
              >
                <div className="font-sans text-[11px]" style={{ color: tokens.fgMuted }}>
                  Binary Octet Breakdown
                </div>
                <div>IP   : {cidrResult.ipBin}</div>
                <div>Mask : {cidrResult.maskBin}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
