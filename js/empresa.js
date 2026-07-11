/* =====================================================================
   CARGAYA — empresa.js
   Lógica del dashboard de EMPRESA: publicar/editar/eliminar/duplicar carga,
   historial, búsqueda de transportistas, perfil.
===================================================================== */

let CY_HIST_EMPRESA_PAGE = 1;
const CY_HIST_PER_PAGE = 8;

function cyMisPublicaciones(){
  return CY.publicaciones.filter(p=>p.empresaId==='demo-empresa');
}

function cyRenderEmpresaHome(){
  const session = cyGetSession();
  document.getElementById('empresa-nombre-home').textContent = session.nombre.split(' ')[0];
  const mias = cyMisPublicaciones();
  const activas = mias.filter(p=>!['finalizada','cancelada'].includes(p.estado));
  const entregadas = mias.filter(p=>p.estado==='finalizada');
  const totalGastado = mias.reduce((s,p)=>s+(p.estado==='finalizada'?p.precio:0),0);

  document.getElementById('empresa-kpis').innerHTML = `
    ${cyKpi('fa-box-open', mias.length, 'Publicaciones totales', 'up', '+12%')}
    ${cyKpi('fa-truck', activas.length, 'En proceso', 'up', '+4%')}
    ${cyKpi('fa-circle-check', entregadas.length, 'Entregas completadas', 'up', '+9%')}
    ${cyKpi('fa-sack-dollar', cyMoney(totalGastado), 'Invertido en fletes', 'down', '-2%')}
  `;

  const recientes = [...mias].sort((a,b)=> b.creado.localeCompare(a.creado)).slice(0,5);
  document.getElementById('empresa-recientes').innerHTML = recientes.length ? recientes.map(p=>`
    <div class="mini-item">
      <div class="ni-icon" style="background:rgba(255,176,32,.15);color:#FFB020;width:34px;height:34px;border-radius:9px;display:grid;place-items:center"><i class="fa-solid fa-box"></i></div>
      <div class="mi-route"><strong>${p.origen} → ${p.destino}</strong><span>${cyFormatoFecha(p.fecha)} · ${p.vehiculo}</span></div>
      ${cyBadge(p.estado)}
    </div>
  `).join('') : `<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Aún no tienes publicaciones</p></div>`;

  if(mias[0]){
    cyRenderRouteMap('map-empresa-home', {n:mias[0].origen, lat:mias[0].origenLat, lng:mias[0].origenLng}, {n:mias[0].destino, lat:mias[0].destinoLat, lng:mias[0].destinoLng});
  }
}

function cyKpi(icon, value, label, trend, trendVal){
  return `<div class="glass-card kpi-card">
    <div class="kpi-top"><div class="kpi-icon"><i class="fa-solid ${icon}"></i></div><span class="kpi-trend ${trend}"><i class="fa-solid fa-arrow-${trend}"></i> ${trendVal}</span></div>
    <div class="kpi-value">${value}</div><div class="kpi-label">${label}</div>
  </div>`;
}

/* ---------------- PUBLICACIONES: render + filtros ---------------- */
function cyPoblarSelectsFiltros(){
  const estadoSel = document.getElementById('filtro-carga-estado');
  if(estadoSel && estadoSel.options.length<=1){
    ESTADOS_CARGA.forEach(e=> estadoSel.innerHTML += `<option value="${e}">${ESTADO_LABEL[e]}</option>`);
  }
  const vehSel = document.getElementById('filtro-carga-vehiculo');
  if(vehSel && vehSel.options.length<=1){
    TIPOS_VEHICULO.forEach(v=> vehSel.innerHTML += `<option value="${v}">${v}</option>`);
  }
  const vehSel2 = document.getElementById('buscar-transportista-vehiculo');
  if(vehSel2 && vehSel2.options.length<=1){
    TIPOS_VEHICULO.forEach(v=> vehSel2.innerHTML += `<option value="${v}">${v}</option>`);
  }
  const vSelViaje = document.getElementById('filtro-viaje-estado');
  if(vSelViaje && vSelViaje.options.length<=1){
    ESTADOS_CARGA.forEach(e=> vSelViaje.innerHTML += `<option value="${e}">${ESTADO_LABEL[e]}</option>`);
  }
}

function cyRenderEmpresaPublicaciones(){
  cyPoblarSelectsFiltros();
  const texto = (document.getElementById('filtro-carga-texto').value||'').toLowerCase();
  const estado = document.getElementById('filtro-carga-estado').value;
  const veh = document.getElementById('filtro-carga-vehiculo').value;

  let list = cyMisPublicaciones().filter(p=>{
    const matchText = !texto || (p.origen+p.destino+p.empresaNombre).toLowerCase().includes(texto);
    const matchEstado = !estado || p.estado===estado;
    const matchVeh = !veh || p.vehiculo===veh;
    return matchText && matchEstado && matchVeh;
  }).sort((a,b)=> b.creado.localeCompare(a.creado));

  const grid = document.getElementById('empresa-publicaciones-grid');
  if(list.length===0){ grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-box-open"></i><p>No hay publicaciones con esos filtros. ¡Prueba publicar una nueva carga!</p></div>`; return; }

  grid.innerHTML = list.map(p=>`
    <div class="glass-card item-card" data-id="${p.id}">
      <div class="item-card-head">
        <div class="item-route"><i class="fa-solid fa-location-dot"></i> ${p.origen} <i class="fa-solid fa-arrow-right" style="font-size:.7rem"></i> ${p.destino}</div>
        ${cyBadge(p.estado)}
      </div>
      <div class="item-meta">
        <span><i class="fa-solid fa-calendar"></i> ${cyFormatoFecha(p.fecha)}</span>
        <span><i class="fa-solid fa-weight-hanging"></i> ${p.peso} kg</span>
        <span><i class="fa-solid fa-cube"></i> ${p.volumen} m³</span>
        <span><i class="fa-solid fa-truck"></i> ${p.vehiculo}</span>
      </div>
      <div class="item-progress"><div class="item-progress-bar" style="width:${cyProgressPercent(p.estado)}%"></div></div>
      <div class="item-price">${cyMoney(p.precio)}</div>
      <div class="item-actions">
        ${cyEstadoBotonSiguiente(p)}
        <button class="btn btn-outline btn-sm" data-action="editar-carga" data-id="${p.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-outline btn-sm" data-action="duplicar-carga" data-id="${p.id}"><i class="fa-solid fa-copy"></i></button>
        <button class="btn btn-danger btn-sm" data-action="eliminar-carga" data-id="${p.id}"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `).join('');

  cyBindPublicacionActions(grid);
}

function cyEstadoBotonSiguiente(p){
  const idx = ESTADO_ORDEN.indexOf(p.estado);
  if(p.estado==='cancelada' || p.estado==='finalizada') return '';
  const siguiente = ESTADO_ORDEN[idx+1];
  if(!siguiente) return '';
  return `<button class="btn btn-primary btn-sm" data-action="avanzar-estado" data-id="${p.id}"><i class="fa-solid fa-forward"></i> ${ESTADO_LABEL[siguiente]}</button>`;
}

function cyBindPublicacionActions(scope){
  scope.querySelectorAll('[data-action="avanzar-estado"]').forEach(btn=>{
    btn.onclick = ()=>{
      const p = CY.publicaciones.find(x=>x.id===btn.dataset.id);
      const idx = ESTADO_ORDEN.indexOf(p.estado);
      p.estado = ESTADO_ORDEN[idx+1];
      cyPersist();
      cyToast(`Estado actualizado a "${ESTADO_LABEL[p.estado]}"`,'success');
      cyAddNotif('fa-truck', `La carga ${p.origen} → ${p.destino} cambió a "${ESTADO_LABEL[p.estado]}"`);
      cyRenderEmpresaPublicaciones();
    };
  });
  scope.querySelectorAll('[data-action="eliminar-carga"]').forEach(btn=>{
    btn.onclick = async ()=>{
      const ok = await cyConfirm('Esta acción eliminará la publicación de forma permanente.', {title:'¿Eliminar publicación?'});
      if(!ok) return;
      CY.publicaciones = CY.publicaciones.filter(x=>x.id!==btn.dataset.id);
      cyPersist();
      cyToast('Publicación eliminada','success');
      cyRenderEmpresaPublicaciones();
      cyRenderEmpresaHome();
    };
  });
  scope.querySelectorAll('[data-action="duplicar-carga"]').forEach(btn=>{
    btn.onclick = ()=>{
      const p = CY.publicaciones.find(x=>x.id===btn.dataset.id);
      const clone = {...p, id:cyId('CARGA'), estado:'pendiente', creado:new Date().toISOString().slice(0,10)};
      CY.publicaciones.unshift(clone);
      cyPersist();
      cyToast('Publicación duplicada correctamente','success');
      cyRenderEmpresaPublicaciones();
    };
  });
  scope.querySelectorAll('[data-action="editar-carga"]').forEach(btn=>{
    btn.onclick = ()=> cyOpenPublicarCarga(btn.dataset.id);
  });
}

/* ---------------- MODAL: publicar / editar carga ---------------- */
function cyOpenPublicarCarga(editId=null){
  const editing = editId ? CY.publicaciones.find(p=>p.id===editId) : null;
  const {root} = cyOpenModal(`
    <h2>${editing?'Editar carga':'Publicar nueva carga'}</h2>
    <p class="muted" style="margin-bottom:18px">Completa los datos de tu mercancía para encontrar transportistas disponibles.</p>
    <form id="form-carga" class="form-grid">
      <div class="form-row-2">
        <label>Origen<input class="input" name="origen" list="cy-ciudades-modal" required value="${editing?editing.origen:''}"></label>
        <label>Destino<input class="input" name="destino" list="cy-ciudades-modal" required value="${editing?editing.destino:''}"></label>
      </div>
      <div class="form-row-2">
        <label>Fecha<input class="input" type="date" name="fecha" required value="${editing?editing.fecha:''}"></label>
        <label>Tipo de vehículo requerido<select class="input" name="vehiculo" required>${TIPOS_VEHICULO.map(v=>`<option ${editing&&editing.vehiculo===v?'selected':''}>${v}</option>`).join('')}</select></label>
      </div>
      <div class="form-row-2">
        <label>Peso (kg)<input class="input" type="number" name="peso" min="1" required value="${editing?editing.peso:''}"></label>
        <label>Volumen (m³)<input class="input" type="number" name="volumen" min="1" required value="${editing?editing.volumen:''}"></label>
      </div>
      <label>Descripción de la mercancía<input class="input" name="descripcion" required value="${editing?editing.descripcion:''}"></label>
      <label>Precio ofrecido (S/)<input class="input" type="number" name="precio" min="1" required value="${editing?editing.precio:''}"></label>
      <datalist id="cy-ciudades-modal">${CIUDADES.map(c=>`<option value="${c.n}">`).join('')}</datalist>
      <button class="btn btn-primary btn-block" type="submit"><i class="fa-solid fa-paper-plane"></i> ${editing?'Guardar cambios':'Publicar carga'}</button>
    </form>
  `);

  root.querySelector('#form-carga').addEventListener('submit', (e)=>{
    e.preventDefault();
    const form = e.target;
    let valid = true;
    form.querySelectorAll('[required]').forEach(inp=>{ if(!cyValidateField(inp,{required:true})) valid=false; });
    if(!valid) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const oCiudad = CIUDADES.find(c=>c.n.toLowerCase()===data.origen.toLowerCase()) || cyRand(CIUDADES);
    const dCiudad = CIUDADES.find(c=>c.n.toLowerCase()===data.destino.toLowerCase()) || cyRand(CIUDADES);

    const btn = form.querySelector('button[type=submit]');
    cyButtonLoading(btn, true, editing?'Guardando…':'Publicando…');

    setTimeout(()=>{
      cyButtonLoading(btn,false);
      const session = cyGetSession();
      if(editing){
        Object.assign(editing, {origen:data.origen, destino:data.destino, fecha:data.fecha, vehiculo:data.vehiculo, peso:Number(data.peso), volumen:Number(data.volumen), descripcion:data.descripcion, precio:Number(data.precio), origenLat:oCiudad.lat, origenLng:oCiudad.lng, destinoLat:dCiudad.lat, destinoLng:dCiudad.lng});
        cyToast('Publicación actualizada correctamente','success');
      } else {
        CY.publicaciones.unshift({
          id:cyId('CARGA'), empresaId:'demo-empresa', empresaNombre:session.nombre,
          origen:data.origen, destino:data.destino, origenLat:oCiudad.lat, origenLng:oCiudad.lng, destinoLat:dCiudad.lat, destinoLng:dCiudad.lng,
          fecha:data.fecha, peso:Number(data.peso), volumen:Number(data.volumen), vehiculo:data.vehiculo,
          descripcion:data.descripcion, precio:Number(data.precio), estado:'pendiente', transportistaAsignado:null,
          creado: new Date().toISOString().slice(0,10)
        });
        cyToast('Tu carga fue publicada. Buscando transportistas compatibles…','success','¡Publicado!');
        cyAddNotif('fa-route', `Nueva carga publicada: ${data.origen} → ${data.destino}`);
      }
      cyPersist();
      cyCloseModal();
      cyRenderEmpresaPublicaciones();
      cyRenderEmpresaHome();
    }, 800);
  });
}

/* ---------------- BUSCAR TRANSPORTISTAS ---------------- */
function cyRenderBuscarTransportistas(){
  cyPoblarSelectsFiltros();
  const texto = (document.getElementById('buscar-transportista-texto').value||'').toLowerCase();
  const veh = document.getElementById('buscar-transportista-vehiculo').value;
  let list = CY.transportistas.filter(t=>{
    const matchText = !texto || (t.nombre+t.ciudadBase).toLowerCase().includes(texto);
    const matchVeh = !veh || t.vehiculo===veh;
    return matchText && matchVeh && t.estado==='activo';
  });
  const grid = document.getElementById('transportistas-grid');
  grid.innerHTML = list.map(t=>`
    <div class="glass-card item-card">
      <div class="item-card-head">
        <div style="display:flex;align-items:center;gap:10px"><img src="${t.avatar}" style="width:44px;height:44px;border-radius:12px"><div><strong>${t.nombre}</strong><div class="muted-sm">${t.ciudadBase} · ★ ${t.calificacion}</div></div></div>
      </div>
      <div class="item-meta">
        <span><i class="fa-solid fa-truck"></i> ${t.vehiculo}</span>
        <span><i class="fa-solid fa-route"></i> ${t.viajes} viajes</span>
      </div>
      <div class="item-actions">
        <button class="btn btn-primary btn-sm" data-action="contactar-transportista" data-id="${t.id}"><i class="fa-solid fa-message"></i> Contactar</button>
        <button class="btn btn-outline btn-sm" data-action="ver-perfil-transportista" data-id="${t.id}"><i class="fa-solid fa-eye"></i> Ver perfil</button>
      </div>
    </div>
  `).join('') || `<div class="empty-state"><i class="fa-solid fa-user-slash"></i><p>No hay transportistas con esos filtros.</p></div>`;

  grid.querySelectorAll('[data-action="contactar-transportista"]').forEach(btn=>{
    btn.onclick = ()=>{ cyToast('Se inició un chat con el transportista.','success'); cyNavigate('chat'); };
  });
  grid.querySelectorAll('[data-action="ver-perfil-transportista"]').forEach(btn=>{
    const t = CY.transportistas.find(x=>x.id===btn.dataset.id);
    btn.onclick = ()=>{
      cyOpenModal(`
        <div class="profile-avatar-row"><img src="${t.avatar}"><div><h3>${t.nombre}</h3><p class="muted-sm">${t.ciudadBase}</p></div></div>
        <div class="kpi-grid" style="margin-top:10px">
          ${cyKpi('fa-star', '★ '+t.calificacion, 'Calificación', 'up', '')}
          ${cyKpi('fa-route', t.viajes, 'Viajes completados', 'up', '')}
        </div>
        <p class="muted-sm">Vehículo: <strong>${t.vehiculo}</strong></p>
      `);
    };
  });
}

/* ---------------- HISTORIAL EMPRESA ---------------- */
function cyRenderHistorialEmpresa(){
  const texto = (document.getElementById('historial-empresa-buscar').value||'').toLowerCase();
  let list = cyMisPublicaciones().filter(p=> !texto || (p.origen+p.destino).toLowerCase().includes(texto));
  list.sort((a,b)=> b.creado.localeCompare(a.creado));

  const paged = cyPaginate(list, CY_HIST_EMPRESA_PAGE, CY_HIST_PER_PAGE);
  document.getElementById('historial-empresa-body').innerHTML = paged.map(p=>`
    <tr>
      <td>${p.id}</td><td>${p.origen}</td><td>${p.destino}</td><td>${cyFormatoFecha(p.fecha)}</td>
      <td>${p.transportistaAsignado || cyRand(NOMBRES_PERSONA)}</td><td>${cyMoney(p.precio)}</td><td>${cyBadge(p.estado)}</td>
    </tr>
  `).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text-faint)">Sin resultados</td></tr>`;

  cyRenderPagination('historial-empresa-pag', list.length, CY_HIST_PER_PAGE, CY_HIST_EMPRESA_PAGE, (p)=>{ CY_HIST_EMPRESA_PAGE=p; cyRenderHistorialEmpresa(); });
}

/* ---------------- PERFIL (compartido empresa/transportista) ---------------- */
function cyRenderPerfil(){
  const session = cyGetSession();
  const wrap = document.getElementById('perfil-form-wrap');
  const esEmpresa = session.rol==='empresa';
  wrap.innerHTML = `
    <div class="panel-head"><h3>Datos ${esEmpresa?'de la empresa':'personales'}</h3></div>
    <div class="profile-avatar-row">
      <img src="${session.avatar}" id="perfil-avatar-preview">
      <div><button class="btn btn-outline btn-sm" id="perfil-cambiar-foto"><i class="fa-solid fa-camera"></i> Cambiar foto</button></div>
    </div>
    <form id="form-perfil" class="form-grid">
      <label>${esEmpresa?'Nombre de la empresa':'Nombre completo'}<input class="input" name="nombre" value="${session.nombre}" required></label>
      ${esEmpresa ? `<label>RUC<input class="input" name="ruc" value="${session.ruc||''}" required></label>` : `<label>DNI<input class="input" name="dni" value="${session.dni||''}" required></label>`}
      <label>Correo<input class="input" type="email" name="correo" value="${session.correo}" required></label>
      <div class="form-row-2">
        <label>Teléfono<input class="input" name="telefono" value="${session.telefono||''}" required></label>
        <label>Dirección<input class="input" name="direccion" value="${session.direccion||session.ciudad||''}"></label>
      </div>
      <button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Guardar cambios</button>
    </form>
  `;
  wrap.querySelector('#perfil-cambiar-foto').onclick = ()=>{
    session.avatar = cyAvatar(Math.random().toString());
    cySetSession(session);
    document.getElementById('perfil-avatar-preview').src = session.avatar;
    document.getElementById('user-avatar').src = session.avatar;
    cyToast('Foto de perfil actualizada','success');
  };
  wrap.querySelector('#form-perfil').addEventListener('submit',(e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    Object.assign(session, data);
    cySetSession(session);
    const idx = CY_USERS.findIndex(u=>u.id===session.id);
    if(idx>-1){ CY_USERS[idx] = {...CY_USERS[idx], ...data}; cySaveUsers(CY_USERS); }
    document.getElementById('user-chip-name').textContent = session.nombre;
    cyToast('Datos actualizados correctamente','success');
  });

  document.getElementById('form-password').onsubmit = (e)=>{
    e.preventDefault();
    cyToast('Contraseña actualizada correctamente','success');
    e.target.reset();
  };
}
