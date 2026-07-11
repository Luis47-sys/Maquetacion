/* =====================================================================
   CARGAYA — auth.js
   Login / Registro simulados para Empresa, Transportista y Admin.
===================================================================== */

let CY_AUTH_ROLE = 'empresa'; // rol activo en el modal actual

function cyOpenLoginModal(prefRole='empresa'){
  const tpl = document.getElementById('tpl-login').innerHTML;
  const {root} = cyOpenModal(tpl);
  CY_AUTH_ROLE = prefRole;
  const tabs = root.querySelectorAll('.auth-tab');
  tabs.forEach(t=>{
    t.classList.toggle('active', t.dataset.role===prefRole);
    t.onclick = ()=>{ tabs.forEach(x=>x.classList.remove('active')); t.classList.add('active'); CY_AUTH_ROLE = t.dataset.role; cyUpdateDemoHint(); };
  });
  cyUpdateDemoHint();

  root.querySelector('[data-action="open-register"]').onclick = (e)=>{ e.preventDefault(); cyCloseModal(); cyOpenRegisterModal(CY_AUTH_ROLE==='admin'?'empresa':CY_AUTH_ROLE); };

  root.querySelector('#form-login').addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-pass');
    const okEmail = cyValidateField(emailInput, {required:true, email:true});
    const okPass = cyValidateField(passInput, {required:true, minLength:4});
    if(!okEmail || !okPass) return;

    const btn = e.target.querySelector('button[type=submit]');
    cyButtonLoading(btn, true, 'Verificando…');

    setTimeout(()=>{
      const user = CY_USERS.find(u=> u.correo.toLowerCase()===email.toLowerCase() && u.rol===CY_AUTH_ROLE);
      if(!user){
        cyButtonLoading(btn, false);
        cyToast('No encontramos una cuenta con ese correo y rol. Prueba con el correo de demo o regístrate.', 'error');
        return;
      }
      if(user.pass !== pass){
        cyButtonLoading(btn, false);
        cyToast('Contraseña incorrecta.', 'error');
        return;
      }
      cyButtonLoading(btn, false);
      cySetSession(user);
      cyToast(`Bienvenido de nuevo, ${user.nombre.split(' ')[0]}`, 'success');
      cyCloseModal();
      cyEnterApp(user);
    }, 700);
  });
}

function cyUpdateDemoHint(){
  const hint = document.getElementById('demo-hint');
  if(!hint) return;
  const demos = {
    empresa: 'empresa@demo.com', transportista: 'transportista@demo.com', admin: 'admin@demo.com'
  };
  hint.innerHTML = `<i class="fa-solid fa-circle-info"></i> Cuenta demo: <strong>${demos[CY_AUTH_ROLE]}</strong> · contraseña <strong>123456</strong>`;
}

function cyOpenRegisterModal(prefRole='empresa'){
  const tpl = document.getElementById('tpl-register').innerHTML;
  const {root} = cyOpenModal(tpl);
  CY_AUTH_ROLE = prefRole;
  const tabs = root.querySelectorAll('.auth-tab');
  tabs.forEach(t=>{
    t.classList.toggle('active', t.dataset.role===prefRole);
    t.onclick = ()=>{ tabs.forEach(x=>x.classList.remove('active')); t.classList.add('active'); CY_AUTH_ROLE=t.dataset.role; cyRenderRegisterForm(root); };
  });
  root.querySelector('[data-action="open-login"]').onclick = (e)=>{ e.preventDefault(); cyCloseModal(); cyOpenLoginModal(CY_AUTH_ROLE); };
  cyRenderRegisterForm(root);
}

function cyRenderRegisterForm(root){
  const wrap = root.querySelector('#register-forms');
  if(CY_AUTH_ROLE==='empresa'){
    wrap.innerHTML = `
      <form id="form-register" class="form-grid">
        <div class="form-row-2">
          <label>Nombre de la empresa<input class="input" name="nombre" required></label>
          <label>RUC<input class="input" name="ruc" required maxlength="11"></label>
        </div>
        <label>Correo electrónico<input class="input" type="email" name="correo" required></label>
        <div class="form-row-2">
          <label>Teléfono<input class="input" name="telefono" required></label>
          <label>Ciudad<input class="input" name="ciudad" list="cy-ciudades" required></label>
        </div>
        <label>Dirección<input class="input" name="direccion" required></label>
        <div class="form-row-2">
          <label>Contraseña<input class="input" type="password" name="pass" required minlength="6"></label>
          <label>Confirmar contraseña<input class="input" type="password" name="pass2" required minlength="6"></label>
        </div>
        <label class="checkbox-line"><input type="checkbox" required> Acepto los términos y condiciones</label>
        <button class="btn btn-primary btn-block" type="submit"><i class="fa-solid fa-building"></i> Crear cuenta empresa</button>
      </form>`;
  } else {
    wrap.innerHTML = `
      <form id="form-register" class="form-grid">
        <div class="form-row-2">
          <label>Nombre completo<input class="input" name="nombre" required></label>
          <label>DNI<input class="input" name="dni" required maxlength="8"></label>
        </div>
        <label>Correo electrónico<input class="input" type="email" name="correo" required></label>
        <div class="form-row-2">
          <label>Teléfono<input class="input" name="telefono" required></label>
          <label>Ciudad base<input class="input" name="ciudad" list="cy-ciudades" required></label>
        </div>
        <label>Tipo de vehículo
          <select class="input" name="vehiculo" required>
            ${TIPOS_VEHICULO.map(v=>`<option>${v}</option>`).join('')}
          </select>
        </label>
        <div class="form-row-2">
          <label>Contraseña<input class="input" type="password" name="pass" required minlength="6"></label>
          <label>Confirmar contraseña<input class="input" type="password" name="pass2" required minlength="6"></label>
        </div>
        <label class="checkbox-line"><input type="checkbox" required> Acepto los términos y condiciones</label>
        <button class="btn btn-primary btn-block" type="submit"><i class="fa-solid fa-truck"></i> Crear cuenta transportista</button>
      </form>`;
  }
  const datalist = document.createElement('datalist');
  datalist.id = 'cy-ciudades';
  datalist.innerHTML = CIUDADES.map(c=>`<option value="${c.n}">`).join('');
  wrap.appendChild(datalist);

  wrap.querySelector('#form-register').addEventListener('submit', (e)=>{
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());

    let valid = true;
    form.querySelectorAll('input[required]').forEach(inp=>{
      if(inp.type==='checkbox') return;
      const ok = cyValidateField(inp, {required:true, email: inp.type==='email'});
      if(!ok) valid = false;
    });
    if(data.pass !== data.pass2){
      cyToast('Las contraseñas no coinciden.', 'error'); valid=false;
    }
    if(CY_USERS.some(u=>u.correo.toLowerCase()===String(data.correo).toLowerCase())){
      cyToast('Ya existe una cuenta con ese correo.', 'error'); valid=false;
    }
    if(!valid) return;

    const btn = form.querySelector('button[type=submit]');
    cyButtonLoading(btn, true, 'Creando cuenta…');

    setTimeout(()=>{
      const id = cyId(CY_AUTH_ROLE==='empresa'?'EMP':'TRA').toLowerCase();
      const newUser = {
        id, rol: CY_AUTH_ROLE, nombre: data.nombre, correo: data.correo, pass: data.pass,
        telefono: data.telefono, avatar: cyAvatar(data.nombre),
        ...(CY_AUTH_ROLE==='empresa' ? {ruc:data.ruc, direccion:data.direccion, ciudad:data.ciudad} : {dni:data.dni, vehiculo:data.vehiculo, ciudad:data.ciudad})
      };
      CY_USERS.push(newUser);
      cySaveUsers(CY_USERS);
      cyButtonLoading(btn, false);
      cyToast(`Cuenta creada con éxito. ¡Bienvenido a CargaYa, ${data.nombre.split(' ')[0]}!`, 'success', '¡Registro exitoso!');
      cySetSession(newUser);
      cyCloseModal();
      cyEnterApp(newUser);
    }, 900);
  });
}

function cyLogout(){
  cyClearSession();
  document.body.classList.remove('in-app');
  cyToast('Sesión cerrada correctamente', 'info');
  window.scrollTo(0,0);
}
