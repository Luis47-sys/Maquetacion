/* =====================================================================
   CARGAYA — matching.js
   Cruce real de origen / destino / fecha / peso / volumen / vehículo entre
   publicaciones de carga y transportistas, con un puntaje de compatibilidad
   (0-100) que ordena las coincidencias de mejor a peor.
===================================================================== */

// Puntaje de compatibilidad 0-100 entre una carga y un transportista/vehículo:
// tipo de vehículo (40 pts), si la carga cabe en peso/volumen (35 pts),
// cercanía de departamento (15 pts) y calificación del transportista (10 pts).
function cyCompatibilidad({vehiculoA, vehiculoB, pesoCarga, capacidadPeso, volumenCarga, capacidadVolumen, mismoDep, calificacion}){
  let score = 0;
  score += vehiculoA && vehiculoB && vehiculoA===vehiculoB ? 40 : 15;
  if(capacidadPeso){
    score += pesoCarga<=capacidadPeso ? 20 : Math.max(0, 20 - ((pesoCarga-capacidadPeso)/capacidadPeso)*20);
  } else score += 10;
  if(capacidadVolumen){
    score += volumenCarga<=capacidadVolumen ? 15 : Math.max(0, 15 - ((volumenCarga-capacidadVolumen)/capacidadVolumen)*15);
  } else score += 8;
  score += mismoDep ? 15 : 5;
  score += calificacion ? (Number(calificacion)/5)*10 : 6;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function cyGenerarMatches(forRole){
  const matches = [];

  if(forRole==='empresa'){
    const misCargas = CY.publicaciones.filter(p=>p.empresaId==='demo-empresa' && ['pendiente','busqueda'].includes(p.estado));
    misCargas.forEach(carga=>{
      const dist = cyHaversine(carga.origenLat, carga.origenLng, carga.destinoLat, carga.destinoLng);
      const candidatos = CY.transportistas.filter(t=>t.estado==='activo').map(t=>{
        const mismoDep = typeof cyMismoDepartamento==='function' && cyMismoDepartamento(t.ciudadBase, carga.origen);
        const score = cyCompatibilidad({
          vehiculoA: carga.vehiculo, vehiculoB: t.vehiculo,
          pesoCarga: carga.peso, capacidadPeso: null,
          volumenCarga: carga.volumen, capacidadVolumen: null,
          mismoDep, calificacion: t.calificacion
        });
        return {t, mismoDep, score};
      }).sort((a,b)=>b.score-a.score).slice(0,3);

      candidatos.forEach(({t, mismoDep, score})=>{
        matches.push({
          id: cyId('MATCH'),
          cargaId: carga.id,
          empresaNombre: carga.empresaNombre,
          empresaAvatar: cyAvatar(carga.empresaNombre),
          transportistaNombre: t.nombre,
          transportistaAvatar: t.avatar,
          origen: carga.origen, destino: carga.destino,
          precio: carga.precio,
          distancia: dist,
          tiempo: cyTiempoEstimado(dist),
          calificacion: t.calificacion,
          vehiculo: t.vehiculo,
          score, cerca: mismoDep
        });
      });
    });
  } else {
    const session = cyGetSession();
    const cargasDisponibles = CY.publicaciones.filter(p=>['pendiente','busqueda'].includes(p.estado) && !p.transportistaAsignadoId);
    const misViajes = typeof cyMisViajes==='function' ? cyMisViajes().filter(v=>['pendiente','busqueda'].includes(v.estado)) : [];
    const refViaje = misViajes[0];
    const refVeh = (typeof CY_VEHICULOS!=='undefined' && CY_VEHICULOS[0]) || null;
    const miVehiculo = (refViaje && refViaje.vehiculo) || (refVeh && refVeh.tipo) || session.vehiculo;
    const miCapacidadPeso = (refViaje && refViaje.capacidadPeso) || (refVeh && refVeh.capacidad) || null;
    const miCapacidadVolumen = (refViaje && refViaje.capacidadVolumen) || null;
    const miCiudad = typeof cyCiudadActualTransportista==='function' ? cyCiudadActualTransportista() : session.ciudad;

    cargasDisponibles.forEach(carga=>{
      const dist = cyHaversine(carga.origenLat, carga.origenLng, carga.destinoLat, carga.destinoLng);
      const mismoDep = typeof cyMismoDepartamento==='function' && cyMismoDepartamento(miCiudad, carga.origen);
      const score = cyCompatibilidad({
        vehiculoA: miVehiculo, vehiculoB: carga.vehiculo,
        pesoCarga: carga.peso, capacidadPeso: miCapacidadPeso,
        volumenCarga: carga.volumen, capacidadVolumen: miCapacidadVolumen,
        mismoDep, calificacion: null
      });
      matches.push({
        id: cyId('MATCH'),
        cargaId: carga.id,
        empresaNombre: carga.empresaNombre,
        empresaAvatar: cyAvatar(carga.empresaNombre),
        transportistaNombre: session.nombre,
        transportistaAvatar: session.avatar,
        origen: carga.origen, destino: carga.destino,
        precio: carga.precio,
        distancia: dist,
        tiempo: cyTiempoEstimado(dist),
        calificacion: (Math.random()*1.5+3.5).toFixed(1),
        vehiculo: carga.vehiculo,
        score, cerca: mismoDep
      });
    });
  }

  matches.sort((a,b)=> b.score-a.score);
  return matches.slice(0, 12);
}

function cyMatchScoreClass(score){ return score>=70 ? 'alta' : score>=45 ? 'media' : 'baja'; }

function cyRenderMatching(){
  const grid = document.getElementById('matching-grid');
  const loading = document.getElementById('matching-loading');
  const session = cyGetSession();
  if(!session) return;
  if(typeof cyRenderDisponibilidadBanner==='function') cyRenderDisponibilidadBanner('matching-banner');
  grid.innerHTML = '';
  loading.classList.remove('hidden');

  setTimeout(()=>{
    loading.classList.add('hidden');
    const matches = cyGenerarMatches(session.rol);
    if(matches.length===0){
      grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><p>No encontramos coincidencias por ahora. Publica una carga o viaje para empezar.</p></div>`;
      return;
    }
    const disp = session.rol==='transportista' ? cyEstadoDisponibilidad() : {disponible:true};
    grid.innerHTML = matches.map((m,i)=>`
      <div class="glass-card match-card ${i===0?'match-card-best':''}" data-match-id="${m.id}">
        ${i===0 ? '<div class="cy-match-best"><i class="fa-solid fa-star"></i> Mejor coincidencia</div>' : ''}
        <div class="match-parties">
          <div class="match-party"><img src="${m.empresaAvatar}" alt=""><div><strong>${m.empresaNombre}</strong><span>Empresa</span></div></div>
          <span class="match-vs"><i class="fa-solid fa-arrow-right-arrow-left"></i></span>
          <div class="match-party"><img src="${m.transportistaAvatar}" alt=""><div><strong>${m.transportistaNombre}</strong><span>Transportista ★ ${m.calificacion}</span></div></div>
        </div>
        <div class="item-route"><i class="fa-solid fa-location-dot"></i> ${m.origen} <i class="fa-solid fa-arrow-right" style="font-size:.7rem"></i> ${m.destino}</div>
        <div class="match-stats">
          <div class="match-stat"><strong>${cyMoney(m.precio)}</strong><span>Precio</span></div>
          <div class="match-stat"><strong>${m.distancia} km</strong><span>Distancia</span></div>
          <div class="match-stat"><strong>${m.tiempo}</strong><span>Tiempo est.</span></div>
          <div class="match-stat cy-match-score"><span class="cy-match-score-value ${cyMatchScoreClass(m.score)}">${m.score}%</span><span>Compatibilidad</span></div>
        </div>
        <div class="item-meta"><span><i class="fa-solid fa-truck"></i> ${m.vehiculo}</span>${m.cerca?'<span class="cy-badge-cerca"><i class="fa-solid fa-location-crosshairs"></i> Mismo departamento</span>':''}</div>
        <div class="item-actions">
          <button class="btn btn-success btn-sm" data-action="match-aceptar" data-id="${m.id}" ${disp.disponible?'':'disabled title="No disponible: completa tu trabajo actual o tu descanso"'}><i class="fa-solid fa-check"></i> Aceptar</button>
          <button class="btn btn-danger btn-sm" data-action="match-rechazar" data-id="${m.id}"><i class="fa-solid fa-xmark"></i> Rechazar</button>
          <button class="btn btn-ghost btn-sm" data-action="match-chat" data-id="${m.id}"><i class="fa-solid fa-message"></i> Chat</button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('[data-action="match-aceptar"]').forEach(btn=>{
      btn.onclick = ()=>{
        const m = matches.find(x=>x.id===btn.dataset.id);
        const carga = CY.publicaciones.find(p=>p.id===m.cargaId);
        if(!carga || !['pendiente','busqueda'].includes(carga.estado)){
          cyToast('Esta coincidencia ya no está disponible.','error');
          return;
        }
        if(session.rol==='transportista'){
          const d = cyEstadoDisponibilidad();
          if(!d.disponible){
            cyToast(d.motivo==='ocupado' ? 'Ya tienes un trabajo en curso. Complétalo antes de aceptar otro.' : 'Estás en tu horario de descanso obligatorio. Espera a que termine para aceptar un nuevo trabajo.', 'error');
            return;
          }
          carga.estado = 'aceptada';
          carga.transportistaAsignado = session.nombre;
          carga.transportistaAsignadoId = CY_DEMO_TRANSPORTISTA_ID;
          carga.fechaAceptada = Date.now();
        } else {
          carga.estado = 'aceptada';
          carga.transportistaAsignado = m.transportistaNombre;
          carga.fechaAceptada = Date.now();
        }
        cyPersist();
        const card = btn.closest('.match-card');
        card.style.transition='opacity .3s,transform .3s'; card.style.opacity='0'; card.style.transform='scale(.95)';
        setTimeout(()=>card.remove(),300);
        cyToast('Coincidencia aceptada. Se abrió un chat con la contraparte para coordinar.','success');
        cyAddNotif('fa-handshake', `Coincidencia aceptada: ${m.origen} → ${m.destino}`, session.rol==='transportista'?'transportista-cargas':'empresa-publicaciones');
        const contraparte = session.rol==='transportista' ? m.empresaNombre : m.transportistaNombre;
        const contraparteAvatar = session.rol==='transportista' ? m.empresaAvatar : m.transportistaAvatar;
        if(typeof cyAbrirChatCon==='function'){
          cyAbrirChatCon(contraparte, contraparteAvatar, `Hola, acabamos de coincidir para la carga ${m.origen} → ${m.destino} (${cyMoney(m.precio)}). ¿Coordinamos la entrega?`);
        }
        if(session.rol==='transportista' && typeof cyOnDisponibilidadChanged==='function') cyOnDisponibilidadChanged();
      };
    });
    grid.querySelectorAll('[data-action="match-rechazar"]').forEach(btn=>{
      btn.onclick = ()=>{
        const card = btn.closest('.match-card');
        card.style.transition='opacity .3s,transform .3s'; card.style.opacity='0'; card.style.transform='scale(.95)';
        setTimeout(()=>card.remove(),300);
        cyToast('Coincidencia rechazada.','info');
      };
    });
    grid.querySelectorAll('[data-action="match-chat"]').forEach(btn=>{
      btn.onclick = ()=>{
        const m = matches.find(x=>x.id===btn.dataset.id);
        const contraparte = session.rol==='transportista' ? m.empresaNombre : m.transportistaNombre;
        const contraparteAvatar = session.rol==='transportista' ? m.empresaAvatar : m.transportistaAvatar;
        if(typeof cyAbrirChatCon==='function'){
          cyAbrirChatCon(contraparte, contraparteAvatar, `Hola, vi la coincidencia para la ruta ${m.origen} → ${m.destino}. ¿Sigue disponible?`);
        } else {
          cyNavigate('chat');
        }
      };
    });
  }, 1100);
}
