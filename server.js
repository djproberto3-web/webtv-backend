const WebSocket = require('ws');

const PORT = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: PORT });

console.log(`Servidor WebSocket rodando na porta ${PORT}...`);

let clients = new Set();             // Todos os clientes conectados
const userLimits = new Map();        // Limite de tokens por usuário

const MAX_TOKENS = 3;                // Número máximo de reações em 10s
const REFILL_TIME = 10000;           // 10s para recarregar tokens

// Cores permitidas para reações
const allowedReactions = ["❤️","😂","🔥","👍","😮"];

wss.on('connection', (ws) => {
  // Adiciona cliente
  clients.add(ws);

  // Inicializa tokens
  userLimits.set(ws, { tokens: MAX_TOKENS, lastRefill: Date.now() });

  // Atualiza contador de usuários para todos
  broadcastUsers();

  // Recebe mensagens de reação
  ws.on('message', (message) => {
    const user = userLimits.get(ws);
    const now = Date.now();

    // Recarrega tokens a cada REFILL_TIME
    if (now - user.lastRefill > REFILL_TIME) {
      user.tokens = MAX_TOKENS;
      user.lastRefill = now;
    }

    // Bloqueio de flood
    if (user.tokens <= 0) {
      ws.send(JSON.stringify({ type: "limit" }));
      return;
    }

    user.tokens--;

    let msg;
    try {
      msg = JSON.parse(message);
    } catch {
      return; // Mensagem inválida
    }

    if (msg.type === "reaction" && allowedReactions.includes(msg.data)) {
      // Broadcast da reação para todos
      broadcast(JSON.stringify({ type: "reaction", data: msg.data }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    userLimits.delete(ws);
    broadcastUsers();
  });
});

// Função de broadcast
function broadcast(msg) {
  clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(msg);
    }
  });
}

// Broadcast do contador de usuários
function broadcastUsers() {
  const total = clients.size;
  const payload = JSON.stringify({ type: "users", data: total });
  broadcast(payload);
}
