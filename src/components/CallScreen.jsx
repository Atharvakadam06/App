/**
 * CallScreen.jsx — Professional P2P WebRTC calling UI
 * Redesigned: subtle dark palette, smooth animations, spring buttons,
 * phone-style ringtone, clean minimal layout
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PhoneOff, Phone, Video, Mic, MicOff, VideoOff,
  Volume2, AlertCircle, RefreshCw,
} from 'lucide-react';
import { updateCallStatus, setCallOffer, setCallAnswer, getCallById } from '../services/data';
import { handleAvatarError } from '../utils/avatarUtils';

// ─── ICE servers ──────────────────────────────────────────────────────────────
const ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

// ─── CSS injection ────────────────────────────────────────────────────────────
function injectCSS() {
  if (document.getElementById('sg-call-css3')) return;
  const s = document.createElement('style');
  s.id = 'sg-call-css3';
  s.textContent = `
    @keyframes sgFadeIn   { from{opacity:0} to{opacity:1} }
    @keyframes sgSlideUp  { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
    @keyframes sgPulse    { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(2.2);opacity:0} }
    @keyframes sgDot      { 0%,80%,100%{opacity:.2;transform:scale(.7)} 40%{opacity:1;transform:scale(1)} }
    @keyframes sgSpin     { to{transform:rotate(360deg)} }
    @keyframes sgBreath   { 0%,100%{opacity:.7} 50%{opacity:1} }
    @keyframes sgRipple   {
      0%   { transform:translate(-50%,-50%) scale(0); opacity:.5; }
      100% { transform:translate(-50%,-50%) scale(2.8); opacity:0; }
    }
    @keyframes sgBtnPress {
      0%   { transform:scale(1); }
      40%  { transform:scale(.88); }
      100% { transform:scale(1); }
    }
  `;
  document.head.appendChild(s);
}

// ─── Ringtone: classic phone double-ring pattern via Web Audio ────────────────
function startRingtone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let active = true;

    function ring() {
      if (!active) return;
      // Classic phone double-ring: two short bursts, then pause
      const now = ctx.currentTime;
      const bursts = [[0, 0.4], [0.5, 0.9]]; // [start, end] offsets in seconds

      bursts.forEach(([s, e]) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);

        // Classic DTMF-like dual tone: 440Hz + 480Hz (standard phone ring)
        osc1.type = 'sine'; osc1.frequency.value = 440;
        osc2.type = 'sine'; osc2.frequency.value = 480;

        gain.gain.setValueAtTime(0, now + s);
        gain.gain.linearRampToValueAtTime(0.18, now + s + 0.02);
        gain.gain.setValueAtTime(0.18, now + e - 0.04);
        gain.gain.linearRampToValueAtTime(0, now + e);

        osc1.start(now + s); osc1.stop(now + e + 0.05);
        osc2.start(now + s); osc2.stop(now + e + 0.05);
      });

      // Repeat every 3.2s (2 bursts = 0.9s + 2.3s silence)
      if (active) setTimeout(ring, 3200);
    }

    ring();

    return () => {
      active = false;
      setTimeout(() => { try { ctx.close(); } catch {} }, 400);
    };
  } catch { return () => {}; }
}

// ─── Calling tone: single repeating beep for caller ─────────────────────────
function startCallingTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let active = true;

    function beep() {
      if (!active) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = 425; // UK dial tone frequency
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.02);
      gain.gain.setValueAtTime(0.1, ctx.currentTime + 0.35);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
      if (active) setTimeout(beep, 1800);
    }

    beep();
    return () => {
      active = false;
      setTimeout(() => { try { ctx.close(); } catch {} }, 400);
    };
  } catch { return () => {}; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function waitIce(pc, ms = 6000) {
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
  const m = Math.floor(s / 60);
  return <>{String(m).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}</>;
}

// ─── Avatar with initials fallback ───────────────────────────────────────────
function CallAvatar({ src, name, size = 96 }) {
  if (src) {
    return (
      <img
        src={src} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        onError={e => handleAvatarError(e, name)}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700,
      color: 'rgba(255,255,255,0.7)',
      letterSpacing: '-0.02em',
    }}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

// ─── Ripple pulse rings ───────────────────────────────────────────────────────
function PulseRings({ n = 3, color = 'rgba(255,255,255,0.12)' }) {
  return (
    <>
      {[...Array(n)].map((_, i) => (
        <span key={i} style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `1.5px solid ${color}`,
          animation: `sgPulse 2.4s ease-out ${i * 0.75}s infinite`,
          pointerEvents: 'none',
        }} />
      ))}
    </>
  );
}

// ─── Call button (Decline / Accept) ──────────────────────────────────────────
function CallBtn({ icon, label, bg, onClick, size = 64 }) {
  const [pressed, setPressed] = useState(false);
  const [ripple, setRipple] = useState(false);

  const handle = (e) => {
    e.stopPropagation();
    setPressed(true);
    setRipple(true);
    setTimeout(() => setPressed(false), 300);
    setTimeout(() => setRipple(false), 600);
    onClick?.();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative' }}>
        {ripple && (
          <span style={{
            position: 'absolute', top: '50%', left: '50%',
            width: size, height: size, borderRadius: '50%',
            background: bg.includes('red') || bg.includes('dc26') ? 'rgba(220,38,38,0.4)' : 'rgba(255,255,255,0.18)',
            animation: 'sgRipple 0.55s ease-out forwards',
            pointerEvents: 'none', zIndex: 0,
          }} />
        )}
        <button
          onClick={handle}
          style={{
            position: 'relative', zIndex: 1,
            width: size, height: size, borderRadius: '50%',
            background: bg,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: pressed ? 'scale(0.88)' : 'scale(1)',
            transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
          }}
        >
          {icon}
        </button>
      </div>
      {label && (
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 500, letterSpacing: '0.01em' }}>
          {label}
        </span>
      )}
    </div>
  );
}

// ─── Control button (Mute / Speaker / Cam) ───────────────────────────────────
function CtrlBtn({ icon, label, active, onClick }) {
  const [pressed, setPressed] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <button
        onClick={() => { setPressed(true); setTimeout(() => setPressed(false), 200); onClick?.(); }}
        style={{
          width: 52, height: 52, borderRadius: '50%',
          background: active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: pressed ? 'scale(0.88)' : 'scale(1)',
          transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), background 0.2s',
          backdropFilter: 'blur(8px)',
        }}
      >
        {icon}
      </button>
      {label && (
        <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: 500 }}>{label}</span>
      )}
    </div>
  );
}

// ─── Shared background for all screens ───────────────────────────────────────
function CallBg({ avatarSrc }) {
  return (
    <>
      {/* Ambient blurred avatar */}
      {avatarSrc && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${avatarSrc})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(60px) brightness(0.08) saturate(0.6)',
          transform: 'scale(1.1)',
          zIndex: 0,
        }} />
      )}
      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'linear-gradient(170deg, rgba(10,13,26,0.97) 0%, rgba(5,8,18,0.99) 100%)',
      }} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   SCREEN: INCOMING CALL
═══════════════════════════════════════════════════════ */
export function IncomingCallOverlay({ call, callerUser, onAccept, onDecline }) {
  const [timeLeft, setTimeLeft] = useState(30);
  const stopRing = useRef(() => {});

  useEffect(() => {
    injectCSS();
    stopRing.current = startRingtone();
    const t = setInterval(() => {
      setTimeLeft(l => {
        if (l <= 1) { onDecline('missed'); return 0; }
        return l - 1;
      });
    }, 1000);
    return () => { clearInterval(t); stopRing.current(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isVideo = call?.type === 'video';
  const progress = (timeLeft / 30) * 100;

  const accept = () => { stopRing.current(); onAccept(); };
  const decline = () => { stopRing.current(); onDecline('rejected'); };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      animation: 'sgSlideUp 0.38s cubic-bezier(0.16,1,0.3,1)',
      overflow: 'hidden',
    }}>
      <CallBg avatarSrc={callerUser?.avatar} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 32px' }}>

        {/* Call type label */}
        <p style={{
          color: 'rgba(255,255,255,0.35)', fontSize: 11.5, fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: 40, margin: '0 0 40px',
        }}>
          {isVideo ? 'Incoming Video Call' : 'Incoming Call'}
        </p>

        {/* Avatar with pulse rings */}
        <div style={{ position: 'relative', width: 104, height: 104, marginBottom: 24 }}>
          <PulseRings n={3} color="rgba(255,255,255,0.1)" />
          <div style={{
            position: 'relative', zIndex: 1,
            width: 104, height: 104, borderRadius: '50%',
            overflow: 'hidden',
            boxShadow: '0 0 0 2px rgba(255,255,255,0.12), 0 16px 48px rgba(0,0,0,0.5)',
          }}>
            <CallAvatar src={callerUser?.avatar} name={callerUser?.name} size={104} />
          </div>
        </div>

        {/* Name */}
        <h1 style={{
          color: '#ffffff', fontSize: 26, fontWeight: 700,
          margin: '0 0 6px', letterSpacing: '-0.025em',
          textAlign: 'center',
        }}>
          {callerUser?.name}
        </h1>

        {/* Sub info */}
        <p style={{
          color: 'rgba(255,255,255,0.35)', fontSize: 13.5,
          margin: '0 0 36px', fontWeight: 400,
        }}>
          {callerUser?.college || 'StuGrow'}
        </p>

        {/* Auto-decline progress */}
        <div style={{ width: 200, marginBottom: 8 }}>
          <div style={{
            height: 2, background: 'rgba(255,255,255,0.07)',
            borderRadius: 99, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: 'rgba(255,255,255,0.3)',
              borderRadius: 99, transition: 'width 1s linear',
            }} />
          </div>
        </div>
        <p style={{
          color: 'rgba(255,255,255,0.18)', fontSize: 11,
          margin: '0 0 52px', fontWeight: 500,
          letterSpacing: '0.03em',
        }}>
          Auto-decline in {timeLeft}s
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 60, alignItems: 'flex-start' }}>
          <CallBtn
            icon={<PhoneOff size={24} color="#fff" />}
            label="Decline"
            bg="rgba(220,38,38,0.85)"
            size={68}
            onClick={decline}
          />
          <CallBtn
            icon={isVideo
              ? <Video size={24} color="#fff" />
              : <Phone size={24} color="#fff" />
            }
            label="Accept"
            bg="rgba(34,197,94,0.85)"
            size={68}
            onClick={accept}
          />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SCREEN: CALLING (caller waiting for pick up)
═══════════════════════════════════════════════════════ */
function CallingScreen({ call, otherUser, onCancel }) {
  const stopTone = useRef(() => {});

  useEffect(() => {
    injectCSS();
    stopTone.current = startCallingTone();
    return () => stopTone.current();
  }, []);

  const cancel = () => { stopTone.current(); onCancel(); };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      animation: 'sgFadeIn 0.3s ease', overflow: 'hidden',
    }}>
      <CallBg avatarSrc={otherUser?.avatar} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 32px' }}>

        <p style={{
          color: 'rgba(255,255,255,0.3)', fontSize: 11.5, fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          margin: '0 0 44px',
        }}>
          {call?.type === 'video' ? 'Video Call' : 'Audio Call'}
        </p>

        {/* Avatar */}
        <div style={{ position: 'relative', width: 104, height: 104, marginBottom: 24 }}>
          <PulseRings n={2} color="rgba(255,255,255,0.08)" />
          <div style={{
            position: 'relative', zIndex: 1,
            width: 104, height: 104, borderRadius: '50%', overflow: 'hidden',
            boxShadow: '0 0 0 2px rgba(255,255,255,0.1), 0 16px 48px rgba(0,0,0,0.5)',
          }}>
            <CallAvatar src={otherUser?.avatar} name={otherUser?.name} size={104} />
          </div>
        </div>

        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.025em' }}>
          {otherUser?.name}
        </h1>

        {/* Animated dots */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 60 }}>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 500, marginRight: 6 }}>Calling</span>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 5, height: 5, borderRadius: '50%',
              background: 'rgba(255,255,255,0.45)',
              display: 'inline-block',
              animation: `sgDot 1.5s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>

        <CallBtn
          icon={<PhoneOff size={26} color="#fff" />}
          label="Cancel"
          bg="rgba(220,38,38,0.85)"
          size={68}
          onClick={cancel}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SCREEN: CONNECTING
═══════════════════════════════════════════════════════ */
function ConnectingScreen({ otherUser }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 16, overflow: 'hidden',
      animation: 'sgFadeIn 0.25s ease',
    }}>
      <CallBg avatarSrc={otherUser?.avatar} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 0 0 2px rgba(255,255,255,0.1)' }}>
          <CallAvatar src={otherUser?.avatar} name={otherUser?.name} size={80} />
        </div>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '2.5px solid rgba(255,255,255,0.08)',
          borderTopColor: 'rgba(255,255,255,0.6)',
          animation: 'sgSpin 0.75s linear infinite',
        }} />
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 500, letterSpacing: '0.03em' }}>Connecting…</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SCREEN: PERMISSION ERROR
═══════════════════════════════════════════════════════ */
function PermScreen({ errType, errDetail, onRetry, onCancel }) {
  const isDenied = errType === 'denied';
  const isNoDevice = errType === 'no_device';
  const isNoOffer = errType === 'no_offer';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: '#080b14',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 32, gap: 16, animation: 'sgFadeIn 0.25s ease',
    }}>
      <div style={{
        width: 60, height: 60, borderRadius: '50%',
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AlertCircle size={26} style={{ color: 'rgba(239,68,68,0.8)' }} />
      </div>
      <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: 0, textAlign: 'center', letterSpacing: '-0.01em' }}>
        {isNoDevice ? 'No Microphone Found' : isNoOffer ? 'Connection Timed Out' : 'Microphone Access Required'}
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, lineHeight: 1.65, textAlign: 'center', maxWidth: 300, margin: 0 }}>
        {isNoDevice ? 'No microphone was detected. Connect one and tap Retry.'
          : isNoOffer ? 'The connection took too long. Please try calling again.'
          : 'Your browser blocked microphone access. Click the lock icon in the address bar to allow it.'}
      </p>
      {errDetail && (
        <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)', padding: '5px 10px', borderRadius: 6, margin: 0 }}>
          {errDetail}
        </p>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button
          onClick={onCancel}
          style={{
            padding: '10px 22px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          End Call
        </button>
        {!isNoOffer && (
          <button
            onClick={onRetry}
            style={{
              padding: '10px 22px', borderRadius: 10, border: 'none',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <RefreshCw size={13} /> Retry
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SCREEN: ACTIVE AUDIO CALL
═══════════════════════════════════════════════════════ */
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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      animation: 'sgFadeIn 0.3s ease', overflow: 'hidden',
    }}>
      <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />
      <CallBg avatarSrc={otherUser?.avatar} />

      {/* Top spacer */}
      <div style={{ flex: 1 }} />

      {/* Center content */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Avatar */}
        <div style={{
          width: 112, height: 112, borderRadius: '50%', overflow: 'hidden', marginBottom: 22,
          boxShadow: '0 0 0 2.5px rgba(255,255,255,0.1), 0 20px 60px rgba(0,0,0,0.6)',
        }}>
          <CallAvatar src={otherUser?.avatar} name={otherUser?.name} size={112} />
        </div>

        <h1 style={{ color: '#fff', fontSize: 27, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.025em' }}>
          {otherUser?.name}
        </h1>

        {/* Live timer */}
        <p style={{
          color: 'rgba(255,255,255,0.45)', fontSize: 13.5, fontWeight: 500,
          margin: 0, animation: 'sgBreath 2.5s ease infinite',
          letterSpacing: '0.04em',
        }}>
          <Timer from={startRef.current} />
        </p>
      </div>

      {/* Bottom controls */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', padding: '32px 0 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
      }}>
        {/* Secondary controls */}
        <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
          <CtrlBtn
            icon={muted
              ? <MicOff size={20} color="rgba(255,255,255,0.7)" />
              : <Mic size={20} color="rgba(255,255,255,0.7)" />
            }
            label={muted ? 'Unmute' : 'Mute'}
            active={muted}
            onClick={toggleMute}
          />
          <CtrlBtn
            icon={<Volume2 size={20} color="rgba(255,255,255,0.7)" />}
            label="Speaker"
            onClick={() => {}}
          />
        </div>

        {/* End call */}
        <CallBtn
          icon={<PhoneOff size={26} color="#fff" />}
          bg="rgba(220,38,38,0.85)"
          size={68}
          onClick={onHangUp}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SCREEN: ACTIVE VIDEO CALL
═══════════════════════════════════════════════════════ */
function VideoCallScreen({ otherUser, localStream, remoteStream, onHangUp }) {
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

  const tap = () => {
    setCtrlsVisible(true);
    clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => setCtrlsVisible(false), 4000);
  };

  const toggleMute = () => { localStream?.getAudioTracks().forEach(t => { t.enabled = muted; }); setMuted(m => !m); };
  const toggleCam = () => { localStream?.getVideoTracks().forEach(t => { t.enabled = camOff; }); setCamOff(c => !c); };

  return (
    <div onClick={tap} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: '#000', animation: 'sgFadeIn 0.3s ease' }}>
      {/* Remote video */}
      <video ref={remoteRef} autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

      {/* No remote video fallback */}
      {!remoteStream && (
        <div style={{
          position: 'absolute', inset: 0, background: '#080b14',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
        }}>
          <div style={{ width: 84, height: 84, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 0 0 2px rgba(255,255,255,0.1)' }}>
            <CallAvatar src={otherUser?.avatar} name={otherUser?.name} size={84} />
          </div>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.07)', borderTopColor: 'rgba(255,255,255,0.5)', animation: 'sgSpin 0.75s linear infinite' }} />
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12.5, fontWeight: 500 }}>Connecting video…</p>
        </div>
      )}

      {/* Local PiP */}
      <div style={{
        position: 'absolute', bottom: 96, right: 14, zIndex: 10,
        width: 88, height: 126, borderRadius: 12, overflow: 'hidden',
        border: '1.5px solid rgba(255,255,255,0.18)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.6)',
      }}>
        {camOff
          ? <div style={{ width: '100%', height: '100%', background: '#111318', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <VideoOff size={18} style={{ color: 'rgba(255,255,255,0.3)' }} />
            </div>
          : <video ref={localRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        }
      </div>

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '14px 16px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.72), transparent)',
        opacity: ctrlsVisible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: ctrlsVisible ? 'auto' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
            <CallAvatar src={otherUser?.avatar} name={otherUser?.name} size={32} />
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 13.5, margin: 0 }}>{otherUser?.name}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0, letterSpacing: '0.04em' }}>
              <Timer from={startRef.current} />
            </p>
          </div>
        </div>
        <div style={{
          background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: 999, padding: '3px 10px',
          color: 'rgba(134,239,172,0.85)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em',
        }}>
          ● LIVE
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        padding: '16px 0 40px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)',
        opacity: ctrlsVisible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: ctrlsVisible ? 'auto' : 'none',
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24,
      }}>
        <CtrlBtn icon={muted ? <MicOff size={20} color="rgba(255,255,255,0.7)" /> : <Mic size={20} color="rgba(255,255,255,0.7)" />} label={muted ? 'Unmute' : 'Mute'} active={muted} onClick={toggleMute} />
        <CallBtn icon={<PhoneOff size={26} color="#fff" />} bg="rgba(220,38,38,0.85)" size={66} onClick={onHangUp} />
        <CtrlBtn icon={camOff ? <VideoOff size={20} color="rgba(255,255,255,0.7)" /> : <Video size={20} color="rgba(255,255,255,0.7)" />} label={camOff ? 'Cam On' : 'Cam Off'} active={camOff} onClick={toggleCam} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN ORCHESTRATOR
═══════════════════════════════════════════════════════ */
export default function CallScreen({ call, currentUser, otherUser, role, onAccept, onDecline, onHangUp }) {
  const [phase, setPhase] = useState(role === 'caller' ? 'caller_waiting' : 'incoming');
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
    r.current.pc = null;
    r.current.localStream = null;
    if (newStatus) updateCallStatus(call.id, newStatus).catch(() => {});
  }, [call.id]);

  const hangUp = useCallback(() => { cleanup('ended'); onHangUp(); }, [cleanup, onHangUp]);

  const handleMediaError = useCallback((e) => {
    const detail = `${e.name}: ${e.message}`;
    if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') setPermErrType('no_device');
    else setPermErrType('denied');
    setPermErrDetail(detail);
    setPhase('perm_error');
  }, []);

  const getMedia = async (type) => {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
    } catch (e) {
      if (type === 'video') {
        try { return await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); } catch {}
      }
      throw e;
    }
  };

  // Caller setup
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
        pc.ontrack = e => { if (e.streams?.[0]) setRemoteStream(e.streams[0]); };
        pc.onconnectionstatechange = () => { if (['failed','closed'].includes(pc.connectionState) && !r.current.dead) hangUp(); };
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
          } catch (e) { console.warn('Poll err:', e); }
        }, 2000);
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
      pc.ontrack = e => { if (e.streams?.[0]) setRemoteStream(e.streams[0]); };
      pc.onconnectionstatechange = () => { if (['failed','closed'].includes(pc.connectionState) && !r.current.dead) hangUp(); };
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
      }, 3000);
    } catch (e) { handleMediaError(e); }
  }, [call.id, call.type, hangUp, onAccept, cleanup, onHangUp, handleMediaError]);

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
