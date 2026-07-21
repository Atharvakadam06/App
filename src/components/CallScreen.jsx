/**
 * CallScreen.jsx — Professional calling (WhatsApp-level)
 *
 * Key fixes:
 *  1. role auto-derived from call.caller_id === currentUserId
 *  2. Caller transitions to "connecting" when answer received in DB
 *  3. Polling at 400ms for fast signaling
 *  4. Receiver polls for caller ICE candidates continuously
 *  5. "Call Ended" screen shown for 2s before unmounting
 *  6. Audio autoplay resilient - retry on any user interaction
 *  7. Camera flip for video calls
 *  8. Both connectionState AND iceConnectionState monitored
 */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  PhoneOff, Phone, Video, Mic, MicOff, CameraOff,
  Volume2, VolumeX, RefreshCw, RotateCcw,
  AlertCircle, Lock, CheckCircle,
} from "lucide-react";
import {
  updateCallStatus, setCallOffer, setCallAnswer,
  getCallById, addIceCandidate, getIceCandidates, clearIceCandidates,
} from "../services/data";
import { handleAvatarError } from "../utils/avatarUtils";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turns:openrelay.metered.ca:443",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

function injectCSS() {
  if (document.getElementById("sg-call-css5")) return;
  const s = document.createElement("style");
  s.id = "sg-call-css5";
  s.textContent = `
    @keyframes scFadeIn   { from{opacity:0} to{opacity:1} }
    @keyframes scSlideUp  { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
    @keyframes scSlideIn  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
    @keyframes scPulse    { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(2.5);opacity:0} }
    @keyframes scDot      { 0%,80%,100%{opacity:.25;transform:scale(.65)} 40%{opacity:1;transform:scale(1)} }
    @keyframes scSpin     { to{transform:rotate(360deg)} }
    @keyframes scBreathe  { 0%,100%{opacity:.5} 50%{opacity:.85} }
    @keyframes scWave     { 0%,100%{transform:scaleY(.4)} 50%{transform:scaleY(1)} }
    @keyframes scEndFade  { 0%{opacity:0;transform:scale(.92)} 15%{opacity:1;transform:scale(1)} 80%{opacity:1} 100%{opacity:0} }
    .sg-call-bg {
      background: linear-gradient(160deg, #0d1117 0%, #111b21 55%, #0a0f1a 100%);
    }
    .sg-ctrl-pill {
      background: rgba(255,255,255,0.07);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 100px;
      display: flex;
      align-items: center;
      gap: 0;
      padding: 10px 12px;
    }
    .sg-call-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 0;
    }
    .sg-call-btn button {
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.1);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      outline: none;
      -webkit-tap-highlight-color: transparent;
      transition: transform 0.14s cubic-bezier(0.34,1.56,0.64,1), background 0.15s;
    }
    .sg-call-btn button:active { transform: scale(0.84) !important; }
    .sg-call-lbl {
      color: rgba(255,255,255,0.42);
      font-size: 10.5px;
      font-weight: 500;
      white-space: nowrap;
    }
  `;
  document.head.appendChild(s);
}

function startRingtone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let active = true;
    const notes = [
      {f:659.25,t:0,d:.22},{f:880,t:.12,d:.22},{f:1046.5,t:.24,d:.22},
      {f:1318.51,t:.36,d:.35},{f:1174.66,t:.55,d:.22},{f:987.77,t:.67,d:.22},
      {f:783.99,t:.79,d:.22},{f:987.77,t:.91,d:.22},{f:1318.51,t:1.03,d:.5},
    ];
    function playNote(freq, start, dur) {
      if (!active) return;
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "triangle"; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start); osc.stop(start + dur + 0.05);
    }
    function play() {
      if (!active) return;
      const now = ctx.currentTime;
      notes.forEach(n => playNote(n.f, now + n.t, n.d));
      if (active) setTimeout(play, 3400);
    }
    play();
    return () => { active = false; setTimeout(() => { try { ctx.close(); } catch {} }, 600); };
  } catch { return () => {}; }
}

function startCallingTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let active = true;
    function beep() {
      if (!active) return;
      const now = ctx.currentTime;
      [[0, .4], [.55, .95]].forEach(([s, e]) => {
        const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
        o1.connect(g); o2.connect(g); g.connect(ctx.destination);
        o1.type = "sine"; o1.frequency.value = 440;
        o2.type = "sine"; o2.frequency.value = 480;
        g.gain.setValueAtTime(0, now + s);
        g.gain.linearRampToValueAtTime(0.07, now + s + 0.02);
        g.gain.setValueAtTime(0.07, now + e - 0.03);
        g.gain.linearRampToValueAtTime(0, now + e);
        o1.start(now + s); o1.stop(now + e + 0.05);
        o2.start(now + s); o2.stop(now + e + 0.05);
      });
      if (active) setTimeout(beep, 3000);
    }
    beep();
    return () => { active = false; setTimeout(() => { try { ctx.close(); } catch {} }, 600); };
  } catch { return () => {}; }
}

function Timer({ from }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs(Math.floor((Date.now() - from) / 1000)), 1000);
    return () => clearInterval(t);
  }, [from]);
  return <>{String(Math.floor(secs / 60)).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")}</>;
}

function Avatar({ src, name, size = 140 }) {
  if (src) {
    return <img src={src} alt="" onError={e => handleAvatarError(e, name)} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
      {name?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );
}

function PulseRings({ n = 3 }) {
  return (
    <>
      {[...Array(n)].map((_, i) => (
        <span key={i} style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.12)", animation: `scPulse 2.8s ease-out ${i * 0.9}s infinite`, pointerEvents: "none" }} />
      ))}
    </>
  );
}

function AudioWaves() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 20 }}>
      {[0,1,2,3,4].map(i => (
        <span key={i} style={{ width: 3, height: 14, borderRadius: 2, background: "rgba(52,211,153,0.8)", animation: `scWave 1.2s ease-in-out ${i * 0.18}s infinite`, display: "inline-block" }} />
      ))}
    </div>
  );
}

function CallBtn({ icon, label, onClick, danger = false, active = false, size = 54 }) {
  const handled = useRef(false);
  const fire = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (handled.current) return;
    handled.current = true;
    setTimeout(() => { handled.current = false; }, 500);
    onClick?.();
  };
  const bg = danger ? "rgba(239,68,68,0.88)" : active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)";
  return (
    <div className="sg-call-btn">
      <button onTouchStart={fire} onClick={fire} style={{ width: size, height: size, background: bg }}>{icon}</button>
      {label && <span className="sg-call-lbl">{label}</span>}
    </div>
  );
}

function BigBtn({ icon, label, bg, onClick }) {
  const handled = useRef(false);
  const fire = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (handled.current) return;
    handled.current = true;
    setTimeout(() => { handled.current = false; }, 500);
    onClick?.();
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <button onTouchStart={fire} onClick={fire} style={{ width: 70, height: 70, borderRadius: "50%", background: bg, border: "none", cursor: "pointer", outline: "none", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 30px rgba(0,0,0,0.45)", WebkitTapHighlightColor: "transparent" }}>{icon}</button>
      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12.5, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function CallLayout({ otherUser, statusNode, children, pulsing = false }) {
  return (
    <div className="sg-call-bg" style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", flexDirection: "column", animation: "scFadeIn 0.3s ease", overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "max(52px, env(safe-area-inset-top, 52px))" }}>
        <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: "0 0 5px", letterSpacing: "-0.025em", textAlign: "center" }}>{otherUser?.name}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Lock size={10} style={{ color: "rgba(255,255,255,0.28)" }} />
          <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 11.5 }}>End-to-end encrypted</span>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: 160, height: 160, marginBottom: 22 }}>
          {pulsing && <PulseRings n={2} />}
          <div style={{ position: "relative", zIndex: 1, width: 160, height: 160, borderRadius: "50%", overflow: "hidden", boxShadow: "0 0 0 3px rgba(255,255,255,0.1), 0 24px 64px rgba(0,0,0,0.65)" }}>
            <Avatar src={otherUser?.avatar} name={otherUser?.name} size={160} />
          </div>
        </div>
        {statusNode}
      </div>
      <div style={{ padding: "0 20px", paddingBottom: "max(40px, env(safe-area-inset-bottom, 40px))", animation: "scSlideIn 0.45s cubic-bezier(0.16,1,0.3,1)" }}>
        {children}
      </div>
    </div>
  );
}

export function IncomingCallOverlay({ call, callerUser, onAccept, onDecline }) {
  const [timeLeft, setTimeLeft] = useState(30);
  const stopRing = useRef(() => {});
  useEffect(() => {
    injectCSS();
    stopRing.current = startRingtone();
    const t = setInterval(() => {
      setTimeLeft(l => { if (l <= 1) { onDecline("missed"); return 0; } return l - 1; });
    }, 1000);
    return () => { clearInterval(t); stopRing.current(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const isVideo = call?.type === "video";
  const accept  = () => { stopRing.current(); onAccept(); };
  const decline = () => { stopRing.current(); onDecline("rejected"); };
  return (
    <div className="sg-call-bg" style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", flexDirection: "column", animation: "scSlideUp 0.38s cubic-bezier(0.16,1,0.3,1)", overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "max(60px, env(safe-area-inset-top, 60px))", animation: "scSlideIn 0.45s cubic-bezier(0.16,1,0.3,1)" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11.5, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 6px" }}>
          {isVideo ? "Incoming Video Call" : "Incoming Call"}
        </p>
        <h1 style={{ color: "#fff", fontSize: 30, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.025em" }}>{callerUser?.name}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Lock size={11} style={{ color: "rgba(255,255,255,0.28)" }} />
          <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 12 }}>End-to-end encrypted</span>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: 160, height: 160 }}>
          <PulseRings n={3} />
          <div style={{ position: "relative", zIndex: 1, width: 160, height: 160, borderRadius: "50%", overflow: "hidden", boxShadow: "0 0 0 3px rgba(255,255,255,0.12), 0 24px 64px rgba(0,0,0,0.6)" }}>
            <Avatar src={callerUser?.avatar} name={callerUser?.name} size={160} />
          </div>
        </div>
        <p style={{ color: "rgba(255,255,255,0.32)", fontSize: 13.5, marginTop: 20 }}>{callerUser?.college || "StuGrow"}</p>
        <div style={{ width: 160, marginTop: 28 }}>
          <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(timeLeft / 30) * 100}%`, background: "rgba(255,255,255,0.26)", borderRadius: 99, transition: "width 1s linear" }} />
          </div>
          <p style={{ color: "rgba(255,255,255,0.17)", fontSize: 11, textAlign: "center", marginTop: 6 }}>Auto-decline in {timeLeft}s</p>
        </div>
      </div>
      <div style={{ padding: "0 40px", paddingBottom: "max(52px, env(safe-area-inset-bottom, 52px))", display: "flex", justifyContent: "space-around", animation: "scSlideIn 0.5s cubic-bezier(0.16,1,0.3,1)" }}>
        <BigBtn icon={<PhoneOff size={27} color="#fff" />} label="Decline" bg="rgba(239,68,68,0.88)" onClick={decline} />
        <BigBtn icon={isVideo ? <Video size={27} color="#fff" /> : <Phone size={27} color="#fff" />} label="Accept" bg="rgba(34,197,94,0.88)" onClick={accept} />
      </div>
    </div>
  );
}

function CallingScreen({ otherUser, onCancel }) {
  const stopTone = useRef(() => {});
  useEffect(() => { injectCSS(); stopTone.current = startCallingTone(); return () => stopTone.current(); }, []);
  return (
    <CallLayout otherUser={otherUser} pulsing statusNode={
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Calling</span>
        {[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.45)", display: "inline-block", animation: `scDot 1.4s ease-in-out ${i * 0.2}s infinite` }} />)}
      </div>
    }>
      <div className="sg-ctrl-pill" style={{ justifyContent: "center" }}>
        <CallBtn icon={<PhoneOff size={22} color="#fff" />} label="End" danger onClick={() => { stopTone.current(); onCancel(); }} />
      </div>
    </CallLayout>
  );
}

function ConnectingScreen({ otherUser }) {
  useEffect(() => { injectCSS(); }, []);
  return (
    <CallLayout otherUser={otherUser} statusNode={
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.65)", animation: "scSpin 0.75s linear infinite" }} />
        <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 14 }}>Connecting...</span>
      </div>
    }>
      <div className="sg-ctrl-pill" style={{ justifyContent: "center", opacity: 0.4 }}><div style={{ flex: 1 }} /></div>
    </CallLayout>
  );
}

function CallEndedScreen({ otherUser, reason }) {
  useEffect(() => { injectCSS(); }, []);
  const msg = reason === "rejected" ? "Call Declined" : reason === "missed" ? "No Answer" : "Call Ended";
  return (
    <div className="sg-call-bg" style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, animation: "scEndFade 2.2s ease forwards" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CheckCircle size={26} style={{ color: "rgba(255,255,255,0.5)" }} />
      </div>
      <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 17, fontWeight: 600, margin: 0 }}>{msg}</p>
      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: 0 }}>{otherUser?.name}</p>
    </div>
  );
}

function PermScreen({ errType, errDetail, onRetry, onCancel }) {
  useEffect(() => { injectCSS(); }, []);
  const isNoDevice = errType === "no_device";
  const isTimeout  = errType === "no_offer";
  return (
    <div className="sg-call-bg" style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 16, animation: "scFadeIn 0.25s ease" }}>
      <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AlertCircle size={24} style={{ color: "rgba(239,68,68,0.8)" }} />
      </div>
      <h2 style={{ color: "#fff", fontSize: 17, fontWeight: 700, margin: 0, textAlign: "center" }}>
        {isNoDevice ? "No Microphone Found" : isTimeout ? "Connection Timed Out" : "Microphone Access Required"}
      </h2>
      <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 13, lineHeight: 1.65, textAlign: "center", maxWidth: 300, margin: 0 }}>
        {isNoDevice ? "No microphone detected. Connect one and tap Retry." : isTimeout ? "The connection took too long. Try calling again." : "Allow microphone access in your browser settings, then tap Retry."}
      </p>
      {errDetail && <p style={{ color: "rgba(255,255,255,0.12)", fontSize: 10, fontFamily: "monospace", background: "rgba(255,255,255,0.04)", padding: "5px 10px", borderRadius: 6, margin: 0 }}>{errDetail}</p>}
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button onClick={onCancel} style={{ padding: "10px 22px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>End Call</button>
        {!isTimeout && <button onClick={onRetry} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><RefreshCw size={13} /> Retry</button>}
      </div>
    </div>
  );
}

function AudioCallScreen({ otherUser, localStream, remoteStream, onHangUp }) {
  const [muted,     setMuted]     = useState(false);
  const [speaker,   setSpeaker]   = useState(false);
  const [connected, setConnected] = useState(false);
  const audioRef = useRef(null);
  const startRef = useRef(Date.now());

  const tryPlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (remoteStream && el.srcObject !== remoteStream) el.srcObject = remoteStream;
    if (el.srcObject && el.paused) el.play().then(() => setConnected(true)).catch(() => {});
  }, [remoteStream]);

  useEffect(() => {
    injectCSS();
    tryPlay();
    document.addEventListener("click",      tryPlay, { passive: true });
    document.addEventListener("touchstart", tryPlay, { passive: true });
    return () => {
      document.removeEventListener("click",      tryPlay);
      document.removeEventListener("touchstart", tryPlay);
    };
  }, [remoteStream, tryPlay]);

  const toggleMute = () => { localStream?.getAudioTracks().forEach(t => { t.enabled = muted; }); setMuted(m => !m); };

  return (
    <CallLayout otherUser={otherUser} statusNode={
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {connected
          ? <AudioWaves />
          : <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.6)", animation: "scSpin 0.75s linear infinite" }} />
        }
        <p style={{ color: connected ? "rgba(52,211,153,0.85)" : "rgba(255,255,255,0.45)", fontSize: 14, fontWeight: 500, margin: 0, animation: "scBreathe 2.5s ease infinite" }}>
          {connected ? <Timer from={startRef.current} /> : "Connecting..."}
        </p>
      </div>
    }>
      <audio ref={audioRef} autoPlay playsInline style={{ position: "absolute", width: 1, height: 1, opacity: 0.01, pointerEvents: "none", top: 0, left: 0 }} />
      <div className="sg-ctrl-pill">
        <CallBtn icon={speaker ? <Volume2 size={20} color="rgba(255,255,255,0.9)" /> : <VolumeX size={20} color="rgba(255,255,255,0.7)" />} label="Speaker" active={speaker} onClick={() => setSpeaker(s => !s)} />
        <CallBtn icon={muted ? <MicOff size={20} color="rgba(255,255,255,0.9)" /> : <Mic size={20} color="rgba(255,255,255,0.7)" />} label={muted ? "Unmute" : "Mute"} active={muted} onClick={toggleMute} />
        <CallBtn icon={<PhoneOff size={21} color="#fff" />} label="End" danger onClick={onHangUp} />
      </div>
    </CallLayout>
  );
}

function VideoCallScreen({ otherUser, localStream, remoteStream, onHangUp }) {
  const [muted,       setMuted]       = useState(false);
  const [camOff,      setCamOff]      = useState(false);
  const [ctrlVisible, setCtrlVisible] = useState(true);
  const remoteRef = useRef(null);
  const localRef  = useRef(null);
  const startRef  = useRef(Date.now());
  const hideTimer = useRef(null);

  useEffect(() => { injectCSS(); }, []);

  const tryPlayRemote = useCallback(() => {
    const el = remoteRef.current;
    if (!el) return;
    if (remoteStream && el.srcObject !== remoteStream) el.srcObject = remoteStream;
    if (el.srcObject && el.paused) el.play().catch(() => {});
  }, [remoteStream]);

  useEffect(() => {
    tryPlayRemote();
    document.addEventListener("click",      tryPlayRemote, { passive: true });
    document.addEventListener("touchstart", tryPlayRemote, { passive: true });
    return () => {
      document.removeEventListener("click",      tryPlayRemote);
      document.removeEventListener("touchstart", tryPlayRemote);
    };
  }, [remoteStream, tryPlayRemote]);

  useEffect(() => {
    if (localRef.current && localStream) {
      localRef.current.srcObject = localStream;
      localRef.current.play().catch(() => {});
    }
  }, [localStream]);

  const resetHide = useCallback(() => {
    setCtrlVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setCtrlVisible(false), 5000);
  }, []);

  useEffect(() => { resetHide(); return () => clearTimeout(hideTimer.current); }, [resetHide]);

  const toggleMute = () => { localStream?.getAudioTracks().forEach(t => { t.enabled = muted; }); setMuted(m => !m); };
  const toggleCam  = () => { localStream?.getVideoTracks().forEach(t => { t.enabled = camOff; }); setCamOff(c => !c); };

  const flipCamera = async () => {
    const vTrack = localStream?.getVideoTracks()[0];
    if (!vTrack) return;
    try {
      const settings  = vTrack.getSettings();
      const newFacing = settings.facingMode === "user" ? "environment" : "user";
      const newStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: newFacing } } });
      const newVTrack = newStream.getVideoTracks()[0];
      const sender    = window.__sgPc?.getSenders?.().find(s => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(newVTrack);
      vTrack.stop();
      if (localRef.current) { localRef.current.srcObject = new MediaStream([newVTrack]); localRef.current.play().catch(() => {}); }
    } catch {}
  };

  return (
    <div onClick={resetHide} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#000", animation: "scFadeIn 0.3s ease", overflow: "hidden" }}>
      <video ref={remoteRef} autoPlay playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      {!remoteStream && (
        <div className="sg-call-bg" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <div style={{ width: 100, height: 100, borderRadius: "50%", overflow: "hidden" }}><Avatar src={otherUser?.avatar} name={otherUser?.name} size={100} /></div>
          <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.08)", borderTopColor: "rgba(255,255,255,0.55)", animation: "scSpin 0.75s linear infinite" }} />
          <p style={{ color: "rgba(255,255,255,0.32)", fontSize: 13 }}>Connecting video...</p>
        </div>
      )}
      <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 110, right: 14, zIndex: 10, width: 90, height: 130, borderRadius: 14, overflow: "hidden", border: "1.5px solid rgba(255,255,255,0.2)", boxShadow: "0 8px 28px rgba(0,0,0,0.55)" }}>
        {camOff
          ? <div style={{ width: "100%", height: "100%", background: "#111b21", display: "flex", alignItems: "center", justifyContent: "center" }}><CameraOff size={18} style={{ color: "rgba(255,255,255,0.3)" }} /></div>
          : <video ref={localRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
        }
      </div>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, padding: "max(14px, env(safe-area-inset-top, 14px)) 16px 14px", background: "linear-gradient(to bottom, rgba(0,0,0,0.72), transparent)", opacity: ctrlVisible ? 1 : 0, transition: "opacity 0.35s ease", pointerEvents: ctrlVisible ? "auto" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden" }}><Avatar src={otherUser?.avatar} name={otherUser?.name} size={36} /></div>
          <div>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, margin: 0 }}>{otherUser?.name}</p>
            <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 11, margin: 0 }}>{remoteStream ? <Timer from={startRef.current} /> : "Connecting..."}</p>
          </div>
        </div>
        {remoteStream && <div style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 99, padding: "3px 10px", color: "rgba(134,239,172,0.85)", fontSize: 9.5, fontWeight: 700 }}>● LIVE</div>}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10, padding: "0 20px", paddingBottom: "max(36px, env(safe-area-inset-bottom, 36px))", background: "linear-gradient(to top, rgba(0,0,0,0.78), transparent)", opacity: ctrlVisible ? 1 : 0, transition: "opacity 0.35s ease", pointerEvents: ctrlVisible ? "auto" : "none" }}>
        <div className="sg-ctrl-pill">
          <CallBtn icon={<RotateCcw size={20} color="rgba(255,255,255,0.75)" />} label="Flip" onClick={flipCamera} />
          <CallBtn icon={camOff ? <CameraOff size={20} color="rgba(255,255,255,0.9)" /> : <Video size={20} color="rgba(255,255,255,0.75)" />} label={camOff ? "Cam On" : "Cam Off"} active={camOff} onClick={toggleCam} />
          <CallBtn icon={muted ? <MicOff size={20} color="rgba(255,255,255,0.9)" /> : <Mic size={20} color="rgba(255,255,255,0.75)" />} label={muted ? "Unmute" : "Mute"} active={muted} onClick={toggleMute} />
          <CallBtn icon={<PhoneOff size={21} color="#fff" />} label="End" danger onClick={onHangUp} />
        </div>
      </div>
    </div>
  );
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForOffer(callId, timeoutMs = 22000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const d = await getCallById(callId);
      if (!d || ["ended", "rejected", "missed"].includes(d.status)) return null;
      if (d.offer) return d;
    } catch {}
    await sleep(400);
  }
  return null;
}

async function getUserMedia(type) {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
  } catch (e) {
    if (type === "video") {
      try { return await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); } catch {}
    }
    throw e;
  }
}

export default function CallScreen({ call, currentUserId, otherUser, onHangUp }) {
  const role = call?.caller_id === currentUserId ? "caller" : "receiver";

  const [phase,        setPhase]        = useState(() => {
    if (!call) return "ended";
    if (call.status === "accepted") return "connecting";
    if (role === "caller") return "caller_waiting";
    return "incoming";
  });
  const [endReason,    setEndReason]    = useState(null);
  const [permErrType,  setPermErrType]  = useState(null);
  const [permErrDetail,setPermErrDetail]= useState(null);
  const [localStream,  setLocalStream]  = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [retryCount,   setRetryCount]   = useState(0);

  const rt = useRef({
    dead: false, pc: null, localStream: null, pollInterval: null,
    callerCandIdx: 0, receiverCandIdx: 0, answerSet: false,
  });

  useEffect(() => { injectCSS(); }, []);

  const cleanup = useCallback((endStatus) => {
    if (rt.current.dead) return;
    rt.current.dead = true;
    clearInterval(rt.current.pollInterval);
    rt.current.localStream?.getTracks().forEach(t => t.stop());
    if (rt.current.pc) {
      rt.current.pc.onicecandidate             = null;
      rt.current.pc.ontrack                    = null;
      rt.current.pc.onconnectionstatechange    = null;
      rt.current.pc.oniceconnectionstatechange = null;
      rt.current.pc.close();
      rt.current.pc = null;
    }
    rt.current.localStream = null;
    window.__sgPc = null;
    if (endStatus) updateCallStatus(call.id, endStatus).catch(() => {});
    clearIceCandidates(call.id).catch(() => {});
  }, [call?.id]);

  const hangUp = useCallback((reason = "ended") => {
    cleanup(reason === "ended" ? "ended" : null);
    setEndReason(reason);
    setPhase("call_ended");
    setTimeout(() => onHangUp(), 2200);
  }, [cleanup, onHangUp]);

  const setupRemoteTracks = useCallback((pc) => {
    pc.ontrack = (e) => {
      if (rt.current.dead) return;
      if (e.streams?.[0]) {
        setRemoteStream(new MediaStream(e.streams[0].getTracks()));
      } else if (e.track) {
        setRemoteStream(prev => {
          const existing = prev ? prev.getTracks() : [];
          return new MediaStream([...existing.filter(t => t.id !== e.track.id), e.track]);
        });
      }
    };
  }, []);

  const onConnState = useCallback((pc) => {
    if (rt.current.dead) return;
    const cs  = pc.connectionState;
    const ics = pc.iceConnectionState;
    if (cs === "connected" || ics === "connected" || ics === "completed") {
      setPhase(prev => {
        if (prev === "active_audio" || prev === "active_video") return prev;
        return call.type === "video" ? "active_video" : "active_audio";
      });
    } else if (cs === "failed" || ics === "failed") {
      try { pc.restartIce?.(); } catch {}
      setTimeout(() => {
        if (!rt.current.dead && (pc.connectionState === "failed" || pc.iceConnectionState === "failed")) hangUp("ended");
      }, 8000);
    } else if (cs === "disconnected" || ics === "disconnected") {
      setTimeout(() => {
        if (!rt.current.dead && (pc.connectionState === "disconnected" || pc.iceConnectionState === "disconnected")) hangUp("ended");
      }, 10000);
    }
  }, [call?.type, hangUp]);

  const drainCandidates = useCallback(async (pc, fromRole) => {
    const idxKey = fromRole === "caller" ? "callerCandIdx" : "receiverCandIdx";
    try {
      const rows = await getIceCandidates(call.id, fromRole, rt.current[idxKey]);
      for (const row of rows) {
        try {
          if (pc.remoteDescription && !rt.current.dead) {
            await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(row.candidate)));
          }
        } catch {}
        if (row.id > rt.current[idxKey]) rt.current[idxKey] = row.id;
      }
    } catch {}
  }, [call?.id]);

  // CALLER FLOW
  useEffect(() => {
    if (role !== "caller") return;
    rt.current.dead            = false;
    rt.current.answerSet       = false;
    rt.current.receiverCandIdx = 0;

    (async () => {
      try {
        const stream = await getUserMedia(call.type);
        if (rt.current.dead) { stream.getTracks().forEach(t => t.stop()); return; }
        rt.current.localStream = stream;
        setLocalStream(stream);

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        rt.current.pc = pc;
        window.__sgPc = pc;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        setupRemoteTracks(pc);
        pc.onconnectionstatechange    = () => onConnState(pc);
        pc.oniceconnectionstatechange = () => onConnState(pc);

        pc.onicecandidate = async (e) => {
          if (e.candidate && !rt.current.dead) {
            await addIceCandidate(call.id, "caller", JSON.stringify(e.candidate.toJSON())).catch(() => {});
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (rt.current.dead) return;
        await setCallOffer(call.id, JSON.stringify({ type: pc.localDescription.type, sdp: pc.localDescription.sdp }));

        rt.current.pollInterval = setInterval(async () => {
          if (rt.current.dead) return;
          try {
            const data = await getCallById(call.id);
            if (!data || ["rejected", "ended", "missed"].includes(data.status)) {
              clearInterval(rt.current.pollInterval);
              if (!rt.current.dead) hangUp(data?.status || "ended");
              return;
            }
            if (data.answer && !rt.current.answerSet && pc.signalingState === "have-local-offer") {
              rt.current.answerSet = true;
              await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.answer)));
              if (!rt.current.dead) setPhase(prev => prev === "caller_waiting" ? "connecting" : prev);
            }
            if (pc.remoteDescription) await drainCandidates(pc, "receiver");
          } catch {}
        }, 400);

      } catch (e) {
        if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") setPermErrType("no_device");
        else setPermErrType("denied");
        setPermErrDetail(`${e.name}: ${e.message}`);
        setPhase("perm_error");
      }
    })();

    return () => { cleanup(null); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, retryCount]);

  // RECEIVER FLOW
  const startReceiverFlow = useCallback(async () => {
    rt.current.dead          = false;
    rt.current.callerCandIdx = 0;

    try {
      const stream = await getUserMedia(call.type);
      if (rt.current.dead) { stream.getTracks().forEach(t => t.stop()); return; }
      rt.current.localStream = stream;
      setLocalStream(stream);

      const callData = await waitForOffer(call.id, 22000);
      if (!callData) { setPermErrType("no_offer"); setPhase("perm_error"); return; }
      if (rt.current.dead) return;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      rt.current.pc = pc;
      window.__sgPc = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      setupRemoteTracks(pc);
      pc.onconnectionstatechange    = () => onConnState(pc);
      pc.oniceconnectionstatechange = () => onConnState(pc);

      pc.onicecandidate = async (e) => {
        if (e.candidate && !rt.current.dead) {
          await addIceCandidate(call.id, "receiver", JSON.stringify(e.candidate.toJSON())).catch(() => {});
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(callData.offer)));
      await drainCandidates(pc, "caller");
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (rt.current.dead) return;
      await setCallAnswer(call.id, JSON.stringify({ type: pc.localDescription.type, sdp: pc.localDescription.sdp }));

      rt.current.pollInterval = setInterval(async () => {
        if (rt.current.dead) return;
        try {
          const live = await getCallById(call.id);
          if (!live || ["ended", "rejected", "missed"].includes(live.status)) {
            clearInterval(rt.current.pollInterval);
            if (!rt.current.dead) hangUp(live?.status || "ended");
            return;
          }
          await drainCandidates(pc, "caller");
        } catch {}
      }, 400);

    } catch (e) {
      if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") setPermErrType("no_device");
      else setPermErrType("denied");
      setPermErrDetail(`${e.name}: ${e.message}`);
      setPhase("perm_error");
    }
  }, [call?.id, call?.type, cleanup, hangUp, setupRemoteTracks, onConnState, drainCandidates]);

  useEffect(() => {
    if (role === "receiver" && phase === "connecting" && !rt.current.localStream && !rt.current.dead) {
      startReceiverFlow();
    }
  }, [role, phase, startReceiverFlow]);

  useEffect(() => { return () => { cleanup("ended"); }; }, [cleanup]);

  const handleRetry = useCallback(() => {
    rt.current.dead      = false;
    rt.current.answerSet = false;
    setPermErrType(null);
    setPermErrDetail(null);
    if (role === "caller") { setPhase("caller_waiting"); setRetryCount(c => c + 1); }
    else { setPhase("connecting"); }
  }, [role]);

  const handleAccept = useCallback(() => {
    setPhase("connecting");
    updateCallStatus(call.id, "accepted").catch(() => {});
  }, [call?.id]);

  const handleDecline = useCallback(async (reason) => {
    cleanup(null);
    await updateCallStatus(call.id, reason).catch(() => {});
    setEndReason(reason);
    setPhase("call_ended");
    setTimeout(() => onHangUp(), 2200);
  }, [call?.id, cleanup, onHangUp]);

  if (!call) return null;
  if (phase === "call_ended")    return <CallEndedScreen otherUser={otherUser} reason={endReason} />;
  if (phase === "incoming")      return <IncomingCallOverlay call={call} callerUser={otherUser} onAccept={handleAccept} onDecline={handleDecline} />;
  if (phase === "caller_waiting")return <CallingScreen otherUser={otherUser} onCancel={() => hangUp("ended")} />;
  if (phase === "connecting")    return <ConnectingScreen otherUser={otherUser} />;
  if (phase === "perm_error")    return <PermScreen errType={permErrType} errDetail={permErrDetail} onRetry={handleRetry} onCancel={() => hangUp("ended")} />;
  if (phase === "active_audio")  return <AudioCallScreen otherUser={otherUser} localStream={localStream} remoteStream={remoteStream} onHangUp={() => hangUp("ended")} />;
  if (phase === "active_video")  return <VideoCallScreen otherUser={otherUser} localStream={localStream} remoteStream={remoteStream} onHangUp={() => hangUp("ended")} />;
  return null;
}
