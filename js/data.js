/* =====================================================================
   CARGAYA — data.js
   Datos ficticios + inicialización de localStorage.
   Todo el "backend" de este prototipo vive en localStorage bajo el
   namespace CY_DB. Nada se envía a ningún servidor.
===================================================================== */

const CY_DB_KEY = 'cargaya_db_v3';

// Identidad compartida de la cuenta demo de transportista (todo el prototipo
// simula una sola identidad de transportista, sin importar con qué cuenta
// se inicie sesión — así se mantiene consistente con el resto del código).
const CY_DEMO_TRANSPORTISTA_ID = 'demo-transportista';
// Horas de descanso obligatorio entre viajes/cargas (regla indicada por el docente).
const CY_HORAS_DESCANSO = 8;
// Máximo de horas de manejo acumuladas antes de forzar el descanso obligatorio.
// Un viaje largo (p.ej. Lima–Cusco) puede superar este máximo por sí solo;
// varios viajes cortos dentro del mismo departamento se van acumulando.
const CY_HORAS_MANEJO_MAX = 8;

// Ciudades y provincias agrupadas por departamento (no solo la capital de
// departamento) para poder distinguir viajes cortos dentro del mismo
// departamento de viajes largos entre departamentos distintos.
const CIUDADES = [
  // Lima
  {n:'Lima', lat:-12.0464, lng:-77.0428, dep:'Lima'},
  {n:'Huacho', lat:-11.1067, lng:-77.6053, dep:'Lima'},
  {n:'Cañete', lat:-13.0836, lng:-76.3839, dep:'Lima'},
  {n:'Barranca', lat:-10.7534, lng:-77.7639, dep:'Lima'},
  // La Libertad
  {n:'Trujillo', lat:-8.1116, lng:-79.0288, dep:'La Libertad'},
  {n:'Chepén', lat:-7.2222, lng:-79.4342, dep:'La Libertad'},
  {n:'Otuzco', lat:-7.8926, lng:-78.5638, dep:'La Libertad'},
  {n:'Pacasmayo', lat:-7.4009, lng:-79.5717, dep:'La Libertad'},
  // Lambayeque
  {n:'Chiclayo', lat:-6.7714, lng:-79.8409, dep:'Lambayeque'},
  {n:'Lambayeque', lat:-6.7011, lng:-79.9061, dep:'Lambayeque'},
  {n:'Ferreñafe', lat:-6.6389, lng:-79.7942, dep:'Lambayeque'},
  // Cusco
  {n:'Cusco', lat:-13.5320, lng:-71.9675, dep:'Cusco'},
  {n:'Urubamba', lat:-13.3050, lng:-72.1167, dep:'Cusco'},
  {n:'Sicuani', lat:-14.2694, lng:-71.2286, dep:'Cusco'},
  {n:'Quillabamba', lat:-12.8664, lng:-72.6925, dep:'Cusco'},
  // Piura
  {n:'Piura', lat:-5.1945, lng:-80.6328, dep:'Piura'},
  {n:'Sullana', lat:-4.9036, lng:-80.6845, dep:'Piura'},
  {n:'Talara', lat:-4.5772, lng:-81.2719, dep:'Piura'},
  {n:'Paita', lat:-5.0892, lng:-81.1144, dep:'Piura'},
  // Ica
  {n:'Ica', lat:-14.0678, lng:-75.7286, dep:'Ica'},
  {n:'Chincha Alta', lat:-13.4114, lng:-76.1331, dep:'Ica'},
  {n:'Pisco', lat:-13.7000, lng:-76.2000, dep:'Ica'},
  {n:'Nazca', lat:-14.8324, lng:-74.9394, dep:'Ica'},
  // Junín
  {n:'Huancayo', lat:-12.0651, lng:-75.2049, dep:'Junín'},
  {n:'Jauja', lat:-11.7767, lng:-75.4967, dep:'Junín'},
  {n:'Tarma', lat:-11.4194, lng:-75.6903, dep:'Junín'},
  {n:'La Merced', lat:-11.0564, lng:-75.3283, dep:'Junín'},
  // Tacna
  {n:'Tacna', lat:-18.0146, lng:-70.2536, dep:'Tacna'},
  {n:'Tarata', lat:-17.4667, lng:-70.0167, dep:'Tacna'},
  {n:'Locumba', lat:-17.6939, lng:-70.7472, dep:'Tacna'},
  // Ucayali
  {n:'Pucallpa', lat:-8.3791, lng:-74.5539, dep:'Ucayali'},
  {n:'Aguaytía', lat:-8.9711, lng:-75.5158, dep:'Ucayali'},
  {n:'Curimaná', lat:-8.7683, lng:-74.9308, dep:'Ucayali'},
  // Arequipa
  {n:'Arequipa', lat:-16.4090, lng:-71.5375, dep:'Arequipa'},
  {n:'Camaná', lat:-16.6231, lng:-72.7114, dep:'Arequipa'},
  {n:'Mollendo', lat:-17.0206, lng:-72.0147, dep:'Arequipa'},
  {n:'Chivay', lat:-15.6386, lng:-71.6017, dep:'Arequipa'}
];

function cyDepartamentoDe(nombreCiudad){
  const c = CIUDADES.find(x=>x.n.toLowerCase()===String(nombreCiudad||'').toLowerCase());
  return c ? c.dep : null;
}
function cyMismoDepartamento(ciudadA, ciudadB){
  const a = cyDepartamentoDe(ciudadA), b = cyDepartamentoDe(ciudadB);
  return !!a && !!b && a===b;
}

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
      transportistaAsignadoId: null,
      fechaAceptada: null,
      fechaFinalizada: null,
      creado: cyFechaFutura(-cyRandInt(1,60))
    });
  }

  // --- Viajes de retorno (transportistas) ---
  // Nota: al sembrar datos de ejemplo evitamos dejar al transportista demo
  // con un viaje ya "en curso" (aceptada/camino/entregada), para que un
  // usuario de prueba siempre empiece con disponibilidad libre.
  for(let i=0;i<20;i++){
    const origen = cyRand(CIUDADES), destino = cyRand(CIUDADES.filter(c=>c.n!==origen.n));
    viajes.push({
      id: cyId('VIAJE'),
      transportistaId: CY_DEMO_TRANSPORTISTA_ID,
      transportistaNombre: 'Mi Cuenta Demo',
      origen: origen.n, destino: destino.n,
      origenLat:origen.lat, origenLng:origen.lng, destinoLat:destino.lat, destinoLng:destino.lng,
      fecha: cyFechaFutura(20),
      capacidadPeso: cyRandInt(1000,15000),
      capacidadVolumen: cyRandInt(5,50),
      vehiculo: cyRand(TIPOS_VEHICULO),
      precioSugerido: cyRandInt(400,3000),
      estado: cyRand(['pendiente','busqueda','encontrado','finalizada','cancelada']),
      empresaAsignada: null,
      fechaAceptada: null,
      fechaFinalizada: null,
      creado: cyFechaFutura(-cyRandInt(1,60))
    });
  }

  // --- Notificaciones iniciales ---
  const plantillasNotif = [
    {icon:'fa-route', text:'Nueva coincidencia encontrada para tu carga Lima → Trujillo', view:'matching'},
    {icon:'fa-check', text:'Tu viaje de retorno fue aceptado por Andes Logística SAC', view:'transportista-viajes'},
    {icon:'fa-message', text:'Tienes un nuevo mensaje de Carlos Ramírez', view:'chat'},
    {icon:'fa-star', text:'Recibiste una calificación de 5 estrellas', view:'perfil'},
    {icon:'fa-truck', text:'La carga CARGA-9F2A1 cambió a estado "En camino"', view:'transportista-cargas'}
  ];
  plantillasNotif.forEach((p,i)=>{
    notificaciones.push({id:cyId('NOT'), icon:p.icon, text:p.text, view:p.view||null, leida:i>2, fecha:Date.now()-i*3600000});
  });

  return {
    empresas, transportistas, publicaciones, viajes, matches, chats, notificaciones, historialEventos: [],
    // Estado de manejo/descanso del transportista demo: horas acumuladas de
    // manejo desde su último descanso completo, y hasta cuándo debe descansar
    // (null si no está en descanso obligatorio).
    transportistaEstado: { horasAcumuladas: 0, descansoHasta: null }
  };
}

function cyNormalizeDB(db){
  if(!db.transportistaEstado) db.transportistaEstado = { horasAcumuladas: 0, descansoHasta: null };
  return db;
}
function cyLoadDB(){
  let raw = localStorage.getItem(CY_DB_KEY);
  if(!raw){
    const fresh = seedDB();
    localStorage.setItem(CY_DB_KEY, JSON.stringify(fresh));
    return fresh;
  }
  try{ return cyNormalizeDB(JSON.parse(raw)); }catch(e){ const fresh = seedDB(); localStorage.setItem(CY_DB_KEY, JSON.stringify(fresh)); return fresh; }
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

// ---- Documentos del transportista (licencia, SOAT, etc.) ----
// Se pueden subir archivos reales (PDF/imagen), guardados como data URL en
// localStorage. `estado` empieza en 'sin_subir' hasta que se sube un archivo.
const CY_DOCS_KEY = 'cargaya_docs_v1';
const CY_DOCS_DEFAULT = [
  {id:'licencia', nombre:'Licencia de conducir', icon:'fa-id-card', estado:'sin_subir', archivo:null, archivoNombre:null, archivoTipo:null, fechaSubida:null},
  {id:'soat', nombre:'SOAT vigente', icon:'fa-file-shield', estado:'sin_subir', archivo:null, archivoNombre:null, archivoTipo:null, fechaSubida:null},
  {id:'tarjeta', nombre:'Tarjeta de propiedad', icon:'fa-file-lines', estado:'sin_subir', archivo:null, archivoNombre:null, archivoTipo:null, fechaSubida:null},
  {id:'revision', nombre:'Revisión técnica', icon:'fa-clipboard-check', estado:'sin_subir', archivo:null, archivoNombre:null, archivoTipo:null, fechaSubida:null},
  {id:'fumigacion', nombre:'Certificado de fumigación', icon:'fa-file-circle-xmark', estado:'sin_subir', archivo:null, archivoNombre:null, archivoTipo:null, fechaSubida:null}
];
function cyLoadDocs(){
  let raw = localStorage.getItem(CY_DOCS_KEY);
  if(!raw){
    const seed = JSON.parse(JSON.stringify(CY_DOCS_DEFAULT));
    localStorage.setItem(CY_DOCS_KEY, JSON.stringify(seed));
    return seed;
  }
  try{ return JSON.parse(raw); }catch(e){ return JSON.parse(JSON.stringify(CY_DOCS_DEFAULT)); }
}
function cySaveDocs(d){ localStorage.setItem(CY_DOCS_KEY, JSON.stringify(d)); }
let CY_DOCS = cyLoadDocs();
