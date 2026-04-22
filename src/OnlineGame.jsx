import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import {
  T, PT, CHAMBER_COUNT, CSS,
  WesternBarBG, CowboySprite, GameCard, PlayIndicator,
  TablePile, WesternAnnouncement, RevolverAnimation,
} from "./shared.jsx";

const EMOTES = ["😏", "🤔", "😂", "💀", "🔥", "😱", "👀", "🤡"];

// positions around table for N players (self always at angle π/2 = top)
function playerPosition(displayIdx, total, radius = 290) {
  const angle = Math.PI / 2 - (displayIdx * 2 * Math.PI) / total;
  return { cx: Math.cos(angle) * radius, cy: -Math.sin(angle) * radius };
}

export default function OnlineGame({ onBackToMenu }) {
  const socketRef = useRef(null);
  const [screen, setScreen] = useState("lobby"); // lobby | waiting | game | gameover
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null); // { roomId, code, isHost }
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [myIdx, setMyIdx] = useState(null);

  // game state (mirrors server publicState)
  const [players, setPlayers] = useState([]);
  const [myHand, setMyHand] = useState([]);
  const [cp, setCp] = useState(0);
  const [pile, setPile] = useState([]);
  const [roundCard, setRoundCard] = useState(null);
  const [lastP, setLastP] = useState(null);
  const [log, setLog] = useState([]);
  const [sel, setSel] = useState([]);
  const [showAnn, setShowAnn] = useState(false);
  const [annCard, setAnnCard] = useState(null);
  const [revealed, setRevealed] = useState(null);
  const [playInd, setPlayInd] = useState(null);
  const [rouletteInfo, setRouletteInfo] = useState(null); // { playerIdx, spentChambers, hit }
  const [emotes, setEmotes] = useState([]);
  const [showEm, setShowEm] = useState(false);
  const [winner, setWinner] = useState(null); // { idx, name }
  const myIdxRef = useRef(null);

  // keep ref in sync for use in socket callbacks
  useEffect(() => { myIdxRef.current = myIdx; }, [myIdx]);

  const applyPublicState = useCallback((ps) => {
    if (!ps) return;
    setPlayers(ps.players || []);
    setCp(ps.cp ?? 0);
    setPile(ps.pile || []);
    setRoundCard(ps.roundCard || null);
    setLastP(ps.lastP ?? null);
    setLog(ps.log || []);
  }, []);

  const addEmote = useCallback((playerIdx, emote) => {
    const id = Date.now() + playerIdx + Math.random();
    setEmotes((p) => [...p, { id, player: playerIdx, emote }]);
    setTimeout(() => setEmotes((p) => p.filter((x) => x.id !== id)), 2200);
  }, []);

  // ─── Socket connection ───────────────────────────────────────────────────
  useEffect(() => {
    const socket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("room_update", ({ roomId, code: c, myIdx: mi, players: pl, isHost }) => {
      setMyIdx(mi);
      setRoomInfo({ roomId, code: c, isHost });
      setLobbyPlayers(pl);
      setScreen("waiting");
      setError(null);
    });

    socket.on("game_start", ({ yourHand, yourIdx, publicState: ps, roundCard: rc }) => {
      setMyIdx(yourIdx);
      myIdxRef.current = yourIdx;
      setMyHand(yourHand);
      applyPublicState(ps);
      setSel([]);
      setRevealed(null);
      setPlayInd(null);
      setRouletteInfo(null);
      setWinner(null);
      setAnnCard(rc);
      setScreen("game");
      setTimeout(() => setShowAnn(true), 500);
    });

    socket.on("player_played", ({ playerIdx, count, publicState: ps }) => {
      applyPublicState(ps);
      setPlayInd({ playerIdx, count });
      setRevealed(null);
    });

    socket.on("turn_change", ({ cp: nextCp, publicState: ps }) => {
      applyPublicState(ps);
      setSel([]);
    });

    socket.on("liar_called", ({ callerIdx, targetIdx, revealedCards, honest, publicState: ps }) => {
      applyPublicState(ps);
      setRevealed({ cards: revealedCards, playerIdx: targetIdx });
      setPlayInd(null);
      setTimeout(() => setRevealed(null), 2500);
    });

    socket.on("roulette_start", ({ playerIdx, spentChambers, hit }) => {
      setRouletteInfo({ playerIdx, spentChambers, hit });
    });

    socket.on("roulette_result", ({ playerIdx, died, publicState: ps }) => {
      applyPublicState(ps);
    });

    socket.on("round_start", ({ yourHand, roundCard: rc, publicState: ps }) => {
      setMyHand(yourHand);
      applyPublicState(ps);
      setSel([]);
      setRevealed(null);
      setPlayInd(null);
      setRouletteInfo(null);
      setAnnCard(rc);
      setTimeout(() => setShowAnn(true), 700);
    });

    socket.on("game_over", ({ winnerIdx, winnerName }) => {
      setWinner({ idx: winnerIdx, name: winnerName });
      setRouletteInfo(null);
      setScreen("gameover");
    });

    socket.on("player_disconnected", ({ name: n, playerIdx, publicState: ps }) => {
      applyPublicState(ps);
    });

    socket.on("player_emote", ({ playerIdx, emote }) => {
      addEmote(playerIdx, emote);
    });

    socket.on("error", ({ message }) => {
      setError(message);
    });

    return () => socket.disconnect();
  }, []);

  // ─── Actions ─────────────────────────────────────────────────────────────
  const createRoom = () => {
    if (!name.trim()) { setError("Entre ton nom."); return; }
    setError(null);
    socketRef.current.emit("create_room", { name: name.trim() });
  };

  const joinRoom = () => {
    if (!name.trim()) { setError("Entre ton nom."); return; }
    if (!code.trim() || code.trim().length !== 4) { setError("Code à 4 caractères."); return; }
    setError(null);
    socketRef.current.emit("join_room", { name: name.trim(), code: code.trim() });
  };

  const startGame = () => {
    socketRef.current.emit("start_game", { roomId: roomInfo.roomId });
  };

  const playCards = () => {
    if (sel.length === 0 || sel.length > 3) return;
    socketRef.current.emit("play_cards", { roomId: roomInfo.roomId, cardIndices: sel });
    setMyHand((h) => h.filter((_, i) => !sel.includes(i)));
    setSel([]);
  };

  const callLiar = () => {
    socketRef.current.emit("call_liar", { roomId: roomInfo.roomId });
  };

  const sendEmote = (e) => {
    socketRef.current.emit("emote", { roomId: roomInfo.roomId, emote: e });
    addEmote(myIdxRef.current, e);
    setShowEm(false);
  };

  const requestRematch = () => {
    socketRef.current.emit("request_rematch", { roomId: roomInfo.roomId });
  };

  const annDone = (card) => {
    setShowAnn(false);
  };

  const rouletteDone = () => {
    setRouletteInfo(null);
  };

  const toggle = (i) => {
    if (cp !== myIdx) return;
    setSel((p) => { if (p.includes(i)) return p.filter((x) => x !== i); if (p.length >= 3) return p; return [...p, i]; });
  };

  const isMyTurn = cp === myIdx && players[myIdx]?.alive;
  const canLiar = isMyTurn && lastP !== null && lastP !== myIdx && pile.length > 0;
  const N = players.length || 1;

  // ─── LOBBY ───────────────────────────────────────────────────────────────
  if (screen === "lobby") {
    return (
      <div style={{ width: "100%", height: "100vh", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Pirata One',serif", color: T.text, gap: 12 }}>
        <style>{CSS}</style>
        <WesternBarBG />
        <div style={{ zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: 300 }}>
          <div style={{ fontSize: 18, color: T.goldDim, letterSpacing: 6 }}>★ ★ ★</div>
          <h1 style={{ fontSize: 36, color: T.redBright, textShadow: `3px 3px 0 #000`, letterSpacing: 4 }}>Liar's Shot</h1>
          <div style={{ fontSize: 8, color: T.goldDim, letterSpacing: 4, fontFamily: "'Press Start 2P'" }}>MULTIJOUEUR EN LIGNE</div>

          <input
            placeholder="Ton nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
            style={{ width: "100%", padding: "10px 14px", background: "rgba(26,18,8,0.9)", border: `1px solid ${T.goldDim}60`, borderRadius: 3, color: T.text, fontFamily: "'Press Start 2P'", fontSize: 10, outline: "none" }}
          />

          <div style={{ width: "100%", height: 1, background: `linear-gradient(90deg,transparent,${T.goldDim}40,transparent)` }} />

          <button onClick={createRoom} style={{ width: "100%", fontFamily: "'Pirata One'", fontSize: 20, padding: "10px 0", background: `linear-gradient(135deg,${T.rim},${T.rimLight})`, color: T.goldBright, border: `2px solid ${T.gold}`, cursor: "pointer", borderRadius: 4, letterSpacing: 3, transition: "transform 0.15s" }} onMouseEnter={(e) => (e.target.style.transform = "scale(1.03)")} onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}>
            + Créer une room
          </button>

          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <input
              placeholder="Code (ex: WXYZ)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
              maxLength={4}
              style={{ flex: 1, padding: "10px 12px", background: "rgba(26,18,8,0.9)", border: `1px solid ${T.goldDim}60`, borderRadius: 3, color: T.text, fontFamily: "'Press Start 2P'", fontSize: 10, outline: "none", textTransform: "uppercase" }}
            />
            <button onClick={joinRoom} style={{ padding: "10px 16px", fontFamily: "'Pirata One'", fontSize: 18, background: "rgba(26,18,8,0.9)", color: T.text, border: `1px solid ${T.goldDim}40`, cursor: "pointer", borderRadius: 3, letterSpacing: 2 }}>
              Rejoindre
            </button>
          </div>

          {error && <div style={{ fontSize: 8, color: T.redBright, fontFamily: "'Press Start 2P'", textAlign: "center" }}>{error}</div>}

          <button onClick={onBackToMenu} style={{ fontFamily: "'Press Start 2P'", fontSize: 7, padding: "8px 16px", background: "transparent", color: T.textDim, border: `1px solid ${T.textDim}30`, cursor: "pointer", borderRadius: 2, marginTop: 4 }}>
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  // ─── WAITING ROOM ────────────────────────────────────────────────────────
  if (screen === "waiting") {
    return (
      <div style={{ width: "100%", height: "100vh", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Pirata One',serif", color: T.text, gap: 14 }}>
        <style>{CSS}</style>
        <WesternBarBG />
        <div style={{ zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, minWidth: 280 }}>
          <div style={{ fontSize: 10, color: T.goldDim, fontFamily: "'Press Start 2P'", letterSpacing: 3 }}>ROOM</div>
          <div style={{ fontSize: 42, color: T.goldBright, fontFamily: "'Press Start 2P'", textShadow: `0 0 20px ${T.goldBright}50,3px 3px 0 #000`, letterSpacing: 8 }}>{roomInfo?.code}</div>
          <div style={{ fontSize: 7, color: T.textDim, fontFamily: "'Press Start 2P'" }}>Partage ce code à tes amis</div>

          <div style={{ width: "100%", maxWidth: 320, padding: "12px 16px", background: "rgba(26,18,8,0.85)", border: `1px solid ${T.goldDim}30`, borderRadius: 4 }}>
            <div style={{ fontSize: 7, color: T.goldDim, fontFamily: "'Press Start 2P'", marginBottom: 10 }}>JOUEURS ({lobbyPlayers.length}/8)</div>
            {lobbyPlayers.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: i < lobbyPlayers.length - 1 ? `1px solid ${T.goldDim}15` : "none" }}>
                <CowboySprite playerIdx={p.colorIdx} size={28} />
                <span style={{ fontSize: 9, color: PT[p.colorIdx % PT.length].primary, fontFamily: "'Press Start 2P'" }}>{p.name}</span>
                {i === myIdx && <span style={{ fontSize: 7, color: T.goldDim, fontFamily: "'Press Start 2P'" }}>(toi)</span>}
                {i === 0 && <span style={{ fontSize: 7, color: T.goldBright, fontFamily: "'Press Start 2P'", marginLeft: "auto" }}>★ hôte</span>}
              </div>
            ))}
          </div>

          {error && <div style={{ fontSize: 8, color: T.redBright, fontFamily: "'Press Start 2P'" }}>{error}</div>}

          {roomInfo?.isHost ? (
            <button
              onClick={startGame}
              disabled={lobbyPlayers.length < 2}
              style={{ fontFamily: "'Pirata One'", fontSize: 22, padding: "10px 36px", background: lobbyPlayers.length >= 2 ? `linear-gradient(135deg,${T.rim},${T.rimLight})` : "rgba(26,18,8,0.5)", color: lobbyPlayers.length >= 2 ? T.goldBright : T.textDim, border: `2px solid ${lobbyPlayers.length >= 2 ? T.gold : T.textDim + "30"}`, cursor: lobbyPlayers.length >= 2 ? "pointer" : "not-allowed", borderRadius: 4, letterSpacing: 3 }}
            >
              ▶ Lancer ({lobbyPlayers.length}/8)
            </button>
          ) : (
            <div style={{ fontSize: 8, color: T.textDim, fontFamily: "'Press Start 2P'", animation: "blink 1.2s infinite" }}>En attente du lancement...</div>
          )}

          <button onClick={onBackToMenu} style={{ fontFamily: "'Press Start 2P'", fontSize: 7, padding: "6px 14px", background: "transparent", color: T.textDim, border: `1px solid ${T.textDim}30`, cursor: "pointer", borderRadius: 2 }}>
            ← Quitter
          </button>
        </div>
      </div>
    );
  }

  // ─── GAME OVER ───────────────────────────────────────────────────────────
  if (screen === "gameover" && winner) {
    const isWinner = winner.idx === myIdx;
    const wColorIdx = players[winner.idx]?.colorIdx ?? winner.idx;
    return (
      <div style={{ width: "100%", height: "100vh", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Pirata One',serif", color: T.text, gap: 12 }}>
        <style>{CSS}</style>
        <WesternBarBG />
        <div style={{ zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 16, color: T.goldDim, letterSpacing: 6 }}>★ ★ ★</div>
          <div style={{ fontSize: 28, color: isWinner ? T.goldBright : T.redBright, textShadow: "3px 3px 0 #000", letterSpacing: 4 }}>{isWinner ? "VICTOIRE !" : "GAME OVER"}</div>
          <div style={{ animation: "floatIdle 2s ease-in-out infinite" }}>
            <CowboySprite playerIdx={wColorIdx} size={100} emotion="smirk" />
          </div>
          <div style={{ fontSize: 14, color: PT[wColorIdx % PT.length].primary, fontFamily: "'Press Start 2P'" }}>{winner.name} gagne !</div>
          <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
            {roomInfo?.isHost && (
              <button onClick={requestRematch} style={{ fontFamily: "'Pirata One'", fontSize: 20, padding: "10px 30px", background: `linear-gradient(135deg,${T.rim},${T.rimLight})`, color: T.goldBright, border: `2px solid ${T.gold}`, cursor: "pointer", borderRadius: 4, letterSpacing: 2 }}>Rejouer</button>
            )}
            <button onClick={onBackToMenu} style={{ fontFamily: "'Press Start 2P'", fontSize: 8, padding: "10px 16px", background: "transparent", color: T.textDim, border: `1px solid ${T.textDim}40`, cursor: "pointer", borderRadius: 2 }}>Menu</button>
          </div>
          {!roomInfo?.isHost && <div style={{ fontSize: 7, color: T.textDim, fontFamily: "'Press Start 2P'" }}>En attente de l'hôte...</div>}
        </div>
      </div>
    );
  }

  // ─── GAME ────────────────────────────────────────────────────────────────
  // Reorder players so self is at display index 0
  const displayPlayers = players.map((p, serverIdx) => ({
    ...p,
    serverIdx,
    displayIdx: ((serverIdx - myIdx) % N + N) % N,
  })).sort((a, b) => a.displayIdx - b.displayIdx);

  return (
    <div style={{ width: "100%", height: "100vh", minHeight: 700, fontFamily: "'Pirata One',serif", color: T.text, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <style>{CSS}</style>
      <WesternBarBG />

      {/* Top bar */}
      <div style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(26,18,8,0.8)", borderBottom: `1px solid ${T.goldDim}15`, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, color: T.goldDim, fontFamily: "'Press Start 2P'", letterSpacing: 1 }}>{roomInfo?.code}</span>
          <button onClick={onBackToMenu} style={{ fontFamily: "'Press Start 2P'", fontSize: 6, padding: "4px 8px", background: "transparent", color: T.textDim, border: `1px solid ${T.textDim}30`, cursor: "pointer", borderRadius: 2 }}>← Quitter</button>
        </div>
        {roundCard && <div style={{ fontSize: 9, color: T.goldBright, padding: "3px 12px", border: `1px solid ${T.goldDim}40`, background: "rgba(0,0,0,0.4)", borderRadius: 2, fontFamily: "'Press Start 2P'", animation: "pulseGlow 2s infinite" }}>★ {roundCard}</div>}
        <span style={{ fontSize: 8, color: T.textDim, fontFamily: "'Press Start 2P'" }}>☠ {players.filter((p) => !p.alive).length}</span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
        {playInd && (
          <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 30 }}>
            <PlayIndicator playerIdx={playInd.playerIdx % PT.length} count={playInd.count} visible name={players[playInd.playerIdx]?.name || "?"} />
          </div>
        )}

        <div style={{ width: 740, height: 740, maxWidth: "96vw", maxHeight: "78vh", borderRadius: "50%", background: `radial-gradient(ellipse at 45% 40%,${T.table},${T.tableDark} 65%,#081a0c)`, border: `8px solid ${T.rim}`, boxShadow: `0 0 0 4px ${T.wood},0 0 0 6px ${T.rimLight}30,inset 0 0 50px rgba(0,0,0,0.4),0 12px 40px rgba(0,0,0,0.6)`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <TablePile cards={pile} roundCard={roundCard} />

          {revealed && (
            <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", display: "flex", gap: 6, zIndex: 70, animation: "fadeInUp 0.3s", filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.7))" }}>
              {revealed.cards.map((c, i) => (
                <div key={i} style={{ animation: `revealFlip 0.4s ease-out ${i * 0.12}s both` }}>
                  <GameCard type={c.type} faceUp small highlight={c.type === roundCard || c.type === "Joker"} />
                </div>
              ))}
            </div>
          )}

          {displayPlayers.map((p) => {
            const { cx, cy } = playerPosition(p.displayIdx, N);
            const isCurrent = cp === p.serverIdx && !showAnn;
            return (
              <div key={p.serverIdx} style={{ position: "absolute", left: `calc(50% + ${cx}px)`, top: `calc(50% + ${cy}px)`, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, zIndex: 5, opacity: p.connected ? 1 : 0.4 }}>
                <CowboySprite playerIdx={p.colorIdx % PT.length} size={N > 5 ? 30 : 38} eliminated={!p.alive} isCurrent={isCurrent} emotion={emotes.some((e) => e.player === p.serverIdx) ? "smirk" : "neutral"} />
                <span style={{ fontSize: N > 5 ? 5 : 6, fontFamily: "'Press Start 2P'", color: PT[p.colorIdx % PT.length].primary, textShadow: "1px 1px 0 #000", opacity: p.alive ? 1 : 0.3 }}>
                  {p.name}{p.serverIdx === myIdx ? " ★" : ""}
                </span>
                <span style={{ fontSize: N > 5 ? 7 : 9, color: p.alive ? T.goldBright : T.redBright, fontFamily: "'Press Start 2P'", background: p.alive ? "rgba(0,0,0,0.5)" : "transparent", padding: p.alive ? "1px 5px" : 0, borderRadius: 3, border: p.alive ? `1px solid ${T.goldDim}40` : "none" }}>{p.alive ? `🃏 ${p.handCount}` : "💀"}</span>
                {p.alive && (
                  <div style={{ display: "flex", gap: 2 }}>
                    {Array.from({ length: CHAMBER_COUNT }, (_, ci) => (
                      <div key={ci} style={{ width: 4, height: 4, borderRadius: "50%", border: `1px solid ${ci < p.chambers ? T.redBright : `${T.textDim}40`}`, background: ci < p.chambers ? T.redBright : "transparent" }} />
                    ))}
                  </div>
                )}
                {!p.connected && p.alive && <span style={{ fontSize: 5, color: T.textDim, fontFamily: "'Press Start 2P'" }}>déco</span>}
                {emotes.filter((e) => e.player === p.serverIdx).map((e) => (
                  <div key={e.id} style={{ position: "absolute", top: -22, fontSize: 22, animation: "fadeInUp 0.3s", zIndex: 50 }}>{e.emote}</div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Log */}
      <div style={{ position: "absolute", top: 44, left: 8, width: 230, maxHeight: 240, overflow: "hidden", zIndex: 10, background: "rgba(0,0,0,0.25)", borderRadius: 4, padding: "4px 6px" }}>
        {log.map((l, i) => (
          <div key={i} style={{ fontSize: 8, fontFamily: "'Press Start 2P'", color: l.includes("═══") ? T.goldDim : l.includes("💀") ? T.redBright : T.textDim, lineHeight: 2.2, animation: "slideInLog 0.3s", opacity: 0.3 + (i / log.length) * 0.7, textShadow: "1px 1px 0 #000" }}>{l}</div>
        ))}
      </div>

      {/* Hand & controls */}
      {players[myIdx]?.alive && !showAnn && roundCard && !rouletteInfo && (
        <div style={{ padding: "10px 16px 14px", background: "linear-gradient(180deg,rgba(26,18,8,0.3),rgba(26,18,8,0.92))", borderTop: `1px solid ${T.goldDim}12`, zIndex: 10 }}>
          <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap", marginBottom: 10 }}>
            {myHand.map((c, i) => (
              <GameCard key={c.id} type={c.type} faceUp selected={sel.includes(i)} highlight={c.type === roundCard || c.type === "Joker"} onClick={isMyTurn ? () => toggle(i) : undefined} small={myHand.length > 7} />
            ))}
          </div>
          {isMyTurn ? (
            <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
              {sel.length > 0 && (
                <button onClick={playCards} style={{ fontFamily: "'Pirata One'", fontSize: 17, padding: "6px 20px", background: "linear-gradient(135deg,#1a5c2a,#0d3a18)", color: "#2ecc71", border: "2px solid #2ecc7180", cursor: "pointer", borderRadius: 3, letterSpacing: 2 }}>
                  Poser {sel.length} carte{sel.length > 1 ? "s" : ""}
                </button>
              )}
              {canLiar && (
                <button onClick={callLiar} style={{ fontFamily: "'Pirata One'", fontSize: 17, padding: "6px 20px", background: `linear-gradient(135deg,${T.rim},#5a2510)`, color: T.redBright, border: `2px solid ${T.redBright}80`, cursor: "pointer", borderRadius: 3, letterSpacing: 2, animation: "pulseGlow 1.5s infinite" }}>
                  🤥 Menteur !
                </button>
              )}
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowEm(!showEm)} style={{ fontSize: 18, padding: "4px 10px", background: "transparent", color: T.text, border: `1px solid ${T.textDim}30`, cursor: "pointer", borderRadius: 3 }}>😏</button>
                {showEm && (
                  <div style={{ position: "absolute", bottom: "110%", right: 0, display: "flex", gap: 5, padding: 8, background: "rgba(26,18,8,0.95)", border: `1px solid ${T.goldDim}30`, borderRadius: 4, zIndex: 20 }}>
                    {EMOTES.map((e) => (
                      <span key={e} style={{ fontSize: 18, cursor: "pointer" }} onClick={() => sendEmote(e)}>{e}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", fontSize: 8, color: players[cp] ? PT[players[cp].colorIdx % PT.length].primary : T.textDim, fontFamily: "'Press Start 2P'", animation: "blink 1.2s infinite" }}>
              {players[cp]?.name || "?"} réfléchit...
            </div>
          )}
        </div>
      )}

      {showAnn && <WesternAnnouncement onComplete={annDone} card={annCard} />}
      {rouletteInfo && (
        <RevolverAnimation
          playerIdx={rouletteInfo.playerIdx % PT.length}
          hit={rouletteInfo.hit}
          spentChambers={rouletteInfo.spentChambers}
          onComplete={rouletteDone}
          playerName={players[rouletteInfo.playerIdx]?.name || "?"}
        />
      )}
    </div>
  );
}
