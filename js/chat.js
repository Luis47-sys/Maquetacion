/* =====================================================================
   CARGAYA — chat.js
   Chat real entre empresa y transportista (sin respuestas automáticas):
   cada hilo pertenece a una empresa y un transportista concretos, y los
   mensajes se guardan con quién los escribió. Al iniciar sesión con una
   cuenta ves el hilo desde tu lado; para "responder del otro lado" hay
   que cerrar sesión y entrar con la otra cuenta — así ambas partes
   conversan de verdad sobre localStorage, sin nada simulado.
===================================================================== */

const CY_CHAT_KEY = 'cargaya_chats_v2';

function cyLoadChats(){
  let raw = localStorage.getItem(CY_CHAT_KEY);
  if(!raw){
    const t0 = Date.now();
    const seed = [
      { id:cyId('CHAT'), empresaNombre:'Mi Empresa Demo', empresaAvatar:cyAvatar('Mi Empresa Demo'), transportistaNombre:'Carlos Ramírez', transportistaAvatar:cyAvatar('Carlos Ramírez'), mensajes:[
        {from:'transportista', text:'Hola, vi tu publicación en CargaYa. ¿Sigue disponible?', time:t0-3600000*5},
        {from:'empresa', text:'¡Hola! Sí, todavía está disponible.', time:t0-3600000*4}
      ]},
      { id:cyId('CHAT'), empresaNombre:'Mi Empresa Demo', empresaAvatar:cyAvatar('Mi Empresa Demo'), transportistaNombre:'María Torres', transportistaAvatar:cyAvatar('María Torres'), mensajes:[
        {from:'transportista', text:'Buenas, tengo disponibilidad para esa ruta la próxima semana.', time:t0-3600000*8}
      ]},
      { id:cyId('CHAT'), empresaNombre:'Andes Logística SAC', empresaAvatar:cyAvatar('Andes Logística SAC'), transportistaNombre:'Mi Cuenta Demo', transportistaAvatar:cyAvatar('Mi Cuenta Demo'), mensajes:[
        {from:'empresa', text:'Hola, vimos tu viaje de retorno publicado. ¿Podrías llevar una carga de textiles?', time:t0-3600000*6},
        {from:'transportista', text:'Claro, cuéntame el peso y la fecha para revisar.', time:t0-3600000*5}
      ]},
      { id:cyId('CHAT'), empresaNombre:'Mi Empresa Demo', empresaAvatar:cyAvatar('Mi Empresa Demo'), transportistaNombre:'Jorge Quispe', transportistaAvatar:cyAvatar('Jorge Quispe'), mensajes:[
        {from:'transportista', text:'¿A qué hora abren para la carga y descarga?', time:t0-3600000*9}
      ]},
      { id:cyId('CHAT'), empresaNombre:'ExpoCarga Perú', empresaAvatar:cyAvatar('ExpoCarga Perú'), transportistaNombre:'Mi Cuenta Demo', transportistaAvatar:cyAvatar('Mi Cuenta Demo'), mensajes:[
        {from:'empresa', text:'Buen día, ¿tu camión soporta 8 toneladas?', time:t0-3600000*10}
      ]}
    ];
    localStorage.setItem(CY_CHAT_KEY, JSON.stringify(seed));
    return seed;
  }
  try{ return JSON.parse(raw); }catch(e){ return []; }
}
function cySaveChats(c){ localStorage.setItem(CY_CHAT_KEY, JSON.stringify(c)); }
let CY_CHATS = cyLoadChats();
let CY_ACTIVE_CHAT = null;

// Datos de "mi lado" y "la contraparte" de un chat, según el rol con el que
// se inició sesión (empresa ve al transportista y viceversa).
function cyChatPerspectiva(chat){
  const session = cyGetSession();
  const miRol = session.rol;
  const otroRol = miRol==='empresa' ? 'transportista' : 'empresa';
  return {
    miRol, otroRol,
    miNombre: chat[miRol+'Nombre'],
    contraparteNombre: chat[otroRol+'Nombre'],
    contraparteAvatar: chat[otroRol+'Avatar']
  };
}
function cyMisChats(){
  const session = cyGetSession();
  if(!session) return [];
  return CY_CHATS.filter(c => c[session.rol+'Nombre'] === session.nombre);
}

function cyRenderChatList(){
  const list = document.getElementById('chat-list');
  if(!list) return;
  const mios = cyMisChats().sort((a,b)=>{
    const la = a.mensajes[a.mensajes.length-1], lb = b.mensajes[b.mensajes.length-1];
    return (lb?lb.time:0) - (la?la.time:0);
  });
  list.innerHTML = mios.map(c=>{
    const {miRol, contraparteNombre, contraparteAvatar} = cyChatPerspectiva(c);
    const last = c.mensajes[c.mensajes.length-1];
    return `<div class="chat-list-item ${CY_ACTIVE_CHAT===c.id?'active':''}" data-chat="${c.id}">
      <img src="${contraparteAvatar}" alt="">
      <div class="cl-info"><strong>${contraparteNombre}</strong><p>${last? (last.from===miRol?'Tú: ':'')+(last.type==='location'?'📍 Ubicación':last.type==='file'?'📎 '+last.text:last.text) : 'Sin mensajes'}</p></div>
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
  const {contraparteNombre, contraparteAvatar} = cyChatPerspectiva(chat);
  const esParDemo = chat.empresaNombre==='Mi Empresa Demo' && chat.transportistaNombre==='Mi Cuenta Demo';
  head.innerHTML = `<img src="${contraparteAvatar}" style="width:34px;height:34px;border-radius:50%">
    <div><span>${contraparteNombre}</span>${esParDemo?'<div class="chat-head-hint">Chat real · cierra sesión y entra con la otra cuenta demo para responder</div>':''}</div>`;
  cyRenderMessages();
}

function cyRenderMessages(){
  const cont = document.getElementById('chat-messages');
  const chat = CY_CHATS.find(c=>c.id===CY_ACTIVE_CHAT);
  if(!chat){
    cont.innerHTML = `<div class="chat-empty"><i class="fa-solid fa-comments" style="font-size:2rem"></i><p>Selecciona una conversación para empezar a chatear</p></div>`;
    return;
  }
  const {miRol} = cyChatPerspectiva(chat);
  cont.innerHTML = chat.mensajes.map(m=>{
    const time = new Date(m.time).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
    const dir = m.from===miRol ? 'out' : 'in';
    if(m.type==='location'){
      return `<div class="msg ${dir}"><div class="msg-location"><i class="fa-solid fa-location-dot"></i> Ubicación compartida</div><time>${time}</time></div>`;
    }
    if(m.type==='file'){
      return `<div class="msg ${dir}"><div class="msg-file"><i class="fa-solid fa-file-pdf"></i> ${m.text}</div><time>${time}</time></div>`;
    }
    return `<div class="msg ${dir}">${m.text}<time>${time}</time></div>`;
  }).join('');
  cont.scrollTop = cont.scrollHeight;
}

function cySendMessage(text, type='text'){
  if(!CY_ACTIVE_CHAT) { cyToast('Selecciona una conversación primero','info'); return; }
  const chat = CY_CHATS.find(c=>c.id===CY_ACTIVE_CHAT);
  const {miRol, contraparteNombre} = cyChatPerspectiva(chat);
  chat.mensajes.push({from: miRol, text, type, time: Date.now()});
  cySaveChats(CY_CHATS);
  cyRenderMessages();
  cyRenderChatList();
  const esParDemo = chat.empresaNombre==='Mi Empresa Demo' && chat.transportistaNombre==='Mi Cuenta Demo';
  if(esParDemo){
    cyToast(`Mensaje enviado a ${contraparteNombre}. Cierra sesión y entra con esa cuenta para responder.`, 'info');
  }
}

// Busca (o crea) el chat entre mi cuenta y esa contraparte y, si se indica,
// le agrega un primer mensaje de contexto (p.ej. al aceptar una carga).
// No navega — úsalo cuando quieras dejar el hilo listo sin sacar al usuario
// de la pantalla en la que está. No genera ninguna respuesta automática.
function cyAsegurarChatCon(contraparteNombre, contraparteAvatar, contextMsg){
  const session = cyGetSession();
  const miRol = session.rol;
  const otroRol = miRol==='empresa' ? 'transportista' : 'empresa';
  let chat = CY_CHATS.find(c => c[miRol+'Nombre']===session.nombre && c[otroRol+'Nombre']===contraparteNombre);
  if(!chat){
    chat = {
      id: cyId('CHAT'),
      empresaNombre: miRol==='empresa' ? session.nombre : contraparteNombre,
      empresaAvatar: miRol==='empresa' ? session.avatar : (contraparteAvatar || cyAvatar(contraparteNombre)),
      transportistaNombre: miRol==='transportista' ? session.nombre : contraparteNombre,
      transportistaAvatar: miRol==='transportista' ? session.avatar : (contraparteAvatar || cyAvatar(contraparteNombre)),
      mensajes: []
    };
    CY_CHATS.unshift(chat);
  }
  if(contextMsg){
    chat.mensajes.push({from: miRol, text: contextMsg, time: Date.now()});
  }
  cySaveChats(CY_CHATS);
  return chat;
}

// Igual que cyAsegurarChatCon, pero además navega directo a esa conversación
// — así el botón "Chat" siempre abre la charla real con esa contraparte.
function cyAbrirChatCon(contraparteNombre, contraparteAvatar, contextMsg){
  const chat = cyAsegurarChatCon(contraparteNombre, contraparteAvatar, contextMsg);
  cyNavigate('chat');
  cyOpenChat(chat.id);
  return chat;
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
