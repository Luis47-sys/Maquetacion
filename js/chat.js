/* =====================================================================
   CARGAYA — chat.js
   Simulación completa de chat tipo WhatsApp con respuestas automáticas,
   envío de ubicación y archivos simulados. Persiste en localStorage.
===================================================================== */

const CY_CHAT_KEY = 'cargaya_chats_v1';
const CY_AUTORESPUESTAS = [
  'Perfecto, quedamos así 👍',
  'Dame unos minutos y te confirmo.',
  'La carga ya está lista para recojo.',
  'Voy en camino, llego en aproximadamente 40 minutos.',
  '¿Podrías confirmarme la dirección exacta?',
  'De acuerdo, el precio me parece justo.',
  'Gracias por la actualización 🙌',
  'Ya llegué al punto de recojo.',
  'Entrega confirmada, todo en orden'
];

function cyLoadChats(){
  let raw = localStorage.getItem(CY_CHAT_KEY);
  if(!raw){
    const nombres = ['Carlos Ramírez','María Torres','Andes Logística SAC','Jorge Quispe','ExpoCarga Perú'];
    const seed = nombres.map((n,i)=>({
      id: cyId('CHAT'),
      nombre: n,
      avatar: cyAvatar(n),
      mensajes: [
        {from:'them', text:'Hola, vi tu publicación en CargaYa. ¿Sigue disponible?', time: Date.now()-3600000*(i+2)},
        {from:'me', text:'¡Hola! Sí, todavía está disponible.', time: Date.now()-3600000*(i+1)}
      ]
    }));
    localStorage.setItem(CY_CHAT_KEY, JSON.stringify(seed));
    return seed;
  }
  try{ return JSON.parse(raw); }catch(e){ return []; }
}
function cySaveChats(c){ localStorage.setItem(CY_CHAT_KEY, JSON.stringify(c)); }
let CY_CHATS = cyLoadChats();
let CY_ACTIVE_CHAT = null;

function cyRenderChatList(){
  const list = document.getElementById('chat-list');
  if(!list) return;
  list.innerHTML = CY_CHATS.map(c=>{
    const last = c.mensajes[c.mensajes.length-1];
    return `<div class="chat-list-item ${CY_ACTIVE_CHAT===c.id?'active':''}" data-chat="${c.id}">
      <img src="${c.avatar}" alt="">
      <div class="cl-info"><strong>${c.nombre}</strong><p>${last? (last.from==='me'?'Tú: ':'')+last.text : 'Sin mensajes'}</p></div>
    </div>`;
  }).join('');
  list.querySelectorAll('.chat-list-item').forEach(item=>{
    item.onclick = ()=> cyOpenChat(item.dataset.chat);
  });
}

function cyOpenChat(chatId){
  CY_ACTIVE_CHAT = chatId;
  cyRenderChatList();
  const chat = CY_CHATS.find(c=>c.id===chatId);
  const head = document.getElementById('chat-window-head');
  head.innerHTML = `<img src="${chat.avatar}" style="width:34px;height:34px;border-radius:50%"> <span>${chat.nombre}</span>`;
  cyRenderMessages();
}

function cyRenderMessages(){
  const cont = document.getElementById('chat-messages');
  const chat = CY_CHATS.find(c=>c.id===CY_ACTIVE_CHAT);
  if(!chat){
    cont.innerHTML = `<div class="chat-empty"><i class="fa-solid fa-comments" style="font-size:2rem"></i><p>Selecciona una conversación para empezar a chatear</p></div>`;
    return;
  }
  cont.innerHTML = chat.mensajes.map(m=>{
    const time = new Date(m.time).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
    if(m.type==='location'){
      return `<div class="msg ${m.from==='me'?'out':'in'}"><div class="msg-location"><i class="fa-solid fa-location-dot"></i> Ubicación compartida</div><time>${time}</time></div>`;
    }
    if(m.type==='file'){
      return `<div class="msg ${m.from==='me'?'out':'in'}"><div class="msg-file"><i class="fa-solid fa-file-pdf"></i> ${m.text}</div><time>${time}</time></div>`;
    }
    return `<div class="msg ${m.from==='me'?'out':'in'}">${m.text}<time>${time}</time></div>`;
  }).join('');
  cont.scrollTop = cont.scrollHeight;
}

function cySendMessage(text, type='text'){
  if(!CY_ACTIVE_CHAT) { cyToast('Selecciona una conversación primero','info'); return; }
  const chat = CY_CHATS.find(c=>c.id===CY_ACTIVE_CHAT);
  chat.mensajes.push({from:'me', text, type, time: Date.now()});
  cySaveChats(CY_CHATS);
  cyRenderMessages();
  cyRenderChatList();

  // respuesta automática simulada
  setTimeout(()=>{
    const reply = cyRand(CY_AUTORESPUESTAS);
    chat.mensajes.push({from:'them', text:reply, time: Date.now()});
    cySaveChats(CY_CHATS);
    if(CY_ACTIVE_CHAT===chat.id) cyRenderMessages();
    cyRenderChatList();
    cyAddNotif('fa-message', `${chat.nombre}: ${reply}`);
  }, cyRandInt(1200,2400));
}

function cyInitChatModule(){
  cyRenderChatList();
  cyRenderMessages();
  const input = document.getElementById('chat-input');
  document.getElementById('chat-send').onclick = ()=>{
    const val = input.value.trim();
    if(!val) return;
    cySendMessage(val);
    input.value='';
  };
  input.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ document.getElementById('chat-send').click(); } });
  document.getElementById('chat-location').onclick = ()=> cySendMessage('', 'location');
  document.getElementById('chat-attach').onclick = ()=> cySendMessage('comprobante_entrega.pdf', 'file');
}
