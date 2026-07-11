/* =====================================================================
   CARGAYA — admin.js
   Panel de administrador: usuarios, empresas, transportistas,
   publicaciones, viajes, reportes y configuraciones.
===================================================================== */

function cyRenderAdminHome(){
  document.getElementById('admin-kpis').innerHTML = `
    ${cyKpi('fa-users', CY.empresas.length + CY.transportistas.length, 'Usuarios totales', 'up', '+9%')}
    ${cyKpi('fa-box', CY.publicaciones.length, 'Publicaciones activas', 'up', '+15%')}
    ${cyKpi('fa-truck', CY.viajes.length, 'Viajes registrados', 'up', '+6%')}
    ${cyKpi('fa-sack-dollar', cyMoney(CY.publicaciones.reduce((s,p)=>s+p.precio,0)), 'Volumen transaccionado', 'up', '+21%')}
  `;
  cyRenderAdminCharts();
}

function cyRenderAdminUsuarios(){
  const texto = (document.getElementById('admin-usuarios-buscar').value||'').toLowerCase();
  const filtro = document.getElementById('admin-usuarios-filtro').value;

  let usuarios = [
    ...CY.empresas.map(e=>({id:e.id, nombre:e.nombre, rol:'empresa', correo:e.correo, estado:e.estado})),
    ...CY.transportistas.map(t=>({id:t.id, nombre:t.nombre, rol:'transportista', correo:t.correo, estado:t.estado})),
    ...CY_USERS.map(u=>({id:u.id, nombre:u.nombre, rol:u.rol, correo:u.correo, estado:'activo'}))
  ];
  usuarios = usuarios.filter(u=>{
    const matchText = !texto || (u.nombre+u.correo).toLowerCase().includes(texto);
    const matchRol = !filtro || u.rol===filtro;
    return matchText && matchRol;
  });

  document.getElementById('admin-usuarios-body').innerHTML = usuarios.slice(0,60).map(u=>`
    <tr>
      <td>${u.id}</td><td>${u.nombre}</td><td style="text-transform:capitalize">${u.rol}</td><td>${u.correo}</td>
      <td>${cyBadge(u.estado)}</td>
      <td>
        <button class="btn btn-outline btn-sm" data-action="admin-toggle-estado" data-id="${u.id}"><i class="fa-solid fa-power-off"></i></button>
        <button class="btn btn-danger btn-sm" data-action="admin-eliminar-usuario" data-id="${u.id}"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-faint)">Sin resultados</td></tr>`;

  document.querySelectorAll('[data-action="admin-toggle-estado"]').forEach(btn=>{
    btn.onclick = ()=>{
      const emp = CY.empresas.find(e=>e.id===btn.dataset.id);
      const tra = CY.transportistas.find(t=>t.id===btn.dataset.id);
      const target = emp || tra;
      if(target){ target.estado = target.estado==='activo' ? 'inactivo':'activo'; cyPersist(); cyToast('Estado del usuario actualizado','success'); cyRenderAdminUsuarios(); }
      else cyToast('Este usuario del sistema no se puede desactivar','info');
    };
  });
  document.querySelectorAll('[data-action="admin-eliminar-usuario"]').forEach(btn=>{
    btn.onclick = async ()=>{
      const ok = await cyConfirm('Esta acción eliminará al usuario de la plataforma.', {title:'¿Eliminar usuario?'});
      if(!ok) return;
      CY.empresas = CY.empresas.filter(e=>e.id!==btn.dataset.id);
      CY.transportistas = CY.transportistas.filter(t=>t.id!==btn.dataset.id);
      cyPersist(); cyToast('Usuario eliminado','success'); cyRenderAdminUsuarios();
    };
  });
}

function cyRenderAdminPublicaciones(){
  document.getElementById('admin-publicaciones-body').innerHTML = CY.publicaciones.slice(0,60).map(p=>`
    <tr><td>${p.id}</td><td>${p.empresaNombre}</td><td>${p.origen}</td><td>${p.destino}</td><td>${cyFormatoFecha(p.fecha)}</td><td>${cyBadge(p.estado)}</td>
    <td><button class="btn btn-danger btn-sm" data-action="admin-elim-pub" data-id="${p.id}"><i class="fa-solid fa-trash"></i></button></td></tr>
  `).join('');
  document.querySelectorAll('[data-action="admin-elim-pub"]').forEach(btn=>{
    btn.onclick = async ()=>{
      const ok = await cyConfirm('Se eliminará esta publicación de la plataforma.', {title:'¿Eliminar publicación?'});
      if(!ok) return;
      CY.publicaciones = CY.publicaciones.filter(p=>p.id!==btn.dataset.id);
      cyPersist(); cyToast('Publicación eliminada','success'); cyRenderAdminPublicaciones();
    };
  });
}

function cyRenderAdminViajes(){
  document.getElementById('admin-viajes-body').innerHTML = CY.viajes.slice(0,60).map(v=>`
    <tr><td>${v.id}</td><td>${v.transportistaNombre}</td><td>${v.origen}</td><td>${v.destino}</td><td>${cyFormatoFecha(v.fecha)}</td><td>${cyBadge(v.estado)}</td>
    <td><button class="btn btn-danger btn-sm" data-action="admin-elim-viaje" data-id="${v.id}"><i class="fa-solid fa-trash"></i></button></td></tr>
  `).join('');
  document.querySelectorAll('[data-action="admin-elim-viaje"]').forEach(btn=>{
    btn.onclick = async ()=>{
      const ok = await cyConfirm('Se eliminará este viaje de la plataforma.', {title:'¿Eliminar viaje?'});
      if(!ok) return;
      CY.viajes = CY.viajes.filter(v=>v.id!==btn.dataset.id);
      cyPersist(); cyToast('Viaje eliminado','success'); cyRenderAdminViajes();
    };
  });
}

function cyRenderAdminReportes(){
  cyRenderAdminCharts();
  const btn = document.querySelector('[data-action="generar-reporte"]');
  if(btn) btn.onclick = ()=>{
    cyButtonLoading(btn, true, 'Generando…');
    setTimeout(()=>{
      cyButtonLoading(btn, false);
      cyToast('Reporte generado. Usa los botones de exportación en cada tabla para descargarlo.','success','Reporte listo');
    }, 1000);
  };
}

function cyInitAdminConfig(){
  const btn = document.getElementById('admin-guardar-config');
  if(btn) btn.onclick = ()=>{
    cyButtonLoading(btn, true, 'Guardando…');
    setTimeout(()=>{ cyButtonLoading(btn,false); cyToast('Configuración de la plataforma guardada','success'); }, 700);
  };
}
