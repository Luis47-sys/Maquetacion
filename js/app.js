/* =====================================================================
   CARGAYA — app.js
   Orquestador principal: navegación entre pantallas, sidebar dinámico,
   tema claro/oscuro, landing dinámica, sesión y eventos globales.
===================================================================== */

/* ---------------- SIDEBAR POR ROL ---------------- */
const CY_SIDEBAR = {
  empresa: [
    {section:'Panel'},
    {view:'empresa-home', icon:'fa-house', label:'Inicio'},
    {view:'empresa-publicaciones', icon:'fa-box', label:'Mis publicaciones'},
    {view:'empresa-buscar', icon:'fa-magnifying-glass', label:'Buscar transportistas'},
    {view:'matching', icon:'fa-bolt', label:'Coincidencias'},
    {section:'Actividad'},
    {view:'empresa-historial', icon:'fa-clock-rotate-left', label:'Historial'},
    {view:'chat', icon:'fa-message', label:'Chat'},
    {section:'Cuenta'},
    {view:'perfil', icon:'fa-user', label:'Perfil'},
    {view:'config', icon:'fa-gear', label:'Configuración'}
  ],
  transportista: [
    {section:'Panel'},
    {view:'transportista-home', icon:'fa-house', label:'Inicio'},
    {view:'transportista-viajes', icon:'fa-route', label:'Mis viajes'},
    {view:'transportista-cargas', icon:'fa-boxes-stacked', label:'Cargas disponibles'},
    {view:'matching', icon:'fa-bolt', label:'Coincidencias'},
    {section:'Operación'},
    {view:'transportista-calendario', icon:'fa-calendar-days', label:'Calendario'},
    {view:'transportista-ingresos', icon:'fa-sack-dollar', label:'Ingresos'},
    {view:'vehiculos', icon:'fa-truck', label:'Vehículos'},
    {view:'documentos', icon:'fa-file-shield', label:'Documentos'},
    {view:'transportista-historial', icon:'fa-clock-rotate-left', label:'Historial'},
    {view:'chat', icon:'fa-message', label:'Chat'},
    {section:'Cuenta'},
    {view:'perfil', icon:'fa-user', label:'Perfil'},
    {view:'config', icon:'fa-gear', label:'Configuración'}
  ],
  admin: [
    {section:'Panel'},
    {view:'admin-home', icon:'fa-gauge-high', label:'Dashboard'},
    {view:'admin-usuarios', icon:'fa-users', label:'Usuarios'},
    {view:'admin-publicaciones', icon:'fa-box', label:'Publicaciones'},
    {view:'admin-viajes', icon:'fa-route', label:'Viajes'},
    {section:'Análisis'},
    {view:'admin-reportes', icon:'fa-chart-line', label:'Reportes'},
    {section:'Cuenta'},
    {view:'perfil', icon:'fa-user', label:'Perfil'},
    {view:'admin-config', icon:'fa-gear', label:'Configuraciones'}
  ]
};

let CY_CURRENT_VIEW = null;

function cyBuildSidebar(rol){
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = CY_SIDEBAR[rol].map(item=>{
    if(item.section) return `<div class="side-section-label">${item.section}</div>`;
    return `<a href="#" class="side-link" data-view="${item.view}"><i class="fa-solid ${item.icon}"></i> ${item.label}</a>`;
  }).join('');
  nav.querySelectorAll('.side-link').forEach(link=>{
    link.onclick = (e)=>{ e.preventDefault(); cyNavigate(link.dataset.view); };
  });
}

/* ---------------- NAVEGACIÓN ENTRE VISTAS ---------------- */
function cyNavigate(view){
  CY_CURRENT_VIEW = view;
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const target = document.getElementById('view-'+view);
  if(target) target.classList.add('active');
  document.querySelectorAll('.side-link').forEach(l=> l.classList.toggle('active', l.dataset.view===view));
  document.getElementById('shell-content').scrollTop = 0;
  document.getElementById('sidebar').classList.remove('open');
  cyRenderView(view);
}

function cyRenderView(view){
  const session = cyGetSession();
  if(!session) return;
  switch(view){
    case 'empresa-home': cyRenderEmpresaHome(); break;
    case 'empresa-publicaciones': cyRenderEmpresaPublicaciones(); break;
    case 'empresa-buscar': cyRenderBuscarTransportistas(); break;
    case 'empresa-historial': cyRenderHistorialEmpresa(); break;
    case 'matching': cyRenderMatching(); break;
    case 'chat': cyInitChatModule(); break;
    case 'perfil': cyRenderPerfil(); break;
    case 'transportista-home': cyRenderTransportistaHome(); break;
    case 'transportista-viajes': cyRenderTransportistaViajes(); break;
    case 'transportista-cargas': cyRenderCargasDisponibles(); break;
    case 'transportista-calendario': cyRenderCalendario(); break;
    case 'transportista-ingresos': cyRenderIngresos(); break;
    case 'vehiculos': cyRenderVehiculos(); break;
    case 'documentos': cyRenderDocumentos(); break;
    case 'transportista-historial': cyRenderHistorialTransportista(); break;
    case 'admin-home': cyRenderAdminHome(); break;
    case 'admin-usuarios': cyRenderAdminUsuarios(); break;
    case 'admin-publicaciones': cyRenderAdminPublicaciones(); break;
    case 'admin-viajes': cyRenderAdminViajes(); break;
    case 'admin-reportes': cyRenderAdminReportes(); break;
    case 'admin-config': cyInitAdminConfig(); break;
  }
}

/* ---------------- ENTRAR / SALIR DE LA APP ---------------- */
function cyEnterApp(user){
  document.body.classList.add('in-app');
  document.getElementById('user-avatar').src = user.avatar;
  document.getElementById('user-chip-name').textContent = user.nombre;
  document.getElementById('user-chip-role').textContent = user.rol;
  cyBuildSidebar(user.rol);
  cyRenderNotifs();
  const home = user.rol==='empresa' ? 'empresa-home' : user.rol==='transportista' ? 'transportista-home' : 'admin-home';
  cyNavigate(home);
  window.scrollTo(0,0);
}

/* ---------------- TEMA CLARO / OSCURO ---------------- */
function cyToggleTheme(){
  const html = document.documentElement;
  const next = html.dataset.theme==='dark' ? 'light' : 'dark';
  html.dataset.theme = next;
  localStorage.setItem('cargaya_theme', next);
  document.querySelectorAll('#theme-toggle i, #theme-toggle-2 i').forEach(i=>{
    i.className = next==='dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  });
  const configDark = document.getElementById('config-dark');
  if(configDark) configDark.checked = next==='dark';
  // re-render visuals affected by theme
  if(CY_CURRENT_VIEW) cyRenderView(CY_CURRENT_VIEW);
}

/* ---------------- LANDING: contenido dinámico ---------------- */
const TESTIMONIOS = [
  {nombre:'Rosa Medina', rol:'Gerente de Logística, Andes Logística', texto:'Desde que usamos CargaYa reducimos en 30% el costo de nuestros fletes interprovinciales.'},
  {nombre:'Jesús Paredes', rol:'Transportista independiente', texto:'Antes volvía vacío 3 de cada 5 viajes. Ahora casi siempre encuentro carga de retorno.'},
  {nombre:'Fiorella Campos', rol:'Directora de Operaciones, ExpoCarga', texto:'El matching es rapidísimo y el chat nos permite coordinar todo sin salir de la app.'},
  {nombre:'Alberto Núñez', rol:'Transportista, Tráiler 3 ejes', texto:'Mis ingresos mensuales subieron notablemente al ocupar los tramos de vuelta.'}
];
const FAQS = [
  {q:'¿CargaYa cobra comisión por cada envío?', a:'Sí, cobramos una pequeña comisión por transacción exitosa. No hay costos fijos ni membresías obligatorias.'},
  {q:'¿Cómo se calculan los precios sugeridos?', a:'Consideramos distancia, tipo de vehículo, peso y demanda de la ruta para sugerir un precio justo entre ambas partes.'},
  {q:'¿Qué pasa si una carga se cancela?', a:'Puedes cancelar antes de que el transportista inicie el viaje. El sistema notifica automáticamente a la otra parte.'},
  {q:'¿Los transportistas están verificados?', a:'Solicitamos documentos como licencia, SOAT y revisión técnica, validados por nuestro equipo antes de habilitar la cuenta.'},
  {q:'¿Puedo usar CargaYa en varias ciudades?', a:'Sí, la plataforma cubre rutas entre las principales ciudades y sigue expandiéndose.'}
];

function cyRenderTestimonios(){
  const track = document.getElementById('testimonial-track');
  if(!track) return;
  track.innerHTML = TESTIMONIOS.map(t=>`
    <div class="glass-card testimonial-card">
      <div class="testimonial-stars">★★★★★</div>
      <p class="testimonial-quote">"${t.texto}"</p>
      <div class="testimonial-person">
        <img src="${cyAvatar(t.nombre)}" alt="">
        <div><strong>${t.nombre}</strong><span>${t.rol}</span></div>
      </div>
    </div>
  `).join('');
}
function cyRenderFAQ(){
  const list = document.getElementById('faq-list');
  if(!list) return;
  list.innerHTML = FAQS.map((f,i)=>`
    <div class="faq-item">
      <button class="faq-q">${f.q} <i class="fa-solid fa-chevron-down"></i></button>
      <div class="faq-a"><p>${f.a}</p></div>
    </div>
  `).join('');
  list.querySelectorAll('.faq-item').forEach(item=>{
    item.querySelector('.faq-q').onclick = ()=> item.classList.toggle('open');
  });
}
function cyAnimateStats(){
  document.querySelectorAll('.stat-num').forEach(el=>{
    const target = Number(el.dataset.count);
    let cur = 0;
    const step = Math.max(1, Math.round(target/60));
    const iv = setInterval(()=>{
      cur += step;
      if(cur>=target){ cur=target; clearInterval(iv); }
      el.textContent = cur.toLocaleString('es-PE');
    }, 25);
  });
}

/* ---------------- GLOBAL SEARCH ---------------- */
function cyInitGlobalSearch(){
  const input = document.getElementById('global-search-input');
  if(!input) return;
  input.addEventListener('input', cyDebounce((e)=>{
    const q = e.target.value.trim();
    if(q.length<2) return;
    cyToast(`Buscando "${q}" en cargas, viajes y transportistas…`, 'info');
  }, 500));
}

/* ---------------- EXPORTAR (delegación global) ---------------- */
document.addEventListener('click', (e)=>{
  const expBtn = e.target.closest('[data-action="export-pdf"]');
  if(expBtn) cyExportPDF(expBtn.dataset.table, 'Historial CargaYa');
  const excBtn = e.target.closest('[data-action="export-excel"]');
  if(excBtn) cyExportExcel(excBtn.dataset.table, 'Historial_CargaYa');
});

/* ---------------- INIT ---------------- */
document.addEventListener('DOMContentLoaded', ()=>{
  // Tema guardado
  const savedTheme = localStorage.getItem('cargaya_theme') || 'dark';
  document.documentElement.dataset.theme = savedTheme;
  document.querySelectorAll('#theme-toggle i, #theme-toggle-2 i').forEach(i=>{
    i.className = savedTheme==='dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  });

  cyRenderTestimonios();
  cyRenderFAQ();
  cyAnimateStats();
  cyInitGlobalSearch();

  // Navbar acciones
  document.querySelectorAll('[data-action="open-login"]').forEach(b=> b.onclick = ()=> cyOpenLoginModal('empresa'));
  document.querySelectorAll('[data-action="open-register"]').forEach(b=> b.onclick = ()=> cyOpenRegisterModal(b.dataset.roleHint || 'empresa'));
  document.getElementById('theme-toggle').onclick = cyToggleTheme;
  document.getElementById('theme-toggle-2').onclick = cyToggleTheme;

  document.getElementById('burger-btn').onclick = ()=>{
    document.getElementById('nav-links').classList.toggle('open');
  };
  document.querySelectorAll('.lang-btn').forEach(btn=>{
    btn.onclick = ()=>{
      document.querySelectorAll('.lang-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      cyToast(btn.dataset.lang==='en' ? 'Language switched to English (demo)' : 'Idioma cambiado a Español', 'info');
    };
  });

  // Sidebar toggle móvil
  const sidebarToggle = document.getElementById('sidebar-toggle');
  if(sidebarToggle) sidebarToggle.onclick = ()=> document.getElementById('sidebar').classList.toggle('open');

  // Logout
  document.getElementById('logout-btn').onclick = cyLogout;

  // Sidebar brand -> landing
  document.querySelectorAll('[data-nav="landing"]').forEach(el=>{
    el.onclick = (e)=>{ e.preventDefault(); document.body.classList.remove('in-app'); window.scrollTo(0,0); };
  });

  // Notificaciones
  const bell = document.getElementById('notif-bell');
  const dropdown = document.getElementById('notif-dropdown');
  bell.onclick = (e)=>{ e.stopPropagation(); dropdown.classList.toggle('open'); CY.notificaciones.forEach(n=>n.leida=true); cyPersist(); cyRenderNotifs(); dropdown.classList.add('open'); };
  document.addEventListener('click', ()=> dropdown.classList.remove('open'));
  dropdown.addEventListener('click', e=> e.stopPropagation());
  document.getElementById('notif-clear').onclick = ()=>{ CY.notificaciones=[]; cyPersist(); cyRenderNotifs(); };

  // Botones de acción "publicar"
  document.body.addEventListener('click', (e)=>{
    if(e.target.closest('[data-action="open-publicar-carga"]')) cyOpenPublicarCarga();
    if(e.target.closest('[data-action="open-publicar-viaje"]')) cyOpenPublicarViaje();
    if(e.target.closest('[data-action="open-vehiculo"]')) cyOpenVehiculoModal();
    if(e.target.closest('[data-action="rerun-matching"]')) cyRenderMatching();
  });

  // Filtros que re-renderizan al escribir/cambiar
  const bindLive = (id, fn)=>{ const el = document.getElementById(id); if(el) el.addEventListener('input', cyDebounce(fn,250)); if(el && el.tagName==='SELECT') el.addEventListener('change', fn); };
  bindLive('filtro-carga-texto', cyRenderEmpresaPublicaciones);
  bindLive('filtro-carga-estado', cyRenderEmpresaPublicaciones);
  bindLive('filtro-carga-vehiculo', cyRenderEmpresaPublicaciones);
  bindLive('buscar-transportista-texto', cyRenderBuscarTransportistas);
  bindLive('buscar-transportista-vehiculo', cyRenderBuscarTransportistas);
  bindLive('historial-empresa-buscar', ()=>{ CY_HIST_EMPRESA_PAGE=1; cyRenderHistorialEmpresa(); });
  bindLive('filtro-viaje-texto', cyRenderTransportistaViajes);
  bindLive('filtro-viaje-estado', cyRenderTransportistaViajes);
  bindLive('historial-transportista-buscar', ()=>{ CY_HIST_TRANS_PAGE=1; cyRenderHistorialTransportista(); });
  bindLive('admin-usuarios-buscar', cyRenderAdminUsuarios);
  bindLive('admin-usuarios-filtro', cyRenderAdminUsuarios);

  // Calendario nav
  const calPrev = document.getElementById('cal-prev'), calNext = document.getElementById('cal-next');
  if(calPrev) calPrev.onclick = ()=>{ CY_CAL_DATE.setMonth(CY_CAL_DATE.getMonth()-1); cyRenderCalendario(); };
  if(calNext) calNext.onclick = ()=>{ CY_CAL_DATE.setMonth(CY_CAL_DATE.getMonth()+1); cyRenderCalendario(); };

  // Config dark mode switch
  const configDark = document.getElementById('config-dark');
  if(configDark){
    configDark.checked = savedTheme==='dark';
    configDark.onchange = cyToggleTheme;
  }

  // Sesión existente -> entrar directo
  const session = cyGetSession();
  if(session) cyEnterApp(session);

  // Ocultar loader inicial
  setTimeout(cyHideLoader, 700);
});
