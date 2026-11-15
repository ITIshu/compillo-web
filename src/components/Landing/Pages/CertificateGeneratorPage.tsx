import React, { useEffect, useRef, useState } from 'react';
import { Award, CheckCircle2, Download, LogIn, Search, ShieldCheck } from 'lucide-react';
import { User } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { WebsiteThemeTokens } from './WebsitePageTheme';
import {
  issueCertificate,
  LabCertificateDoc,
  listUserCertificates,
  verifyCertificateById,
} from '../../../services/firestorePlatformService';
import { googleSignIn } from '../../../services/googleAuth';

interface CertificateGeneratorPageProps {
  tokens: WebsiteThemeTokens;
  firebaseUser: User | null;
  prefillTrack?: { score: number; courseTitle: string } | null;
}

const COURSE_TRACKS = [
  'Python AST & Full-Stack Web Engineering',
  'Data Structures & Algorithms Lab (RTU CS302)',
  'Interactive SQL & Relational Schema Mastery',
  'Zero-Trust Cloud Hosting & Container Runtime',
];

export const CertificateGeneratorPage: React.FC<CertificateGeneratorPageProps> = ({
  tokens,
  firebaseUser,
  prefillTrack,
}) => {
  const [recipientName, setRecipientName] = useState(firebaseUser?.displayName || 'Ishant Saraogi');
  const [courseTitle, setCourseTitle] = useState(prefillTrack?.courseTitle || COURSE_TRACKS[0]);
  const [score, setScore] = useState(prefillTrack?.score ?? 100);
  const [activeCertId, setActiveCertId] = useState('CMP-2026-PREVIEW');
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issueSuccess, setIssueSuccess] = useState<string | null>(null);

  const [myCerts, setMyCerts] = useState<LabCertificateDoc[]>([]);
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<LabCertificateDoc | null | 'not-found'>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (firebaseUser?.displayName) {
      setRecipientName(firebaseUser.displayName);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (prefillTrack) {
      setCourseTitle(prefillTrack.courseTitle);
      setScore(prefillTrack.score);
    }
  }, [prefillTrack]);

  useEffect(() => {
    if (!firebaseUser) {
      setMyCerts([]);
      return;
    }
    void listUserCertificates(firebaseUser.uid).then(setMyCerts).catch(() => null);
  }, [firebaseUser]);

  const issuedDateLabel = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Render crisp high-DPI certificate canvas whenever fields update
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Subtle geometric border frame
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 36, w - 72, h - 72);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(52, 52, w - 104, h - 104);

    // Header
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 26px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COMPILLO SOFTWARE STUDIO · VERIFIED LAB CREDENTIAL', w / 2, 130);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 54px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('Certificate of Completion', w / 2, 220);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('This certifies that', w / 2, 300);

    // Recipient Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(recipientName || 'Developer', w / 2, 390);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 280, 420);
    ctx.lineTo(w / 2 + 280, 420);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '26px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('has successfully completed all automated test evaluations for', w / 2, 485);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 34px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(courseTitle, w / 2, 545);

    // Score & Metadata row
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 28px "JetBrains Mono", monospace';
    ctx.fillText(`VERIFIED SCORE: ${score} / 100`, w / 2, 625);

    // Footer blocks
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px "JetBrains Mono", monospace';
    ctx.fillText(`CERTIFICATE ID: ${activeCertId}`, 100, 770);
    ctx.fillText(`ISSUED: ${issuedDateLabel}`, 100, 805);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('Compillo Cloud Verification Engine', w - 100, 770);
    ctx.fillStyle = '#64748b';
    ctx.font = '18px "JetBrains Mono", monospace';
    ctx.fillText('compillo.studio · verified-credential', w - 100, 805);
  }, [recipientName, courseTitle, score, activeCertId, issuedDateLabel]);

  const handleIssueAndSave = async () => {
    setIssueError(null);
    setIssueSuccess(null);
    if (!recipientName.trim()) {
      setIssueError('Enter recipient name first.');
      return;
    }

    if (!firebaseUser) {
      try {
        await googleSignIn();
      } catch {
        setIssueError('Sign in with Google to save a verified certificate ID to Firestore.');
      }
      return;
    }

    setIsIssuing(true);
    try {
      const certId = await issueCertificate({
        recipientName: recipientName.trim(),
        courseTitle,
        score,
      });
      setActiveCertId(certId);
      setIssueSuccess(`Verified certificate ${certId} recorded in Firestore.`);
      const updated = await listUserCertificates(firebaseUser.uid);
      setMyCerts(updated);
    } catch (err: any) {
      setIssueError(err?.message || 'Failed to save certificate.');
    } finally {
      setIsIssuing(false);
    }
  };

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCertId.toLowerCase()}-certificate.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleVerifyLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyInput.trim()) return;
    const docData = await verifyCertificateById(verifyInput.trim());
    setVerifyResult(docData || 'not-found');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="space-y-2 max-w-2xl">
        <div className="text-xs font-medium flex items-center gap-2" style={{ color: tokens.fgMuted }}>
          <span>Compillo Credentials</span>
          <span aria-hidden="true">·</span>
          <span>Downloadable PNG</span>
          <span aria-hidden="true">·</span>
          <span>Firestore Verified</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
          Lab Certificate Generator &amp; Verifier
        </h1>
        <p className="text-sm sm:text-base leading-relaxed" style={{ color: tokens.fgMuted }}>
          Generate verified university lab and coding challenge certificates, download a high-resolution PNG credential, and verify any Certificate ID publicly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Generator Controls + Verifier */}
        <div className="lg:col-span-5 space-y-6">
          <div
            className="p-6 rounded-2xl border space-y-4"
            style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: tokens.borderColor }}>
              <h2 className="text-base font-bold">Certificate Details</h2>
              {!firebaseUser && (
                <button
                  type="button"
                  onClick={() => void googleSignIn()}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
                >
                  <LogIn size={12} />
                  <span>Sign In</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" htmlFor="cert-name">Recipient Full Name</label>
              <input
                id="cert-name"
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                maxLength={80}
                className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.fgPrimary }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" htmlFor="cert-track">Course or Lab Track</label>
              <select
                id="cert-track"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.fgPrimary }}
              >
                {COURSE_TRACKS.map((track) => (
                  <option key={track} value={track}>{track}</option>
                ))}
                {!COURSE_TRACKS.includes(courseTitle) && (
                  <option value={courseTitle}>{courseTitle}</option>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" htmlFor="cert-score">Evaluation Score (0-100)</label>
              <input
                id="cert-score"
                type="number"
                min={0}
                max={100}
                value={score}
                onChange={(e) => setScore(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                className="w-full px-3 py-2 rounded-lg border text-xs font-mono tabular-nums outline-none"
                style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.fgPrimary }}
              />
            </div>

            {issueError && <div className="text-xs text-rose-400">{issueError}</div>}
            {issueSuccess && (
              <div className="text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                <span>{issueSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleIssueAndSave}
                disabled={isIssuing}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.fgPrimary }}
              >
                <ShieldCheck size={14} />
                <span>{isIssuing ? 'Recording...' : 'Issue Verified ID'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPng}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
              >
                <Download size={14} />
                <span>Download PNG</span>
              </button>
            </div>
          </div>

          {/* Public Verification Lookup */}
          <form
            onSubmit={handleVerifyLookup}
            className="p-6 rounded-2xl border space-y-3"
            style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
          >
            <h3 className="text-sm font-bold">Verify Certificate ID</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder="CMP-2026-XXXXXX"
                className="flex-1 min-w-0 px-3 py-2 rounded-lg border text-xs font-mono outline-none"
                style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.fgPrimary }}
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold cursor-pointer shrink-0"
                style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
              >
                <Search size={13} />
                <span>Verify</span>
              </button>
            </div>

            {verifyResult === 'not-found' && (
              <div className="text-xs text-rose-400">No verified certificate matched that ID.</div>
            )}
            {verifyResult && verifyResult !== 'not-found' && (
              <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs space-y-1">
                <div className="font-bold text-emerald-400">Verified Authentic Credential</div>
                <div>Recipient: {verifyResult.recipientName}</div>
                <div>Course: {verifyResult.courseTitle}</div>
                <div className="font-mono tabular-nums">
                  Score: {verifyResult.score}/100 · Issued:{' '}
                  {verifyResult.issuedAt instanceof Timestamp
                    ? verifyResult.issuedAt.toDate().toLocaleDateString()
                    : 'Verified'}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Right: Live Retina Canvas Preview + Issued History */}
        <div className="lg:col-span-7 space-y-6">
          <div
            className="p-4 sm:p-6 rounded-2xl border space-y-3"
            style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: tokens.fgMuted }}>
              <span className="font-semibold" style={{ color: tokens.fgPrimary }}>Live Certificate Preview</span>
              <span className="font-mono">{activeCertId}</span>
            </div>
            <canvas
              ref={canvasRef}
              width={1400}
              height={900}
              className="w-full h-auto rounded-xl border"
              style={{ borderColor: tokens.borderColor }}
            />
          </div>

          {myCerts.length > 0 && (
            <div
              className="p-5 rounded-2xl border space-y-3"
              style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
            >
              <div className="text-xs font-bold flex items-center gap-2">
                <Award size={14} />
                <span>Your Issued Certificates ({myCerts.length})</span>
              </div>
              <div className="space-y-2">
                {myCerts.map((c) => (
                  <div
                    key={c.certId}
                    className="p-3 rounded-lg border flex items-center justify-between gap-3 text-xs"
                    style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{c.courseTitle}</div>
                      <div className="font-mono text-[11px]" style={{ color: tokens.fgMuted }}>
                        {c.certId} · {c.recipientName} · {c.score}/100
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCertId(c.certId);
                        setRecipientName(c.recipientName);
                        setCourseTitle(c.courseTitle);
                        setScore(c.score);
                      }}
                      className="px-3 py-1.5 rounded-lg border text-xs font-semibold shrink-0 cursor-pointer"
                      style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg }}
                    >
                      Load Preview
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
