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

    const user = userLimits.get(ws);
    const now = Date.now();

    // recarrega tokens a cada 10s
    if (now - user.lastRefill > REFILL_TIME) {
      user.tokens = MAX_TOKENS;
      user.lastRefill = now;
    }

    // bloqueia flood
    if (user.tokens <= 0) {
      ws.send(JSON.stringify({ type: "limit" }));
      return;
    }

    user.tokens--;

    // valida emojis permitidos
    const allowed = ["❤️","😂","🔥","👍","😮"];
    if (!allowed.includes(message.toString())) return;

    broadcast(JSON.stringify({
      type: "reaction",
      data: message.toString()
    }));
  });

  ws.on('close', () => {
    clients.delete(ws);
    userLimits.delete(ws);
    broadcastUsers();
  });
});

function broadcast(msg) {
  clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(msg);
    }
  });
}

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

console.log("Servidor WebSocket rodando...");
