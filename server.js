const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: process.env.PORT || 10000 });

let clients = new Set();
const userLimits = new Map();

const MAX_TOKENS = 3;
const REFILL_TIME = 10000;

wss.on('connection', (ws) => {

  clients.add(ws);

  userLimits.set(ws, {
    tokens: MAX_TOKENS,
    lastRefill: Date.now()
  });

  broadcastUsers();

  ws.on('message', (message) => {

    let data;

    // 🔒 Garantir que é JSON válido
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    // 🎯 Só processa reações
    if (data.type !== "reaction") return;

    const user = userLimits.get(ws);
    if (!user) return;

    const now = Date.now();

    // 🔄 Recarregar tokens
    if (now - user.lastRefill > REFILL_TIME) {
      user.tokens = MAX_TOKENS;
      user.lastRefill = now;
    }

    // 🚫 Anti-flood
    if (user.tokens <= 0) {
      ws.send(JSON.stringify({ type: "limit" }));
      return;
    }

    user.tokens--;

    // ✅ Emojis permitidos
    const allowed = ["❤️","😂","🔥","👍","😮"];
    if (!allowed.includes(data.data)) return;

    // 📡 BROADCAST PARA TODOS
    broadcast(JSON.stringify({
      type: "reaction",
      data: data.data
    }));
  });

  ws.on('close', () => {
    clients.delete(ws);
    userLimits.delete(ws);
    broadcastUsers();
  });
});

// 📡 Broadcast geral
function broadcast(msg) {
  clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(msg);
    }
  });
}

// 👥 Atualiza contador de usuários
function broadcastUsers() {
  const total = clients.size;

  const payload = JSON.stringify({
    type: "users",
    data: total
  });

  clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(payload);
    }
  });
}

console.log("✅ Servidor WebSocket rodando...");
