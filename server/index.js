import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const CARD_TYPES = ["Roi", "Dame", "Valet"];
const ALL_CARDS = ["As", "Roi", "Dame", "Valet"];
const CHAMBER_COUNT = 6;
const MAX_PLAYERS = 8;
const MIN_PLAYERS = 2;
const TURN_TIMEOUT_MS = 40_000;

function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function createDeck() {
  const d = [];
  for (let i = 0; i < 5; i++)
    for (const t of ALL_CARDS)
      d.push({ type: t, id: `${t}_${i}_${Math.random().toString(36).slice(2, 8)}` });
  return shuffle(d);
}

function legit(cards, rc) {
  return cards.every((c) => c.type === rc || c.type === "As");
}

function aliveCount(players) {
  return players.filter((p) => p.alive).length;
}

function nextAlive(from, players) {
  const n = players.length;
  let next = (from + 1) % n;
  for (let i = 0; i < n; i++) {
    if (players[next].alive) return next;
    next = (next + 1) % n;
  }
  return next;
}

function dealCards(players) {
  const deck = createDeck();
  const alive = players.filter((p) => p.alive);
  const per = Math.floor(deck.length / alive.length);
  let ci = 0;
  return players.map((p) => {
    if (!p.alive) return { ...p, hand: [] };
    const hand = deck.slice(ci, ci + per);
    ci += per;
    return { ...p, hand };
  });
}

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function publicState(room) {
  return {
    players: room.players.map((p) => ({
      name: p.name,
      alive: p.alive,
      handCount: p.hand.length,
      chambers: p.chambers,
      colorIdx: p.colorIdx,
      connected: p.connected,
    })),
    cp: room.cp,
    pile: room.pile,
    roundCard: room.roundCard,
    lastP: room.lastP,
    log: room.log,
    status: room.status,
  };
}

// ─── State ───────────────────────────────────────────────────────────────────
const rooms = new Map();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// ─── Helpers ─────────────────────────────────────────────────────────────────
function startNewRound(room, fromIdx) {
  clearTurnTimer(room);
  room.players = dealCards(room.players);
  room.pile = [];
  room.lastP = null;
  room.lastCards = [];
  room.roundCard = CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];
  room.cp = fromIdx;
  room.status = "playing";
  room.log = [...room.log.slice(-9), "═══ Nouveau round ═══", `★ Carte: ${room.roundCard}`];

  room.players.forEach((p, i) => {
    const s = io.sockets.sockets.get(p.socketId);
    if (s) {
      s.emit("round_start", {
        yourHand: p.hand,
        roundCard: room.roundCard,
        publicState: publicState(room),
      });
    }
  });

  scheduleTurnTimeout(room);
}

function triggerRoulette(room, playerIdx) {
  clearTurnTimer(room);
  room.status = "roulette";
  const player = room.players[playerIdx];
  const spent = player.chambers;
  const remaining = Math.max(1, CHAMBER_COUNT - spent);
  const hit = Math.random() < 1 / remaining;

  room._rouletteHit = hit;
  room._roulettePlayer = playerIdx;

  io.to(room.id).emit("roulette_start", {
    playerIdx,
    spentChambers: spent,
    hit,
  });

  setTimeout(() => processRouletteResult(room, playerIdx, hit), 7200);
}

function processRouletteResult(room, playerIdx, hit) {
  const player = room.players[playerIdx];
  if (hit) {
    room.log = [...room.log.slice(-9), `💀 ${player.name} éliminé !`];
    room.players[playerIdx] = { ...player, alive: false };
  } else {
    room.players[playerIdx] = { ...player, chambers: player.chambers + 1 };
    const rem = CHAMBER_COUNT - room.players[playerIdx].chambers;
    room.log = [...room.log.slice(-9), `${player.name} survit ! (${rem} chambre${rem > 1 ? "s" : ""} restante${rem > 1 ? "s" : ""})`];
  }

  io.to(room.id).emit("roulette_result", {
    playerIdx,
    died: hit,
    publicState: publicState(room),
  });

  if (aliveCount(room.players) <= 1) {
    const winner = room.players.find((p) => p.alive);
    const winnerIdx = room.players.indexOf(winner);
    room.status = "done";
    setTimeout(() => {
      io.to(room.id).emit("game_over", {
        winnerIdx,
        winnerName: winner.name,
      });
    }, 800);
    return;
  }

  const next = nextAlive(playerIdx, room.players);
  setTimeout(() => startNewRound(room, next), 1200);
}

function broadcastRoomUpdate(room) {
  room.players.forEach((p, i) => {
    const s = io.sockets.sockets.get(p.socketId);
    if (s) {
      s.emit("room_update", {
        roomId: room.id,
        code: room.code,
        myIdx: i,
        players: room.players.map((p2) => ({
          name: p2.name,
          colorIdx: p2.colorIdx,
          connected: p2.connected,
        })),
        isHost: p.socketId === room.hostSocketId,
      });
    }
  });
}

function clearTurnTimer(room) {
  if (room._turnTimer) { clearTimeout(room._turnTimer); room._turnTimer = null; }
}

function scheduleTurnTimeout(room) {
  clearTurnTimer(room);
  room._turnTimer = setTimeout(() => {
    if (room.status !== "playing") return;
    const p = room.players[room.cp];
    if (!p || !p.alive) return;
    // Auto-play: discard first card (pass turn)
    room.log = [...room.log.slice(-9), `${p.name} temps écoulé — passe son tour`];
    const cards = [p.hand[0]];
    const newHand = p.hand.slice(1);
    room.players[room.cp] = { ...p, hand: newHand };
    room.pile = [...room.pile, ...cards];
    room.lastP = room.cp;
    room.lastCards = cards;
    io.to(room.id).emit("player_played", { playerIdx: room.cp, count: 1, publicState: publicState(room) });
    if (newHand.length === 0) {
      setTimeout(() => startNewRound(room, nextAlive(room.cp, room.players)), 1200);
      return;
    }
    const next = nextAlive(room.cp, room.players);
    room.cp = next;
    io.to(room.id).emit("turn_change", { cp: next, publicState: publicState(room) });
    scheduleTurnTimeout(room);
  }, TURN_TIMEOUT_MS);
}

// ─── Socket handlers ─────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  socket.on("create_room", ({ name }) => {
    let code;
    const usedCodes = new Set([...rooms.values()].map((r) => r.code));
    do { code = generateCode(); } while (usedCodes.has(code));

    const roomId = Math.random().toString(36).slice(2, 10);
    const room = {
      id: roomId,
      code,
      hostSocketId: socket.id,
      status: "waiting",
      players: [{
        socketId: socket.id,
        name: name.trim().slice(0, 16) || "Cowboy",
        hand: [],
        alive: true,
        chambers: 0,
        colorIdx: 0,
        connected: true,
      }],
      cp: 0,
      pile: [],
      roundCard: null,
      lastP: null,
      lastCards: [],
      log: [],
      _turnTimer: null,
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.playerIdx = 0;

    socket.emit("room_update", {
      roomId,
      code,
      myIdx: 0,
      players: room.players.map((p) => ({ name: p.name, colorIdx: p.colorIdx, connected: p.connected })),
      isHost: true,
    });
  });

  socket.on("join_room", ({ code, name }) => {
    const room = [...rooms.values()].find(
      (r) => r.code === code.toUpperCase().trim() && r.status === "waiting"
    );
    if (!room) { socket.emit("error", { message: "Room introuvable ou partie déjà en cours." }); return; }
    if (room.players.length >= MAX_PLAYERS) { socket.emit("error", { message: "Room pleine (8 joueurs max)." }); return; }

    const colorIdx = room.players.length;
    room.players.push({
      socketId: socket.id,
      name: name.trim().slice(0, 16) || "Cowboy",
      hand: [],
      alive: true,
      chambers: 0,
      colorIdx,
      connected: true,
    });

    const myIdx = room.players.length - 1;
    socket.join(room.id);
    socket.data.roomId = room.id;
    socket.data.playerIdx = myIdx;

    broadcastRoomUpdate(room);
  });

  socket.on("start_game", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.hostSocketId !== socket.id) return;
    if (room.players.length < MIN_PLAYERS) {
      socket.emit("error", { message: `Il faut au moins ${MIN_PLAYERS} joueurs.` });
      return;
    }

    room.players = dealCards(room.players.map((p) => ({ ...p, alive: true, chambers: 0 })));
    room.status = "playing";
    room.cp = 0;
    room.pile = [];
    room.roundCard = CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];
    room.lastP = null;
    room.lastCards = [];
    room.log = ["═══ Partie lancée ═══", `★ Carte: ${room.roundCard}`];

    room.players.forEach((p, i) => {
      const s = io.sockets.sockets.get(p.socketId);
      if (s) {
        s.emit("game_start", {
          yourHand: p.hand,
          yourIdx: i,
          publicState: publicState(room),
          roundCard: room.roundCard,
        });
      }
    });

    scheduleTurnTimeout(room);
  });

  socket.on("play_cards", ({ roomId, cardIndices }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== "playing") return;
    const myIdx = socket.data.playerIdx;
    if (room.cp !== myIdx) return;
    const player = room.players[myIdx];
    if (!player?.alive) return;
    if (!Array.isArray(cardIndices) || cardIndices.length === 0 || cardIndices.length > 3) return;
    if (cardIndices.some((i) => i < 0 || i >= player.hand.length)) return;

    clearTurnTimer(room);

    const cards = cardIndices.map((i) => player.hand[i]);
    const newHand = player.hand.filter((_, i) => !cardIndices.includes(i));
    room.players[myIdx] = { ...player, hand: newHand };
    room.pile = [...room.pile, ...cards];
    room.lastP = myIdx;
    room.lastCards = cards;
    room.log = [...room.log.slice(-9), `${player.name} pose ${cards.length} carte(s)`];

    io.to(roomId).emit("player_played", {
      playerIdx: myIdx,
      count: cards.length,
      publicState: publicState(room),
    });

    if (newHand.length === 0) {
      room.log = [...room.log.slice(-9), `${player.name} main vide !`];
      setTimeout(() => startNewRound(room, nextAlive(myIdx, room.players)), 1200);
      return;
    }

    const next = nextAlive(myIdx, room.players);
    room.cp = next;
    io.to(roomId).emit("turn_change", { cp: next, publicState: publicState(room) });
    scheduleTurnTimeout(room);
  });

  socket.on("call_liar", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== "playing") return;
    const myIdx = socket.data.playerIdx;
    if (room.cp !== myIdx) return;
    if (room.lastP === null || room.lastP === myIdx || room.lastCards.length === 0) return;

    clearTurnTimer(room);

    const was = !legit(room.lastCards, room.roundCard);
    const targetIdx = was ? room.lastP : myIdx;
    room.log = [
      ...room.log.slice(-8),
      `${room.players[myIdx].name} appelle MENTEUR !`,
      `→ Cartes: ${room.lastCards.map((c) => c.type).join(", ")}`,
    ];

    io.to(roomId).emit("liar_called", {
      callerIdx: myIdx,
      targetIdx,
      revealedCards: room.lastCards,
      honest: !was,
      publicState: publicState(room),
    });

    setTimeout(() => triggerRoulette(room, targetIdx), 2000);
  });

  socket.on("emote", ({ roomId, emote }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    io.to(roomId).emit("player_emote", { playerIdx: socket.data.playerIdx, emote });
  });

  socket.on("request_rematch", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.hostSocketId !== socket.id) return;
    clearTurnTimer(room);
    room.players = room.players.map((p) => ({ ...p, alive: true, hand: [], chambers: 0 }));
    room.status = "waiting";
    room.cp = 0; room.pile = []; room.roundCard = null;
    room.lastP = null; room.lastCards = []; room.log = [];
    broadcastRoomUpdate(room);
  });

  socket.on("disconnect", () => {
    const roomId = socket.data?.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const playerIdx = socket.data.playerIdx;
    if (room.players[playerIdx]) {
      room.players[playerIdx].connected = false;
      io.to(roomId).emit("player_disconnected", {
        name: room.players[playerIdx].name,
        playerIdx,
        publicState: publicState(room),
      });
    }

    // If it was their turn, skip
    if (room.status === "playing" && room.cp === playerIdx) {
      clearTurnTimer(room);
      const next = nextAlive(playerIdx, room.players.map((p, i) => i === playerIdx ? { ...p, alive: false } : p));
      if (aliveCount(room.players) <= 1) {
        const w = room.players.find((p) => p.alive);
        if (w) { room.status = "done"; io.to(roomId).emit("game_over", { winnerIdx: room.players.indexOf(w), winnerName: w.name }); }
      } else {
        room.cp = next;
        io.to(roomId).emit("turn_change", { cp: next, publicState: publicState(room) });
        scheduleTurnTimeout(room);
      }
    }

    // Cleanup room after delay if all disconnected
    setTimeout(() => {
      const r = rooms.get(roomId);
      if (r && r.players.every((p) => !p.connected)) { clearTurnTimer(r); rooms.delete(roomId); }
    }, 60_000);
  });
});

// Serve frontend in production
const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, "../dist");
app.use(express.static(distPath));
app.get("*", (_, res) => res.sendFile(join(distPath, "index.html")));

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`🤠 Liar's Shot server on port ${PORT}`));
