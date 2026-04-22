import { useState, useEffect, useCallback, useRef } from "react";
import {
  T, PT, CARD_TYPES, CHAMBER_COUNT, CSS,
  createDeck, legit,
  WesternBarBG, CowboySprite, GameCard, PlayIndicator,
  TablePile, WesternAnnouncement, RevolverAnimation,
} from "./shared.jsx";

const PLAYER_NAMES = ["Vous", "Billy", "Snake", "Dice"];
const EMOTES = ["😏", "🤔", "😂", "💀", "🔥", "😱", "👀", "🤡"];

export default function SoloGame({ onBackToMenu }) {
  const [gs, setGs] = useState("menu");
  const [timerDur, setTimerDur] = useState(20);
  const [players, setPlayers] = useState([]);
  const [cp, setCp] = useState(0);
  const [pile, setPile] = useState([]);
  const [roundCard, setRoundCard] = useState(null);
  const [lastP, setLastP] = useState(null);
  const [lastCards, setLastCards] = useState([]);
  const [sel, setSel] = useState([]);
  const [rouletteP, setRouletteP] = useState(null);
  const [rouletteHit, setRouletteHit] = useState(false);
  const [chambers, setChambers] = useState([0, 0, 0, 0]);
  const chambersRef = useRef([0, 0, 0, 0]);
  const [log, setLog] = useState([]);
  const [emotes, setEmotes] = useState([]);
  const [showEm, setShowEm] = useState(false);
  const [timer, setTimer] = useState(null);
  const [winner, setWinner] = useState(null);
  const [showAnn, setShowAnn] = useState(false);
  const [revealed, setRevealed] = useState(null);
  const [playInd, setPlayInd] = useState(null);
  const [deckCounts, setDeckCounts] = useState(null);
  const timerRef = useRef(null);
  const botRef = useRef(null);

  useEffect(() => { chambersRef.current = chambers; }, [chambers]);

  const addLog = useCallback((m) => setLog((p) => [...p.slice(-10), m]), []);
  const computeDeckCounts = useCallback((pl) => {
    const n = pl.filter((p) => p.alive).length;
    const handSize = n <= 5 ? 4 : 3;
    const total = n * handSize;
    const reg = Math.ceil(total / 4);
    return { Roi: reg, Dame: reg, Valet: reg, Joker: total - 3 * reg };
  }, []);
  const alive = (pl) => pl.filter((p) => p.alive).length;
  const nextAlive = useCallback((f, pl) => {
    let n = (f + 1) % 4, s = 0;
    while (!pl[n].alive && s < 4) { n = (n + 1) % 4; s++; }
    return n;
  }, []);
  const deal = useCallback((pl) => {
    const al = pl.filter((p) => p.alive);
    const d = createDeck(al.length);
    const per = Math.floor(d.length / al.length);
    let ci = 0;
    return pl.map((p) => {
      if (p.alive) { const h = d.slice(ci, ci + per); ci += per; return { ...p, hand: h }; }
      return { ...p, hand: [] };
    });
  }, []);
  const emote = useCallback((i, e) => {
    const id = Date.now() + i + Math.random();
    setEmotes((p) => [...p, { id, player: i, emote: e }]);
    setTimeout(() => setEmotes((p) => p.filter((x) => x.id !== id)), 2200);
  }, []);
  const showPlayIndicator = useCallback((playerIdx, count) => {
    setPlayInd({ playerIdx, count });
  }, []);

  const start = useCallback(() => {
    const base = Array.from({ length: 4 }, (_, i) => ({ id: i, name: PLAYER_NAMES[i], hand: [], alive: true, isHuman: i === 0 }));
    const d = deal(base);
    setPlayers(d);
    setDeckCounts(computeDeckCounts(base));
    chambersRef.current = [0, 0, 0, 0];
    setChambers([0, 0, 0, 0]);
    setPile([]); setRoundCard(null); setLastP(null); setLastCards([]);
    setSel([]); setLog(["═══ Partie lancée ═══"]); setEmotes([]);
    setWinner(null); setRevealed(null); setPlayInd(null);
    setGs("playing"); setCp(0);
    setTimeout(() => setShowAnn(true), 500);
  }, [deal]);

  const newRound = useCallback((pl, from) => {
    setPile([]); setLastP(null); setLastCards([]);
    setSel([]); setRevealed(null); setPlayInd(null);
    const d = deal(pl);
    setPlayers(d);
    setDeckCounts(computeDeckCounts(pl));
    addLog("═══ Nouveau round ═══");
    setCp(from);
    setTimeout(() => setShowAnn(true), 700);
  }, [deal, addLog, computeDeckCounts]);

  const annDone = useCallback((card) => {
    setRoundCard(card); setShowAnn(false);
    addLog(`★ Carte: ${card}`);
    setTimeout(() => {
      setPlayers((prev) => {
        if (prev[cp] && !prev[cp].isHuman && prev[cp].alive) {
          botRef.current = setTimeout(() => botPlay(cp, prev, card), 800 + Math.random() * 1200);
        }
        return prev;
      });
    }, 400);
  }, [cp, addLog]);

  useEffect(() => {
    if (gs !== "playing" || rouletteP !== null || showAnn || !roundCard) return;
    const c = players[cp];
    if (c?.isHuman && c?.alive) {
      setTimer(timerDur);
      timerRef.current = setInterval(() => {
        setTimer((p) => { if (p <= 1) { clearInterval(timerRef.current); return 0; } return p - 1; });
      }, 1000);
      return () => clearInterval(timerRef.current);
    } else { setTimer(null); }
  }, [cp, gs, rouletteP, showAnn, roundCard, timerDur]);

  const trigRoulette = useCallback((i) => {
    clearInterval(timerRef.current); setTimer(null);
    const spent = chambersRef.current[i];
    const remaining = Math.max(1, CHAMBER_COUNT - spent);
    const hit = Math.random() < 1 / remaining;
    setRouletteHit(hit); setRouletteP(i); setGs("roulette");
  }, []);

  const proceed = useCallback((from, pl, rc) => {
    if (alive(pl) <= 1) {
      const w = pl.find((p) => p.alive);
      setWinner(w.id); setGs("gameOver"); return;
    }
    const n = nextAlive(from, pl);
    setCp(n);
    if (!pl[n].isHuman) {
      botRef.current = setTimeout(() => botDecide(n, pl, rc), 1000 + Math.random() * 1500);
    }
  }, [nextAlive]);

  const humanPlay = useCallback(() => {
    if (sel.length === 0 || sel.length > 3 || !roundCard) return;
    clearInterval(timerRef.current);
    setPlayInd(null);
    const p = players[0], cards = sel.map((i) => p.hand[i]);
    const nh = p.hand.filter((_, i) => !sel.includes(i));
    const ok = legit(cards, roundCard);
    setPile((prev) => [...prev, ...cards]);
    setLastP(0); setLastCards(cards); setSel([]);
    showPlayIndicator(0, cards.length);
    addLog(`Vous posez ${cards.length} carte(s) ${ok ? "✓" : "🤥"}`);
    if (!ok && Math.random() > 0.6) emote(0, "😏");
    const np = [...players]; np[0] = { ...p, hand: nh }; setPlayers(np);
    if (nh.length === 0) { addLog("Main vide !"); setTimeout(() => newRound(np, nextAlive(0, np)), 1200); return; }
    setTimeout(() => proceed(0, np, roundCard), 900);
  }, [sel, players, roundCard, legit, addLog, emote, showPlayIndicator, proceed, nextAlive, newRound]);

  const humanLiar = useCallback(() => {
    if (lastP === null || lastP === 0) return;
    clearInterval(timerRef.current); setPlayInd(null);
    const was = !legit(lastCards, roundCard);
    addLog("Vous appelez MENTEUR !");
    setRevealed({ cards: lastCards, player: lastP });
    addLog(`→ Cartes: ${lastCards.map((c) => c.type).join(", ")}`);
    setTimeout(() => {
      setRevealed(null);
      if (was) { addLog(`→ ${PLAYER_NAMES[lastP]} mentait !`); trigRoulette(lastP); }
      else { addLog("→ Vrai ! Vous tirez..."); trigRoulette(0); }
    }, 1800);
  }, [lastP, lastCards, roundCard, legit, addLog, trigRoulette]);

  const botPlay = useCallback((bi, pl, rc) => {
    const b = pl[bi];
    if (!b?.alive || b.hand.length === 0) return;
    setPlayInd(null);
    const rCard = rc || roundCard, cnt = Math.min(1 + Math.floor(Math.random() * 2), b.hand.length);
    const lg = b.hand.filter((c) => c.type === rCard || c.type === "Joker");
    let ctp;
    if (lg.length >= cnt && Math.random() > 0.2) ctp = lg.slice(0, cnt);
    else ctp = b.hand.slice(0, cnt);
    const nh = b.hand.filter((c) => !ctp.includes(c)), ok = legit(ctp, rCard);
    setPile((prev) => [...prev, ...ctp]);
    setLastP(bi); setLastCards(ctp);
    showPlayIndicator(bi, cnt);
    addLog(`${b.name} pose ${cnt} carte(s)`);
    if (Math.random() > 0.6) emote(bi, !ok && Math.random() > 0.4 ? "😏" : EMOTES[Math.floor(Math.random() * EMOTES.length)]);
    const np = [...pl]; np[bi] = { ...b, hand: nh }; setPlayers(np);
    if (nh.length === 0) { addLog(`${b.name} main vide !`); setTimeout(() => newRound(np, nextAlive(bi, np)), 1200); return; }
    setTimeout(() => proceed(bi, np, rCard), 900);
  }, [roundCard, legit, addLog, emote, showPlayIndicator, proceed, nextAlive, newRound]);

  const botDecide = useCallback((bi, pl, rc) => {
    const b = pl[bi];
    if (!b?.alive) return;
    const rCard = rc || roundCard;
    if (lastP !== null && lastP !== bi && lastCards.length > 0) {
      const own = b.hand.filter((c) => c.type === rCard || c.type === "Joker").length;
      let sus = 0.15 + lastCards.length * 0.1;
      if (own >= 3) sus += 0.2;
      if (own >= 5) sus += 0.15;
      if (Math.random() < sus) {
        setPlayInd(null);
        const was = !legit(lastCards, rCard);
        addLog(`${b.name} appelle MENTEUR !`);
        setRevealed({ cards: lastCards, player: lastP });
        addLog(`→ Cartes: ${lastCards.map((c) => c.type).join(", ")}`);
        setTimeout(() => {
          setRevealed(null);
          if (was) { addLog(`→ ${PLAYER_NAMES[lastP]} mentait !`); trigRoulette(lastP); }
          else { addLog(`→ Vrai ! ${b.name} tire...`); trigRoulette(bi); }
        }, 1800);
        return;
      }
    }
    botPlay(bi, pl, rCard);
  }, [roundCard, lastP, lastCards, legit, addLog, trigRoulette, botPlay]);

  const rouletteDone = useCallback((died) => {
    const pi = rouletteP;
    setRouletteP(null);
    setPlayers((prev) => {
      let np = [...prev];
      if (died) {
        addLog(`💀 ${PLAYER_NAMES[pi]} éliminé !`);
        np[pi] = { ...np[pi], alive: false };
        if (alive(np) <= 1) {
          const w = np.find((p) => p.alive);
          setWinner(w.id); setGs("gameOver"); return np;
        }
      } else {
        const rem = CHAMBER_COUNT - chambersRef.current[pi] - 1;
        addLog(`${PLAYER_NAMES[pi]} survit ! (${rem} chambre${rem > 1 ? "s" : ""} restante${rem > 1 ? "s" : ""})`);
        setChambers((ch) => { const n = [...ch]; n[pi]++; chambersRef.current = n; return n; });
      }
      setGs("playing");
      const n = nextAlive(pi, np);
      setTimeout(() => newRound(np, n), 900);
      return np;
    });
  }, [rouletteP, addLog, nextAlive, newRound]);

  const toggle = (i) => {
    if (cp !== 0 || !players[0]?.alive) return;
    setSel((p) => { if (p.includes(i)) return p.filter((x) => x !== i); if (p.length >= 3) return p; return [...p, i]; });
  };

  useEffect(() => () => { clearInterval(timerRef.current); clearTimeout(botRef.current); }, []);

  const human = players[0], isMyTurn = cp === 0 && human?.alive;
  const canLiar = isMyTurn && lastP !== null && lastP !== 0 && lastCards.length > 0;

  // ═══ MENU ═══
  if (gs === "menu") {
    return (
      <div style={{ width: "100%", height: "100vh", minHeight: 600, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Pirata One',serif", color: T.text, gap: 10 }}>
        <style>{CSS}</style>
        <WesternBarBG />
        <div style={{ zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 18, color: T.goldDim, letterSpacing: 6 }}>★ ★ ★</div>
          <h1 style={{ fontSize: 48, color: T.redBright, textShadow: `3px 3px 0 #000, 0 0 20px ${T.redBright}30`, letterSpacing: 6, fontFamily: "'Pirata One',serif" }}>Liar's Shot</h1>
          <div style={{ fontSize: 9, color: T.goldDim, letterSpacing: 4, fontFamily: "'Press Start 2P'" }}>SOLO — vs BOTS</div>
          <div style={{ display: "flex", gap: 16, margin: "16px 0" }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ textAlign: "center", animation: `floatIdle ${2 + i * 0.4}s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }}>
                <CowboySprite playerIdx={i} size={50} />
                <div style={{ fontSize: 6, color: PT[i].primary, marginTop: 3, fontFamily: "'Press Start 2P'" }}>{PLAYER_NAMES[i]}</div>
              </div>
            ))}
          </div>
          <div style={{ maxWidth: 330, padding: "10px 18px", border: `1px solid ${T.goldDim}30`, background: "rgba(26,18,8,0.85)", borderRadius: 4, textAlign: "center", fontSize: 12, color: T.textDim, lineHeight: 2 }}>
            Posez la carte annoncée — ou bluffez.<br />
            Les <span style={{ color: T.goldBright }}>🃏 Jokers</span> sont des cartes universelles.<br />
            Si on vous attrape → <span style={{ color: T.redBright }}>roulette russe</span> !
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 7, color: T.textDim, fontFamily: "'Press Start 2P'" }}>Timer:</span>
            {[10, 15, 20, 30].map((t) => (
              <button key={t} onClick={() => setTimerDur(t)} style={{ fontFamily: "'Press Start 2P'", fontSize: 8, padding: "5px 10px", background: timerDur === t ? T.rim : "transparent", color: timerDur === t ? T.goldBright : T.textDim, border: `1px solid ${timerDur === t ? T.gold : `${T.textDim}40`}`, cursor: "pointer", borderRadius: 2 }}>{t}s</button>
            ))}
          </div>
          <button onClick={start} style={{ fontFamily: "'Pirata One',serif", fontSize: 24, padding: "12px 48px", marginTop: 10, background: `linear-gradient(135deg,${T.rim},${T.rimLight})`, color: T.goldBright, border: `2px solid ${T.gold}`, cursor: "pointer", borderRadius: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.5)", textShadow: `0 0 8px ${T.goldBright}40, 1px 1px 0 #000`, letterSpacing: 4, transition: "transform 0.2s" }} onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")} onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}>
            ▶ JOUER
          </button>
          <button onClick={onBackToMenu} style={{ fontFamily: "'Press Start 2P'", fontSize: 7, padding: "8px 16px", background: "transparent", color: T.textDim, border: `1px solid ${T.textDim}30`, cursor: "pointer", borderRadius: 2, marginTop: 4 }}>
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  // ═══ GAME OVER ═══
  if (gs === "gameOver") {
    return (
      <div style={{ width: "100%", height: "100vh", minHeight: 600, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Pirata One',serif", color: T.text, gap: 12 }}>
        <style>{CSS}</style>
        <WesternBarBG />
        <div style={{ zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 16, color: T.goldDim, letterSpacing: 6 }}>★ ★ ★</div>
          <div style={{ fontSize: 28, color: winner === 0 ? T.goldBright : T.redBright, textShadow: "3px 3px 0 #000", letterSpacing: 4 }}>{winner === 0 ? "VICTOIRE !" : "GAME OVER"}</div>
          <div style={{ animation: "floatIdle 2s ease-in-out infinite" }}>
            <CowboySprite playerIdx={winner} size={100} emotion="smirk" />
          </div>
          <div style={{ fontSize: 14, color: PT[winner].primary, fontFamily: "'Press Start 2P'" }}>{PLAYER_NAMES[winner]} gagne !</div>
          <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
            <button onClick={start} style={{ fontFamily: "'Pirata One'", fontSize: 20, padding: "10px 30px", background: `linear-gradient(135deg,${T.rim},${T.rimLight})`, color: T.goldBright, border: `2px solid ${T.gold}`, cursor: "pointer", borderRadius: 4, boxShadow: "0 3px 10px rgba(0,0,0,0.5)", letterSpacing: 2 }}>Rejouer</button>
            <button onClick={() => setGs("menu")} style={{ fontFamily: "'Press Start 2P'", fontSize: 8, padding: "10px 16px", background: "transparent", color: T.textDim, border: `1px solid ${T.textDim}40`, cursor: "pointer", borderRadius: 2 }}>Menu</button>
          </div>
        </div>
      </div>
    );
  }

  // ═══ PLAYING ═══
  return (
    <div style={{ width: "100%", height: "100vh", minHeight: 700, fontFamily: "'Pirata One',serif", color: T.text, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <style>{CSS}</style>
      <WesternBarBG />
      <div style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(26,18,8,0.8)", borderBottom: `1px solid ${T.goldDim}15`, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, color: T.goldDim, letterSpacing: 2 }}>Solo</span>
          <button onClick={onBackToMenu} style={{ fontFamily: "'Press Start 2P'", fontSize: 6, padding: "4px 8px", background: "transparent", color: T.textDim, border: `1px solid ${T.textDim}30`, cursor: "pointer", borderRadius: 2 }}>← Quitter</button>
        </div>
        {roundCard && <div style={{ fontSize: 9, color: T.goldBright, padding: "3px 12px", border: `1px solid ${T.goldDim}40`, background: "rgba(0,0,0,0.4)", borderRadius: 2, fontFamily: "'Press Start 2P'", animation: "pulseGlow 2s infinite" }}>★ {roundCard}</div>}
        {timer !== null && <span style={{ fontSize: 12, fontFamily: "'Press Start 2P'", color: timer <= 5 ? T.redBright : T.goldBright, animation: timer <= 5 ? "blink 0.5s infinite" : "none", textShadow: timer <= 5 ? `0 0 8px ${T.redBright}` : "none" }}>⏱ {timer}s</span>}
        <span style={{ fontSize: 8, color: T.textDim, fontFamily: "'Press Start 2P'" }}>☠ {4 - alive(players)}</span>
      </div>
      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
        {playInd && (
          <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 30 }}>
            <PlayIndicator playerIdx={playInd.playerIdx} count={playInd.count} visible name={PLAYER_NAMES[playInd.playerIdx]} />
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
          {players.map((p, i) => {
            const a = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][i];
            const cx = Math.cos(a) * 320, cy = -Math.sin(a) * 320;
            const isCurrent = cp === i && !showAnn;
            return (
              <div key={i} style={{ position: "absolute", left: `calc(50% + ${cx}px)`, top: `calc(50% + ${cy}px)`, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, zIndex: isCurrent ? 8 : 5, filter: isCurrent ? `drop-shadow(0 0 10px ${PT[i].primary}) drop-shadow(0 0 20px ${PT[i].primary}80)` : "none", transition: "filter 0.4s" }}>
                <CowboySprite playerIdx={i} size={52} eliminated={!p.alive} isCurrent={isCurrent} emotion={emotes.some((e) => e.player === i) ? "smirk" : "neutral"} />
                <span style={{ fontSize: 9, fontFamily: "'Press Start 2P'", color: PT[i].primary, textShadow: "1px 1px 0 #000", opacity: p.alive ? 1 : 0.3 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: p.alive ? T.goldBright : T.redBright, fontFamily: "'Press Start 2P'", background: p.alive ? "rgba(0,0,0,0.5)" : "transparent", padding: p.alive ? "2px 6px" : 0, borderRadius: 3, border: p.alive ? `1px solid ${T.goldDim}40` : "none" }}>{p.alive ? `🃏 ${p.hand.length}` : "💀"}</span>
                {p.alive && (
                  <div style={{ display: "flex", gap: 3 }}>
                    {Array.from({ length: CHAMBER_COUNT }, (_, ci) => (
                      <div key={ci} style={{ width: 6, height: 6, borderRadius: "50%", border: `1px solid ${ci < chambers[i] ? T.redBright : `${T.textDim}40`}`, background: ci < chambers[i] ? T.redBright : "transparent", boxShadow: ci < chambers[i] ? `0 0 3px ${T.redBright}60` : "none" }} />
                    ))}
                  </div>
                )}
                {emotes.filter((e) => e.player === i).map((e) => (
                  <div key={e.id} style={{ position: "absolute", top: -22, fontSize: 22, animation: "fadeInUp 0.3s", zIndex: 50, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>{e.emote}</div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {/* Log */}
      <div style={{ position: "absolute", top: 44, left: 8, width: 240, maxHeight: 260, overflow: "hidden", zIndex: 10, background: "rgba(0,0,0,0.55)", border: `1px solid ${T.goldDim}20`, borderRadius: 5, padding: "6px 8px" }}>
        {log.map((l, i) => (
          <div key={i} style={{ fontSize: 11, fontFamily: "'Press Start 2P'", color: l.includes("═══") ? T.goldBright : l.includes("💀") ? T.redBright : T.text, lineHeight: 2.4, animation: "slideInLog 0.3s", opacity: 0.4 + (i / log.length) * 0.6, textShadow: "1px 1px 0 #000" }}>{l}</div>
        ))}
      </div>

      {/* Deck composition */}
      {deckCounts && (
        <div style={{ position: "absolute", top: 44, right: 8, width: 165, zIndex: 10, background: "rgba(0,0,0,0.55)", border: `1px solid ${T.goldDim}20`, borderRadius: 5, padding: "8px 12px" }}>
          <div style={{ fontSize: 7, fontFamily: "'Press Start 2P'", color: T.goldDim, letterSpacing: 2, marginBottom: 8, textAlign: "center" }}>DECK</div>
          {[["Roi", "♠"], ["Dame", "♥"], ["Valet", "♦"], ["Joker", "🃏"]].map(([type, suit]) => (
            <div key={type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontFamily: "'Press Start 2P'", color: type === "Dame" || type === "Valet" ? T.redBright : type === "Joker" ? T.goldBright : T.text }}>{suit} {type}</span>
              <span style={{ fontSize: 12, fontFamily: "'Press Start 2P'", color: T.goldBright, textShadow: `0 0 6px ${T.goldBright}60` }}>×{deckCounts[type]}</span>
            </div>
          ))}
        </div>
      )}
      {human?.alive && gs === "playing" && !showAnn && roundCard && (
        <div style={{ padding: "10px 16px 14px", background: "linear-gradient(180deg,rgba(26,18,8,0.3),rgba(26,18,8,0.92))", borderTop: `1px solid ${T.goldDim}12`, zIndex: 10 }}>
          <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap", marginBottom: 10 }}>
            {human.hand.map((c, i) => (
              <GameCard key={c.id} type={c.type} faceUp selected={sel.includes(i)} highlight={c.type === roundCard || c.type === "Joker"} onClick={isMyTurn ? () => toggle(i) : undefined} small={human.hand.length > 7} />
            ))}
          </div>
          {isMyTurn ? (
            <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
              {sel.length > 0 && (
                <button onClick={humanPlay} style={{ fontFamily: "'Pirata One'", fontSize: 17, padding: "6px 20px", background: "linear-gradient(135deg,#1a5c2a,#0d3a18)", color: "#2ecc71", border: "2px solid #2ecc7180", cursor: "pointer", borderRadius: 3, boxShadow: "0 3px 12px rgba(0,0,0,0.4)", letterSpacing: 2 }}>
                  Poser {sel.length} carte{sel.length > 1 ? "s" : ""}
                </button>
              )}
              {canLiar && (
                <button onClick={humanLiar} style={{ fontFamily: "'Pirata One'", fontSize: 17, padding: "6px 20px", background: `linear-gradient(135deg,${T.rim},#5a2510)`, color: T.redBright, border: `2px solid ${T.redBright}80`, cursor: "pointer", borderRadius: 3, boxShadow: "0 3px 12px rgba(0,0,0,0.4)", letterSpacing: 2, animation: "pulseGlow 1.5s infinite" }}>
                  🤥 Menteur !
                </button>
              )}
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowEm(!showEm)} style={{ fontSize: 18, padding: "4px 10px", background: "transparent", color: T.text, border: `1px solid ${T.textDim}30`, cursor: "pointer", borderRadius: 3 }}>😏</button>
                {showEm && (
                  <div style={{ position: "absolute", bottom: "110%", right: 0, display: "flex", gap: 5, padding: 8, background: "rgba(26,18,8,0.95)", border: `1px solid ${T.goldDim}30`, borderRadius: 4, zIndex: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
                    {EMOTES.map((e) => (
                      <span key={e} style={{ fontSize: 18, cursor: "pointer", transition: "transform 0.15s" }} onClick={() => { emote(0, e); setShowEm(false); }} onMouseEnter={(ev) => (ev.target.style.transform = "scale(1.3)")} onMouseLeave={(ev) => (ev.target.style.transform = "scale(1)")}>{e}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", fontSize: 10, color: PT[cp]?.primary || T.textDim, fontFamily: "'Press Start 2P'", animation: "blink 1.2s infinite" }}>
              {PLAYER_NAMES[cp]} réfléchit...
            </div>
          )}
        </div>
      )}
      {showAnn && <WesternAnnouncement onComplete={annDone} />}
      {gs === "roulette" && rouletteP !== null && (
        <RevolverAnimation playerIdx={rouletteP} hit={rouletteHit} spentChambers={chambers[rouletteP]} onComplete={rouletteDone} playerName={PLAYER_NAMES[rouletteP]} />
      )}
    </div>
  );
}
