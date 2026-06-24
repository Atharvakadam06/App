/**
 * CallScreen.jsx — Bulletproof WhatsApp-style P2P WebRTC calling
 *
 * Fixes over previous version:
 * 1. Race condition: receiver WAITS (polls) for offer to appear in DB instead
 *    of failing immediately if offer not found yet
 * 2. Permission errors show a retry screen instead of killing the call
 * 3. All mutable state in a single ref object (no stale closure bugs)
 * 4. Proper connection state monitoring (auto-detects drops)
 * 5. Caller ICE gathering happens in parallel with caller_ringing display
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PhoneOff, Phone, Video, Mic, MicOff, VideoOff,
  Volume2, AlertCircle, RefreshCw,
} from 'lucide-react';
import { updateCallStatus, setCallOffer, setCallAnswer, getCallById } from '../services/data';

// ─── Free ICE servers ─────────────────────────────────────────────────────────
const ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turns:openrelay.metered.ca:443',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

// ─── Utils ────────────────────────────────────────────────────────────────────
function injectCSS() {
  if (document.getElementById('sg-call-css2')) return;
  const s = document.createElement('style');
  s.id = 'sg-call-css2';
  s.textContent = `
    @keyframes sgRing2 { 0%{transform:scale(1);opacity:.65} 100%{transform:scale(2.3);opacity:0} }
    @keyframes sgUp2   { from{opacity:0;transform:translateY(48px)} to{opacity:1;transform:translateY(0)} }
    @keyframes sgIn2   { from{opacity:0} to{opacity:1} }
    @keyframes sgDot2  { 0%,80%,100%{opacity:.2;transform:scale(.65)} 40%{opacity:1;transform:scale(1)} }
    @keyframes sgSpin2 { to{transform:rotate(360deg)} }
    @keyframes sgPls2  { 0%,100%{opacity:1} 50%{opacity:.4} }
  `;
  document.head.appendChild(s);
}

function startRing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = 'sine';
    let on = true;
    function tick() {
      if (!on) return;
      [[520, 0], [440, .55]].forEach(([f, d]) => {
        osc.frequency.setValueAtTime(f, ctx.currentTime + d);
        g.gain.setValueAtTime(.22, ctx.currentTime + d);
        g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + d + .38);
      });
      if (on) setTimeout(tick, 2100);
    }
    osc.start(); tick();
    return () => {
      on = false;
      g.gain.setValueAtTime(.001, ctx.currentTime);
      try { osc.stop(ctx.currentTime + .05); } catch {}
      setTimeout(() => { try { ctx.close(); } catch {} }, 300);
    };
  } catch { return () => {}; }
}

// Wait for ICE gathering to finish (max ms)
function waitIce(pc, ms = 6000) {
  return new Promise(r => {
    if (pc.iceGatheringState === 'complete') { r(); return; }
    const h = () => { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', h); r(); } };
    pc.addEventListener('icegatheringstatechange', h);
    setTimeout(() => { pc.removeEventListener('icegatheringstatechange', h); r(); }, ms);
  });
}

// Receiver waits for caller's offer to appear in DB (fixes race condition)
async function waitForOffer(callId, timeoutMs = 25000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const d = await getCallById(callId);
      if (!d) return null;
      if (['ended', 'rejected', 'missed'].includes(d.status)) return null;
      if (d.offer) return d;
    } catch {}
    await new Promise(r => setTimeout(r, 2000));
  }
  return null; // timed out
}

// Get user media with smart fallback:
// — Video calls: try audio+video, fall back to audio-only if camera unavailable
// — Audio calls: audio only
async function getMedia(callType) {
  const isVideo = callType === 'video';

  if (!isVideo) {
    // Audio call — only request mic
    return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  }

  // Video call — try with camera first
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  } catch (camErr) {
    // Camera unavailable (in use, not found, hardware error) → fall back to audio only
    const cameraFallbackErrors = [
      'NotFoundError', 'DevicesNotFoundError',
      'NotReadableError', 'TrackStartError',
      'OverconstrainedError', 'ConstraintNotSatisfiedError',
      'AbortError',
    ];
    if (cameraFallbackErrors.includes(camErr.name)) {
      console.warn('[Call] Camera unavailable (' + camErr.name + '), falling back to audio-only');
      return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    throw camErr; // permission error — rethrow for caller to handle
  }
}

// ─── Small UI atoms ───────────────────────────────────────────────────────────
function Timer({ from }) {
  const [s, set] = useState(0);
  useEffect(() => { const t = setInterval(() => set(Math.floor((Date.now() - from) / 1000)), 1000); return () => clearInterval(t); }, [from]);
  return <>{String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}</>;
}

function Rings({ color = '#4ade80', n = 3 }) {
  return <>{[...Array(n)].map((_, i) => (
    <span key={i} style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: `2px solid ${color}`, animation: `sgRing2 2.2s ease-out ${i * .7}s infinite` }} />
  ))}</>;
}

function Btn({ icon, label, bg, shadow, onClick, size = 58, dimmed }) {
  const [h, sh] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
      <button onClick={onClick} onMouseEnter={() => sh(true)} onMouseLeave={() => sh(false)}
        style={{
          width: size, height: size, borderRadius: '50%', border: 'none',
          background: bg || (dimmed ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.12)'),
          boxShadow: shadow || 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: h ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform .15s, background .15s',
          backdropFilter: 'blur(6px)',
        }}>
        {icon}
      </button>
      {label && <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, fontWeight: 600 }}>{label}</span>}
    </div>
  );
}

// ─── Screen: INCOMING (receiver sees ringing) ─────────────────────────────────
export function IncomingCallOverlay({ call, callerUser, onAccept, onDecline }) {
  const [left, setLeft] = useState(30);
  const stopRef = useRef(() => {});
  useEffect(() => {
    injectCSS();
    stopRef.current = startRing();
    const t = setInterval(() => setLeft(l => { if (l <= 1) { onDecline('missed'); return 0; } return l - 1; }), 1000);
    return () => { clearInterval(t); stopRef.current(); };
  }, []);

  const isVideo = call?.type === 'video';
  const accent = isVideo ? '#818cf8' : '#4ade80';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'linear-gradient(180deg,#0f172a,#020617)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'sgUp2 .35s cubic-bezier(.16,1,.3,1)' }}>
      <div style={{ position: 'absolute', width: 380, height: 380, borderRadius: '50%', background: isVideo ? 'rgba(99,102,241,.1)' : 'rgba(34,197,94,.09)', filter: 'blur(80px)', top: '10%', left: '50%', transform: 'translateX(-50%)' }} />
      <p style={{ color: accent, fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 36, position: 'relative', zIndex: 1 }}>
        {isVideo ? '📹 Incoming Video Call' : '📞 Incoming Audio Call'}
      </p>
      <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 22, zIndex: 1 }}>
        <Rings color={accent} />
        <img src={callerUser?.avatar} alt="" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${accent}`, position: 'relative', zIndex: 1 }} />
      </div>
      <h1 style={{ color: '#f1f5f9', fontSize: 25, fontWeight: 800, margin: 0, letterSpacing: '-.02em', position: 'relative', zIndex: 1 }}>{callerUser?.name}</h1>
      <p style={{ color: 'rgba(255,255,255,.32)', fontSize: 13, margin: '5px 0 0', fontWeight: 500, position: 'relative', zIndex: 1 }}>{callerUser?.college || 'StuGrow Student'}</p>
      <div style={{ width: 220, height: 3, background: 'rgba(255,255,255,.07)', borderRadius: 99, margin: '28px 0 6px', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <div style={{ height: '100%', width: `${(left / 30) * 100}%`, background: `linear-gradient(90deg,${accent},${accent}88)`, borderRadius: 99, transition: 'width 1s linear' }} />
      </div>
      <p style={{ color: 'rgba(255,255,255,.2)', fontSize: 11, marginBottom: 44, position: 'relative', zIndex: 1 }}>Auto-declining in {left}s</p>
      <div style={{ display: 'flex', gap: 56, position: 'relative', zIndex: 1 }}>
        <Btn icon={<PhoneOff style={{ width: 26, height: 26, color: '#fff' }} />} label="Decline" bg="linear-gradient(135deg,#dc2626,#ef4444)" shadow="0 8px 28px rgba(220,38,38,.5)" size={68} onClick={() => { stopRef.current(); onDecline('rejected'); }} />
        <Btn icon={isVideo ? <Video style={{ width: 26, height: 26, color: '#fff' }} /> : <Phone style={{ width: 26, height: 26, color: '#fff' }} />} label="Accept" bg={isVideo ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'linear-gradient(135deg,#16a34a,#22c55e)'} shadow={isVideo ? '0 8px 28px rgba(99,102,241,.5)' : '0 8px 28px rgba(34,197,94,.5)'} size={68} onClick={() => { stopRef.current(); onAccept(); }} />
      </div>
    </div>
  );
}

// ─── Screen: CALLING (caller waiting) ────────────────────────────────────────
function CallingScreen({ call, otherUser, onCancel }) {
  const accent = call?.type === 'video' ? '#818cf8' : '#4ade80';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'radial-gradient(ellipse at 50% 30%,#1e293b,#020617)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'sgIn2 .3s ease' }}>
      <div style={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', background: call?.type === 'video' ? 'rgba(99,102,241,.1)' : 'rgba(34,197,94,.08)', filter: 'blur(80px)', top: '10%', left: '50%', transform: 'translateX(-50%)' }} />
      <p style={{ color: accent, fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 34, position: 'relative', zIndex: 1 }}>{call?.type === 'video' ? '📹 Video Call' : '📞 Audio Call'}</p>
      <div style={{ position: 'relative', width: 108, height: 108, marginBottom: 22, zIndex: 1 }}>
        <Rings color={accent} />
        <img src={otherUser?.avatar} alt="" style={{ width: 108, height: 108, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${accent}`, position: 'relative', zIndex: 1 }} />
      </div>
      <h1 style={{ color: '#f1f5f9', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-.02em', position: 'relative', zIndex: 1 }}>{otherUser?.name}</h1>
      <div style={{ display: 'flex', gap: 6, marginTop: 22, position: 'relative', zIndex: 1 }}>
        {[0, 1, 2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: accent, display: 'inline-block', animation: `sgDot2 1.4s ease-in-out ${i * .18}s infinite` }} />)}
      </div>
      <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 14, fontWeight: 600, margin: '10px 0 0', position: 'relative', zIndex: 1 }}>Calling…</p>
      <div style={{ position: 'absolute', bottom: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <Btn icon={<PhoneOff style={{ width: 28, height: 28, color: '#fff' }} />} label="Cancel" bg="linear-gradient(135deg,#dc2626,#ef4444)" shadow="0 8px 32px rgba(220,38,38,.55)" size={70} onClick={onCancel} />
      </div>
    </div>
  );
}

// ─── Screen: CONNECTING (receiver accepted, WebRTC negotiating) ───────────────
function ConnectingScreen({ otherUser }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: '#020617', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <img src={otherUser?.avatar} alt="" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(99,102,241,.35)', marginBottom: 6 }} />
      <div style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid rgba(255,255,255,.07)', borderTopColor: '#6366f1', animation: 'sgSpin2 .8s linear infinite' }} />
      <p style={{ color: 'rgba(255,255,255,.32)', fontSize: 13, fontWeight: 600 }}>Connecting…</p>
    </div>
  );
}

// ─── Screen: PERMISSION ERROR ─────────────────────────────────────────────────
function PermScreen({ errType, errDetail, onRetry, onCancel }) {
  const isDenied = errType === 'denied';
  const isNoDevice = errType === 'no_device';
  const isNoOffer = errType === 'no_offer';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: '#020617', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AlertCircle style={{ width: 28, height: 28, color: '#f87171' }} />
      </div>
      <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 800, margin: 0, textAlign: 'center' }}>
        {isNoDevice ? 'No Microphone Found'
          : isNoOffer ? 'Connection Timed Out'
          : 'Microphone Access Required'}
      </h2>
      <p style={{ color: 'rgba(255,255,255,.38)', fontSize: 13, lineHeight: 1.65, textAlign: 'center', maxWidth: 310, margin: 0 }}>
        {isNoDevice
          ? 'No microphone was detected on this device. Connect one and tap Retry.'
          : isNoOffer
          ? "The other person's connection took too long. Please try calling again."
          : 'Your browser blocked microphone access. To fix it:'}
      </p>
      {isDenied && (
        <ol style={{ color: 'rgba(255,255,255,.45)', fontSize: 12, lineHeight: 1.8, textAlign: 'left', maxWidth: 290, margin: 0, paddingLeft: 20 }}>
          <li>Click the <b style={{ color: '#94a3b8' }}>🔒 lock icon</b> in the browser address bar</li>
          <li>Set <b style={{ color: '#94a3b8' }}>Microphone</b> → <b style={{ color: '#4ade80' }}>Allow</b></li>
          <li>Reload the page and tap <b style={{ color: '#94a3b8' }}>Retry</b></li>
        </ol>
      )}
      {errDetail && (
        <p style={{ color: 'rgba(255,255,255,.18)', fontSize: 10, fontFamily: 'monospace', background: 'rgba(255,255,255,.04)', padding: '6px 12px', borderRadius: 8, margin: 0 }}>
          {errDetail}
        </p>
      )}
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button onClick={onCancel} style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: 'rgba(255,255,255,.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>End Call</button>
        {!isNoOffer && (
          <button onClick={onRetry} style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#4f46e5,#6366f1)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw style={{ width: 14, height: 14 }} /> Retry
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Screen: ACTIVE AUDIO CALL ────────────────────────────────────────────────
function AudioCallScreen({ otherUser, localStream, remoteStream, onHangUp }) {
  const [muted, setMuted] = useState(false);
  const audioRef = useRef(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
      audioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  const toggleMute = () => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(m => !m);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'linear-gradient(180deg,#0f172a,#020617)', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'sgIn2 .3s ease' }}>
      <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />
      {/* Blurred bg */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${otherUser?.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(40px) brightness(.12) saturate(.7)', zIndex: 0 }} />
      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <img src={otherUser?.avatar} alt="" style={{ width: 112, height: 112, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,.2)', boxShadow: '0 16px 60px rgba(0,0,0,.5)', marginBottom: 20 }} />
        <h1 style={{ color: '#f1f5f9', fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-.02em' }}>{otherUser?.name}</h1>
        <p style={{ color: '#4ade80', fontSize: 13, margin: '8px 0 0', fontWeight: 700, animation: 'sgPls2 2s ease infinite' }}>● <Timer from={startRef.current} /></p>
      </div>
      {/* Controls */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 28, paddingBottom: 56, paddingTop: 16 }}>
        <Btn icon={muted ? <MicOff style={{ width: 22, height: 22, color: '#fff' }} /> : <Mic style={{ width: 22, height: 22, color: '#fff' }} />} label={muted ? 'Unmute' : 'Mute'} dimmed={muted} onClick={toggleMute} />
        <Btn icon={<PhoneOff style={{ width: 28, height: 28, color: '#fff' }} />} bg="linear-gradient(135deg,#dc2626,#b91c1c)" shadow="0 8px 32px rgba(220,38,38,.6)" size={72} onClick={onHangUp} />
        <Btn icon={<Volume2 style={{ width: 22, height: 22, color: '#fff' }} />} label="Speaker" />
      </div>
    </div>
  );
}

// ─── Screen: ACTIVE VIDEO CALL ────────────────────────────────────────────────
function VideoCallScreen({ currentUser, otherUser, localStream, remoteStream, onHangUp }) {
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [ctrlsVisible, setCtrlsVisible] = useState(true);
  const remoteRef = useRef(null);
  const localRef = useRef(null);
  const startRef = useRef(Date.now());
  const hideRef = useRef(null);

  useEffect(() => {
    if (remoteRef.current && remoteStream) { remoteRef.current.srcObject = remoteStream; remoteRef.current.play().catch(() => {}); }
  }, [remoteStream]);

  useEffect(() => {
    if (localRef.current && localStream) { localRef.current.srcObject = localStream; localRef.current.play().catch(() => {}); }
  }, [localStream]);

  useEffect(() => {
    hideRef.current = setTimeout(() => setCtrlsVisible(false), 4000);
    return () => clearTimeout(hideRef.current);
  }, []);

  const tap = () => { setCtrlsVisible(true); clearTimeout(hideRef.current); hideRef.current = setTimeout(() => setCtrlsVisible(false), 4000); };
  const toggleMute = () => { localStream?.getAudioTracks().forEach(t => { t.enabled = muted; }); setMuted(m => !m); };
  const toggleCam = () => { localStream?.getVideoTracks().forEach(t => { t.enabled = camOff; }); setCamOff(c => !c); };

  return (
    <div onClick={tap} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: '#000', display: 'flex', flexDirection: 'column', animation: 'sgIn2 .3s ease' }}>
      {/* Remote video */}
      <video ref={remoteRef} autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      {/* Fallback when no remote video yet */}
      {!remoteStream && (
        <div style={{ position: 'absolute', inset: 0, background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <img src={otherUser?.avatar} alt="" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(99,102,241,.4)' }} />
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,.08)', borderTopColor: '#6366f1', animation: 'sgSpin2 .8s linear infinite' }} />
          <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 12, fontWeight: 600 }}>Connecting video…</p>
        </div>
      )}
      {/* Local PiP */}
      <div style={{ position: 'absolute', bottom: 100, right: 14, zIndex: 10, width: 96, height: 136, borderRadius: 14, overflow: 'hidden', border: '2px solid rgba(255,255,255,.2)', boxShadow: '0 8px 24px rgba(0,0,0,.5)' }}>
        {camOff
          ? <div style={{ width: '100%', height: '100%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><VideoOff style={{ width: 22, height: 22, color: 'rgba(255,255,255,.35)' }} /></div>
          : <video ref={localRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />}
      </div>
      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '14px 18px', background: 'linear-gradient(to bottom,rgba(0,0,0,.75),transparent)', opacity: ctrlsVisible ? 1 : 0, transition: 'opacity .3s ease', display: 'flex', alignItems: 'center', justifyContent: 'space-between', pointerEvents: ctrlsVisible ? 'auto' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <img src={otherUser?.avatar} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,.2)' }} />
          <div>
            <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13, margin: 0 }}>{otherUser?.name}</p>
            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, margin: 0 }}>🎥 <Timer from={startRef.current} /></p>
          </div>
        </div>
        <div style={{ background: 'rgba(34,197,94,.18)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 999, padding: '3px 10px', color: '#86efac', fontSize: 9, fontWeight: 800 }}>● LIVE</div>
      </div>
      {/* Bottom controls */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, padding: '12px 24px 38px', background: 'linear-gradient(to top,rgba(0,0,0,.85),transparent)', opacity: ctrlsVisible ? 1 : 0, transition: 'opacity .3s ease', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22, pointerEvents: ctrlsVisible ? 'auto' : 'none' }}>
        <Btn icon={muted ? <MicOff style={{ width: 20, height: 20, color: '#fff' }} /> : <Mic style={{ width: 20, height: 20, color: '#fff' }} />} label={muted ? 'Unmute' : 'Mute'} dimmed={muted} onClick={toggleMute} size={50} />
        <Btn icon={<PhoneOff style={{ width: 26, height: 26, color: '#fff' }} />} bg="linear-gradient(135deg,#dc2626,#b91c1c)" shadow="0 8px 28px rgba(220,38,38,.6)" size={68} onClick={onHangUp} />
        <Btn icon={camOff ? <VideoOff style={{ width: 20, height: 20, color: '#fff' }} /> : <Video style={{ width: 20, height: 20, color: '#fff' }} />} label={camOff ? 'Cam On' : 'Cam Off'} dimmed={camOff} onClick={toggleCam} size={50} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ════════════════════════════════════════════════════════════════════════════
export default function CallScreen({ call, currentUser, otherUser, role, onAccept, onDecline, onHangUp }) {
  // phase: 'incoming' | 'caller_waiting' | 'connecting' | 'active_audio' | 'active_video' | 'perm_error'
  const [phase, setPhase] = useState(role === 'caller' ? 'caller_waiting' : 'incoming');
  const [permErrType, setPermErrType] = useState(null);
  const [permErrDetail, setPermErrDetail] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // Single ref for all mutable WebRTC state — eliminates stale closure bugs
  const r = useRef({ pc: null, localStream: null, poll: null, dead: false });

  useEffect(() => { injectCSS(); }, []);

  // ── Cleanup everything ────────────────────────────────────────────────────
  const cleanup = useCallback((newStatus) => {
    if (r.current.dead) return;
    r.current.dead = true;
    clearInterval(r.current.poll);
    r.current.localStream?.getTracks().forEach(t => t.stop());
    r.current.pc?.close();
    r.current.pc = null;
    r.current.localStream = null;
    if (newStatus) updateCallStatus(call.id, newStatus).catch(() => {});
  }, [call.id]);

  const hangUp = useCallback(() => {
    cleanup('ended');
    onHangUp();
  }, [cleanup, onHangUp]);

  // ── Classify media errors ────────────────────────────────────────────────
  const handleMediaError = useCallback((e, context) => {
    const detail = `${e.name}: ${e.message}`;
    console.error(`[Call] ${context} media error →`, detail);
    if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
      setPermErrType('no_device');
    } else {
      setPermErrType('denied');
    }
    setPermErrDetail(detail);
    setPhase('perm_error');
  }, []);

  // ── Get user media (robust fallback) ──────────────────────────────────────
  const getMedia = async (type) => {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
    } catch (e) {
      if (type === 'video') {
        try {
          return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (e2) { throw e; }
      }
      throw e;
    }
  };

  // ── CALLER: set up WebRTC (runs once on mount) ────────────────────────────
  useEffect(() => {
    if (role !== 'caller') return;
    r.current.dead = false;

    (async () => {
      try {
        // 1. Get media
        const stream = await getMedia(call.type);
        if (r.current.dead) { stream.getTracks().forEach(t => t.stop()); return; }
        r.current.localStream = stream;
        setLocalStream(stream);

        // 2. Create peer connection + add tracks
        const pc = new RTCPeerConnection({ iceServers: ICE });
        r.current.pc = pc;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        pc.ontrack = e => { if (e.streams?.[0]) setRemoteStream(e.streams[0]); };
        pc.onconnectionstatechange = () => {
          if (['failed', 'closed'].includes(pc.connectionState) && !r.current.dead) { hangUp(); }
        };

        // 3. Create offer → wait for ICE → store in DB
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await waitIce(pc);
        if (r.current.dead) return;
        await setCallOffer(call.id, JSON.stringify(pc.localDescription));

        // 4. Poll for answer from receiver
        r.current.poll = setInterval(async () => {
          if (r.current.dead) return;
          try {
            const data = await getCallById(call.id);
            if (!data || ['rejected', 'ended', 'missed'].includes(data.status)) {
              clearInterval(r.current.poll);
              if (!r.current.dead) { cleanup(null); onHangUp(); }
              return;
            }
            if (data.answer && pc.signalingState === 'have-local-offer') {
              clearInterval(r.current.poll);
              await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.answer)));
              setPhase(call.type === 'video' ? 'active_video' : 'active_audio');
            }
          } catch (e) { console.warn('Caller poll err:', e); }
        }, 2000);

      } catch (e) {
        if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(e.name)) {
          setPermErrType('denied'); setPhase('perm_error');
        } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
          setPermErrType('no_device'); setPhase('perm_error');
        } else {
          console.error('Caller setup error:', e);
          cleanup('ended'); onHangUp();
        }
      }
    })();

    return () => { cleanup(null); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // ── RECEIVER: accept call ─────────────────────────────────────────────────
  const handleAccept = useCallback(async () => {
    setPhase('connecting');
    onAccept();
    r.current.dead = false;

    try {
      // 1. Get media
      const stream = await getMedia(call.type);
      if (r.current.dead) { stream.getTracks().forEach(t => t.stop()); return; }
      r.current.localStream = stream;
      setLocalStream(stream);

      // 2. Wait for offer (caller may still be gathering ICE — this fixes the race condition)
      const callData = await waitForOffer(call.id, 25000);
      if (!callData) {
        setPermErrType('no_offer'); setPhase('perm_error'); return;
      }
      if (r.current.dead) return;

      // 3. Create peer connection
      const pc = new RTCPeerConnection({ iceServers: ICE });
      r.current.pc = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      pc.ontrack = e => { if (e.streams?.[0]) setRemoteStream(e.streams[0]); };
      pc.onconnectionstatechange = () => {
        if (['failed', 'closed'].includes(pc.connectionState) && !r.current.dead) { hangUp(); }
      };

      // 4. Set caller's offer → create answer → wait for ICE → store answer
      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(callData.offer)));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitIce(pc);
      if (r.current.dead) return;
      await setCallAnswer(call.id, JSON.stringify(pc.localDescription));

      setPhase(call.type === 'video' ? 'active_video' : 'active_audio');

      // 5. Poll only for remote hang-up
      r.current.poll = setInterval(async () => {
        if (r.current.dead) return;
        try {
          const live = await getCallById(call.id);
          if (!live || ['ended', 'rejected', 'missed'].includes(live.status)) {
            clearInterval(r.current.poll);
            if (!r.current.dead) { cleanup(null); onHangUp(); }
          }
        } catch {}
      }, 3000);

    } catch (e) {
      if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(e.name)) {
        setPermErrType('denied'); setPhase('perm_error');
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setPermErrType('no_device'); setPhase('perm_error');
      } else {
        console.error('Receiver setup error:', e);
        cleanup('ended'); onHangUp();
      }
    }
  }, [call.id, call.type, hangUp, onAccept, cleanup, onHangUp]);

  // ── Retry after permission error ──────────────────────────────────────────
  const handleRetry = useCallback(() => {
    r.current.dead = false;
    setPermErrType(null);
    setPermErrDetail(null);
    if (role === 'caller') {
      setPhase('caller_waiting');
      r.current.dead = false;
      (async () => {
        try {
          const stream = await getMedia(call.type);
          if (r.current.dead) { stream.getTracks().forEach(t => t.stop()); return; }
          r.current.localStream = stream; setLocalStream(stream);
          const pc = new RTCPeerConnection({ iceServers: ICE });
          r.current.pc = pc;
          stream.getTracks().forEach(t => pc.addTrack(t, stream));
          pc.ontrack = e => { if (e.streams?.[0]) setRemoteStream(e.streams[0]); };
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await waitIce(pc);
          if (r.current.dead) return;
          await setCallOffer(call.id, JSON.stringify(pc.localDescription));
          r.current.poll = setInterval(async () => {
            if (r.current.dead) return;
            const data = await getCallById(call.id);
            if (!data || ['rejected','ended','missed'].includes(data.status)) { clearInterval(r.current.poll); cleanup(null); onHangUp(); return; }
            if (data.answer && pc.signalingState === 'have-local-offer') {
              clearInterval(r.current.poll);
              await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.answer)));
              setPhase(call.type === 'video' ? 'active_video' : 'active_audio');
            }
          }, 2000);
        } catch (e) { handleMediaError(e, 'Caller retry'); }
      })();
    } else {
      handleAccept();
    }
  }, [role, call.id, call.type, cleanup, onHangUp, handleAccept, handleMediaError]);

  if (!call) return null;

  // ─── Render based on phase ────────────────────────────────────────────────
  if (phase === 'incoming') {
    return <IncomingCallOverlay call={call} callerUser={otherUser} onAccept={handleAccept}
      onDecline={async (r2) => { cleanup(null); await updateCallStatus(call.id, r2).catch(() => {}); onDecline(r2); }} />;
  }

  if (phase === 'caller_waiting') {
    return <CallingScreen call={call} otherUser={otherUser} onCancel={hangUp} />;
  }

  if (phase === 'connecting') {
    return <ConnectingScreen otherUser={otherUser} />;
  }

  if (phase === 'perm_error') {
    return <PermScreen errType={permErrType} errDetail={permErrDetail} onRetry={handleRetry} onCancel={hangUp} />;
  }

  if (phase === 'active_audio') {
    return <AudioCallScreen otherUser={otherUser} localStream={localStream} remoteStream={remoteStream} onHangUp={hangUp} />;
  }

  if (phase === 'active_video') {
    return <VideoCallScreen currentUser={currentUser} otherUser={otherUser} localStream={localStream} remoteStream={remoteStream} onHangUp={hangUp} />;
  }

  return null;
}
