import { useState } from "react";
import { T, PT, CSS, WesternBarBG, CowboySprite } from "./shared.jsx";
import SoloGame from "./SoloGame.jsx";
import OnlineGame from "./OnlineGame.jsx";

export default function App() {
  const [mode, setMode] = useState(null); // null | "solo" | "online"

  if (mode === "solo") return <SoloGame onBackToMenu={() => setMode(null)} />;
  if (mode === "online") return <OnlineGame onBackToMenu={() => setMode(null)} />;

  // ─── Mode selection ────────────────────────────────────────────────────
  return (
    <div style={{ width: "100%", height: "100vh", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Pirata One',serif", color: T.text, gap: 16 }}>
      <style>{CSS}</style>
      <WesternBarBG />

      <div style={{ zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 22, color: T.goldDim, letterSpacing: 8 }}>★ ★ ★</div>
        <h1 style={{ fontSize: 64, color: T.redBright, textShadow: `4px 4px 0 #000, 0 0 24px ${T.redBright}30`, letterSpacing: 6, fontFamily: "'Pirata One',serif" }}>Liar's Shot</h1>
        <div style={{ fontSize: 11, color: T.goldDim, letterSpacing: 4, fontFamily: "'Press Start 2P'" }}>JEU DU MENTEUR</div>

        <div style={{ display: "flex", gap: 24, margin: "18px 0" }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ textAlign: "center", animation: `floatIdle ${2 + i * 0.4}s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }}>
              <CowboySprite playerIdx={i} size={68} />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
          <button
            onClick={() => setMode("solo")}
            style={{
              fontFamily: "'Pirata One',serif",
              fontSize: 28,
              padding: "16px 44px",
              background: `linear-gradient(135deg,${T.rim},${T.rimLight})`,
              color: T.goldBright,
              border: `2px solid ${T.gold}`,
              cursor: "pointer",
              borderRadius: 4,
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              textShadow: `1px 1px 0 #000`,
              letterSpacing: 3,
              transition: "transform 0.15s",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            🤠 Solo
            <span style={{ fontSize: 9, color: T.goldDim, fontFamily: "'Press Start 2P'", letterSpacing: 1 }}>vs bots</span>
          </button>

          <button
            onClick={() => setMode("online")}
            style={{
              fontFamily: "'Pirata One',serif",
              fontSize: 28,
              padding: "16px 44px",
              background: `linear-gradient(135deg,#0d2a3a,#1a4a5a)`,
              color: "#48c9b0",
              border: `2px solid #16a08580`,
              cursor: "pointer",
              borderRadius: 4,
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              textShadow: `1px 1px 0 #000`,
              letterSpacing: 3,
              transition: "transform 0.15s",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            🌐 En Ligne
            <span style={{ fontSize: 9, color: "#16a085", fontFamily: "'Press Start 2P'", letterSpacing: 1 }}>2–8 joueurs</span>
          </button>
        </div>

        <div style={{ maxWidth: 380, padding: "12px 20px", border: `1px solid ${T.goldDim}20`, background: "rgba(26,18,8,0.7)", borderRadius: 4, textAlign: "center", fontSize: 13, color: T.textDim, lineHeight: 2.2, marginTop: 8 }}>
          Posez la carte annoncée — ou bluffez.<br />
          Les <span style={{ color: T.goldBright }}>🃏 Jokers</span> = cartes universelles · Si on vous attrape → <span style={{ color: T.redBright }}>roulette russe !</span>
        </div>
      </div>
    </div>
  );
}
