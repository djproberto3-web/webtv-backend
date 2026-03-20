const WebSocket = require('ws');
const PORT = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: PORT });
console.log(`Servidor WebSocket rodando na porta ${PORT}...`);

let clients = new Set();
const userLimits = new Map();
const MAX_TOKENS = 3;
const REFILL_TIME = 10000;
const allowedReactions = ["❤️","😂","🔥","👍","😮"];

wss.on('connection', (ws) => {
  clients.add(ws);
  userLimits.set(ws, { tokens: MAX_TOKENS, lastRefill: Date.now() });
  broadcastUsers();

  ws.on('message', (message) => {
    const user = userLimits.get(ws);
    const now = Date.now();
    if (now - user.lastRefill > REFILL_TIME){ user.tokens = MAX_TOKENS; user.lastRefill = now; }
    if(user.tokens<=0){ ws.send(JSON.stringify({ type:"limit" })); return; }
    user.tokens--;

    let msg;
    try { msg=JSON.parse(message); } catch { return; }
    if(msg.type==="reaction" && allowedReactions.includes(msg.data)){
      broadcast(JSON.stringify({ type:"reaction", data: msg.data }));
    }
  });

  ws.on('close', ()=>{
    clients.delete(ws);
    userLimits.delete(ws);
    broadcastUsers();
  });
});

function broadcast(msg){
  clients.forEach(c=>{ if(c.readyState===WebSocket.OPEN) c.send(msg); });
}

function broadcastUsers(){
  const total=clients.size;
  const payload=JSON.stringify({ type:"users", data:total });
  broadcast(payload);
}
