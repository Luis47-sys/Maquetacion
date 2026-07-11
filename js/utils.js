/* =====================================================================
   CARGAYA — utils.js
   Toasts, modales, loaders, validaciones, exportación y helpers de tabla.
===================================================================== */

/* ---------------- TOASTS ---------------- */
function cyToast(msg, type='info', title=''){
  const cont = document.getElementById('toast-container');
  const icons = {success:'fa-circle-check', error:'fa-circle-exclamation', info:'fa-circle-info', warn:'fa-triangle-exclamation'};
  const titles = {success: title||'Listo', error: title||'Ups', info: title||'Aviso', warn: title||'Atención'};
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `<i class="fa-solid ${icons[type]||icons.info}"></i>
    <div><strong>${titles[type]}</strong><span>${msg}</span></div>
    <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>`;
  el.querySelector('.toast-close').onclick = ()=> el.remove();
  cont.appendChild(el);
  setTimeout(()=>{ el.style.transition='opacity .3s,transform .3s'; el.style.opacity='0'; el.style.transform='translateX(30px)'; setTimeout(()=>el.remove(),300); }, 4200);
}

/* ---------------- LOADER GLOBAL ---------------- */
function cyShowLoader(){ document.getElementById('global-loader').classList.remove('hide'); }
function cyHideLoader(){ document.getElementById('global-loader').classList.add('hide'); }

/* ---------------- BUTTON MINI LOADER ---------------- */
function cyButtonLoading(btn, isLoading, textLoading='Procesando…'){
  if(isLoading){
    btn.dataset.originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> ${textLoading}`;
  } else {
    btn.disabled = false;
    if(btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
  }
}

/* ---------------- MODAL ---------------- */
function cyOpenModal(innerHTML, {large=false, onClose=null}={}){
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-overlay" id="cy-modal-overlay">
    <div class="modal-box ${large?'modal-lg':''}">
      <button class="modal-close" id="cy-modal-close"><i class="fa-solid fa-xmark"></i></button>
      ${innerHTML}
    </div>
  </div>`;
  const overlay = document.getElementById('cy-modal-overlay');
  const close = ()=>{ root.innerHTML=''; if(onClose) onClose(); };
  document.getElementById('cy-modal-close').onclick = close;
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) close(); });
  return { close, root: root.querySelector('.modal-box') };
}
function cyCloseModal(){ document.getElementById('modal-root').innerHTML=''; }

function cyConfirm(message, {title='¿Estás seguro?', icon='fa-triangle-exclamation', confirmText='Sí, confirmar', confirmClass='btn-danger'}={}){
  return new Promise((resolve)=>{
    const {close} = cyOpenModal(`
      <div class="confirm-modal">
        <i class="fa-solid ${icon}"></i>
        <h3>${title}</h3>
        <p class="muted" style="margin-top:8px">${message}</p>
        <div class="actions">
          <button class="btn btn-ghost" id="cy-conf-cancel">Cancelar</button>
          <button class="btn ${confirmClass}" id="cy-conf-ok">${confirmText}</button>
        </div>
      </div>
    `);
    document.getElementById('cy-conf-cancel').onclick = ()=>{ close(); resolve(false); };
    document.getElementById('cy-conf-ok').onclick = ()=>{ close(); resolve(true); };
  });
}

/* ---------------- VALIDACIÓN ---------------- */
function cyValidateField(input, rules={}){
  const val = input.value.trim();
  let error = '';
  if(rules.required && !val) error = 'Este campo es obligatorio';
  else if(rules.email && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) error = 'Correo inválido';
  else if(rules.minLength && val.length < rules.minLength) error = `Mínimo ${rules.minLength} caracteres`;
  else if(rules.numeric && val && isNaN(Number(val))) error = 'Debe ser un número';
  else if(rules.pattern && val && !rules.pattern.test(val)) error = rules.patternMsg || 'Formato inválido';

  let errEl = input.parentElement.querySelector('.field-error');
  if(error){
    input.classList.add('invalid');
    if(!errEl){ errEl = document.createElement('span'); errEl.className='field-error'; input.parentElement.appendChild(errEl); }
    errEl.textContent = error;
  } else {
    input.classList.remove('invalid');
    if(errEl) errEl.remove();
  }
  return !error;
}

/* ---------------- BADGES DE ESTADO ---------------- */
const CY_BADGE_CLASS = {
  pendiente:'badge-pendiente', busqueda:'badge-busqueda', encontrado:'badge-encontrado',
  aceptada:'badge-aceptada', camino:'badge-camino', entregada:'badge-entregada',
  finalizada:'badge-finalizada', cancelada:'badge-cancelada',
  activo:'badge-activo', inactivo:'badge-inactivo'
};
function cyBadge(estado){
  const label = ESTADO_LABEL[estado] || (estado.charAt(0).toUpperCase()+estado.slice(1));
  return `<span class="badge ${CY_BADGE_CLASS[estado]||'badge-pendiente'}">${label}</span>`;
}
function cyProgressPercent(estado){
  const idx = ESTADO_ORDEN.indexOf(estado);
  if(estado==='cancelada') return 0;
  if(idx<0) return 0;
  return Math.round(((idx+1)/ESTADO_ORDEN.length)*100);
}

/* ---------------- EXPORTAR TABLAS ---------------- */
function cyExportExcel(tableId, filename='reporte'){
  const table = document.getElementById(tableId);
  if(!table){ cyToast('No hay datos para exportar','error'); return; }
  let csv = [];
  table.querySelectorAll('tr').forEach(row=>{
    const cols = Array.from(row.querySelectorAll('th,td')).map(td=>{
      let text = td.innerText.replace(/"/g,'""').trim();
      return `"${text}"`;
    });
    csv.push(cols.join(','));
  });
  const blob = new Blob(['\uFEFF'+csv.join('\n')], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename+'.csv'; a.click();
  URL.revokeObjectURL(url);
  cyToast('Archivo Excel (.csv) descargado correctamente','success');
}

function cyExportPDF(tableId, filename='reporte'){
  const table = document.getElementById(tableId);
  if(!table){ cyToast('No hay datos para exportar','error'); return; }
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>${filename}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;color:#14171F;}
      h1{font-size:18px;margin-bottom:14px;}
      table{border-collapse:collapse;width:100%;font-size:12px;}
      th,td{border:1px solid #ccc;padding:8px 10px;text-align:left;}
      th{background:#FFB020;color:#181307;}
    </style></head><body>
    <h1>CargaYa — ${filename}</h1>
    <p style="color:#666;font-size:11px;margin-bottom:16px">Generado el ${new Date().toLocaleString('es-PE')}</p>
    ${table.outerHTML}
    </body></html>
  `);
  win.document.close();
  setTimeout(()=>{ win.print(); }, 400);
  cyToast('Se abrió la vista de impresión para exportar a PDF','success');
}

/* ---------------- TABLA: sort + paginate + search genérico ---------------- */
function cyPaginate(array, page, perPage){
  const start = (page-1)*perPage;
  return array.slice(start, start+perPage);
}
function cyRenderPagination(containerId, totalItems, perPage, currentPage, onChange){
  const el = document.getElementById(containerId);
  const totalPages = Math.max(1, Math.ceil(totalItems/perPage));
  let html = '';
  for(let i=1;i<=totalPages;i++){
    html += `<button class="page-btn ${i===currentPage?'active':''}" data-page="${i}">${i}</button>`;
  }
  el.innerHTML = html;
  el.querySelectorAll('.page-btn').forEach(btn=>{
    btn.onclick = ()=> onChange(Number(btn.dataset.page));
  });
}

/* ---------------- DEBOUNCE ---------------- */
function cyDebounce(fn, delay=300){
  let t;
  return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), delay); };
}

/* ---------------- DISTANCIA / TIEMPO SIMULADOS ---------------- */
function cyHaversine(lat1,lng1,lat2,lng2){
  const R=6371, toRad = d=>d*Math.PI/180;
  const dLat = toRad(lat2-lat1), dLng = toRad(lng2-lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return Math.round(R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}
function cyTiempoEstimado(km){
  const horas = km/65;
  if(horas<1) return Math.round(horas*60)+' min';
  return horas.toFixed(1)+' h';
}

/* ---------------- NOTIFICACIONES ---------------- */
function cyAddNotif(icon, text){
  CY.notificaciones.unshift({id:cyId('NOT'), icon, text, leida:false, fecha:Date.now()});
  cyPersist();
  cyRenderNotifs();
}
function cyRenderNotifs(){
  const list = document.getElementById('notif-list');
  const count = document.getElementById('notif-count');
  if(!list) return;
  const noLeidas = CY.notificaciones.filter(n=>!n.leida).length;
  count.textContent = noLeidas;
  count.style.display = noLeidas>0 ? 'grid' : 'none';
  if(CY.notificaciones.length===0){
    list.innerHTML = `<div class="notif-empty">Sin notificaciones por ahora</div>`;
    return;
  }
  list.innerHTML = CY.notificaciones.slice(0,25).map(n=>`
    <div class="notif-item">
      <div class="ni-icon"><i class="fa-solid ${n.icon}"></i></div>
      <div><p>${n.text}</p><span>${cyTimeAgo(n.fecha)}</span></div>
    </div>
  `).join('');
}
function cyTimeAgo(ts){
  const diff = Math.floor((Date.now()-ts)/1000);
  if(diff<60) return 'hace un momento';
  if(diff<3600) return `hace ${Math.floor(diff/60)} min`;
  if(diff<86400) return `hace ${Math.floor(diff/3600)} h`;
  return `hace ${Math.floor(diff/86400)} d`;
}
