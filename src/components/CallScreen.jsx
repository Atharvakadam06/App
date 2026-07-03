/**
 * CallScreen.jsx — WhatsApp-style professional calling UI
 * Layout: name + status at top, large centered avatar, pill control bar at bottom
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PhoneOff, Phone, Video, Mic, MicOff, VideoOff,
  Volume2, VolumeX, MoreHorizontal, AlertCircle, RefreshCw,
  Lock, UserPlus, Minimize2,
} from 'lucide-react';
import { updateCallStatus, setCallOffer, setCallAnswer, getCallById } from '../services/data';
import { handleAvatarError } from '../utils/avatarUtils';

// ─── ICE servers ───────────────────────────────────────────────────────────────
const ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'stun:stun.services.mozilla.com' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:5349',
      'turns:openrelay.metered.ca:443',
      'turns:openrelay.metered.ca:5349'
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

// ─── CSS ───────────────────────────────────────────────────────────────────────
function injectCSS() {
  if (document.getElementById('sg-call-css4')) return;
  const s = document.createElement('style');
  s.id = 'sg-call-css4';
  s.textContent = `
    @keyframes scFadeIn  { from{opacity:0}             to{opacity:1} }
    @keyframes scSlideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
    @keyframes scPulse   { 0%,100%{transform:scale(1);opacity:.45} 50%{transform:scale(2.4);opacity:0} }
    @keyframes scDot     { 0%,80%,100%{opacity:.25;transform:scale(.65)} 40%{opacity:1;transform:scale(1)} }
    @keyframes scSpin    { to{transform:rotate(360deg)} }
    @keyframes scBreath  { 0%,100%{opacity:.55} 50%{opacity:.9} }
    @keyframes scRipple  { 0%{transform:scale(0);opacity:.5} 100%{transform:scale(3);opacity:0} }
    @keyframes scSlideIn { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
    @keyframes scBounce  {
      0%  { transform:scale(1); }
      30% { transform:scale(.86); }
      60% { transform:scale(1.06); }
      100%{ transform:scale(1); }
    }

    /* ── Background doodle pattern (like WhatsApp) ── */
    .sc-bg-pattern {
      background-color: #111b21;
      background-image:
        radial-gradient(circle at 20% 35%, rgba(255,255,255,0.016) 0%, transparent 55%),
        radial-gradient(circle at 80% 65%, rgba(255,255,255,0.012) 0%, transparent 50%),
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Ccircle cx='40' cy='40' r='14' fill='none' stroke='rgba(255,255,255,0.028)' stroke-width='1.5'/%3E%3Ccircle cx='200' cy='80' r='10' fill='none' stroke='rgba(255,255,255,0.022)' stroke-width='1'/%3E%3Crect x='300' y='30' width='22' height='22' rx='4' fill='none' stroke='rgba(255,255,255,0.024)' stroke-width='1.2'/%3E%3Cpath d='M120 200 Q140 185 160 200 Q140 215 120 200Z' fill='none' stroke='rgba(255,255,255,0.026)' stroke-width='1'/%3E%3Ccircle cx='360' cy='180' r='16' fill='none' stroke='rgba(255,255,255,0.02)' stroke-width='1.2'/%3E%3Crect x='60' y='290' width='28' height='18' rx='5' fill='none' stroke='rgba(255,255,255,0.022)' stroke-width='1'/%3E%3Cpath d='M240 310 l10-16 l10 16 Z' fill='none' stroke='rgba(255,255,255,0.024)' stroke-width='1'/%3E%3Ccircle cx='330' cy='340' r='12' fill='none' stroke='rgba(255,255,255,0.02)' stroke-width='1'/%3E%3Cpath d='M160 360 Q180 345 200 360 Q180 375 160 360Z' fill='none' stroke='rgba(255,255,255,0.022)' stroke-width='1'/%3E%3C/svg%3E");
    }

    /* ── Pill control bar ── */
    .sc-ctrl-bar {
      background: rgba(255,255,255,0.07);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 100px;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 10px 14px;
    }

    /* ── Incoming screen action btns ── */
    .sc-incoming-btns {
      display: flex;
      align-items: center;
      justify-content: space-around;
      width: 100%;
      padding: 0 28px;
      gap: 0;
    }
  `;
  document.head.appendChild(s);
}

// ─── Professional electronic chime melody (melodic arpeggio) for incoming call 
function startRingtone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let active = true;

    // Elegant professional electronic chime arpeggio
    // Notes: E5 (659.25Hz), A5 (880.00Hz), C6 (1046.50Hz), E6 (1318.51Hz)
    const melody = [
      { f: 659.25, t: 0.0, d: 0.22 },
      { f: 880.00, t: 0.12, d: 0.22 },
      { f: 1046.50, t: 0.24, d: 0.22 },
      { f: 1318.51, t: 0.36, d: 0.35 },
      { f: 1174.66, t: 0.55, d: 0.22 },
      { f: 987.77, t: 0.67, d: 0.22 },
      { f: 783.99, t: 0.79, d: 0.22 },
      { f: 987.77, t: 0.91, d: 0.22 },
      { f: 1318.51, t: 1.03, d: 0.50 },
    ];

    function playNote(freq, startTime, duration) {
      if (!active) return;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = 'triangle'; // Warm clean tone
      osc.frequency.setValueAtTime(freq, startTime);

      // ADSR decay/pluck shape
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.18, startTime + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    }

    function playMelody() {
      if (!active) return;
      const now = ctx.currentTime;
      melody.forEach(n => {
        playNote(n.f, now + n.t, n.d);
      });
      if (active) setTimeout(playMelody, 3400);
    }

    playMelody();
    return () => { active = false; setTimeout(() => { try { ctx.close(); } catch {} }, 500); };
  } catch { return () => {}; }
}

// ─── Double deep vibration dial tone (440+480 Hz US ringback cadence) ──────────
function startCallingTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let active = true;
    function beep() {
      if (!active) return;
      const now = ctx.currentTime;
      // Double burst cadence: 0.4s on, 0.2s off, 0.4s on, then 2s off
      [[0, 0.4], [0.55, 0.95]].forEach(([s, e]) => {
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        const g = ctx.createGain();
        o1.connect(g); o2.connect(g); g.connect(ctx.destination);
        o1.type = 'sine'; o1.frequency.value = 440;
        o2.type = 'sine'; o2.frequency.value = 480;
        g.gain.setValueAtTime(0, now + s);
        g.gain.linearRampToValueAtTime(0.08, now + s + 0.02);
        g.gain.setValueAtTime(0.08, now + e - 0.03);
        g.gain.linearRampToValueAtTime(0, now + e);
        o1.start(now + s); o1.stop(now + e + 0.05);
        o2.start(now + s); o2.stop(now + e + 0.05);
      });
      if (active) setTimeout(beep, 3000);
    }
    beep();
    return () => { active = false; setTimeout(() => { try { ctx.close(); } catch {} }, 500); };
  } catch { return () => {}; }
}

// ─── WebRTC helpers ───────────────────────────────────────────────────────────
function waitIce(pc, ms = 1200) {
  return new Promise(r => {
    if (pc.iceGatheringState === 'complete') { r(); return; }
    const h = () => { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', h); r(); } };
    pc.addEventListener('icegatheringstatechange', h);
    setTimeout(() => { pc.removeEventListener('icegatheringstatechange', h); r(); }, ms);
  });
}

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
  return null;
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function Timer({ from }) {
  const [s, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set(Math.floor((Date.now() - from) / 1000)), 1000);
    return () => clearInterval(t);
  }, [from]);
  return <>{String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}</>;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function CallAvatar({ src, name, size = 140 }) {
  if (src) {
    return (
      <img
        src={src} alt=""
        onError={e => handleAvatarError(e, name)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: 'rgba(255,255,255,0.65)',
    }}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

// ─── Pulse rings around avatar ────────────────────────────────────────────────
function PulseRings({ n = 3 }) {
  return (
    <>
      {[...Array(n)].map((_, i) => (
        <span key={i} style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '1.5px solid rgba(255,255,255,0.14)',
          animation: `scPulse 2.6s ease-out ${i * 0.82}s infinite`,
          pointerEvents: 'none',
        }} />
      ))}
    </>
  );
}
// ─── Round pill control button ────────────────────────────────────────────────
function PillBtn({ icon, label, onClick, danger = false, active = false, size = 52 }) {
  const [pressed, setPressed] = useState(false);
  const [rippling, setRippling] = useState(false);
  const handledRef = useRef(false);

  const handle = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (handledRef.current) return;
    handledRef.current = true;
    setTimeout(() => { handledRef.current = false; }, 600); // Debounce double trigger

    setPressed(true); setRippling(true);
    setTimeout(() => setPressed(false), 140);
    setTimeout(() => setRippling(false), 300);
    onClick?.();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, flex: 1 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        {rippling && (
          <span style={{
            position: 'absolute', top: '50%', left: '50%',
            width: size, height: size, borderRadius: '50%',
            background: danger ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.2)',
            animation: 'scRipple 0.4s ease-out forwards',
            pointerEvents: 'none', zIndex: 0,
          }} />
        )}
        <button
          onTouchStart={handle}
          onClick={handle}
          style={{
            position: 'relative', zIndex: 1,
            width: size, height: size, borderRadius: '50%',
            background: danger
              ? 'rgba(239,68,68,0.9)'
              : active
              ? 'rgba(255,255,255,0.25)'
              : 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifycenter: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: pressed ? 'scale(0.86)' : 'scale(1)',
            transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1), background 0.15s',
            backdropFilter: 'blur(10px)',
            outline: 'none',
          }}
        >
          {icon}
        </button>
      </div>
      {label && (
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>
          {label}
        </span>
      )}
    </div>
  );
}

// ─── Big action button (Accept / Decline for incoming) ───────────────────────
function BigActionBtn({ icon, label, bg, onClick }) {
  const [pressed, setPressed] = useState(false);
  const handledRef = useRef(false);

  const handle = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (handledRef.current) return;
    handledRef.current = true;
    setTimeout(() => { handledRef.current = false; }, 600); // Debounce double trigger

    setPressed(true);
    setTimeout(() => setPressed(false), 140);
    onClick?.();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <button
        onTouchStart={handle}
        onClick={handle}
        style={{
          width: 68, height: 68, borderRadius: '50%',
          background: bg, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: pressed ? 'scale(0.85)' : 'scale(1)',
          transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: '0 6px 28px rgba(0,0,0,0.4)',
          outline: 'none',
        }}
      >
        {icon}
      </button>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12.5, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   INCOMING CALL
═══════════════════════════════════════════════════ */
export function IncomingCallOverlay({ call, callerUser, onAccept, onDecline }) {
  const [timeLeft, setTimeLeft] = useState(30);
  const stopRing = useRef(() => {});

  useEffect(() => {
    injectCSS();
    stopRing.current = startRingtone();
    const t = setInterval(() => {
      setTimeLeft(l => { if (l <= 1) { onDecline('missed'); return 0; } return l - 1; });
    }, 1000);
    return () => { clearInterval(t); stopRing.current(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isVideo = call?.type === 'video';
  const accept = () => { stopRing.current(); onAccept(); };
  const decline = () => { stopRing.current(); onDecline('rejected'); };

  return (
    <div className="sc-bg-pattern" style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', flexDirection: 'column',
      animation: 'scSlideUp 0.38s cubic-bezier(0.16,1,0.3,1)',
      overflow: 'hidden',
    }}>
      {/* ── Top section ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 60, paddingBottom: 20,
        animation: 'scSlideIn 0.45s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <p style={{
          color: 'rgba(255,255,255,0.38)', fontSize: 12, fontWeight: 500,
          letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px',
        }}>
          {isVideo ? 'Incoming Video Call' : 'Incoming Call'}
        </p>
        <h1 style={{
          color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 8px',
          letterSpacing: '-0.025em',
        }}>
          {callerUser?.name}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <Lock size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 400 }}>
            End-to-end encrypted
          </span>
        </div>
      </div>

      {/* ── Center avatar ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ position: 'relative', width: 160, height: 160 }}>
          <PulseRings n={3} />
          <div style={{
            position: 'relative', zIndex: 1,
            width: 160, height: 160, borderRadius: '50%', overflow: 'hidden',
            boxShadow: '0 0 0 3px rgba(255,255,255,0.12), 0 24px 64px rgba(0,0,0,0.6)',
          }}>
            <CallAvatar src={callerUser?.avatar} name={callerUser?.name} size={160} />
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13.5, marginTop: 20, fontWeight: 400 }}>
          {callerUser?.college || 'StuGrow'}
        </p>

        {/* Auto-decline progress */}
        <div style={{ width: 160, marginTop: 28 }}>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${(timeLeft / 30) * 100}%`,
              background: 'rgba(255,255,255,0.28)', borderRadius: 99,
              transition: 'width 1s linear',
            }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11, textAlign: 'center', marginTop: 6, letterSpacing: '0.03em' }}>
            Auto-decline in {timeLeft}s
          </p>
        </div>
      </div>

      {/* ── Bottom buttons ── */}
      <div style={{
        padding: '0 0 56px',
        display: 'flex', justifyContent: 'center',
        animation: 'scSlideIn 0.5s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div className="sc-incoming-btns">
          <BigActionBtn
            icon={<PhoneOff size={26} color="#fff" />}
            label="Decline"
            bg="rgba(239,68,68,0.88)"
            onClick={decline}
          />
          <BigActionBtn
            icon={isVideo ? <Video size={26} color="#fff" /> : <Phone size={26} color="#fff" />}
            label="Accept"
            bg="rgba(34,197,94,0.88)"
            onClick={accept}
          />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SHARED CALL LAYOUT (used by Calling + Active Audio + Connecting)
═══════════════════════════════════════════════════ */
function CallLayout({ otherUser, topLabel, statusNode, children, topRight, topLeft, pulsing = false }) {
  return (
    <div className="sc-bg-pattern" style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', flexDirection: 'column',
      animation: 'scFadeIn 0.3s ease',
      overflow: 'hidden',
    }}>
      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '52px 20px 0',
      }}>
        <div style={{ width: 44 }}>{topLeft || null}</div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h1 style={{
            color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 5px',
            letterSpacing: '-0.02em', textAlign: 'center',
          }}>
            {otherUser?.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Lock size={10} style={{ color: 'rgba(255,255,255,0.28)' }} />
            <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11.5, fontWeight: 400 }}>
              End-to-end encrypted
            </span>
          </div>
        </div>
        <div style={{ width: 44, display: 'flex', justifyContent: 'flex-end' }}>{topRight || null}</div>
      </div>

      {/* ── Center avatar ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 0,
      }}>
        <div style={{ position: 'relative', width: 168, height: 168, marginBottom: 24 }}>
          {pulsing && <PulseRings n={2} />}
          <div style={{
            position: 'relative', zIndex: 1,
            width: 168, height: 168, borderRadius: '50%', overflow: 'hidden',
            boxShadow: '0 0 0 3px rgba(255,255,255,0.1), 0 28px 72px rgba(0,0,0,0.65)',
          }}>
            <CallAvatar src={otherUser?.avatar} name={otherUser?.name} size={168} />
          </div>
        </div>

        {/* Status */}
        {statusNode}
      </div>

      {/* ── Bottom controls ── */}
      <div style={{ padding: '0 20px 44px', animation: 'scSlideIn 0.45s cubic-bezier(0.16,1,0.3,1)' }}>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CALLING (caller waiting)
═══════════════════════════════════════════════════ */
function CallingScreen({ call, otherUser, onCancel }) {
  const stopTone = useRef(() => {});
  useEffect(() => {
    injectCSS();
    stopTone.current = startCallingTone();
    return () => stopTone.current();
  }, []);

  return (
    <CallLayout
      otherUser={otherUser}
      pulsing
      statusNode={
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4 }}>
          <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 14, fontWeight: 400 }}>Calling</span>
          {[0,1,2].map(i => (
            <span key={i} style={{
              width: 5, height: 5, borderRadius: '50%',
              background: 'rgba(255,255,255,0.45)',
              display: 'inline-block',
              animation: `scDot 1.5s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      }
    >
      <div className="sc-ctrl-bar">
        <PillBtn icon={<PhoneOff size={22} color="#fff" />} danger onClick={() => { stopTone.current(); onCancel(); }} />
      </div>
    </CallLayout>
  );
}

/* ═══════════════════════════════════════════════════
   CONNECTING
═══════════════════════════════════════════════════ */
function ConnectingScreen({ otherUser }) {
  useEffect(() => { injectCSS(); }, []);
  return (
    <CallLayout
      otherUser={otherUser}
      statusNode={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 16, height: 16, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.12)',
            borderTopColor: 'rgba(255,255,255,0.6)',
            animation: 'scSpin 0.75s linear infinite',
          }} />
          <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 14, fontWeight: 400 }}>Connecting…</span>
        </div>
      }
    >
      <div className="sc-ctrl-bar" style={{ justifyContent: 'center' }}>
        <div style={{ flex: 1 }} />
      </div>
    </CallLayout>
  );
}

/* ═══════════════════════════════════════════════════
   ACTIVE AUDIO CALL
═══════════════════════════════════════════════════ */
function AudioCallScreen({ otherUser, localStream, remoteStream, onHangUp }) {
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const audioRef = useRef(null);
  const startRef = useRef(Date.now());

  const handlePlayAudio = useCallback(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
      audioRef.current.play().catch(e => console.warn('Audio play failed:', e));
    }
  }, [remoteStream]);

  useEffect(() => {
    injectCSS();
    handlePlayAudio();
    // iOS Safari / Chrome Autoplay policy bypass
    document.addEventListener('click', handlePlayAudio);
    document.addEventListener('touchstart', handlePlayAudio);
    return () => {
      document.removeEventListener('click', handlePlayAudio);
      document.removeEventListener('touchstart', handlePlayAudio);
    };
  }, [remoteStream, handlePlayAudio]);

  const toggleMute = () => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(m => !m);
  };

  return (
    <CallLayout
      otherUser={otherUser}
      topRight={
        <button style={{
          width: 38, height: 38, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <UserPlus size={16} color="rgba(255,255,255,0.65)" />
        </button>
      }
      topLeft={
        <button style={{
          width: 38, height: 38, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Minimize2 size={16} color="rgba(255,255,255,0.65)" />
        </button>
      }
      statusNode={
        <p style={{
          color: 'rgba(255,255,255,0.55)', fontSize: 15, fontWeight: 500,
          margin: 0, letterSpacing: '0.04em',
          animation: 'scBreath 2.5s ease infinite',
        }}>
          <Timer from={startRef.current} />
        </p>
      }
    >
      <audio
        ref={audioRef}
        autoPlay
        playsInline
        controls={false}
        style={{ position: 'absolute', top: 0, left: 0, width: '1px', height: '1px', opacity: 0.01, pointerEvents: 'none', zIndex: -1 }}
      />
      <div className="sc-ctrl-bar">
        <PillBtn icon={<MoreHorizontal size={20} color="rgba(255,255,255,0.75)" />} label="More" onClick={() => {}} />
        <PillBtn icon={<Video size={20} color="rgba(255,255,255,0.75)" />} label="Camera" onClick={() => {}} />
        <PillBtn
          icon={speakerOn ? <Volume2 size={20} color="rgba(255,255,255,0.9)" /> : <VolumeX size={20} color="rgba(255,255,255,0.75)" />}
          label="Speaker"
          active={speakerOn}
          onClick={() => setSpeakerOn(s => !s)}
        />
        <PillBtn
          icon={muted ? <MicOff size={20} color="rgba(255,255,255,0.9)" /> : <Mic size={20} color="rgba(255,255,255,0.75)" />}
          label={muted ? 'Unmute' : 'Mute'}
          active={muted}
          onClick={toggleMute}
        />
        <PillBtn
          icon={<PhoneOff size={20} color="#fff" />}
          label="End"
          danger
          onClick={onHangUp}
        />
      </div>
    </CallLayout>
  );
}

/* ═══════════════════════════════════════════════════
   ACTIVE VIDEO CALL
═══════════════════════════════════════════════════ */
function VideoCallScreen({ otherUser, localStream, remoteStream, onHangUp }) {
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [ctrlsVisible, setCtrlsVisible] = useState(true);
  const remoteRef = useRef(null);
  const localRef = useRef(null);
  const startRef = useRef(Date.now());
  const hideRef = useRef(null);

  useEffect(() => { injectCSS(); }, []);

  const handlePlayVideo = useCallback(() => {
    if (remoteRef.current && remoteStream) {
      remoteRef.current.srcObject = remoteStream;
      remoteRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    handlePlayVideo();
    document.addEventListener('click', handlePlayVideo);
    document.addEventListener('touchstart', handlePlayVideo);
    return () => {
      document.removeEventListener('click', handlePlayVideo);
      document.removeEventListener('touchstart', handlePlayVideo);
    };
  }, [remoteStream, handlePlayVideo]);

  useEffect(() => {
    if (localRef.current && localStream) { localRef.current.srcObject = localStream; localRef.current.play().catch(() => {}); }
  }, [localStream]);

  useEffect(() => {
    hideRef.current = setTimeout(() => setCtrlsVisible(false), 4500);
    return () => clearTimeout(hideRef.current);
  }, []);

  const tap = () => {
    setCtrlsVisible(true);
    clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => setCtrlsVisible(false), 4500);
  };

  const toggleMute = () => { localStream?.getAudioTracks().forEach(t => { t.enabled = muted; }); setMuted(m => !m); };
  const toggleCam  = () => { localStream?.getVideoTracks().forEach(t => { t.enabled = camOff; }); setCamOff(c => !c); };

  return (
    <div onClick={tap} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#000', animation: 'scFadeIn 0.3s ease' }}>
      {/* Remote video */}
      <video ref={remoteRef} autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

      {/* No remote yet */}
      {!remoteStream && (
        <div className="sc-bg-pattern" style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 0 0 2px rgba(255,255,255,0.1)' }}>
            <CallAvatar src={otherUser?.avatar} name={otherUser?.name} size={100} />
          </div>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.08)', borderTopColor: 'rgba(255,255,255,0.55)', animation: 'scSpin 0.75s linear infinite' }} />
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 500 }}>Connecting video…</p>
        </div>
      )}

      {/* Local PiP */}
      <div style={{
        position: 'absolute', bottom: 108, right: 14, zIndex: 10,
        width: 88, height: 128, borderRadius: 14, overflow: 'hidden',
        border: '1.5px solid rgba(255,255,255,0.2)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
      }}>
        {camOff
          ? <div style={{ width: '100%', height: '100%', background: '#111b21', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><VideoOff size={18} style={{ color: 'rgba(255,255,255,0.3)' }} /></div>
          : <video ref={localRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        }
      </div>

      {/* Top overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '14px 16px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
        opacity: ctrlsVisible ? 1 : 0, transition: 'opacity 0.32s ease',
        pointerEvents: ctrlsVisible ? 'auto' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden' }}>
            <CallAvatar src={otherUser?.avatar} name={otherUser?.name} size={34} />
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>{otherUser?.name}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0, letterSpacing: '0.04em' }}>
              <Timer from={startRef.current} />
            </p>
          </div>
        </div>
        <div style={{
          background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 99, padding: '3px 10px',
          color: 'rgba(134,239,172,0.85)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em',
        }}>● LIVE</div>
      </div>

      {/* Bottom controls */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        padding: '0 20px 40px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
        opacity: ctrlsVisible ? 1 : 0, transition: 'opacity 0.32s ease',
        pointerEvents: ctrlsVisible ? 'auto' : 'none',
      }}>
        <div className="sc-ctrl-bar">
          <PillBtn icon={<MoreHorizontal size={20} color="rgba(255,255,255,0.75)" />} label="More" onClick={() => {}} />
          <PillBtn
            icon={camOff ? <VideoOff size={20} color="rgba(255,255,255,0.9)" /> : <Video size={20} color="rgba(255,255,255,0.75)" />}
            label={camOff ? 'Cam On' : 'Cam Off'}
            active={camOff}
            onClick={toggleCam}
          />
          <PillBtn icon={<Volume2 size={20} color="rgba(255,255,255,0.75)" />} label="Speaker" onClick={() => {}} />
          <PillBtn
            icon={muted ? <MicOff size={20} color="rgba(255,255,255,0.9)" /> : <Mic size={20} color="rgba(255,255,255,0.75)" />}
            label={muted ? 'Unmute' : 'Mute'}
            active={muted}
            onClick={toggleMute}
          />
          <PillBtn icon={<PhoneOff size={20} color="#fff" />} label="End" danger onClick={onHangUp} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PERMISSION ERROR
═══════════════════════════════════════════════════ */
function PermScreen({ errType, errDetail, onRetry, onCancel }) {
  const isNoOffer = errType === 'no_offer';
  const isNoDevice = errType === 'no_device';
  useEffect(() => { injectCSS(); }, []);
  return (
    <div className="sc-bg-pattern" style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, gap: 16, animation: 'scFadeIn 0.25s ease',
    }}>
      <div style={{
        width: 58, height: 58, borderRadius: '50%',
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AlertCircle size={24} style={{ color: 'rgba(239,68,68,0.8)' }} />
      </div>
      <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: 0, textAlign: 'center' }}>
        {isNoDevice ? 'No Microphone Found' : isNoOffer ? 'Connection Timed Out' : 'Microphone Access Required'}
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, lineHeight: 1.65, textAlign: 'center', maxWidth: 300, margin: 0 }}>
        {isNoDevice ? 'No microphone detected. Connect one and tap Retry.'
          : isNoOffer ? 'The connection took too long. Try calling again.'
          : 'Allow microphone access in your browser settings, then tap Retry.'}
      </p>
      {errDetail && (
        <p style={{ color: 'rgba(255,255,255,0.14)', fontSize: 10, fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)', padding: '5px 10px', borderRadius: 6, margin: 0 }}>{errDetail}</p>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button onClick={onCancel} style={{ padding: '10px 22px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          End Call
        </button>
        {!isNoOffer && (
          <button onClick={onRetry} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} /> Retry
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN ORCHESTRATOR
═══════════════════════════════════════════════════ */
export default function CallScreen({ call, currentUser, otherUser, role, onAccept, onDecline, onHangUp }) {
  const [phase, setPhase] = useState(() => {
    if (call?.status === 'accepted') return 'connecting';
    return role === 'caller' ? 'caller_waiting' : 'incoming';
  });
  const [permErrType, setPermErrType] = useState(null);
  const [permErrDetail, setPermErrDetail] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const r = useRef({ pc: null, localStream: null, poll: null, dead: false });

  useEffect(() => { injectCSS(); }, []);

  const cleanup = useCallback((newStatus) => {
    if (r.current.dead) return;
    r.current.dead = true;
    clearInterval(r.current.poll);
    r.current.localStream?.getTracks().forEach(t => t.stop());
    r.current.pc?.close();
    r.current.pc = null; r.current.localStream = null;
    if (newStatus) updateCallStatus(call.id, newStatus).catch(() => {});
  }, [call.id]);

  const hangUp = useCallback(() => { cleanup('ended'); onHangUp(); }, [cleanup, onHangUp]);

  const handleMediaError = useCallback((e) => {
    if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') setPermErrType('no_device');
    else setPermErrType('denied');
    setPermErrDetail(`${e.name}: ${e.message}`);
    setPhase('perm_error');
  }, []);

  const getMedia = async (type) => {
    try { return await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' }); }
    catch (e) {
      if (type === 'video') { try { return await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); } catch {} }
      throw e;
    }
  };

  useEffect(() => {
    if (role !== 'caller') return;
    r.current.dead = false;
    (async () => {
      try {
        const stream = await getMedia(call.type);
        if (r.current.dead) { stream.getTracks().forEach(t => t.stop()); return; }
        r.current.localStream = stream; setLocalStream(stream);
        const pc = new RTCPeerConnection({ iceServers: ICE });
        r.current.pc = pc;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        pc.ontrack = e => {
          if (e.streams?.[0]) {
            setRemoteStream(e.streams[0]);
          } else if (e.track) {
            const ms = new MediaStream();
            ms.addTrack(e.track);
            setRemoteStream(ms);
          }
        };
        pc.onconnectionstatechange = () => {
          if (r.current.dead) return;
          if (pc.connectionState === 'closed') {
            hangUp();
          } else if (pc.connectionState === 'failed') {
            setTimeout(() => {
              if (pc && pc.connectionState === 'failed' && !r.current.dead) {
                hangUp();
              }
            }, 4000);
          }
        };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await waitIce(pc);
        if (r.current.dead) return;
        await setCallOffer(call.id, JSON.stringify(pc.localDescription));
        r.current.poll = setInterval(async () => {
          if (r.current.dead) return;
          try {
            const data = await getCallById(call.id);
            if (!data || ['rejected','ended','missed'].includes(data.status)) { clearInterval(r.current.poll); if (!r.current.dead) { cleanup(null); onHangUp(); } return; }
            if (data.answer && pc.signalingState === 'have-local-offer') {
              clearInterval(r.current.poll);
              await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.answer)));
              setPhase(call.type === 'video' ? 'active_video' : 'active_audio');
            }
          } catch {}
        }, 800); // Poll fast (800ms) for instant pickup response
      } catch (e) { handleMediaError(e); }
    })();
    return () => { cleanup(null); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const handleAccept = useCallback(async () => {
    setPhase('connecting'); onAccept(); r.current.dead = false;
    try {
      const stream = await getMedia(call.type);
      if (r.current.dead) { stream.getTracks().forEach(t => t.stop()); return; }
      r.current.localStream = stream; setLocalStream(stream);
      const callData = await waitForOffer(call.id, 25000);
      if (!callData) { setPermErrType('no_offer'); setPhase('perm_error'); return; }
      if (r.current.dead) return;
      const pc = new RTCPeerConnection({ iceServers: ICE });
      r.current.pc = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      pc.ontrack = e => {
        if (e.streams?.[0]) {
          setRemoteStream(e.streams[0]);
        } else if (e.track) {
          const ms = new MediaStream();
          ms.addTrack(e.track);
          setRemoteStream(ms);
        }
      };
      pc.onconnectionstatechange = () => {
        if (r.current.dead) return;
        if (pc.connectionState === 'closed') {
          hangUp();
        } else if (pc.connectionState === 'failed') {
          setTimeout(() => {
            if (pc && pc.connectionState === 'failed' && !r.current.dead) {
              hangUp();
            }
          }, 4000);
        }
      };
      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(callData.offer)));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitIce(pc);
      if (r.current.dead) return;
      await setCallAnswer(call.id, JSON.stringify(pc.localDescription));
      setPhase(call.type === 'video' ? 'active_video' : 'active_audio');
      r.current.poll = setInterval(async () => {
        if (r.current.dead) return;
        try {
          const live = await getCallById(call.id);
          if (!live || ['ended','rejected','missed'].includes(live.status)) { clearInterval(r.current.poll); if (!r.current.dead) { cleanup(null); onHangUp(); } }
        } catch {}
      }, 800); // Poll fast (800ms) for fast hangup detection
    } catch (e) { handleMediaError(e); }
  }, [call.id, call.type, hangUp, onAccept, cleanup, onHangUp, handleMediaError]);

  // If role is receiver and the call was already accepted globally, trigger setup automatically
  useEffect(() => {
    if (role === 'receiver' && phase === 'connecting' && !localStream && !r.current.dead) {
      handleAccept();
    }
  }, [role, phase, localStream, handleAccept]);

  const handleRetry = useCallback(() => {
    r.current.dead = false; setPermErrType(null); setPermErrDetail(null);
    if (role === 'caller') { setPhase('caller_waiting'); r.current.dead = false; }
    else handleAccept();
  }, [role, handleAccept]);

  if (!call) return null;

  if (phase === 'incoming') return <IncomingCallOverlay call={call} callerUser={otherUser} onAccept={handleAccept} onDecline={async r2 => { cleanup(null); await updateCallStatus(call.id, r2).catch(() => {}); onDecline(r2); }} />;
  if (phase === 'caller_waiting') return <CallingScreen call={call} otherUser={otherUser} onCancel={hangUp} />;
  if (phase === 'connecting') return <ConnectingScreen otherUser={otherUser} />;
  if (phase === 'perm_error') return <PermScreen errType={permErrType} errDetail={permErrDetail} onRetry={handleRetry} onCancel={hangUp} />;
  if (phase === 'active_audio') return <AudioCallScreen otherUser={otherUser} localStream={localStream} remoteStream={remoteStream} onHangUp={hangUp} />;
  if (phase === 'active_video') return <VideoCallScreen currentUser={currentUser} otherUser={otherUser} localStream={localStream} remoteStream={remoteStream} onHangUp={hangUp} />;
  return null;
}
