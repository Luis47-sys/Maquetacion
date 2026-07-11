/* =====================================================================
   CARGAYA — matching.js
   Simula el cruce de origen / destino / fecha / peso / volumen / vehículo
   entre publicaciones de carga y viajes de retorno.
===================================================================== */

function cyGenerarMatches(forRole){
  // Genera un set de coincidencias ficticias combinando publicaciones propias
  // con transportistas (o viceversa), calculando distancia y tiempo simulados.
  const session = cyGetSession();
  const matches = [];

  if(forRole==='empresa'){
    const misCargas = CY.publicaciones.filter(p=>p.empresaId==='demo-empresa' && ['pendiente','busqueda'].includes(p.estado));
    misCargas.forEach(carga=>{
      const candidatos = CY.transportistas.filter(()=>Math.random()>0.4).slice(0,2);
      candidatos.forEach(t=>{
        const dist = cyHaversine(carga.origenLat, carga.origenLng, carga.destinoLat, carga.destinoLng);
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
          vehiculo: t.vehiculo
        });
      });
    });
  } else {
    const misViajes = CY.viajes.filter(v=>v.transportistaId==='demo-transportista' && ['pendiente','busqueda'].includes(v.estado));
    misViajes.forEach(viaje=>{
      const candidatos = CY.empresas.filter(()=>Math.random()>0.4).slice(0,2);
      candidatos.forEach(emp=>{
        const dist = cyHaversine(viaje.origenLat, viaje.origenLng, viaje.destinoLat, viaje.destinoLng);
        matches.push({
          id: cyId('MATCH'),
          viajeId: viaje.id,
          empresaNombre: emp.nombre,
          empresaAvatar: emp.avatar,
          transportistaNombre: viaje.transportistaNombre,
          transportistaAvatar: cyAvatar(viaje.transportistaNombre),
          origen: viaje.origen, destino: viaje.destino,
          precio: viaje.precioSugerido,
          distancia: dist,
          tiempo: cyTiempoEstimado(dist),
          calificacion: (Math.random()*1.5+3.5).toFixed(1),
          vehiculo: viaje.vehiculo
        });
      });
    });
  }
  return matches;
}

function cyRenderMatching(){
  const grid = document.getElementById('matching-grid');
  const loading = document.getElementById('matching-loading');
  const session = cyGetSession();
  if(!session) return;
  grid.innerHTML = '';
  loading.classList.remove('hidden');

  setTimeout(()=>{
    loading.classList.add('hidden');
    const matches = cyGenerarMatches(session.rol);
    if(matches.length===0){
      grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><p>No encontramos coincidencias por ahora. Publica una carga o viaje para empezar.</p></div>`;
      return;
    }
    grid.innerHTML = matches.map(m=>`
      <div class="glass-card match-card" data-match-id="${m.id}">
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
        </div>
        <div class="item-meta"><span><i class="fa-solid fa-truck"></i> ${m.vehiculo}</span></div>
        <div class="item-actions">
          <button class="btn btn-success btn-sm" data-action="match-aceptar" data-id="${m.id}"><i class="fa-solid fa-check"></i> Aceptar</button>
          <button class="btn btn-danger btn-sm" data-action="match-rechazar" data-id="${m.id}"><i class="fa-solid fa-xmark"></i> Rechazar</button>
          <button class="btn btn-ghost btn-sm" data-action="match-chat" data-id="${m.id}"><i class="fa-solid fa-message"></i> Chat</button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('[data-action="match-aceptar"]').forEach(btn=>{
      btn.onclick = ()=>{
        const card = btn.closest('.match-card');
        card.style.transition='opacity .3s,transform .3s'; card.style.opacity='0'; card.style.transform='scale(.95)';
        setTimeout(()=>card.remove(),300);
        cyToast('Coincidencia aceptada. Se creó un chat y se actualizó el estado a "Aceptada".','success');
        cyAddNotif('fa-handshake','Nueva coincidencia aceptada correctamente');
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
      btn.onclick = ()=>{ cyNavigate('chat'); };
    });
  }, 1100);
}
