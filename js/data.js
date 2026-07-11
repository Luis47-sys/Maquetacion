/* =====================================================================
   CARGAYA — data.js
   Datos ficticios + inicialización de localStorage.
   Todo el "backend" de este prototipo vive en localStorage bajo el
   namespace CY_DB. Nada se envía a ningún servidor.
===================================================================== */

const CY_DB_KEY = 'cargaya_db_v1';

const CIUDADES = [
  {n:'Lima', lat:-12.0464, lng:-77.0428},
  {n:'Arequipa', lat:-16.4090, lng:-71.5375},
  {n:'Trujillo', lat:-8.1116, lng:-79.0288},
  {n:'Chiclayo', lat:-6.7714, lng:-79.8409},
  {n:'Cusco', lat:-13.5320, lng:-71.9675},
  {n:'Piura', lat:-5.1945, lng:-80.6328},
  {n:'Ica', lat:-14.0678, lng:-75.7286},
  {n:'Huancayo', lat:-12.0651, lng:-75.2049},
  {n:'Tacna', lat:-18.0146, lng:-70.2536},
  {n:'Pucallpa', lat:-8.3791, lng:-74.5539}
];

const TIPOS_VEHICULO = ['Furgón', 'Camión 2 ejes', 'Camión 3 ejes', 'Tráiler', 'Camioneta', 'Cisterna'];

const ESTADOS_CARGA = ['pendiente','busqueda','encontrado','aceptada','camino','entregada','finalizada','cancelada'];
const ESTADO_LABEL = {
  pendiente:'Pendiente', busqueda:'En búsqueda', encontrado:'Transportista encontrado',
  aceptada:'Aceptada', camino:'En camino', entregada:'Entregada', finalizada:'Finalizada', cancelada:'Cancelada'
};
const ESTADO_ORDEN = ['pendiente','busqueda','encontrado','aceptada','camino','entregada','finalizada'];

function cyRand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function cyRandInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function cyId(prefix){ return prefix + '-' + Math.random().toString(36).slice(2,7).toUpperCase(); }
function cyAvatar(seed){ return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`; }
function cyFechaFutura(diasMax=30){
  const d = new Date();
  d.setDate(d.getDate() + cyRandInt(-5, diasMax));
  return d.toISOString().slice(0,10);
}
function cyFormatoFecha(iso){
  const d = new Date(iso+'T00:00:00');
  return d.toLocaleDateString('es-PE', {day:'2-digit', month:'short', year:'numeric'});
}
function cyMoney(n){ return 'S/ ' + Number(n).toLocaleString('es-PE', {minimumFractionDigits:0}); }

const NOMBRES_EMPRESA = ['Andes Logística SAC','ExpoCarga Perú','TransPacífico EIRL','Ruta Norte Cargo','Distribuidora Sur','Comercial Amazonas','Industrias Delta','Grupo Cordillera','Agroexport Ica','Textiles del Valle'];
const NOMBRES_PERSONA = ['Carlos Ramírez','María Torres','Jorge Quispe','Lucía Fernández','Pedro Salazar','Ana Huamán','Miguel Rojas','Sofía Vargas','Diego Castro','Valeria Mendoza','Renzo Flores','Karen Chávez'];

function seedDB(){
  const empresas = [];
  const transportistas = [];
  const publicaciones = [];
  const viajes = [];
  const matches = [];
  const chats = [];
  const notificaciones = [];

  // --- Empresas ficticias (para admin y buscar-transportista mock) ---
  NOMBRES_EMPRESA.forEach((nombre,i)=>{
    empresas.push({
      id: 'EMP-' + (1000+i),
      nombre, ruc: '20' + cyRandInt(100000000,999999999),
      correo: nombre.split(' ')[0].toLowerCase()+ i +'@empresa.com',
      telefono: '9' + cyRandInt(10000000,99999999),
      direccion: cyRand(CIUDADES).n + ', Av. Industrial ' + cyRandInt(100,999),
      estado: Math.random()>0.15 ? 'activo':'inactivo',
      avatar: cyAvatar(nombre),
      creado: cyFechaFutura(-cyRandInt(10,300))
    });
  });

  // --- Transportistas ficticios ---
  NOMBRES_PERSONA.forEach((nombre,i)=>{
    transportistas.push({
      id: 'TRA-' + (2000+i),
      nombre, dni: '' + cyRandInt(10000000,99999999),
      correo: nombre.split(' ')[0].toLowerCase()+i+'@transporte.com',
      telefono: '9' + cyRandInt(10000000,99999999),
      vehiculo: cyRand(TIPOS_VEHICULO),
      calificacion: (Math.random()*1.5+3.5).toFixed(1),
      viajes: cyRandInt(12,340),
      estado: Math.random()>0.1 ? 'activo':'inactivo',
      avatar: cyAvatar(nombre),
      ciudadBase: cyRand(CIUDADES).n,
      creado: cyFechaFutura(-cyRandInt(10,300))
    });
  });

  // --- Publicaciones de carga (empresas) ---
  for(let i=0;i<26;i++){
    const origen = cyRand(CIUDADES), destino = cyRand(CIUDADES.filter(c=>c.n!==origen.n));
    publicaciones.push({
      id: cyId('CARGA'),
      empresaId: 'demo-empresa',
      empresaNombre: 'Mi Empresa Demo',
      origen: origen.n, destino: destino.n,
      origenLat:origen.lat, origenLng:origen.lng, destinoLat:destino.lat, destinoLng:destino.lng,
      fecha: cyFechaFutura(20),
      peso: cyRandInt(300, 12000),
      volumen: cyRandInt(2,40),
      vehiculo: cyRand(TIPOS_VEHICULO),
      descripcion: cyRand(['Textiles empacados','Electrodomésticos','Insumos agrícolas','Material de construcción','Productos envasados','Repuestos industriales']),
      precio: cyRandInt(400,3200),
      estado: cyRand(ESTADOS_CARGA.slice(0,6)),
      transportistaAsignado: null,
      creado: cyFechaFutura(-cyRandInt(1,60))
    });
  }

  // --- Viajes de retorno (transportistas) ---
  for(let i=0;i<20;i++){
    const origen = cyRand(CIUDADES), destino = cyRand(CIUDADES.filter(c=>c.n!==origen.n));
    viajes.push({
      id: cyId('VIAJE'),
      transportistaId: 'demo-transportista',
      transportistaNombre: 'Mi Cuenta Demo',
      origen: origen.n, destino: destino.n,
      origenLat:origen.lat, origenLng:origen.lng, destinoLat:destino.lat, destinoLng:destino.lng,
      fecha: cyFechaFutura(20),
      capacidadPeso: cyRandInt(1000,15000),
      capacidadVolumen: cyRandInt(5,50),
      vehiculo: cyRand(TIPOS_VEHICULO),
      precioSugerido: cyRandInt(400,3000),
      estado: cyRand(['pendiente','busqueda','encontrado','aceptada','camino','entregada','finalizada']),
      empresaAsignada: null,
      creado: cyFechaFutura(-cyRandInt(1,60))
    });
  }

  // --- Notificaciones iniciales ---
  const plantillasNotif = [
    {icon:'fa-route', text:'Nueva coincidencia encontrada para tu carga Lima → Trujillo'},
    {icon:'fa-check', text:'Tu viaje de retorno fue aceptado por Andes Logística SAC'},
    {icon:'fa-message', text:'Tienes un nuevo mensaje de Carlos Ramírez'},
    {icon:'fa-star', text:'Recibiste una calificación de 5 estrellas'},
    {icon:'fa-truck', text:'La carga CARGA-9F2A1 cambió a estado "En camino"'}
  ];
  plantillasNotif.forEach((p,i)=>{
    notificaciones.push({id:cyId('NOT'), icon:p.icon, text:p.text, leida:i>2, fecha:Date.now()-i*3600000});
  });

  return { empresas, transportistas, publicaciones, viajes, matches, chats, notificaciones, historialEventos: [] };
}

function cyLoadDB(){
  let raw = localStorage.getItem(CY_DB_KEY);
  if(!raw){
    const fresh = seedDB();
    localStorage.setItem(CY_DB_KEY, JSON.stringify(fresh));
    return fresh;
  }
  try{ return JSON.parse(raw); }catch(e){ const fresh = seedDB(); localStorage.setItem(CY_DB_KEY, JSON.stringify(fresh)); return fresh; }
}
function cySaveDB(db){ localStorage.setItem(CY_DB_KEY, JSON.stringify(db)); }

// DB en memoria (se sincroniza con localStorage tras cada cambio)
let CY = cyLoadDB();
function cyPersist(){ cySaveDB(CY); }

// ---- Usuarios (auth) ----
const CY_USERS_KEY = 'cargaya_users_v1';
function cyLoadUsers(){
  let raw = localStorage.getItem(CY_USERS_KEY);
  if(!raw){
    const seedUsers = [
      {id:'demo-empresa', rol:'empresa', nombre:'Mi Empresa Demo', ruc:'20123456789', correo:'empresa@demo.com', pass:'123456', telefono:'987654321', direccion:'Lima, Av. Principal 123', avatar: cyAvatar('Mi Empresa Demo')},
      {id:'demo-transportista', rol:'transportista', nombre:'Mi Cuenta Demo', dni:'45678912', correo:'transportista@demo.com', pass:'123456', telefono:'987654322', vehiculo:'Camión 3 ejes', avatar: cyAvatar('Mi Cuenta Demo')},
      {id:'demo-admin', rol:'admin', nombre:'Administrador CargaYa', correo:'admin@demo.com', pass:'123456', telefono:'987654323', avatar: cyAvatar('Administrador CargaYa')}
    ];
    localStorage.setItem(CY_USERS_KEY, JSON.stringify(seedUsers));
    return seedUsers;
  }
  try{ return JSON.parse(raw); }catch(e){ return []; }
}
function cySaveUsers(u){ localStorage.setItem(CY_USERS_KEY, JSON.stringify(u)); }
let CY_USERS = cyLoadUsers();

const CY_SESSION_KEY = 'cargaya_session_v1';
function cyGetSession(){ try{ return JSON.parse(localStorage.getItem(CY_SESSION_KEY)); }catch(e){ return null; } }
function cySetSession(user){ localStorage.setItem(CY_SESSION_KEY, JSON.stringify(user)); }
function cyClearSession(){ localStorage.removeItem(CY_SESSION_KEY); }

// ---- Vehículos y documentos por transportista (demo) ----
const CY_VEH_KEY = 'cargaya_vehiculos_v1';
function cyLoadVehiculos(){
  let raw = localStorage.getItem(CY_VEH_KEY);
  if(!raw){
    const seed = [
      {id:cyId('VEH'), placa:'ABC-123', modelo:'Volvo FH 2020', capacidad:12000, peso:9000, tipo:'Tráiler'},
      {id:cyId('VEH'), placa:'XYZ-987', modelo:'Hino 500 2019', capacidad:6000, peso:4000, tipo:'Camión 2 ejes'}
    ];
    localStorage.setItem(CY_VEH_KEY, JSON.stringify(seed));
    return seed;
  }
  try{ return JSON.parse(raw); }catch(e){ return []; }
}
function cySaveVehiculos(v){ localStorage.setItem(CY_VEH_KEY, JSON.stringify(v)); }
let CY_VEHICULOS = cyLoadVehiculos();

const CY_DOCS = [
  {nombre:'Licencia de conducir', estado:'aprobado', icon:'fa-id-card'},
  {nombre:'SOAT vigente', estado:'aprobado', icon:'fa-file-shield'},
  {nombre:'Tarjeta de propiedad', estado:'pendiente', icon:'fa-file-lines'},
  {nombre:'Revisión técnica', estado:'aprobado', icon:'fa-clipboard-check'},
  {nombre:'Certificado de fumigación', estado:'rechazado', icon:'fa-file-circle-xmark'}
];
