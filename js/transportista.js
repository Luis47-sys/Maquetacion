/* =====================================================================
   CARGAYA — transportista.js
   Lógica del dashboard de TRANSPORTISTA: publicar/editar/eliminar viaje,
   aceptar/cancelar cargas, calendario, ingresos, vehículos, documentos.
===================================================================== */

let CY_HIST_TRANS_PAGE = 1;
let CY_CAL_DATE = new Date();

function cyMisViajes(){
  return CY.viajes.filter(v=>v.transportistaId==='demo-transportista');
}

/* =====================================================================
   REGLAS DE NEGOCIO: un trabajo activo a la vez + horas de manejo + descanso.
   - Mientras el transportista tenga una carga o viaje en curso (estado
     "aceptada", "camino" o "entregada" — es decir, ya comprometido y aún
     sin cerrar), no puede aceptar ningún otro trabajo.
   - Cada trabajo suma horas de manejo reales (según distancia) a un
     acumulado. Solo al llegar a CY_HORAS_MANEJO_MAX se activa el descanso
     obligatorio de CY_HORAS_DESCANSO horas — así, varios envíos cortos
     dentro del mismo departamento pueden encadenarse sin descansar, pero
     un viaje largo (p.ej. Lima–Cusco) agota el máximo por sí solo.
===================================================================== */
const CY_ESTADOS_TRABAJO_ACTIVO = ['aceptada','camino','entregada'];
let CY_COUNTDOWN_TIMERS = {};

// Devuelve la carga o viaje que el transportista tiene actualmente en curso, o null.
function cyTrabajoActivoTransportista(){
  const carga = CY.publicaciones.find(p=>p.transportistaAsignadoId===CY_DEMO_TRANSPORTISTA_ID && CY_ESTADOS_TRABAJO_ACTIVO.includes(p.estado));
  if(carga) return {tipo:'carga', item:carga};
  const viaje = CY.viajes.find(v=>v.transportistaId===CY_DEMO_TRANSPORTISTA_ID && CY_ESTADOS_TRABAJO_ACTIVO.includes(v.estado));
  if(viaje) return {tipo:'viaje', item:viaje};
  return null;
}

// Horas de manejo estimadas de una carga/viaje según su distancia real.
function cyHorasManejoDeItem(item){
  const km = cyHaversine(item.origenLat, item.origenLng, item.destinoLat, item.destinoLng);
  return cyHorasManejo(km);
}

// Se llama al finalizar un trabajo: suma sus horas de manejo al acumulado
// del transportista y, si llega al máximo, activa el descanso obligatorio.
// Devuelve true si esta finalización disparó el descanso.
function cyRegistrarHorasManejo(item){
  const est = CY.transportistaEstado;
  const horas = cyHorasManejoDeItem(item);
  est.horasAcumuladas = (est.horasAcumuladas||0) + horas;
  let descansoActivado = false;
  if(est.horasAcumuladas >= CY_HORAS_MANEJO_MAX){
    est.descansoHasta = Date.now() + CY_HORAS_DESCANSO*3600000;
    est.horasAcumuladas = 0;
    descansoActivado = true;
  }
  cyPersist();
  return descansoActivado;
}

// Ciudad donde se encuentra el transportista ahora mismo: el destino de su
// último trabajo finalizado, o su ciudad base si todavía no completó ninguno.
function cyCiudadActualTransportista(){
  let ultima = null, ultimaFecha = -Infinity;
  CY.publicaciones.forEach(p=>{ if(p.transportistaAsignadoId===CY_DEMO_TRANSPORTISTA_ID && p.fechaFinalizada && p.fechaFinalizada>ultimaFecha){ ultimaFecha=p.fechaFinalizada; ultima=p.destino; } });
  CY.viajes.forEach(v=>{ if(v.transportistaId===CY_DEMO_TRANSPORTISTA_ID && v.fechaFinalizada && v.fechaFinalizada>ultimaFecha){ ultimaFecha=v.fechaFinalizada; ultima=v.destino; } });
  if(ultima) return ultima;
  const session = cyGetSession();
  return (session && session.ciudad) || 'Lima';
}

// Estado de disponibilidad del transportista: disponible / ocupado / en descanso.
function cyEstadoDisponibilidad(){
  const activo = cyTrabajoActivoTransportista();
  if(activo) return {disponible:false, motivo:'ocupado', activo};
  const est = CY.transportistaEstado || {horasAcumuladas:0, descansoHasta:null};
  if(est.descansoHasta && Date.now() < est.descansoHasta){
    return {disponible:false, motivo:'descanso', restanteMs: est.descansoHasta - Date.now(), horasAcumuladas: est.horasAcumuladas||0};
  }
  return {disponible:true, horasAcumuladas: est.horasAcumuladas||0};
}

function cyFormatDuracion(ms){
  const totalSeg = Math.max(0, Math.ceil(ms/1000));
  const h = String(Math.floor(totalSeg/3600)).padStart(2,'0');
  const m = String(Math.floor((totalSeg%3600)/60)).padStart(2,'0');
  const s = String(totalSeg%60).padStart(2,'0');
  return `${h}:${m}:${s}`;
}

// Avanza el trabajo activo del transportista un estado (usado desde el banner
// de disponibilidad). Si llega a "finalizada", registra la hora para el descanso.
function cyAvanzarTrabajoActivo(){
  const activo = cyTrabajoActivoTransportista();
  if(!activo) return;
  const idx = ESTADO_ORDEN.indexOf(activo.item.estado);
  const siguiente = ESTADO_ORDEN[idx+1];
  if(!siguiente) return;
  activo.item.estado = siguiente;
  cyPersist();
  cyToast(`Estado actualizado a "${ESTADO_LABEL[siguiente]}"`, 'success');
  cyAddNotif('fa-truck', `Tu ${activo.tipo==='viaje'?'viaje':'carga'} ${activo.item.origen} → ${activo.item.destino} cambió a "${ESTADO_LABEL[siguiente]}"`, activo.tipo==='viaje'?'transportista-viajes':'transportista-cargas');
  if(siguiente==='finalizada'){
    activo.item.fechaFinalizada = Date.now();
    const descansoActivado = cyRegistrarHorasManejo(activo.item);
    if(descansoActivado){
      cyToast(`Alcanzaste el máximo de ${CY_HORAS_MANEJO_MAX}h de manejo. Por seguridad debes descansar ${CY_HORAS_DESCANSO} horas antes de aceptar un nuevo trabajo.`, 'info', 'Descanso obligatorio');
    } else {
      cyToast(`Trabajo completado. Llevas ${CY.transportistaEstado.horasAcumuladas.toFixed(1)}h de manejo acumuladas — puedes seguir aceptando cargas cercanas sin descansar.`, 'success');
    }
  }
  cyOnDisponibilidadChanged();
}

// Cancela el trabajo activo (carga o viaje) desde el banner de disponibilidad.
// A diferencia de finalizarlo, cancelar no activa el descanso obligatorio.
async function cyCancelarTrabajoActivo(){
  const activo = cyTrabajoActivoTransportista();
  if(!activo) return;
  const ok = await cyConfirm('Se cancelará tu trabajo actual y no se marcará como completado, así que no se aplicará el descanso obligatorio.', {title:'¿Cancelar este trabajo?'});
  if(!ok) return;
  activo.item.estado = 'cancelada';
  cyPersist();
  cyToast(activo.tipo==='viaje' ? 'Viaje cancelado' : 'Carga cancelada', 'info');
  cyOnDisponibilidadChanged();
}

// Refresca las superficies de la app donde el transportista puede aceptar trabajo,
// para que reflejen el nuevo estado de disponibilidad sin necesidad de recargar.
function cyOnDisponibilidadChanged(){
  if(document.getElementById('cargas-disponibles-grid')) cyRenderCargasDisponibles();
  if(document.getElementById('transportista-kpis')) cyRenderTransportistaHome();
  if(document.getElementById('transportista-viajes-grid')) cyRenderTransportistaViajes();
  cyRenderDisponibilidadBanner('matching-banner');
}

// Renderiza (o limpia) el banner de disponibilidad dentro del contenedor indicado.
function cyRenderDisponibilidadBanner(containerId){
  const el = document.getElementById(containerId);
  if(!el) return;
  if(CY_COUNTDOWN_TIMERS[containerId]){ clearInterval(CY_COUNTDOWN_TIMERS[containerId]); delete CY_COUNTDOWN_TIMERS[containerId]; }

  const session = cyGetSession();
  if(!session || session.rol!=='transportista'){ el.innerHTML=''; return; }

  const estado = cyEstadoDisponibilidad();

  if(estado.disponible){
    const horas = estado.horasAcumuladas||0;
    const pct = Math.min(100, Math.round((horas/CY_HORAS_MANEJO_MAX)*100));
    el.innerHTML = `
      <div class="glass-card cy-status-banner cy-status-disponible">
        <div class="cy-status-icon"><i class="fa-solid fa-circle-check"></i></div>
        <div class="cy-status-body">
          <h3>Estás disponible</h3>
          <p class="muted-sm">Ubicación actual: <strong>${cyCiudadActualTransportista()}</strong>. Puedes aceptar una nueva carga o viaje cuando quieras.</p>
          ${horas>0 ? `
            <div class="cy-fatigue">
              <div class="item-progress"><div class="item-progress-bar" style="width:${pct}%"></div></div>
              <span class="muted-sm">${horas.toFixed(1)}h de manejo acumuladas de ${CY_HORAS_MANEJO_MAX}h antes del descanso obligatorio</span>
            </div>` : ''}
        </div>
      </div>`;
    return;
  }

  if(estado.motivo==='ocupado'){
    const it = estado.activo.item;
    const idx = ESTADO_ORDEN.indexOf(it.estado);
    const siguiente = ESTADO_ORDEN[idx+1];
    el.innerHTML = `
      <div class="glass-card cy-status-banner cy-status-ocupado">
        <div class="cy-status-icon"><i class="fa-solid fa-truck-fast"></i></div>
        <div class="cy-status-body">
          <h3>Tienes un trabajo en curso</h3>
          <p class="muted-sm">Debes completarlo antes de aceptar otra carga o viaje.</p>
          <div class="item-route"><i class="fa-solid fa-location-dot"></i> ${it.origen} <i class="fa-solid fa-arrow-right" style="font-size:.7rem"></i> ${it.destino}</div>
          <div class="item-progress"><div class="item-progress-bar" style="width:${cyProgressPercent(it.estado)}%"></div></div>
          ${cyBadge(it.estado)}
        </div>
        <div class="cy-status-actions">
          ${siguiente ? `<button class="btn btn-primary btn-sm" id="cy-btn-avanzar-activo-${containerId}"><i class="fa-solid fa-forward"></i> ${ESTADO_LABEL[siguiente]}</button>` : ''}
          <button class="btn btn-outline btn-sm" id="cy-btn-cancelar-activo-${containerId}"><i class="fa-solid fa-ban"></i> Cancelar</button>
        </div>
      </div>`;
    const btn = document.getElementById(`cy-btn-avanzar-activo-${containerId}`);
    if(btn) btn.onclick = cyAvanzarTrabajoActivo;
    const cancelBtn = document.getElementById(`cy-btn-cancelar-activo-${containerId}`);
    if(cancelBtn) cancelBtn.onclick = cyCancelarTrabajoActivo;
    return;
  }

  if(estado.motivo==='descanso'){
    el.innerHTML = `
      <div class="glass-card cy-status-banner cy-status-descanso">
        <div class="cy-status-icon"><i class="fa-solid fa-bed"></i></div>
        <div class="cy-status-body">
          <h3>Estás en tiempo de descanso</h3>
          <p class="muted-sm">Llegaste al máximo de ${CY_HORAS_MANEJO_MAX}h de manejo continuo. Por seguridad debes descansar ${CY_HORAS_DESCANSO} horas antes de aceptar un nuevo trabajo.</p>
        </div>
        <div class="cy-status-actions">
          <div class="cy-countdown" id="cy-countdown-${containerId}">${cyFormatDuracion(estado.restanteMs)}</div>
          <span class="muted-sm">Disponible en</span>
        </div>
      </div>`;
    CY_COUNTDOWN_TIMERS[containerId] = setInterval(()=>{
      const actual = cyEstadoDisponibilidad();
      if(actual.disponible || actual.motivo!=='descanso'){
        clearInterval(CY_COUNTDOWN_TIMERS[containerId]); delete CY_COUNTDOWN_TIMERS[containerId];
        cyOnDisponibilidadChanged();
        return;
      }
      const span = document.getElementById(`cy-countdown-${containerId}`);
      if(span) span.textContent = cyFormatDuracion(actual.restanteMs);
    }, 1000);
  }
}

function cyRenderTransportistaHome(){
  const session = cyGetSession();
  document.getElementById('transportista-nombre-home').textContent = session.nombre.split(' ')[0];
  cyRenderDisponibilidadBanner('home-disponibilidad-banner');
  const mios = cyMisViajes();
  const activos = mios.filter(v=>!['finalizada','cancelada'].includes(v.estado));
  const finalizados = mios.filter(v=>v.estado==='finalizada');
  const ingresos = mios.reduce((s,v)=> s+(v.estado==='finalizada'?v.precioSugerido:0),0);

  document.getElementById('transportista-kpis').innerHTML = `
    ${cyKpi('fa-route', mios.length, 'Viajes publicados', 'up', '+8%')}
    ${cyKpi('fa-truck-fast', activos.length, 'En proceso', 'up', '+3%')}
    ${cyKpi('fa-circle-check', finalizados.length, 'Completados', 'up', '+11%')}
    ${cyKpi('fa-sack-dollar', cyMoney(ingresos), 'Ingresos generados', 'up', '+6%')}
  `;

  const proximos = [...mios].filter(v=>!['finalizada','cancelada'].includes(v.estado)).sort((a,b)=>a.fecha.localeCompare(b.fecha)).slice(0,5);
  const proximosBox = document.getElementById('transportista-proximos');
  proximosBox.innerHTML = proximos.length ? proximos.map(v=>`
    <div class="mini-item mini-item-clickable" data-id="${v.id}">
      <div class="ni-icon" style="background:rgba(11,166,166,.15);color:#0BA6A6;width:34px;height:34px;border-radius:9px;display:grid;place-items:center"><i class="fa-solid fa-truck"></i></div>
      <div class="mi-route"><strong>${v.origen} → ${v.destino}</strong><span>${cyFormatoFecha(v.fecha)}</span></div>
      ${cyBadge(v.estado)}
    </div>
  `).join('') : `<div class="empty-state"><i class="fa-solid fa-route"></i><p>No tienes viajes próximos</p></div>`;
  proximosBox.querySelectorAll('.mini-item-clickable').forEach(el=>{
    el.onclick = ()=> cyNavigate('transportista-viajes');
  });

  const rating = (Math.random()*1+4).toFixed(1);
  document.getElementById('transportista-rating-box').innerHTML = `
    <div class="rating-big">★ ${rating}</div>
    <div class="rating-stars">${'★'.repeat(Math.round(rating))}${'☆'.repeat(5-Math.round(rating))}</div>
    <p class="muted-sm">Basado en ${cyRandInt(40,180)} calificaciones</p>
    <div class="rating-bars">
      ${[5,4,3,2,1].map(n=>`<div class="rating-bar-row"><span>${n}★</span><div class="bar-bg"><div class="bar-fill" style="width:${n===5?70: n===4?20: n===3?7:2}%"></div></div></div>`).join('')}
    </div>
  `;
}

/* ---------------- MIS VIAJES ---------------- */
function cyRenderTransportistaViajes(){
  cyPoblarSelectsFiltros();
  const texto = (document.getElementById('filtro-viaje-texto').value||'').toLowerCase();
  const estado = document.getElementById('filtro-viaje-estado').value;
  let list = cyMisViajes().filter(v=>{
    const matchText = !texto || (v.origen+v.destino).toLowerCase().includes(texto);
    const matchEstado = !estado || v.estado===estado;
    return matchText && matchEstado;
  }).sort((a,b)=> b.creado.localeCompare(a.creado));

  const grid = document.getElementById('transportista-viajes-grid');
  if(list.length===0){ grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-route"></i><p>No hay viajes con esos filtros. ¡Publica tu primer viaje de retorno!</p></div>`; return; }

  grid.innerHTML = list.map(v=>`
    <div class="glass-card item-card">
      <div class="item-card-head">
        <div class="item-route"><i class="fa-solid fa-location-dot"></i> ${v.origen} <i class="fa-solid fa-arrow-right" style="font-size:.7rem"></i> ${v.destino}</div>
        ${cyBadge(v.estado)}
      </div>
      <div class="item-meta">
        <span><i class="fa-solid fa-calendar"></i> ${cyFormatoFecha(v.fecha)}</span>
        <span><i class="fa-solid fa-weight-hanging"></i> ${v.capacidadPeso} kg</span>
        <span><i class="fa-solid fa-truck"></i> ${v.vehiculo}</span>
      </div>
      <div class="item-progress"><div class="item-progress-bar" style="width:${cyProgressPercent(v.estado)}%"></div></div>
      <div class="item-price">${cyMoney(v.precioSugerido)}</div>
      <div class="item-actions">
        ${cyEstadoBotonSiguienteViaje(v)}
        <button class="btn btn-outline btn-sm" data-action="editar-viaje" data-id="${v.id}"><i class="fa-solid fa-pen"></i></button>
        ${v.estado!=='cancelada'&&v.estado!=='finalizada' ? `<button class="btn btn-danger btn-sm" data-action="cancelar-viaje" data-id="${v.id}"><i class="fa-solid fa-ban"></i></button>` : ''}
        <button class="btn btn-danger btn-sm" data-action="eliminar-viaje" data-id="${v.id}"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('[data-action="avanzar-estado-viaje"]').forEach(btn=>{
    btn.onclick = ()=>{
      const v = CY.viajes.find(x=>x.id===btn.dataset.id);
      const idx = ESTADO_ORDEN.indexOf(v.estado);
      const siguiente = ESTADO_ORDEN[idx+1];
      if(siguiente==='aceptada'){
        const disp = cyEstadoDisponibilidad();
        if(!disp.disponible){
          cyToast(disp.motivo==='ocupado' ? 'Ya tienes un trabajo en curso. Complétalo antes de aceptar otro.' : 'Estás en tu horario de descanso obligatorio. Espera a que termine para aceptar un nuevo trabajo.', 'error');
          return;
        }
        v.fechaAceptada = Date.now();
      }
      v.estado = siguiente;
      cyPersist(); cyToast(`Estado actualizado a "${ESTADO_LABEL[v.estado]}"`,'success');
      cyAddNotif('fa-truck', `Tu viaje ${v.origen} → ${v.destino} cambió a "${ESTADO_LABEL[v.estado]}"`, 'transportista-viajes');
      if(siguiente==='finalizada'){
        v.fechaFinalizada = Date.now();
        const descansoActivado = cyRegistrarHorasManejo(v);
        if(descansoActivado){
          cyToast(`Alcanzaste el máximo de ${CY_HORAS_MANEJO_MAX}h de manejo. Por seguridad debes descansar ${CY_HORAS_DESCANSO} horas antes de aceptar un nuevo trabajo.`, 'info', 'Descanso obligatorio');
        } else {
          cyToast(`Viaje completado. Llevas ${CY.transportistaEstado.horasAcumuladas.toFixed(1)}h de manejo acumuladas — puedes seguir aceptando cargas cercanas sin descansar.`, 'success');
        }
      }
      cyOnDisponibilidadChanged();
    };
  });
  grid.querySelectorAll('[data-action="cancelar-viaje"]').forEach(btn=>{
    btn.onclick = async ()=>{
      const ok = await cyConfirm('El viaje se marcará como cancelado.', {title:'¿Cancelar viaje?'});
      if(!ok) return;
      const v = CY.viajes.find(x=>x.id===btn.dataset.id);
      v.estado='cancelada'; cyPersist();
      cyToast('Viaje cancelado','info');
      cyOnDisponibilidadChanged();
    };
  });
  grid.querySelectorAll('[data-action="eliminar-viaje"]').forEach(btn=>{
    btn.onclick = async ()=>{
      const ok = await cyConfirm('Esta acción eliminará el viaje de forma permanente.', {title:'¿Eliminar viaje?'});
      if(!ok) return;
      CY.viajes = CY.viajes.filter(x=>x.id!==btn.dataset.id);
      cyPersist(); cyToast('Viaje eliminado','success');
      cyOnDisponibilidadChanged();
    };
  });
  grid.querySelectorAll('[data-action="editar-viaje"]').forEach(btn=>{
    btn.onclick = ()=> cyOpenPublicarViaje(btn.dataset.id);
  });
}
function cyEstadoBotonSiguienteViaje(v){
  const idx = ESTADO_ORDEN.indexOf(v.estado);
  if(v.estado==='cancelada' || v.estado==='finalizada') return '';
  const siguiente = ESTADO_ORDEN[idx+1];
  if(!siguiente) return '';
  const bloqueado = siguiente==='aceptada' && !cyEstadoDisponibilidad().disponible;
  return `<button class="btn btn-primary btn-sm" data-action="avanzar-estado-viaje" data-id="${v.id}" ${bloqueado?'disabled title="No disponible: completa tu trabajo actual o tu descanso"':''}><i class="fa-solid fa-forward"></i> ${ESTADO_LABEL[siguiente]}</button>`;
}

function cyOpenPublicarViaje(editId=null){
  const editing = editId ? CY.viajes.find(v=>v.id===editId) : null;
  const {root} = cyOpenModal(`
    <h2>${editing?'Editar viaje':'Publicar viaje de retorno'}</h2>
    <p class="muted" style="margin-bottom:18px">Indica tu ruta de vuelta para que empresas cercanas te encuentren.</p>
    <form id="form-viaje" class="form-grid">
      <div class="form-row-2">
        <label>Origen<input class="input" name="origen" list="cy-ciudades-modal2" required value="${editing?editing.origen:''}"></label>
        <label>Destino<input class="input" name="destino" list="cy-ciudades-modal2" required value="${editing?editing.destino:''}"></label>
      </div>
      <div class="form-row-2">
        <label>Fecha de retorno<input class="input" type="date" name="fecha" required value="${editing?editing.fecha:''}"></label>
        <label>Tipo de vehículo<select class="input" name="vehiculo" required>${TIPOS_VEHICULO.map(v=>`<option ${editing&&editing.vehiculo===v?'selected':''}>${v}</option>`).join('')}</select></label>
      </div>
      <div class="form-row-2">
        <label>Capacidad de peso (kg)<input class="input" type="number" name="capacidadPeso" min="1" required value="${editing?editing.capacidadPeso:''}"></label>
        <label>Capacidad de volumen (m³)<input class="input" type="number" name="capacidadVolumen" min="1" required value="${editing?editing.capacidadVolumen:''}"></label>
      </div>
      <label>Precio sugerido (S/)<input class="input" type="number" name="precioSugerido" min="1" required value="${editing?editing.precioSugerido:''}"></label>
      <datalist id="cy-ciudades-modal2">${CIUDADES.map(c=>`<option value="${c.n}">`).join('')}</datalist>
      <button class="btn btn-primary btn-block" type="submit"><i class="fa-solid fa-paper-plane"></i> ${editing?'Guardar cambios':'Publicar viaje'}</button>
    </form>
  `);
  root.querySelector('#form-viaje').addEventListener('submit',(e)=>{
    e.preventDefault();
    const form = e.target;
    let valid=true;
    form.querySelectorAll('[required]').forEach(inp=>{ if(!cyValidateField(inp,{required:true})) valid=false; });
    if(!valid) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const oCiudad = CIUDADES.find(c=>c.n.toLowerCase()===data.origen.toLowerCase()) || cyRand(CIUDADES);
    const dCiudad = CIUDADES.find(c=>c.n.toLowerCase()===data.destino.toLowerCase()) || cyRand(CIUDADES);
    const btn = form.querySelector('button[type=submit]');
    cyButtonLoading(btn,true, editing?'Guardando…':'Publicando…');
    setTimeout(()=>{
      cyButtonLoading(btn,false);
      const session = cyGetSession();
      if(editing){
        Object.assign(editing, {origen:data.origen, destino:data.destino, fecha:data.fecha, vehiculo:data.vehiculo, capacidadPeso:Number(data.capacidadPeso), capacidadVolumen:Number(data.capacidadVolumen), precioSugerido:Number(data.precioSugerido), origenLat:oCiudad.lat, origenLng:oCiudad.lng, destinoLat:dCiudad.lat, destinoLng:dCiudad.lng});
        cyToast('Viaje actualizado correctamente','success');
      } else {
        CY.viajes.unshift({
          id:cyId('VIAJE'), transportistaId:'demo-transportista', transportistaNombre:session.nombre,
          origen:data.origen, destino:data.destino, origenLat:oCiudad.lat, origenLng:oCiudad.lng, destinoLat:dCiudad.lat, destinoLng:dCiudad.lng,
          fecha:data.fecha, capacidadPeso:Number(data.capacidadPeso), capacidadVolumen:Number(data.capacidadVolumen),
          vehiculo:data.vehiculo, precioSugerido:Number(data.precioSugerido), estado:'pendiente', empresaAsignada:null,
          fechaAceptada:null, fechaFinalizada:null,
          creado:new Date().toISOString().slice(0,10)
        });
        cyToast('Tu viaje de retorno fue publicado','success','¡Publicado!');
        cyAddNotif('fa-route', `Nuevo viaje publicado: ${data.origen} → ${data.destino}`, 'transportista-viajes');
      }
      cyPersist(); cyCloseModal();
      cyRenderTransportistaViajes(); cyRenderTransportistaHome();
    },800);
  });
}

/* ---------------- CARGAS DISPONIBLES (aceptar) ---------------- */
function cyRenderCargasDisponibles(){
  cyRenderDisponibilidadBanner('cargas-disponibles-banner');
  const estadoDisp = cyEstadoDisponibilidad();
  const miCiudad = cyCiudadActualTransportista();
  let disponibles = CY.publicaciones.filter(p=>p.estado==='busqueda' || p.estado==='pendiente');
  disponibles = disponibles.map(p=>({p, cerca: cyMismoDepartamento(miCiudad, p.origen)}))
    .sort((a,b)=> (b.cerca - a.cerca) || a.p.fecha.localeCompare(b.p.fecha))
    .slice(0,12);
  const grid = document.getElementById('cargas-disponibles-grid');
  grid.innerHTML = disponibles.map(({p, cerca})=>`
    <div class="glass-card item-card" data-id="${p.id}">
      <div class="item-card-head">
        <div class="item-route"><i class="fa-solid fa-location-dot"></i> ${p.origen} <i class="fa-solid fa-arrow-right" style="font-size:.7rem"></i> ${p.destino}</div>
        ${cyBadge(p.estado)}
      </div>
      <div class="item-meta">
        <span><i class="fa-solid fa-building"></i> ${p.empresaNombre}</span>
        <span><i class="fa-solid fa-calendar"></i> ${cyFormatoFecha(p.fecha)}</span>
        <span><i class="fa-solid fa-weight-hanging"></i> ${p.peso} kg</span>
        <span><i class="fa-solid fa-truck"></i> ${p.vehiculo}</span>
        ${cerca ? `<span class="cy-badge-cerca"><i class="fa-solid fa-location-crosshairs"></i> Cerca de ti (${cyDepartamentoDe(p.origen)})</span>` : ''}
      </div>
      <div class="item-price">${cyMoney(p.precio)}</div>
      <div class="item-actions">
        <button class="btn btn-success btn-sm" data-action="aceptar-carga" data-id="${p.id}" ${estadoDisp.disponible?'':'disabled title="No disponible: completa tu descanso o tu trabajo actual"'}><i class="fa-solid fa-check"></i> Aceptar carga</button>
        <button class="btn btn-outline btn-sm" data-action="rechazar-carga" data-id="${p.id}"><i class="fa-solid fa-xmark"></i> Rechazar</button>
      </div>
    </div>
  `).join('') || `<div class="empty-state"><i class="fa-solid fa-box-open"></i><p>No hay cargas disponibles en este momento.</p></div>`;

  grid.querySelectorAll('[data-action="aceptar-carga"]').forEach(btn=>{
    btn.onclick = async ()=>{
      const disp = cyEstadoDisponibilidad();
      if(!disp.disponible){
        cyToast(disp.motivo==='ocupado' ? 'Ya tienes un trabajo en curso. Complétalo antes de aceptar otro.' : 'Estás en tu horario de descanso obligatorio. Espera a que termine para aceptar un nuevo trabajo.', 'error');
        return;
      }
      const ok = await cyConfirm('Confirmas que aceptas transportar esta carga. No podrás aceptar otro trabajo hasta completarla.', {title:'¿Aceptar esta carga?', icon:'fa-circle-check', confirmClass:'btn-success', confirmText:'Sí, aceptar'});
      if(!ok) return;
      const p = CY.publicaciones.find(x=>x.id===btn.dataset.id);
      const session = cyGetSession();
      p.estado='aceptada';
      p.transportistaAsignado = session.nombre;
      p.transportistaAsignadoId = CY_DEMO_TRANSPORTISTA_ID;
      p.fechaAceptada = Date.now();
      cyPersist();
      if(typeof cyAsegurarChatCon==='function'){
        cyAsegurarChatCon(p.empresaNombre, cyAvatar(p.empresaNombre), `Hola, acepté tu carga ${p.origen} → ${p.destino} (${cyMoney(p.precio)}). ¿Coordinamos la hora de recojo?`);
      }
      cyToast('Carga aceptada. Revisa el chat para coordinar la entrega.','success');
      cyAddNotif('fa-handshake', `Aceptaste la carga ${p.origen} → ${p.destino}`, 'chat');
      cyOnDisponibilidadChanged();
    };
  });
  grid.querySelectorAll('[data-action="rechazar-carga"]').forEach(btn=>{
    btn.onclick = ()=>{
      btn.closest('.item-card').remove();
      cyToast('Carga descartada de tus sugerencias','info');
    };
  });
}

/* ---------------- CALENDARIO ---------------- */
function cyRenderCalendario(){
  const label = document.getElementById('cal-label');
  const grid = document.getElementById('calendar-grid');
  const year = CY_CAL_DATE.getFullYear(), month = CY_CAL_DATE.getMonth();
  label.textContent = CY_CAL_DATE.toLocaleDateString('es-PE', {month:'long', year:'numeric'});

  const eventos = cyMisViajes().reduce((acc,v)=>{ acc[v.fecha] = acc[v.fecha]||[]; acc[v.fecha].push(v); return acc; }, {});
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0,10);

  let html = ['D','L','M','X','J','V','S'].map(d=>`<div class="cal-dow">${d}</div>`).join('');
  for(let i=0;i<startDow;i++) html += `<div class="cal-cell empty"></div>`;
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const evs = eventos[dateStr]||[];
    html += `<div class="cal-cell ${dateStr===todayStr?'today':''}">
      <div class="cal-num">${d}</div>
      ${evs.slice(0,2).map(e=>`<div class="cal-event" title="${e.origen} → ${e.destino}">${e.origen}→${e.destino}</div>`).join('')}
    </div>`;
  }
  grid.innerHTML = html;
}

/* ---------------- INGRESOS ---------------- */
function cyRenderIngresos(){
  const mios = cyMisViajes();
  const totalIngresos = mios.reduce((s,v)=>s+(v.estado==='finalizada'?v.precioSugerido:0), 0) + cyRandInt(4000,12000);
  const totalKm = mios.reduce((s,v)=> s + cyHaversine(v.origenLat,v.origenLng,v.destinoLat,v.destinoLng), 0);
  document.getElementById('ingresos-kpis').innerHTML = `
    ${cyKpi('fa-sack-dollar', cyMoney(totalIngresos), 'Ingresos totales', 'up', '+14%')}
    ${cyKpi('fa-road', totalKm.toLocaleString('es-PE')+' km', 'Kilómetros recorridos', 'up', '+7%')}
    ${cyKpi('fa-boxes-stacked', mios.filter(v=>v.estado==='finalizada').length, 'Cargas realizadas', 'up', '+5%')}
    ${cyKpi('fa-building', new Set(mios.map(v=>v.empresaAsignada)).size || cyRandInt(6,18), 'Empresas atendidas', 'up', '+3%')}
  `;
  cyRenderIngresosCharts();
}

/* ---------------- VEHÍCULOS ---------------- */
function cyRenderVehiculos(){
  const grid = document.getElementById('vehiculos-grid');
  grid.innerHTML = CY_VEHICULOS.map(v=>`
    <div class="glass-card vehiculo-card">
      <div class="vehiculo-top"><span class="vehiculo-plate">${v.placa}</span><i class="fa-solid fa-truck" style="color:var(--amber)"></i></div>
      <h3 style="margin-top:12px">${v.modelo}</h3>
      <div class="item-meta" style="margin-top:8px">
        <span><i class="fa-solid fa-truck-ramp-box"></i> ${v.tipo}</span>
        <span><i class="fa-solid fa-weight-hanging"></i> ${v.peso} kg</span>
        <span><i class="fa-solid fa-cube"></i> ${v.capacidad} kg cap.</span>
      </div>
      <div class="item-actions">
        <button class="btn btn-outline btn-sm" data-action="editar-vehiculo" data-id="${v.id}"><i class="fa-solid fa-pen"></i> Editar</button>
        <button class="btn btn-danger btn-sm" data-action="eliminar-vehiculo" data-id="${v.id}"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `).join('') || `<div class="empty-state"><i class="fa-solid fa-truck"></i><p>No has agregado vehículos aún.</p></div>`;

  grid.querySelectorAll('[data-action="eliminar-vehiculo"]').forEach(btn=>{
    btn.onclick = async ()=>{
      const ok = await cyConfirm('Se eliminará este vehículo de tu flota.', {title:'¿Eliminar vehículo?'});
      if(!ok) return;
      CY_VEHICULOS = CY_VEHICULOS.filter(v=>v.id!==btn.dataset.id);
      cySaveVehiculos(CY_VEHICULOS);
      cyToast('Vehículo eliminado','success');
      cyRenderVehiculos();
    };
  });
  grid.querySelectorAll('[data-action="editar-vehiculo"]').forEach(btn=>{
    btn.onclick = ()=> cyOpenVehiculoModal(btn.dataset.id);
  });
}

function cyOpenVehiculoModal(editId=null){
  const editing = editId ? CY_VEHICULOS.find(v=>v.id===editId) : null;
  const {root} = cyOpenModal(`
    <h2>${editing?'Editar vehículo':'Agregar vehículo'}</h2>
    <form id="form-vehiculo" class="form-grid" style="margin-top:14px">
      <div class="form-row-2">
        <label>Placa<input class="input" name="placa" required value="${editing?editing.placa:''}"></label>
        <label>Modelo<input class="input" name="modelo" required value="${editing?editing.modelo:''}"></label>
      </div>
      <label>Tipo de vehículo<select class="input" name="tipo" required>${TIPOS_VEHICULO.map(t=>`<option ${editing&&editing.tipo===t?'selected':''}>${t}</option>`).join('')}</select></label>
      <div class="form-row-2">
        <label>Capacidad máxima (kg)<input class="input" type="number" name="capacidad" required value="${editing?editing.capacidad:''}"></label>
        <label>Peso del vehículo (kg)<input class="input" type="number" name="peso" required value="${editing?editing.peso:''}"></label>
      </div>
      <button class="btn btn-primary btn-block" type="submit"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>
    </form>
  `);
  root.querySelector('#form-vehiculo').addEventListener('submit',(e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    if(editing){ Object.assign(editing, {placa:data.placa, modelo:data.modelo, tipo:data.tipo, capacidad:Number(data.capacidad), peso:Number(data.peso)}); cyToast('Vehículo actualizado','success'); }
    else { CY_VEHICULOS.push({id:cyId('VEH'), placa:data.placa, modelo:data.modelo, tipo:data.tipo, capacidad:Number(data.capacidad), peso:Number(data.peso)}); cyToast('Vehículo agregado a tu flota','success'); }
    cySaveVehiculos(CY_VEHICULOS);
    cyCloseModal();
    cyRenderVehiculos();
  });
}

/* ---------------- DOCUMENTOS (subida real de archivos) ---------------- */
const CY_DOC_LABEL = {sin_subir:'Sin subir', pendiente:'En revisión', aprobado:'Aprobado', rechazado:'Rechazado'};
const CY_DOC_BADGE = {sin_subir:'badge-inactivo', pendiente:'badge-pendiente', aprobado:'badge-activo', rechazado:'badge-inactivo'};
const CY_DOC_MAX_BYTES = 3*1024*1024; // 3 MB, límite razonable para guardarlo en localStorage

function cyRenderDocumentos(){
  const grid = document.getElementById('documentos-grid');
  grid.innerHTML = CY_DOCS.map(d=>`
    <div class="glass-card doc-card">
      <div class="doc-icon"><i class="fa-solid ${d.icon}"></i></div>
      <h3>${d.nombre}</h3>
      <div style="margin:10px 0"><span class="badge ${CY_DOC_BADGE[d.estado]}">${CY_DOC_LABEL[d.estado]}</span></div>
      ${d.archivoNombre ? `<p class="muted-sm doc-filename"><i class="fa-solid fa-paperclip"></i> ${d.archivoNombre}</p>` : `<p class="muted-sm">PDF o imagen, máx. 3 MB</p>`}
      <input type="file" class="hidden doc-file-input" data-id="${d.id}" accept="application/pdf,image/png,image/jpeg">
      <div class="item-actions">
        <button class="btn btn-outline btn-sm btn-block" data-action="subir-doc" data-id="${d.id}">${d.archivoNombre?'Reemplazar archivo':'Subir archivo'}</button>
        ${d.archivo ? `<button class="btn btn-ghost btn-sm" data-action="ver-doc" data-id="${d.id}" title="Ver documento"><i class="fa-solid fa-eye"></i></button>` : ''}
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('[data-action="subir-doc"]').forEach(btn=>{
    btn.onclick = ()=> grid.querySelector(`.doc-file-input[data-id="${btn.dataset.id}"]`).click();
  });

  grid.querySelectorAll('.doc-file-input').forEach(input=>{
    input.onchange = ()=>{
      const file = input.files[0];
      if(!file) return;
      if(!/^(application\/pdf|image\/(png|jpe?g))$/.test(file.type)){
        cyToast('Formato no permitido. Sube un PDF, JPG o PNG.', 'error');
        input.value = '';
        return;
      }
      if(file.size > CY_DOC_MAX_BYTES){
        cyToast('El archivo pesa demasiado. El máximo permitido es 3 MB.', 'error');
        input.value = '';
        return;
      }
      const doc = CY_DOCS.find(d=>d.id===input.dataset.id);
      const reader = new FileReader();
      cyShowLoader();
      reader.onload = ()=>{
        doc.archivo = reader.result;
        doc.archivoNombre = file.name;
        doc.archivoTipo = file.type;
        doc.estado = 'pendiente';
        doc.fechaSubida = Date.now();
        cySaveDocs(CY_DOCS);
        cyHideLoader();
        cyToast(`${doc.nombre} subido y enviado a validación`, 'success');
        cyAddNotif('fa-file-arrow-up', `Subiste "${doc.nombre}" para validación`, 'documentos');
        cyRenderDocumentos();
        // Validación simulada: en unos segundos el equipo de CargaYa lo aprueba.
        setTimeout(()=>{
          doc.estado = 'aprobado';
          cySaveDocs(CY_DOCS);
          cyToast(`Tu ${doc.nombre.toLowerCase()} fue validado`, 'success', '¡Documento aprobado!');
          cyAddNotif('fa-file-shield', `Tu documento "${doc.nombre}" fue aprobado`, 'documentos');
          if(document.getElementById('documentos-grid')) cyRenderDocumentos();
        }, cyRandInt(2500, 4500));
      };
      reader.onerror = ()=>{ cyHideLoader(); cyToast('No se pudo leer el archivo. Intenta de nuevo.', 'error'); };
      reader.readAsDataURL(file);
    };
  });

  grid.querySelectorAll('[data-action="ver-doc"]').forEach(btn=>{
    btn.onclick = ()=>{
      const doc = CY_DOCS.find(d=>d.id===btn.dataset.id);
      if(!doc || !doc.archivo) return;
      const win = window.open('', '_blank');
      if(!win) { cyToast('El navegador bloqueó la ventana emergente.', 'error'); return; }
      const body = (doc.archivoTipo||'').startsWith('image/')
        ? `<img src="${doc.archivo}" style="max-width:100%">`
        : `<iframe src="${doc.archivo}" style="border:none;width:100vw;height:100vh"></iframe>`;
      win.document.write(`<title>${doc.nombre}</title><body style="margin:0;background:#14171F">${body}</body>`);
      win.document.close();
    };
  });
}

/* ---------------- HISTORIAL TRANSPORTISTA ---------------- */
function cyRenderHistorialTransportista(){
  const texto = (document.getElementById('historial-transportista-buscar').value||'').toLowerCase();
  let list = cyMisViajes().filter(v=> !texto || (v.origen+v.destino).toLowerCase().includes(texto));
  list.sort((a,b)=> b.creado.localeCompare(a.creado));
  const paged = cyPaginate(list, CY_HIST_TRANS_PAGE, CY_HIST_PER_PAGE);
  document.getElementById('historial-transportista-body').innerHTML = paged.map(v=>`
    <tr><td>${v.id}</td><td>${v.origen}</td><td>${v.destino}</td><td>${cyFormatoFecha(v.fecha)}</td>
    <td>${v.empresaAsignada || cyRand(NOMBRES_EMPRESA)}</td><td>${cyMoney(v.precioSugerido)}</td><td>${cyBadge(v.estado)}</td></tr>
  `).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text-faint)">Sin resultados</td></tr>`;
  cyRenderPagination('historial-transportista-pag', list.length, CY_HIST_PER_PAGE, CY_HIST_TRANS_PAGE, (p)=>{ CY_HIST_TRANS_PAGE=p; cyRenderHistorialTransportista(); });
}
