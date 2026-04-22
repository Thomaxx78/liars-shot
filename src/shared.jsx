import { useState, useEffect, useRef } from "react";

export const CARD_TYPES = ["Roi", "Dame", "Valet"];
export const ALL_CARDS = ["Joker", "Roi", "Dame", "Valet"];
export const CARD_LABELS = { Joker: "★", Roi: "K", Dame: "Q", Valet: "J" };
export const CARD_SUITS = { Joker: "★", Roi: "♠", Dame: "♥", Valet: "♦" };
export const CHAMBER_COUNT = 6;

export const T = {
  bg: "#0c0a08",
  table: "#1a5c2a",
  tableDark: "#0d3a18",
  rim: "#3d1e0c",
  rimLight: "#6b3a1a",
  wood: "#2a1a0a",
  woodLight: "#4a3220",
  gold: "#d4a642",
  goldBright: "#f5d070",
  goldDim: "#8a6d2f",
  red: "#c0392b",
  redBright: "#e74c3c",
  text: "#e8dcc8",
  textDim: "#8a7d6a",
  cardFace: "#f5f0e1",
  cardBack: "#1a1520",
};

export const PT = [
  { primary: "#c0392b", light: "#e74c3c", dark: "#8e2b20", skin: "#f0c8a0", hair: "#2c1810", scarf: "#e74c3c", hat: "#3d1e0c" },
  { primary: "#2980b9", light: "#5dade2", dark: "#1a5276", skin: "#d4a574", hair: "#1a1a1a", scarf: "#3498db", hat: "#1a3a4a" },
  { primary: "#27ae60", light: "#52d689", dark: "#1a7a40", skin: "#c68642", hair: "#4a3728", scarf: "#2ecc71", hat: "#2a4a2a" },
  { primary: "#d4a642", light: "#f5d070", dark: "#8a6d2f", skin: "#e8c8a0", hair: "#5a3a1a", scarf: "#e67e22", hat: "#4a3220" },
  { primary: "#8e44ad", light: "#bb8fce", dark: "#6c3483", skin: "#f0c8a0", hair: "#2c1810", scarf: "#9b59b6", hat: "#3d1e4a" },
  { primary: "#16a085", light: "#48c9b0", dark: "#0e6655", skin: "#d4a574", hair: "#1a1a1a", scarf: "#1abc9c", hat: "#0a2a28" },
  { primary: "#e67e22", light: "#f0a500", dark: "#a04000", skin: "#c68642", hair: "#4a3728", scarf: "#f39c12", hat: "#4a2a10" },
  { primary: "#bdc3c7", light: "#ecf0f1", dark: "#7f8c8d", skin: "#e8c8a0", hair: "#5a3a1a", scarf: "#95a5a6", hat: "#4a4a4a" },
];

export const CSS = `
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
  @keyframes bounceArrow{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(5px)}}
  @keyframes deathShake{0%,100%{transform:translate(0,0) rotate(0)}25%{transform:translate(-5px,3px) rotate(-3deg)}75%{transform:translate(5px,-3px) rotate(3deg)}}
  @keyframes cardReveal{0%{transform:scale(0.3) rotateY(90deg);opacity:0}60%{transform:scale(1.1) rotateY(0)}100%{transform:scale(1);opacity:1}}
  @keyframes fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideInLog{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
  @keyframes pulseGlow{0%,100%{box-shadow:0 0 6px rgba(212,166,66,0.2)}50%{box-shadow:0 0 16px rgba(212,166,66,0.5)}}
  @keyframes floatIdle{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
  @keyframes revealFlip{0%{transform:rotateY(90deg) scale(0.8)}100%{transform:rotateY(0) scale(1)}}
  @keyframes popIn{0%{transform:scale(0) translateY(10px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}
  @keyframes cardDrop{0%{transform:translateY(-20px) rotate(10deg);opacity:0}100%{transform:translateY(0) rotate(0);opacity:1}}
  @keyframes screenShake{0%,100%{transform:translate(0,0)}25%{transform:translate(-6px,4px)}50%{transform:translate(4px,-6px)}75%{transform:translate(-4px,-2px)}}
  @keyframes flashPulse{0%{opacity:0.8}100%{opacity:0}}
  @keyframes smokeRise{0%{transform:translateY(0);opacity:0.4}100%{transform:translateY(-40px) scale(2);opacity:0}}
  *{box-sizing:border-box;margin:0;padding:0}
`;

export function createDeck(playerCount) {
  const handSize = playerCount <= 5 ? 4 : 3;
  const total = playerCount * handSize;
  const regularPerType = Math.ceil(total / 4);
  const jokerCount = total - 3 * regularPerType;
  const d = [];
  for (let i = 0; i < regularPerType; i++)
    for (const t of CARD_TYPES)
      d.push({ type: t, id: `${t}_${i}_${Math.random().toString(36).slice(2, 8)}` });
  for (let i = 0; i < jokerCount; i++)
    d.push({ type: "Joker", id: `Joker_${i}_${Math.random().toString(36).slice(2, 8)}` });
  return shuffle(d);
}

export function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export function legit(cards, rc) {
  return cards.every((c) => c.type === rc || c.type === "Joker");
}

// ═══ WESTERN BAR BACKGROUND ═══
export function WesternBarBG() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      <svg width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="wallG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1208" />
            <stop offset="40%" stopColor="#2a1a0c" />
            <stop offset="100%" stopColor="#1a1208" />
          </linearGradient>
          <linearGradient id="floorG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a1a0a" />
            <stop offset="100%" stopColor="#1a1008" />
          </linearGradient>
          <linearGradient id="lampG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5d070" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f5d070" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="lightG" cx="0.5" cy="0" r="0.8">
            <stop offset="0%" stopColor="#f5d070" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#f5d070" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="800" height="400" fill="url(#wallG)" />
        {[0, 80, 160, 240, 320].map((y) => (
          <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="#3a2810" strokeWidth="1" opacity="0.3" />
        ))}
        {[0, 120, 250, 400, 530, 670, 800].map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2="400" stroke="#3a2810" strokeWidth="0.5" opacity="0.15" />
        ))}
        <rect x="60" y="60" width="55" height="70" fill="#d4b896" rx="1" opacity="0.4" />
        <rect x="63" y="63" width="49" height="12" fill="#8a4020" opacity="0.5" />
        <text x="87" y="73" fontSize="7" fill="#f5f0e1" textAnchor="middle" fontFamily="serif" opacity="0.5">WANTED</text>
        <rect x="72" y="80" width="30" height="30" fill="#b8956a" rx="1" opacity="0.3" />
        <text x="87" y="120" fontSize="5" fill="#4a2a10" textAnchor="middle" fontFamily="serif" opacity="0.4">$500</text>
        <rect x="680" y="50" width="55" height="70" fill="#d4b896" rx="1" opacity="0.35" />
        <rect x="683" y="53" width="49" height="12" fill="#8a4020" opacity="0.5" />
        <text x="707" y="63" fontSize="7" fill="#f5f0e1" textAnchor="middle" fontFamily="serif" opacity="0.5">WANTED</text>
        <rect x="692" y="70" width="30" height="30" fill="#b8956a" rx="1" opacity="0.3" />
        <text x="707" y="110" fontSize="5" fill="#4a2a10" textAnchor="middle" fontFamily="serif" opacity="0.4">$1000</text>
        <rect x="280" y="30" width="240" height="8" fill="#4a2a10" opacity="0.6" />
        <rect x="280" y="36" width="240" height="3" fill="#3a1e08" opacity="0.4" />
        {[300, 330, 355, 385, 420, 450, 480].map((x, i) => (
          <g key={i} opacity={0.4 + i * 0.05}>
            <rect x={x} y={8 + (i % 3) * 3} width={8 + (i % 2) * 4} height={22 - (i % 3) * 3} fill={["#2a5a2a", "#5a2a1a", "#8a6a20", "#1a3a5a", "#5a1a3a", "#3a5a2a", "#6a4a10"][i]} rx="1" />
            <rect x={x} y={6 + (i % 3) * 3} width={8 + (i % 2) * 4} height="4" fill={["#2a5a2a", "#5a2a1a", "#8a6a20", "#1a3a5a", "#5a1a3a", "#3a5a2a", "#6a4a10"][i]} rx="2" opacity="0.8" />
          </g>
        ))}
        <line x1="200" y1="0" x2="200" y2="50" stroke="#3a2a1a" strokeWidth="2" opacity="0.5" />
        <rect x="185" y="48" width="30" height="15" fill="#6a4a20" rx="2" opacity="0.6" />
        <rect x="188" y="51" width="24" height="9" fill="#f5d070" rx="1" opacity="0.3" />
        <ellipse cx="200" cy="80" rx="80" ry="60" fill="url(#lampG)" opacity="0.3" />
        <line x1="600" y1="0" x2="600" y2="50" stroke="#3a2a1a" strokeWidth="2" opacity="0.5" />
        <rect x="585" y="48" width="30" height="15" fill="#6a4a20" rx="2" opacity="0.6" />
        <rect x="588" y="51" width="24" height="9" fill="#f5d070" rx="1" opacity="0.3" />
        <ellipse cx="600" cy="80" rx="80" ry="60" fill="url(#lampG)" opacity="0.3" />
        <rect x="0" y="400" width="800" height="200" fill="url(#floorG)" />
        {[0, 100, 210, 340, 460, 580, 700].map((x) => (
          <line key={x} x1={x} y1="400" x2={x} y2="600" stroke="#3a2810" strokeWidth="1" opacity="0.2" />
        ))}
        <ellipse cx="400" cy="100" rx="350" ry="200" fill="url(#lightG)" />
        <g transform="translate(400,100)" opacity="0.25">
          <ellipse cx="0" cy="0" rx="18" ry="14" fill="#d4c8b0" />
          <ellipse cx="-7" cy="-2" rx="5" ry="6" fill="#1a1208" />
          <ellipse cx="7" cy="-2" rx="5" ry="6" fill="#1a1208" />
          <path d="M-18,-8 Q-30,-30 -22,-40 Q-18,-30 -14,-12" fill="#d4c8b0" />
          <path d="M18,-8 Q30,-30 22,-40 Q18,-30 14,-12" fill="#d4c8b0" />
          <rect x="-3" y="8" width="6" height="12" fill="#d4c8b0" rx="2" />
        </g>
      </svg>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />
    </div>
  );
}

// ═══ COWBOY SPRITE ═══
export function CowboySprite({ playerIdx, size = 80, eliminated = false, isCurrent = false, emotion = "neutral" }) {
  const t = PT[playerIdx % PT.length];
  return (
    <div style={{ position: "relative", width: size, height: size * 1.2 }}>
      <svg viewBox="0 0 32 40" width={size} height={size * 1.2} style={{ imageRendering: "pixelated", filter: eliminated ? "saturate(0.15) brightness(0.4)" : "none" }}>
        <ellipse cx="16" cy="38" rx="10" ry="2" fill="rgba(0,0,0,0.3)" />
        <rect x="3" y="4" width="26" height="2" fill={t.hat} />
        <rect x="4" y="3" width="24" height="1" fill={t.hat} />
        <rect x="3" y="6" width="26" height="1" fill={T.gold} />
        <rect x="8" y="0" width="16" height="4" fill={t.hat} />
        <rect x="10" y="1" width="6" height="1" fill="rgba(255,255,255,0.08)" />
        <rect x="9" y="7" width="14" height="12" fill={t.skin} />
        <rect x="7" y="10" width="2" height="4" fill={t.skin} />
        <rect x="23" y="10" width="2" height="4" fill={t.skin} />
        <rect x="11" y="11" width="3" height="2" fill="#fff" />
        <rect x="18" y="11" width="3" height="2" fill="#fff" />
        <rect x="12" y="11" width="2" height="2" fill={eliminated ? "#c0392b" : "#1a1208"} />
        <rect x="19" y="11" width="2" height="2" fill={eliminated ? "#c0392b" : "#1a1208"} />
        <rect x="11" y="10" width="3" height="1" fill={t.hair} />
        <rect x="18" y="10" width="3" height="1" fill={t.hair} />
        <rect x="15" y="13" width="2" height="2" fill={`${t.skin}cc`} />
        {emotion === "smirk" ? (
          <>
            <rect x="13" y="16" width="5" height="1" fill="#8a4030" />
            <rect x="17" y="15" width="2" height="1" fill="#8a4030" />
          </>
        ) : emotion === "shocked" ? (
          <rect x="14" y="15" width="4" height="3" rx="1" fill="#5a2020" />
        ) : (
          <rect x="13" y="16" width="6" height="1" fill="#8a4030" />
        )}
        <rect x="8" y="19" width="16" height="3" fill={t.scarf} />
        <rect x="13" y="22" width="6" height="2" fill={t.scarf} />
        <rect x="15" y="19" width="2" height="1" fill={t.dark} />
        <rect x="6" y="22" width="20" height="12" fill={t.dark} />
        <rect x="12" y="22" width="8" height="10" fill={T.cardFace} />
        <rect x="10" y="22" width="2" height="8" fill={t.primary} />
        <rect x="20" y="22" width="2" height="8" fill={t.primary} />
        <rect x="6" y="30" width="20" height="2" fill="#1a1208" />
        <rect x="14" y="30" width="4" height="2" fill={T.gold} />
        <rect x="4" y="23" width="2" height="8" fill={t.dark} />
        <rect x="26" y="23" width="2" height="8" fill={t.dark} />
        <rect x="4" y="31" width="2" height="2" fill={t.skin} />
        <rect x="26" y="31" width="2" height="2" fill={t.skin} />
        <rect x="8" y="34" width="6" height="4" fill="#2a1a0a" />
        <rect x="18" y="34" width="6" height="4" fill="#2a1a0a" />
        <rect x="6" y="36" width="2" height="1" fill={T.gold} />
        <rect x="24" y="36" width="2" height="1" fill={T.gold} />
        {eliminated && (
          <>
            <rect x="11" y="11" width="1" height="1" fill="#c0392b" />
            <rect x="13" y="11" width="1" height="1" fill="#c0392b" />
            <rect x="12" y="12" width="1" height="1" fill="#c0392b" />
            <rect x="18" y="11" width="1" height="1" fill="#c0392b" />
            <rect x="20" y="11" width="1" height="1" fill="#c0392b" />
            <rect x="19" y="12" width="1" height="1" fill="#c0392b" />
          </>
        )}
      </svg>
      {isCurrent && !eliminated && (
        <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", fontSize: 14, color: T.gold, animation: "bounceArrow 1s ease-in-out infinite", textShadow: `0 0 6px ${T.goldBright}60` }}>▼</div>
      )}
    </div>
  );
}

// ═══ CARD ═══
export function GameCard({ type, faceUp = true, selected = false, onClick, small = false, highlight = false, style: es = {} }) {
  const w = small ? 38 : 54, h = w * 1.45, isJoker = type === "Joker";
  const color = type === "Dame" || type === "Valet" ? T.redBright : isJoker ? T.goldBright : "#2a2218";
  return (
    <div onClick={onClick} style={{ width: w, height: h, borderRadius: 3, position: "relative", cursor: onClick ? "pointer" : "default", transform: selected ? "translateY(-10px) scale(1.06)" : "none", transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s", userSelect: "none", ...es }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 3, boxShadow: selected ? `0 8px 20px rgba(0,0,0,0.5), 0 0 12px ${T.goldBright}40, inset 0 0 0 2px ${T.goldBright}` : highlight ? `0 3px 8px rgba(0,0,0,0.4), 0 0 6px #2ecc7130, inset 0 0 0 1.5px #2ecc7180` : "0 2px 6px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.06)" }} />
      {faceUp ? (
        <div style={{ width: "100%", height: "100%", borderRadius: 3, background: isJoker ? `linear-gradient(135deg,#1a1520,#2a1a35,#1a1520)` : `linear-gradient(160deg,${T.cardFace},#ece4d0)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Pirata One',serif", overflow: "hidden", position: "relative", border: isJoker ? `1px solid ${T.goldBright}60` : "none" }}>
          <span style={{ position: "absolute", top: 2, left: 3, fontSize: small ? 8 : 10, color, fontFamily: "'Press Start 2P',monospace" }}>{isJoker ? "J" : CARD_LABELS[type]}</span>
          <span style={{ position: "absolute", top: small ? 11 : 13, left: 3, fontSize: small ? 6 : 8, color, opacity: 0.7 }}>{isJoker ? "K" : CARD_SUITS[type]}</span>
          <span style={{ fontSize: small ? 18 : 26, color, textShadow: isJoker ? `0 0 12px ${T.goldBright}80` : "none" }}>{isJoker ? "🃏" : CARD_SUITS[type]}</span>
          {isJoker && <span style={{ fontSize: small ? 5 : 6, color: T.goldBright, fontFamily: "'Press Start 2P',monospace", marginTop: 2, textShadow: `0 0 6px ${T.goldBright}60` }}>JOKER</span>}
          <span style={{ position: "absolute", bottom: 2, right: 3, fontSize: small ? 8 : 10, color, fontFamily: "'Press Start 2P',monospace", transform: "rotate(180deg)" }}>{isJoker ? "J" : CARD_LABELS[type]}</span>
        </div>
      ) : (
        <div style={{ width: "100%", height: "100%", borderRadius: 3, background: "linear-gradient(145deg,#1a1520,#120e18)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <div style={{ width: "82%", height: "85%", borderRadius: 2, border: `1px solid ${T.goldDim}50`, background: `repeating-conic-gradient(#1a1520 0% 25%,#1e1828 0% 50%) 50%/6px 6px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: small ? 8 : 12, color: T.goldDim, opacity: 0.5 }}>♠</div>
        </div>
      )}
    </div>
  );
}

// ═══ PLAY INDICATOR ═══
export function PlayIndicator({ playerIdx, count, visible, name }) {
  if (!visible) return null;
  const t = PT[playerIdx % PT.length];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", background: "rgba(0,0,0,0.75)", border: `1px solid ${t.primary}60`, borderRadius: 20, animation: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 8px ${t.primary}20` }}>
      <span style={{ fontSize: 8, color: t.primary, fontFamily: "'Press Start 2P',monospace", fontWeight: "bold" }}>{name}</span>
      <div style={{ display: "flex", gap: 3 }}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} style={{ width: 20, height: 28, borderRadius: 2, background: "linear-gradient(145deg,#1a1520,#120e18)", border: `1px solid ${T.goldDim}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: T.goldDim, animation: `cardDrop 0.3s ease-out ${i * 0.1}s both` }}>?</div>
        ))}
      </div>
      <span style={{ fontSize: 10, color: T.text, fontFamily: "'Press Start 2P',monospace" }}>×{count}</span>
    </div>
  );
}

// ═══ TABLE PILE ═══
export function TablePile({ cards, roundCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      {roundCard && (
        <div style={{ fontFamily: "'Pirata One',serif", fontSize: 13, color: T.goldBright, background: "rgba(0,0,0,0.5)", padding: "3px 12px", borderRadius: 3, border: `1px solid ${T.goldDim}50`, letterSpacing: 2, textShadow: `0 0 6px ${T.goldBright}40` }}>★ {roundCard} ★</div>
      )}
      <div style={{ position: "relative", width: 45, height: 65 }}>
        {cards.slice(-6).map((c, i) => (
          <div key={c.id + i} style={{ position: "absolute", top: i * 1, left: i * 2, transform: `rotate(${(i - 2.5) * 7}deg)` }}>
            <GameCard type={c.type} faceUp={false} small />
          </div>
        ))}
      </div>
      {cards.length > 0 && <span style={{ fontFamily: "'Press Start 2P'", fontSize: 6, color: T.textDim }}>{cards.length}</span>}
    </div>
  );
}

// ═══ WESTERN ANNOUNCEMENT ═══
export function WesternAnnouncement({ onComplete, card: forcedCard }) {
  const [phase, setPhase] = useState("intro");
  const [spinIdx, setSpinIdx] = useState(0);
  const [chosen, setChosen] = useState(null);
  const target = useRef(forcedCard || CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)]);

  useEffect(() => {
    setTimeout(() => setPhase("spinning"), 500);
    let tick = 0, speed = 100;
    const spin = () => {
      tick++;
      setSpinIdx((p) => (p + 1) % CARD_TYPES.length);
      if (tick < 12) setTimeout(spin, speed);
      else if (tick < 18) { speed += 50; setTimeout(spin, speed); }
      else if (tick < 22) { speed += 100; setTimeout(spin, speed); }
      else { setPhase("reveal"); setChosen(target.current); }
    };
    setTimeout(spin, 600);
    const t = setTimeout(() => onComplete(target.current), 3800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 80, background: "rgba(6,4,2,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Pirata One',serif", backdropFilter: "blur(3px)" }}>
      <div style={{ width: 200, height: 1, background: `linear-gradient(90deg,transparent,${T.goldDim},transparent)`, marginBottom: 12 }} />
      <div style={{ fontSize: 12, color: T.goldDim, letterSpacing: 6, fontFamily: "'Press Start 2P'", marginBottom: 16, textShadow: `0 0 8px ${T.goldDim}40` }}>NOUVEAU ROUND</div>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 20, minHeight: 100 }}>
        {phase === "reveal" && chosen ? (
          <div style={{ animation: "cardReveal 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <div style={{ padding: 10, border: `2px solid ${T.goldBright}`, borderRadius: 6, boxShadow: `0 0 40px ${T.goldBright}30`, background: `radial-gradient(circle,${T.goldBright}08,transparent 70%)` }}>
              <GameCard type={chosen} faceUp />
            </div>
          </div>
        ) : (
          CARD_TYPES.map((type, i) => (
            <div key={type} style={{ transform: i === spinIdx % CARD_TYPES.length ? "scale(1.25)" : "scale(0.75)", opacity: i === spinIdx % CARD_TYPES.length ? 1 : 0.2, transition: "transform 0.08s,opacity 0.08s" }}>
              <GameCard type={type} faceUp small />
            </div>
          ))
        )}
      </div>
      {phase === "reveal" && (
        <div style={{ textAlign: "center", animation: "fadeInUp 0.4s ease-out" }}>
          <div style={{ fontSize: 28, color: T.goldBright, textShadow: `0 0 12px ${T.goldBright}50,2px 2px 0 #000`, letterSpacing: 4 }}>{chosen?.toUpperCase()}</div>
          <div style={{ fontSize: 7, color: T.textDim, marginTop: 8, fontFamily: "'Press Start 2P'" }}>Posez des {chosen}s ou bluffez !</div>
          <div style={{ fontSize: 7, color: T.goldDim, marginTop: 5, fontFamily: "'Press Start 2P'" }}>🃏 Joker = Carte universelle</div>
        </div>
      )}
      <div style={{ width: 200, height: 1, background: `linear-gradient(90deg,transparent,${T.goldDim},transparent)`, marginTop: 14 }} />
    </div>
  );
}

// ═══ REVOLVER ANIMATION ═══
export function RevolverAnimation({ playerIdx, onComplete, hit, spentChambers, playerName }) {
  const [phase, setPhase] = useState("pickup");
  const [cylAngle, setCylAngle] = useState(0);
  const [result, setResult] = useState(null);
  const [muzzleFlash, setMuzzleFlash] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const spinRef = useRef(null);
  const remaining = CHAMBER_COUNT - spentChambers;
  const visualBulletPos = useRef(hit ? 0 : remaining > 1 ? 1 + Math.floor(Math.random() * (remaining - 1)) : 0).current;
  const t = PT[playerIdx % PT.length];

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("spin"), 1000);
    let angle = 0, speed = 25;
    const t2 = setTimeout(() => {
      spinRef.current = setInterval(() => { angle += speed; setCylAngle(angle); }, 30);
    }, 1000);
    const t3 = setTimeout(() => {
      clearInterval(spinRef.current);
      setPhase("slowdown");
      speed = 25;
      const slowDown = () => {
        speed *= 0.92; angle += speed; setCylAngle(angle);
        if (speed > 0.5) { spinRef.current = setTimeout(slowDown, 40); }
        else { setPhase("aim"); }
      };
      slowDown();
    }, 2800);
    const t4 = setTimeout(() => setPhase("fire"), 4400);
    const t5 = setTimeout(() => {
      if (hit) {
        setMuzzleFlash(true); setScreenShake(true);
        setTimeout(() => setMuzzleFlash(false), 200);
        setTimeout(() => setScreenShake(false), 500);
      }
      setResult(hit ? "dead" : "alive");
      setPhase("result");
    }, 4800);
    const t6 = setTimeout(() => onComplete(hit), 6600);
    return () => {
      [t1, t2, t3, t4, t5, t6].forEach(clearTimeout);
      clearInterval(spinRef.current);
      clearTimeout(spinRef.current);
    };
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 100, background: "rgba(2,1,0,0.95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Pirata One',serif", animation: screenShake ? "screenShake 0.1s infinite" : "none" }}>
      {muzzleFlash && <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 40%,rgba(255,200,50,0.4),transparent 60%)", zIndex: 110, animation: "flashPulse 0.15s" }} />}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle,transparent 25%,rgba(0,0,0,0.7) 100%)", pointerEvents: "none" }} />
      <div style={{ marginBottom: 12, animation: result === "dead" ? "deathShake 0.12s infinite" : "none", filter: result === "dead" ? "brightness(0.6) saturate(0.5)" : "none", transition: "filter 0.3s" }}>
        <CowboySprite playerIdx={playerIdx} size={80} eliminated={result === "dead"} emotion={phase === "aim" ? "shocked" : result === "alive" ? "smirk" : "neutral"} />
      </div>
      <div style={{ fontSize: 13, color: t.primary, fontFamily: "'Press Start 2P',monospace", marginBottom: 14, textShadow: "1px 1px 0 #000" }}>{playerName}</div>
      <div style={{ position: "relative", width: 200, height: 140, marginBottom: 10 }}>
        <svg viewBox="0 0 200 140" width={200} height={140}>
          <rect x="100" y="50" width="90" height="16" rx="3" fill="#3a3a3a" />
          <rect x="100" y="52" width="90" height="4" fill="#4a4a4a" />
          <rect x="180" y="53" width="18" height="10" rx="2" fill="#2a2a2a" />
          <circle cx="198" cy="58" r="4" fill="#1a1a1a" />
          <path d="M100,66 L95,110 Q93,118 100,120 L115,120 Q120,118 118,110 L110,66" fill="#5a3a1a" />
          <path d="M102,70 L98,108 Q96,114 102,116 L112,116 Q116,114 114,108 L110,70" fill="#6a4a2a" />
          <path d="M105,66 Q100,80 105,90 L115,90 Q120,80 115,66" fill="none" stroke="#3a3a3a" strokeWidth="2" />
          <rect x="108" y="72" width="3" height="12" rx="1" fill="#2a2a2a" />
          <rect x="98" y="42" width="8" height="12" rx="2" fill="#3a3a3a" style={{ transformOrigin: "102px 54px", transform: phase === "fire" ? "rotate(-30deg)" : "none", transition: "transform 0.1s" }} />
          <g transform="translate(90,58)">
            <circle cx="0" cy="0" r="22" fill="#4a4a4a" stroke="#3a3a3a" strokeWidth="2" />
            <circle cx="0" cy="0" r="20" fill="#555" />
            <g style={{ transform: `rotate(${cylAngle}deg)`, transformOrigin: "0px 0px" }}>
              {Array.from({ length: remaining }, (_, i) => {
                const a = (i * (360 / remaining) * Math.PI) / 180;
                const cx = Math.cos(a) * 13, cy = Math.sin(a) * 13;
                const isBullet = i === visualBulletPos;
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r={5} fill="#1a1a1a" stroke="#333" strokeWidth="0.5" />
                    {isBullet && phase === "result" && <circle cx={cx} cy={cy} r={3.5} fill={result === "dead" ? "#c0392b" : "#8a6d2f"} />}
                    {isBullet && phase !== "result" && <circle cx={cx} cy={cy} r={3.5} fill="#8a6d2f" />}
                    {!isBullet && <circle cx={cx} cy={cy} r={2} fill="#222" />}
                  </g>
                );
              })}
            </g>
            <circle cx="0" cy="0" r="3" fill="#3a3a3a" />
            <circle cx="0" cy="0" r="1.5" fill="#4a4a4a" />
          </g>
          {muzzleFlash && (
            <g>
              <polygon points="198,58 230,48 225,57 240,58 225,59 230,68" fill="#ffcc00" opacity="0.9" />
              <polygon points="198,58 220,52 218,57 228,58 218,59 220,64" fill="#fff" opacity="0.7" />
            </g>
          )}
          {result === "dead" && !muzzleFlash && (
            <g opacity="0.4">
              <circle cx="200" cy="52" r="6" fill="#888" style={{ animation: "smokeRise 2s forwards" }} />
              <circle cx="205" cy="48" r="4" fill="#999" style={{ animation: "smokeRise 2s 0.2s forwards" }} />
              <circle cx="195" cy="50" r="5" fill="#777" style={{ animation: "smokeRise 2s 0.4s forwards" }} />
            </g>
          )}
        </svg>
      </div>
      <div style={{ minHeight: 50, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        {phase === "pickup" && <span style={{ fontSize: 10, color: T.textDim, fontFamily: "'Press Start 2P'", animation: "blink 0.8s infinite" }}>Prend le revolver...</span>}
        {(phase === "spin" || phase === "slowdown") && (
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 11, color: T.goldBright, fontFamily: "'Press Start 2P'" }}>Le barillet tourne...</span>
            <div style={{ fontSize: 20, marginTop: 6, animation: "blink 0.3s infinite" }}>🎰</div>
          </div>
        )}
        {phase === "aim" && <span style={{ fontSize: 12, color: T.redBright, fontFamily: "'Press Start 2P'", animation: "blink 0.4s infinite", textShadow: `0 0 10px ${T.redBright}` }}>. . .</span>}
        {phase === "fire" && <span style={{ fontSize: 16, color: "#fff", fontFamily: "'Press Start 2P'", animation: "blink 0.1s infinite" }}>*CLIC*</span>}
        {phase === "result" && result === "dead" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 26, color: T.redBright, textShadow: `0 0 20px ${T.redBright},3px 3px 0 #000`, fontFamily: "'Press Start 2P'", animation: "deathShake 0.15s infinite" }}>💥 BANG !</div>
            <div style={{ fontSize: 11, color: T.redBright, marginTop: 8, fontFamily: "'Press Start 2P'" }}>ÉLIMINÉ</div>
          </div>
        )}
        {phase === "result" && result === "alive" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, color: T.textDim, fontFamily: "'Press Start 2P'" }}>*clic*</div>
            <div style={{ fontSize: 11, color: "#2ecc71", marginTop: 6, fontFamily: "'Press Start 2P'", textShadow: "0 0 8px #2ecc7160" }}>Sauvé... cette fois.</div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 12, alignItems: "center" }}>
        {Array.from({ length: spentChambers }, (_, i) => (
          <div key={`s${i}`} style={{ width: 14, height: 14, borderRadius: "50%", border: `1px solid ${T.textDim}30`, background: `${T.textDim}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6, color: T.textDim }}>○</div>
        ))}
        {spentChambers > 0 && <div style={{ width: 1, height: 14, background: `${T.textDim}30`, margin: "0 2px" }} />}
        {Array.from({ length: remaining }, (_, i) => (
          <div key={`r${i}`} style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${i === 0 && phase === "result" ? (result === "dead" ? T.redBright : "#2ecc71") : `${T.textDim}40`}`, background: i === 0 && phase === "result" ? (result === "dead" ? T.redBright : "#2ecc71") : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: "#fff", boxShadow: i === 0 && phase === "result" && result === "dead" ? `0 0 10px ${T.redBright}` : "none", transition: "all 0.3s" }}>
            {i === 0 && phase === "result" && result === "dead" ? "●" : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
