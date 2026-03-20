const WebSocket = require('ws');
const PORT = process.env.PORT || 10000;

// Criando servidor WebSocket
const wss = new WebSocket.Server({ port: PORT });
console.log(`Servidor WebSocket rodando na porta ${PORT}...`);

let clients = new Set();
const userLimits = new Map();
const MAX_TOKENS = 3;       // Limite de reações por intervalo
const REFILL_TIME = 10000;  // 10s
const allowedReactions = ["❤️","😂","🔥","👍","😮"];

// Conexão de cada cliente
wss.on('connection', (ws) => {
  clients.add(ws);
  userLimits.set(ws, { tokens: MAX_TOKENS, lastRefill: Date.now() });
  
  // Envia contagem atual de usuários
  broadcastUsers();

  ws.on('message', (message) => {
    const user = userLimits.get(ws);
    const now = Date.now();

    // Recarrega tokens a cada REFILL_TIME
    if(now - user.lastRefill > REFILL_TIME){
      user.tokens = MAX_TOKENS;
      user.lastRefill = now;
    }

    // Bloqueio anti-flood
    if(user.tokens <= 0){
      ws.send(JSON.stringify({ type: "limit" }));
      return;
    }
    user.tokens--;

    // Valida mensagem recebida
    let msg;
    try { msg = JSON.parse(message); } catch { return; }

    // Reação permitida
    if(msg.type === "reaction" && allowedReactions.includes(msg.data)){
      // Envia para todos os clientes
      broadcast(JSON.stringify({ type: "reaction", data: msg.data }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    userLimits.delete(ws);
    broadcastUsers();
  });
});

// Envia mensagem para todos os clientes
function broadcast(msg){
  clients.forEach(c => {
    if(c.readyState === WebSocket.OPEN) c.send(msg);
  });
}

// Atualiza contagem de usuários em todos os clientes
function broadcastUsers(){
  const total = clients.size;
  broadcast(JSON.stringify({ type: "users", data: total }));
}
