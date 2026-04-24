// ========== CONFIGURACIÓN FIREBASE ==========
const firebaseConfig = {
    apiKey: "AIzaSyB3xTYP7wKgvFvySX8ZkHqm0Tly8y4LcM4",
    authDomain: "imprecioneswjs.firebaseapp.com",
    databaseURL: "https://imprecioneswjs-default-rtdb.firebaseio.com",
    projectId: "imprecioneswjs",
    storageBucket: "imprecioneswjs.appspot.com",
    appId: "1:923402098800:web:ef57d1e1bf1fdd758a3cb5"
};

// ========== VARIABLES GLOBALES ==========
let app, db;
let clientesAgua = [];
let clientesCursos = [];
let todosClientes = [];
let pagos = [];
let cursos = [];
let inscripciones = [];
let usuarioActual = { nombre: 'Administrador', rol: 'Admin' };
let clientePagoSeleccionado = null;
let tipoRecordatorioSeleccionado = null;
let clientesFiltradosRecordatorio = [];

// ========== INICIALIZAR FIREBASE ==========
if (!firebase.apps || !firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
} else {
    app = firebase.app();
}
db = firebase.database();
console.log('✅ Firebase listo');

// ========== OBTENER USUARIO ==========
function obtenerUsuario() {
    try {
        if (window.parent && window.parent.sessionStorage) {
            const nombre = window.parent.sessionStorage.getItem('nombreUsuario');
            const rol = window.parent.sessionStorage.getItem('rolUsuario');
            if (nombre) {
                usuarioActual.nombre = nombre;
                usuarioActual.rol = rol || 'Admin';
            }
        }
        if (!usuarioActual.nombre || usuarioActual.nombre === 'Administrador') {
            const nombre = sessionStorage.getItem('nombreUsuario');
            if (nombre) {
                usuarioActual.nombre = nombre;
                usuarioActual.rol = sessionStorage.getItem('rolUsuario') || 'Admin';
            }
        }
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        const userAvatar = document.getElementById('userAvatar');
        if (userName) userName.textContent = usuarioActual.nombre;
        if (userRole) userRole.textContent = usuarioActual.rol;
        if (userAvatar) userAvatar.textContent = usuarioActual.nombre.charAt(0).toUpperCase();
    } catch (e) {
        console.log('Error leyendo usuario:', e);
    }
}

// ========== GENERAR USUARIO AUTOMÁTICO ==========
function generarUsuarioAutomatico(nombre) {
    const palabras = nombre.toLowerCase().split(' ');
    let base = '';
    if (palabras.length >= 2) {
        base = palabras[0] + palabras[1];
    } else {
        base = palabras[0];
    }
    base = base.replace(/[^a-z]/g, '');
    
    const usuariosExistentes = todosClientes.map(c => c.usuario || '');
    let numero = 1;
    let usuarioGenerado = `FUM-${base}${numero.toString().padStart(3, '0')}`;
    
    while (usuariosExistentes.includes(usuarioGenerado)) {
        numero++;
        usuarioGenerado = `FUM-${base}${numero.toString().padStart(3, '0')}`;
    }
    
    return usuarioGenerado;
}

// ========== CARGAR DATOS ==========
async function cargarDatos() {
    try {
        const clientesSnap = await db.ref('usuarios_fundacion').once('value');
        todosClientes = [];
        clientesAgua = [];
        clientesCursos = [];
        
        if (clientesSnap.exists()) {
            const data = clientesSnap.val();
            for (let key in data) {
                const cliente = { firebaseKey: key, ...data[key] };
                todosClientes.push(cliente);
                
                if (cliente.tipo === 'agua' || cliente.tipo === 'ambos') {
                    // Calcular cuotas pagadas y pendientes
                    cliente.cuotaMensual = cliente.cuotaMensual || 500;
                    cliente.cuotasPagadas = cliente.cuotasPagadas || 0;
                    cliente.ultimoMesPagado = cliente.ultimoMesPagado || 0;
                    cliente.ultimoAñoPagado = cliente.ultimoAñoPagado || new Date().getFullYear();
                    
                    // Calcular cuántas cuotas debe (mes actual - último mes pagado)
                    const fechaActual = new Date();
                    const añoActual = fechaActual.getFullYear();
                    const mesActual = fechaActual.getMonth() + 1;
                    
                    if (cliente.ultimoAñoPagado === añoActual) {
                        cliente.cuotasAdeudadas = Math.max(0, mesActual - cliente.ultimoMesPagado);
                    } else {
                        const mesesRestantesAñoPasado = 12 - cliente.ultimoMesPagado;
                        cliente.cuotasAdeudadas = mesesRestantesAñoPasado + mesActual;
                    }
                    
                    cliente.deuda = cliente.cuotaMensual * cliente.cuotasAdeudadas;
                    
                    clientesAgua.push(cliente);
                }
                if (cliente.tipo === 'curso' || cliente.tipo === 'ambos') {
                    clientesCursos.push(cliente);
                }
            }
        }

        const pagosSnap = await db.ref('pagos_agua').once('value');
        pagos = pagosSnap.exists() ? Object.entries(pagosSnap.val()).map(([k,v]) => ({ firebaseKey: k, ...v })) : [];

        const cursosSnap = await db.ref('cursos_fundacion').once('value');
        cursos = cursosSnap.exists() ? Object.entries(cursosSnap.val()).map(([k,v]) => ({ firebaseKey: k, ...v })) : [];

        const inscSnap = await db.ref('inscripciones_fundacion').once('value');
        inscripciones = inscSnap.exists() ? Object.entries(inscSnap.val()).map(([k,v]) => ({ firebaseKey: k, ...v })) : [];

        console.log('✅ Datos cargados');
    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

// ========== CAMBIAR SECCIÓN ==========
window.cambiarSeccion = async function(seccion) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => {
        if (b.textContent.includes(seccion === 'inicio' ? 'Inicio' : 
            seccion === 'usuarios' ? 'Usuarios' :
            seccion === 'agua' ? 'Agua' :
            seccion === 'cursos' ? 'Cursos' : 
            seccion === 'reportes' ? 'Reportes' : 'Recordatorios')) {
            b.classList.add('active');
        }
    });

    await cargarDatos();
    const content = document.getElementById('content');

    switch(seccion) {
        case 'inicio':
            await mostrarInicio(content);
            break;
        case 'usuarios':
            await mostrarUsuarios(content);
            break;
        case 'agua':
            await mostrarAgua(content);
            break;
        case 'cursos':
            await mostrarCursos(content);
            break;
        case 'reportes':
            await mostrarReportes(content);
            break;
        case 'recordatorios':
            await mostrarRecordatorios(content);
            break;
    }
};

// ========== INICIO ==========
async function mostrarInicio(container) {
    const totalDeuda = clientesAgua.reduce((s,c) => s + (c.deuda||0), 0);
    const totalPagosMes = pagos.filter(p => {
        const fecha = new Date(p.fecha);
        return fecha.getMonth() === new Date().getMonth() && fecha.getFullYear() === new Date().getFullYear();
    }).reduce((s,p) => s + p.monto, 0);

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:25px;">
            <h2>🏠 Panel de Control</h2>
            <span style="background:#1976d2; color:white; padding:8px 16px; border-radius:30px;">${new Date().toLocaleDateString()}</span>
        </div>
        <div class="stats-grid">
            <div class="stat-card water">
                <div class="stat-info"><h3>Clientes Agua</h3><span class="number">${clientesAgua.length}</span></div>
                <div class="stat-icon"><i class="fa-solid fa-water"></i></div>
            </div>
            <div class="stat-card courses">
                <div class="stat-info"><h3>Clientes Cursos</h3><span class="number">${clientesCursos.length}</span></div>
                <div class="stat-icon"><i class="fa-solid fa-graduation-cap"></i></div>
            </div>
            <div class="stat-card debt">
                <div class="stat-info"><h3>Deuda Total</h3><span class="number">RD$ ${totalDeuda.toFixed(2)}</span></div>
                <div class="stat-icon"><i class="fa-solid fa-dollar-sign"></i></div>
            </div>
            <div class="stat-card paid">
                <div class="stat-info"><h3>Cobrado Mes</h3><span class="number">RD$ ${totalPagosMes.toFixed(2)}</span></div>
                <div class="stat-icon"><i class="fa-solid fa-coins"></i></div>
            </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
            <div style="background:white; padding:25px; border-radius:12px; box-shadow:0 5px 15px rgba(0,0,0,0.05);">
                <h3>💧 Proyecto Agua</h3>
                <p>Clientes con deuda: <strong>${clientesAgua.filter(c => c.deuda > 0).length}</strong></p>
                <button class="btn btn-primary" onclick="cambiarSeccion('agua')">Ver Proyecto Agua</button>
            </div>
            <div style="background:white; padding:25px; border-radius:12px; box-shadow:0 5px 15px rgba(0,0,0,0.05);">
                <h3>📚 Cursos</h3>
                <p>Cursos activos: <strong>${cursos.filter(c => c.activo !== false).length}</strong></p>
                <button class="btn btn-primary" onclick="cambiarSeccion('cursos')">Ver Cursos</button>
            </div>
        </div>
    `;
}

// ========== USUARIOS ==========
async function mostrarUsuarios(container) {
    let html = `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <h2>👥 Usuarios</h2>
            <button class="btn btn-primary" onclick="abrirModalNuevoUsuario()">➕ Nuevo Usuario</button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Nombre</th>
                        <th>Tipo</th>
                        <th>WhatsApp</th>
                        <th>Zona</th>
                        <th>Cuota Mensual</th>
                        <th>Cuotas Pagadas</th>
                        <th>Cuotas Atrasadas</th>
                        <th>Deuda</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    todosClientes.forEach(c => {
        let tipoBadge = '';
        if (c.tipo === 'agua') tipoBadge = '<span class="badge agua">💧 Agua</span>';
        else if (c.tipo === 'curso') tipoBadge = '<span class="badge curso">📚 Curso</span>';
        else if (c.tipo === 'ambos') tipoBadge = '<span class="badge ambos">💧📚 Ambos</span>';
        
        const cuotasAtrasadas = c.cuotasAdeudadas || 0;
        
        html += `<tr>
            <td><code>${c.usuario || 'N/A'}</code></td>
            <td><strong>${c.nombre || ''}</strong></td>
            <td>${tipoBadge}</td>
            <td>${c.whatsapp ? `<a href="https://wa.me/${c.whatsapp}" target="_blank" class="whatsapp-btn"><i class="fa-brands fa-whatsapp"></i> ${c.whatsapp}</a>` : 'N/A'}</td>
            <td><span class="zona-tag"><i class="fa-solid fa-location-dot"></i> ${c.zona || 'N/A'}</span></td>
            <td>RD$ ${(c.cuotaMensual || 500).toFixed(2)}</td>
            <td>${c.cuotasPagadas || 0} / 12</td>
            <td style="color:${cuotasAtrasadas > 0 ? '#e74c3c' : '#27ae60'}; font-weight:bold;">${cuotasAtrasadas}</td>
            <td style="color:${c.deuda > 0 ? '#e74c3c' : '#27ae60'}; font-weight:bold;">RD$ ${(c.deuda || 0).toFixed(2)}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="editarUsuario('${c.firebaseKey}')"><i class="fa-solid fa-edit"></i></button>
                <button class="btn btn-success btn-sm" onclick="abrirModalPagoCliente('${c.firebaseKey}')"><i class="fa-solid fa-dollar-sign"></i></button>
                <button class="btn btn-warning btn-sm" onclick="enviarRecordatorioIndividual('${c.firebaseKey}')"><i class="fa-brands fa-whatsapp"></i></button>
            </td>
        </tr>`;
    });
    
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

// ========== AGUA ==========
async function mostrarAgua(container) {
    let html = `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <h2>💧 Proyecto Agua</h2>
            <div>
                <button class="btn btn-success" onclick="abrirModalPago()"><i class="fa-solid fa-dollar-sign"></i> Registrar Pago</button>
                <button class="btn btn-warning" onclick="mostrarPendientes()"><i class="fa-solid fa-clock"></i> Pendientes</button>
            </div>
        </div>
        <div id="aguaContent">
    `;
    html += await tablaAgua();
    html += `</div>`;
    container.innerHTML = html;
}

async function tablaAgua() {
    let html = `<div class="table-container"><table><thead><tr>
        <th>Cliente</th><th>Usuario</th><th>WhatsApp</th><th>Zona</th><th>Cuota Mensual</th>
        <th>Cuotas Pagadas</th><th>Cuotas Atrasadas</th><th>Deuda</th><th>Estado</th><th>Acciones</th>
    </tr></thead><tbody>`;
    
    clientesAgua.forEach(c => {
        const estado = c.deuda > 0 ? 'pendiente' : 'pagado';
        const estadoTexto = c.deuda > 0 ? 'Pendiente' : 'Al día';
        html += `<tr>
            <td><strong>${c.nombre || ''}</strong></td>
            <td><code>${c.usuario || ''}</code></td>
            <td><a href="https://wa.me/${c.whatsapp}" class="whatsapp-btn"><i class="fa-brands fa-whatsapp"></i> ${c.whatsapp}</a></td>
            <td><span class="zona-tag"><i class="fa-solid fa-location-dot"></i> ${c.zona || 'N/A'}</span></td>
            <td>RD$ ${(c.cuotaMensual || 500).toFixed(2)}</td>
            <td>${c.cuotasPagadas || 0} / 12</td>
            <td style="color:${c.cuotasAdeudadas > 0 ? '#e74c3c' : '#27ae60'}; font-weight:bold;">${c.cuotasAdeudadas || 0}</td>
            <td style="color:${c.deuda > 0 ? '#e74c3c' : '#27ae60'}; font-weight:bold;">RD$ ${(c.deuda || 0).toFixed(2)}</td>
            <td><span class="badge ${estado}">${estadoTexto}</span></td>
            <td>
                <button class="btn btn-success btn-sm" onclick="abrirModalPagoCliente('${c.firebaseKey}')"><i class="fa-solid fa-dollar-sign"></i> Pagar</button>
                <button class="btn btn-warning btn-sm" onclick="enviarRecordatorioIndividual('${c.firebaseKey}')"><i class="fa-brands fa-whatsapp"></i> Recordar</button>
            </td>
        </tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
}

window.mostrarPendientes = async function() {
    await cargarDatos();
    const deudores = clientesAgua.filter(c => c.deuda > 0);
    let html = `
        <div style="margin-bottom:20px;">
            <button class="btn btn-primary" onclick="mostrarAgua(document.getElementById('content'))"><i class="fa-solid fa-arrow-left"></i> Volver</button>
        </div>
        <h3>Pagos Pendientes (${deudores.length})</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>WhatsApp</th>
                        <th>Zona</th>
                        <th>Cuotas Atrasadas</th>
                        <th>Deuda</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    deudores.forEach(c => {
        html += `<tr>
            <td><strong>${c.nombre}</strong></td>
            <td><a href="https://wa.me/${c.whatsapp}" class="whatsapp-btn"><i class="fa-brands fa-whatsapp"></i> ${c.whatsapp}</a></td>
            <td><span class="zona-tag"><i class="fa-solid fa-location-dot"></i> ${c.zona}</span></td>
            <td style="color:#e74c3c; font-weight:bold;">${c.cuotasAdeudadas || 0}</td>
            <td style="color:#e74c3c; font-weight:bold;">RD$ ${(c.deuda || 0).toFixed(2)}</td>
            <td>
                <button class="btn btn-success btn-sm" onclick="abrirModalPagoCliente('${c.firebaseKey}')"><i class="fa-solid fa-dollar-sign"></i> Cobrar</button>
                <button class="btn btn-warning btn-sm" onclick="enviarRecordatorioIndividual('${c.firebaseKey}')"><i class="fa-brands fa-whatsapp"></i> Recordar</button>
            </td>
        </tr>`;
    });
    html += `</tbody></table></div>`;
    document.getElementById('aguaContent').innerHTML = html;
};

// ========== FUNCIONES DE PAGO CON CUOTAS ==========
window.abrirModalPago = function() {
    clientePagoSeleccionado = null;
    document.getElementById('formPago').classList.add('hidden');
    document.getElementById('buscarCliente').value = '';
    document.getElementById('resultadoBusquedaPago').innerHTML = '';
    abrirModal('modalPago');
};

window.abrirModalPagoCliente = function(clienteKey) {
    const cliente = clientesAgua.find(c => c.firebaseKey === clienteKey) || 
                   todosClientes.find(c => c.firebaseKey === clienteKey);
    if (!cliente) return;
    
    clientePagoSeleccionado = cliente;
    
    const mesActual = new Date().getMonth() + 1;
    const añoActual = new Date().getFullYear();
    const cuotasAtrasadas = cliente.cuotasAdeudadas || 0;
    const cuotaMensual = cliente.cuotaMensual || 500;
    const montoSugerido = cuotasAtrasadas > 0 ? cuotasAtrasadas * cuotaMensual : cuotaMensual;
    
    document.getElementById('clientePagoNombre').innerHTML = `
        <strong style="font-size:16px;">${cliente.nombre}</strong><br>
        <small style="color:#666;">
            Cuota mensual: RD$ ${cuotaMensual.toFixed(2)} | 
            Cuotas pagadas: ${cliente.cuotasPagadas || 0}/12<br>
            Cuotas atrasadas: ${cuotasAtrasadas} | 
            Deuda actual: RD$ ${(cliente.deuda || 0).toFixed(2)}
        </small>
    `;
    
    // Calcular cuántas cuotas puede pagar
    const maxCuotas = cuotasAtrasadas > 0 ? cuotasAtrasadas : 1;
    document.getElementById('cantidadCuotas').value = cuotasAtrasadas > 0 ? cuotasAtrasadas : 1;
    document.getElementById('cantidadCuotas').max = Math.max(12, maxCuotas + 6);
    
    actualizarMontoPago();
    
    document.getElementById('formPago').classList.remove('hidden');
    document.getElementById('buscarCliente').value = '';
    document.getElementById('resultadoBusquedaPago').innerHTML = '';
    abrirModal('modalPago');
};

window.actualizarMontoPago = function() {
    if (!clientePagoSeleccionado) return;
    
    const cantidadCuotas = parseInt(document.getElementById('cantidadCuotas').value) || 1;
    const cuotaMensual = clientePagoSeleccionado.cuotaMensual || 500;
    const montoTotal = cantidadCuotas * cuotaMensual;
    
    document.getElementById('montoPago').value = montoTotal.toFixed(2);
    document.getElementById('resumenCuotas').innerHTML = `
        <small style="color:#666;">
            Pagando ${cantidadCuotas} cuota${cantidadCuotas !== 1 ? 's' : ''} 
            (RD$ ${cuotaMensual.toFixed(2)} c/u) = RD$ ${montoTotal.toFixed(2)}
        </small>
    `;
};

window.buscarClientesPago = function() {
    const busq = document.getElementById('buscarCliente')?.value.toLowerCase() || '';
    const cont = document.getElementById('resultadoBusquedaPago');
    if (!cont) return;
    
    const filtrados = todosClientes.filter(c => 
        (c.nombre?.toLowerCase().includes(busq) || c.whatsapp?.includes(busq)) &&
        (c.tipo === 'agua' || c.tipo === 'ambos')
    );
    
    if (filtrados.length === 0) {
        cont.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">No se encontraron clientes</div>';
    } else {
        cont.innerHTML = filtrados.map(c => `
            <div style="border:1px solid #e0e0e0; border-radius:8px; padding:12px; margin:5px; cursor:pointer; transition:all 0.3s;" 
                 onmouseover="this.style.backgroundColor='#f5f5f5'" 
                 onmouseout="this.style.backgroundColor='white'"
                 onclick="seleccionarClientePago('${c.firebaseKey}')">
                <strong><i class="fa-solid fa-user"></i> ${c.nombre}</strong> 
                <span class="badge ${c.tipo === 'agua' ? 'agua' : 'ambos'}" style="margin-left:10px;">${c.tipo}</span>
                <br><small>
                    <i class="fa-solid fa-location-dot"></i> ${c.zona || 'N/A'} | 
                    Cuotas atrasadas: ${c.cuotasAdeudadas || 0} | 
                    Deuda: RD$ ${(c.deuda || 0).toFixed(2)}
                </small>
            </div>
        `).join('');
    }
};

window.seleccionarClientePago = function(clienteKey) {
    const cliente = todosClientes.find(c => c.firebaseKey === clienteKey);
    if (!cliente) return;
    
    clientePagoSeleccionado = cliente;
    
    const cuotasAtrasadas = cliente.cuotasAdeudadas || 0;
    const cuotaMensual = cliente.cuotaMensual || 500;
    
    document.getElementById('clientePagoNombre').innerHTML = `
        <strong style="font-size:16px;">${cliente.nombre}</strong><br>
        <small style="color:#666;">
            Cuota mensual: RD$ ${cuotaMensual.toFixed(2)} | 
            Cuotas pagadas: ${cliente.cuotasPagadas || 0}/12<br>
            Cuotas atrasadas: ${cuotasAtrasadas} | 
            Deuda actual: RD$ ${(cliente.deuda || 0).toFixed(2)}
        </small>
    `;
    
    document.getElementById('cantidadCuotas').value = cuotasAtrasadas > 0 ? cuotasAtrasadas : 1;
    document.getElementById('cantidadCuotas').max = Math.max(12, cuotasAtrasadas + 6);
    actualizarMontoPago();
    
    document.getElementById('resultadoBusquedaPago').innerHTML = '';
};

window.mostrarBusquedaClientes = function() {
    document.getElementById('formPago').classList.add('hidden');
    document.getElementById('resultadoBusquedaPago').innerHTML = '';
    document.getElementById('buscarCliente').value = '';
};

// 🟢 PROCESAR PAGO CON CUOTAS
window.procesarPago = async function() {
    if (!clientePagoSeleccionado) {
        alert('❌ Seleccione un cliente');
        return;
    }
    
    const cantidadCuotas = parseInt(document.getElementById('cantidadCuotas').value);
    const monto = parseFloat(document.getElementById('montoPago').value);
    const mes = parseInt(document.getElementById('mesPago').value);
    const esAdelantado = document.getElementById('pagoAdelantado').checked;
    
    if (!cantidadCuotas || cantidadCuotas <= 0) {
        alert('❌ Seleccione la cantidad de cuotas a pagar');
        return;
    }
    
    if (!monto || monto <= 0) {
        alert('❌ Ingrese un monto válido');
        return;
    }

    try {
        const fecha = new Date();
        const fechaISO = fecha.toISOString();
        const año = fecha.getFullYear();
        const cuotaMensual = clientePagoSeleccionado.cuotaMensual || 500;
        
        // Calcular nuevos valores
        const cuotasPagadasAnterior = clientePagoSeleccionado.cuotasPagadas || 0;
        const nuevasCuotasPagadas = cuotasPagadasAnterior + cantidadCuotas;
        const ultimoMesPagado = (clientePagoSeleccionado.ultimoMesPagado || 0) + cantidadCuotas;
        const ultimoAñoPagado = ultimoMesPagado > 12 ? clientePagoSeleccionado.ultimoAñoPagado + 1 : clientePagoSeleccionado.ultimoAñoPagado || año;
        const mesFinal = ultimoMesPagado > 12 ? ultimoMesPagado - 12 : ultimoMesPagado;
        
        // Registrar pago con detalle de cuotas
        await db.ref('pagos_agua').push({
            clienteId: clientePagoSeleccionado.firebaseKey,
            clienteNombre: clientePagoSeleccionado.nombre,
            monto: monto,
            cantidadCuotas: cantidadCuotas,
            cuotasPagadas: nuevasCuotasPagadas,
            fecha: fechaISO,
            mes: mes,
            año: año,
            zona: clientePagoSeleccionado.zona,
            adelantado: esAdelantado,
            registradoPor: usuarioActual.nombre,
            tipo: 'agua'
        });

        // Actualizar datos del cliente
        const nuevaDeuda = Math.max(0, (clientePagoSeleccionado.deuda || 0) - monto);
        await db.ref(`usuarios_fundacion/${clientePagoSeleccionado.firebaseKey}`).update({
            cuotasPagadas: nuevasCuotasPagadas,
            ultimoMesPagado: mesFinal,
            ultimoAñoPagado: ultimoAñoPagado,
            deuda: nuevaDeuda,
            ultimoPago: fechaISO
        });

        // Generar ticket
        const factura = {
            numero: `FAC-${Date.now()}`,
            fecha: fecha.toLocaleDateString(),
            hora: fecha.toLocaleTimeString(),
            cliente: clientePagoSeleccionado.nombre,
            concepto: `Pago de ${cantidadCuotas} cuota${cantidadCuotas !== 1 ? 's' : ''} - ${new Date(fecha).toLocaleString('default', { month: 'long' })} ${año}`,
            monto: monto,
            cantidadCuotas: cantidadCuotas,
            cuotaMensual: cuotaMensual,
            cuotasPagadas: nuevasCuotasPagadas,
            cuotasRestantes: 12 - nuevasCuotasPagadas,
            metodo: 'Efectivo',
            cajero: usuarioActual.nombre,
            deudaRestante: nuevaDeuda,
            whatsapp: clientePagoSeleccionado.whatsapp
        };

        imprimirTicketFundacion(factura);
        
        cerrarModal('modalPago');
        await cargarDatos();
        await cambiarSeccion('agua');
        
    } catch (error) {
        console.error('Error procesando pago:', error);
        alert('❌ Error al procesar el pago');
    }
};

// 🟢 IMPRIMIR TICKET CON INFORMACIÓN DE CUOTAS
function imprimirTicketFundacion(factura) {
    let ticket = '';
    
    ticket += '='.repeat(32) + '\n';
    ticket += '   FUNDACIÓN FRANCISCO\n';
    ticket += '     LORENZO DE LA ROSA\n';
    ticket += '='.repeat(32) + '\n';
    ticket += 'Calle Principal #123, SDE\n';
    ticket += 'Tel: 809-555-1212\n';
    ticket += 'RNC: 123-456789-0\n\n';
    ticket += '-'.repeat(32) + '\n';
    ticket += `FACTURA DE PAGO\n`;
    ticket += `No: ${factura.numero}\n`;
    ticket += `Fecha: ${factura.fecha} ${factura.hora}\n`;
    ticket += '-'.repeat(32) + '\n';
    ticket += `Cliente: ${factura.cliente}\n`;
    ticket += `Concepto: ${factura.concepto}\n`;
    ticket += `Cuota mensual: RD$ ${factura.cuotaMensual.toFixed(2)}\n`;
    ticket += `Cuotas pagadas: ${factura.cuotasPagadas} / 12\n`;
    ticket += `Cuotas restantes: ${factura.cuotasRestantes}\n`;
    ticket += '-'.repeat(32) + '\n';
    ticket += `${'Monto pagado:'.padStart(20)} RD$ ${factura.monto.toFixed(2)}\n`;
    ticket += `${'Deuda restante:'.padStart(20)} RD$ ${factura.deudaRestante.toFixed(2)}\n`;
    ticket += '-'.repeat(32) + '\n';
    ticket += `Método de pago: ${factura.metodo}\n`;
    ticket += `Atendido por: ${factura.cajero}\n`;
    ticket += '='.repeat(32) + '\n';
    
    if (factura.deudaRestante > 0) {
        ticket += '⚠️  CLIENTE CON PENDIENTE  ⚠️\n';
        ticket += `     Deuda: RD$ ${factura.deudaRestante.toFixed(2)}\n`;
    } else {
        ticket += '   ✅ CLIENTE AL DÍA ✅\n';
    }
    
    ticket += '='.repeat(32) + '\n';
    ticket += '   ¡GRACIAS POR SU PAGO!\n';
    ticket += '   Dios le bendiga 🙏\n';
    ticket += '='.repeat(32) + '\n';
    ticket += '\n\n\n';
    
    const estiloTicket = `
        <style>
            @page { margin: 0; size: 80mm auto; }
            body { margin: 0; padding: 8px 4px; background: white; font-family: 'Courier New', monospace; }
            pre { margin: 0; padding: 0; font-family: 'Courier New', monospace; font-size: 12px; font-weight: bold; line-height: 1.3; white-space: pre-wrap; text-align: left; }
            @media print { body { margin: 0; padding: 0; } pre { font-size: 13px; font-weight: bold; } }
        </style>
    `;
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Ticket Pago - ${factura.cliente}</title>
            ${estiloTicket}
        </head>
        <body>
            <pre>${ticket}</pre>
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                        setTimeout(function() {
                            window.parent.document.body.removeChild(window.frameElement);
                        }, 1500);
                    }, 300);
                };
            <\/script>
        </body>
        </html>
    `);
    iframeDoc.close();
    
    mostrarFacturaPantalla(factura);
}

function mostrarFacturaPantalla(factura) {
    const facturaHTML = `
        <div style="text-align:center;">
            <h3 style="margin-bottom:5px;">FUNDACIÓN FRANCISCO LORENZO</h3>
            <p style="font-size:12px;">RNC: 123-456789-0 | Tel: 809-555-1212</p>
            <hr style="margin:10px 0;">
            <p><strong>Factura No.</strong> ${factura.numero}</p>
            <p><strong>Fecha:</strong> ${factura.fecha} ${factura.hora}</p>
            <p><strong>Cliente:</strong> ${factura.cliente}</p>
            <hr style="margin:10px 0;">
            <p><strong>Concepto:</strong> ${factura.concepto}</p>
            <p><strong>Cuotas pagadas:</strong> ${factura.cuotasPagadas} / 12</p>
            <p><strong>Cuotas restantes:</strong> ${factura.cuotasRestantes}</p>
            <p style="font-size:18px; font-weight:bold;">Monto: RD$ ${factura.monto.toFixed(2)}</p>
            <p><strong>Deuda restante:</strong> RD$ ${factura.deudaRestante.toFixed(2)}</p>
            <p><strong>Método:</strong> ${factura.metodo}</p>
            <hr style="margin:10px 0;">
            <p><strong>Atendido por:</strong> ${factura.cajero}</p>
            <p style="margin-top:15px; font-style:italic;">¡Gracias por su pago! 🙏</p>
            ${factura.deudaRestante > 0 ? '<p style="color:#e74c3c; font-weight:bold;">⚠️ CLIENTE CON PENDIENTE ⚠️</p>' : '<p style="color:#27ae60; font-weight:bold;">✅ CLIENTE AL DÍA</p>'}
        </div>
    `;
    
    document.getElementById('facturaContenido').innerHTML = facturaHTML;
    
    window.facturaActual = {
        ...factura,
        whatsapp: factura.whatsapp,
        html: facturaHTML
    };
    
    abrirModal('modalFactura');
}

window.enviarFacturaWhatsApp = function() {
    if (!window.facturaActual) return;
    
    const mensaje = `*FUNDACIÓN FRANCISCO LORENZO DE LA ROSA*
*FACTURA DE PAGO*

*Factura No:* ${window.facturaActual.numero}
*Fecha:* ${window.facturaActual.fecha}
*Cliente:* ${window.facturaActual.cliente}

*${window.facturaActual.concepto}*
*Cuotas pagadas:* ${window.facturaActual.cuotasPagadas}/12
*Cuotas restantes:* ${window.facturaActual.cuotasRestantes}
*Monto pagado:* RD$ ${window.facturaActual.monto.toFixed(2)}
*Deuda restante:* RD$ ${window.facturaActual.deudaRestante.toFixed(2)}
*Método:* ${window.facturaActual.metodo}

*Atendido por:* ${window.facturaActual.cajero}

${window.facturaActual.deudaRestante > 0 ? '⚠️ CLIENTE CON PENDIENTE ⚠️' : '✅ CLIENTE AL DÍA'}

¡Gracias por su pago! 🙏`;

    const whatsappUrl = `https://wa.me/${window.facturaActual.whatsapp}?text=${encodeURIComponent(mensaje)}`;
    window.open(whatsappUrl, '_blank');
};

window.imprimirTicket = function() {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Ticket de Pago</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 20px; }
                .ticket { max-width: 300px; margin: 0 auto; }
                @media print {
                    body { margin: 0; }
                }
            </style>
        </head>
        <body>
            <div class="ticket">
                ${document.getElementById('facturaContenido').innerHTML}
            </div>
            <script>
                window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
};

// ========== CURSOS ==========
async function mostrarCursos(container) {
    let html = `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <h2>📚 Cursos y Talleres</h2>
            <div>
                <button class="btn btn-primary" onclick="abrirModalCurso()"><i class="fa-solid fa-plus"></i> Nuevo Curso</button>
            </div>
        </div>
        <div class="cursos-grid">
    `;
    
    const cursosActivos = cursos.filter(c => c.activo !== false);
    
    for (const c of cursosActivos) {
        const inscritos = inscripciones.filter(i => i.cursoId === c.firebaseKey && i.activo !== false).length;
        const cupo = c.cupo || 30;
        const porcentaje = (inscritos / cupo) * 100;
        
        html += `
            <div class="curso-card">
                <div class="curso-header">
                    <span class="curso-title"><i class="fa-solid fa-book"></i> ${c.nombre}</span>
                    <span class="inscritos-count">${inscritos}/${cupo}</span>
                </div>
                <div style="margin:10px 0; color:#666;">
                    <i class="fa-regular fa-calendar"></i> ${c.fechaInicio ? new Date(c.fechaInicio).toLocaleDateString() : 'N/A'} - ${c.fechaFin ? new Date(c.fechaFin).toLocaleDateString() : 'N/A'}<br>
                    <i class="fa-regular fa-clock"></i> ${c.hora || 'N/A'}
                </div>
                <p style="font-size:13px;">${c.descripcion || 'Sin descripción'}</p>
                <div style="margin:10px 0; height:6px; background:#eee; border-radius:3px;">
                    <div style="width:${porcentaje}%; height:6px; background:#9b59b6; border-radius:3px;"></div>
                </div>
                <div style="margin-top:15px; display:flex; gap:5px;">
                    <button class="btn btn-info btn-sm" onclick="verInscritos('${c.firebaseKey}')"><i class="fa-solid fa-users"></i> Ver (${inscritos})</button>
                    <button class="btn btn-warning btn-sm" onclick="finalizarCurso('${c.firebaseKey}')"><i class="fa-solid fa-check"></i> Finalizar</button>
                    <button class="btn btn-success btn-sm" onclick="enviarRecordatorioCurso('${c.firebaseKey}')"><i class="fa-brands fa-whatsapp"></i> Recordar</button>
                </div>
            </div>
        `;
    }
    
    if (cursosActivos.length === 0) {
        html += `<div style="grid-column:1/-1; text-align:center; padding:50px; background:white; border-radius:12px;">
            <i class="fa-solid fa-book-open" style="font-size:48px; color:#ccc;"></i>
            <h3 style="margin:15px 0;">No hay cursos activos</h3>
            <button class="btn btn-primary" onclick="abrirModalCurso()">➕ Crear primer curso</button>
        </div>`;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

window.verInscritos = async function(cursoId) {
    const curso = cursos.find(c => c.firebaseKey === cursoId);
    const inscritosCurso = inscripciones.filter(i => i.cursoId === cursoId && i.activo !== false);
    
    let lista = inscritosCurso.map(i => `• ${i.clienteNombre} - ${i.whatsapp || 'Sin WhatsApp'}`).join('\n');
    alert(`Inscritos en "${curso?.nombre}":\n${inscritosCurso.length} alumnos\n\n${lista || 'No hay inscritos'}`);
};

window.finalizarCurso = async function(cursoId) {
    if (!confirm('¿Finalizar este curso?')) return;
    await db.ref(`cursos_fundacion/${cursoId}`).update({ activo: false });
    await cargarDatos();
    await mostrarCursos(document.getElementById('content'));
};

window.abrirModalCurso = function() {
    const nombre = prompt('Nombre del curso:');
    if (!nombre) return;
    const descripcion = prompt('Descripción del curso:');
    const inicio = prompt('Fecha inicio (YYYY-MM-DD):');
    const fin = prompt('Fecha fin (YYYY-MM-DD):');
    const hora = prompt('Hora (ej: 09:00 AM):', '09:00 AM');
    const tiempo = prompt('Horas totales:', '20');
    
    db.ref('cursos_fundacion').push({
        nombre,
        descripcion: descripcion || 'Curso ofrecido por la fundación',
        fechaInicio: inicio,
        fechaFin: fin,
        hora: hora,
        tiempoEstimado: parseInt(tiempo) || 20,
        cupo: 30,
        inscritos: 0,
        activo: true,
        fechaCreacion: new Date().toISOString()
    }).then(() => {
        alert('✅ Curso creado');
        cargarDatos().then(() => mostrarCursos(document.getElementById('content')));
    });
};


window.enviarRecordatorioCurso = async function(cursoId) {
    const curso = cursos.find(c => c.firebaseKey === cursoId);
    const inscritos = inscripciones.filter(i => i.cursoId === cursoId && i.activo !== false);
    
    if (inscritos.length === 0) {
        alert('No hay inscritos en este curso');
        return;
    }
    
    const mensajeBase = `*FUNDACIÓN FRANCISCO LORENZO*
*RECORDATORIO DE CURSO*

Curso: *${curso.nombre}*
Fecha: ${curso.fechaInicio ? new Date(curso.fechaInicio).toLocaleDateString() : 'N/A'} - ${curso.fechaFin ? new Date(curso.fechaFin).toLocaleDateString() : 'N/A'}
Hora: ${curso.hora || 'N/A'}

Por favor confirmar asistencia.
¡Gracias! 🙏`;

    let contador = 0;
    for (const inscrito of inscritos) {
        if (inscrito.whatsapp) {
            setTimeout(() => {
                const whatsappUrl = `https://wa.me/${inscrito.whatsapp}?text=${encodeURIComponent(mensajeBase)}`;
                window.open(whatsappUrl, '_blank');
                contador++;
            }, contador * 2000);
        }
    }
    
    alert(`✅ Abriendo WhatsApp para ${contador} alumnos`);
};

// ========== REPORTES CON RANGO DE FECHAS ==========
async function mostrarReportes(container) {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    
    const vendedores = [...new Set(pagos.map(p => p.registradoPor).filter(v => v))];
    
    container.innerHTML = `
        <h2>📊 Reportes</h2>
        
        <div class="filtros-reporte">
            <h3 style="margin-bottom:15px;">Filtrar por rango de fechas</h3>
            <div class="filtros-row">
                <div class="form-group">
                    <label><i class="fa-regular fa-calendar"></i> Fecha inicial</label>
                    <input type="date" id="fechaInicio" class="form-control" value="${primerDiaMes.toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label><i class="fa-regular fa-calendar"></i> Fecha final</label>
                    <input type="date" id="fechaFin" class="form-control" value="${ultimoDiaMes.toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label><i class="fa-solid fa-filter"></i> Tipo de pago</label>
                    <select id="tipoReporte" class="form-control">
                        <option value="todos">Todos los pagos</option>
                        <option value="agua">💧 Solo Proyecto Agua</option>
                        <option value="cursos">📚 Solo Cursos</option>
                    </select>
                </div>
                <div class="form-group">
                    <label><i class="fa-solid fa-user"></i> Vendedor</label>
                    <select id="vendedorReporte" class="form-control">
                        <option value="todos">Todos los vendedores</option>
                        ${vendedores.map(v => `<option value="${v}">${v}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn btn-primary" onclick="generarReporte()"><i class="fa-solid fa-magnifying-glass"></i> Generar</button>
                <button class="btn btn-success" onclick="exportarPDF()"><i class="fa-solid fa-file-pdf"></i> Exportar PDF</button>
                <button class="btn btn-info" onclick="imprimirReporteTicket()"><i class="fa-solid fa-print"></i> Imprimir Reporte</button>
            </div>
        </div>
        
        <div id="reporteResultados">
            <!-- Resultados dinámicos -->
        </div>
    `;
    
    await generarReporte();
}

window.generarReporte = async function() {
    const fechaInicio = new Date(document.getElementById('fechaInicio').value);
    const fechaFin = new Date(document.getElementById('fechaFin').value);
    fechaFin.setHours(23, 59, 59);
    
    const tipo = document.getElementById('tipoReporte').value;
    const vendedor = document.getElementById('vendedorReporte').value;
    
    let pagosFiltrados = pagos.filter(p => {
        const fechaPago = new Date(p.fecha);
        return fechaPago >= fechaInicio && fechaPago <= fechaFin;
    });
    
    if (tipo === 'agua') {
        pagosFiltrados = pagosFiltrados.filter(p => p.tipo === 'agua' || !p.tipo);
    } else if (tipo === 'cursos') {
        pagosFiltrados = pagosFiltrados.filter(p => p.tipo === 'cursos');
    }
    
    if (vendedor !== 'todos') {
        pagosFiltrados = pagosFiltrados.filter(p => p.registradoPor === vendedor);
    }
    
    const totalMonto = pagosFiltrados.reduce((s,p) => s + p.monto, 0);
    const totalCuotasPagadas = pagosFiltrados.reduce((s,p) => s + (p.cantidadCuotas || 1), 0);
    
    const porVendedor = {};
    pagosFiltrados.forEach(p => {
        const vendedor = p.registradoPor || 'Sin asignar';
        if (!porVendedor[vendedor]) {
            porVendedor[vendedor] = { monto: 0, cantidad: 0, cuotas: 0 };
        }
        porVendedor[vendedor].monto += p.monto;
        porVendedor[vendedor].cantidad++;
        porVendedor[vendedor].cuotas += (p.cantidadCuotas || 1);
    });
    
    const porZona = {};
    pagosFiltrados.forEach(p => {
        porZona[p.zona || 'Sin zona'] = (porZona[p.zona || 'Sin zona'] || 0) + p.monto;
    });
    
    let html = `
        <div class="stats-grid">
            <div class="stat-card paid">
                <div class="stat-info">
                    <h3>Total Cobrado</h3>
                    <span class="number">RD$ ${totalMonto.toFixed(2)}</span>
                </div>
                <div class="stat-icon"><i class="fa-solid fa-coins"></i></div>
            </div>
            <div class="stat-card water">
                <div class="stat-info">
                    <h3>Cuotas Pagadas</h3>
                    <span class="number">${totalCuotasPagadas}</span>
                </div>
                <div class="stat-icon"><i class="fa-solid fa-calendar-check"></i></div>
            </div>
            <div class="stat-card info">
                <div class="stat-info">
                    <h3>Transacciones</h3>
                    <span class="number">${pagosFiltrados.length}</span>
                </div>
                <div class="stat-icon"><i class="fa-solid fa-receipt"></i></div>
            </div>
        </div>
        
        <h3 style="margin:20px 0 10px;">📊 Estadísticas por Vendedor</h3>
        <div class="table-container">
            <table class="tabla-reporte">
                <thead>
                    <tr>
                        <th>Vendedor</th>
                        <th>Cuotas Cobradas</th>
                        <th>Cantidad Pagos</th>
                        <th>Total</th>
                        <th>Promedio</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    for (const [vendedor, stats] of Object.entries(porVendedor)) {
        html += `<tr>
            <td><strong>${vendedor}</strong></td>
            <td>${stats.cuotas}</td>
            <td>${stats.cantidad}</td>
            <td><strong style="color:#27ae60;">RD$ ${stats.monto.toFixed(2)}</strong></td>
            <td>RD$ ${(stats.monto / stats.cantidad).toFixed(2)}</td>
        </tr>`;
    }
    
    html += `
                </tbody>
            </table>
        </div>
        
        <h3 style="margin:30px 0 10px;">📍 Distribución por Zona</h3>
        <div class="table-container">
            <table class="tabla-reporte">
                <thead>
                    <tr>
                        <th>Zona</th>
                        <th>Total Cobrado</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    for (const [zona, monto] of Object.entries(porZona)) {
        html += `<tr><td>${zona}</td><td><strong style="color:#27ae60;">RD$ ${monto.toFixed(2)}</strong></td></tr>`;
    }
    
    html += `
                </tbody>
            </table>
        </div>
        
        <h3 style="margin:30px 0 10px;">📋 Detalle de Pagos</h3>
        <div class="table-container">
            <table class="tabla-reporte">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Zona</th>
                        <th>Cuotas</th>
                        <th>Monto</th>
                        <th>Vendedor</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    pagosFiltrados.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).forEach(p => {
        html += `<tr>
            <td>${new Date(p.fecha).toLocaleDateString()}</td>
            <td><strong>${p.clienteNombre}</strong></td>
            <td><span class="zona-tag"><i class="fa-solid fa-location-dot"></i> ${p.zona || 'N/A'}</span></td>
            <td>${p.cantidadCuotas || 1}</td>
            <td style="color:#27ae60; font-weight:bold;">RD$ ${p.monto.toFixed(2)}</td>
            <td>${p.registradoPor || 'Admin'}</td>
        </tr>`;
    });
    
    if (pagosFiltrados.length === 0) {
        html += `<tr><td colspan="6" style="text-align:center; padding:40px;">No hay pagos en este rango</td></tr>`;
    }
    
    html += `</tbody></table></div>`;
    
    document.getElementById('reporteResultados').innerHTML = html;
    
    window.reporteActual = {
        fechaInicio,
        fechaFin,
        tipo,
        vendedor,
        pagos: pagosFiltrados,
        total: totalMonto,
        totalCuotas: totalCuotasPagadas,
        porZona,
        porVendedor
    };
};

// ========== IMPRIMIR REPORTE COMO TICKET ==========
window.imprimirReporteTicket = function() {
    if (!window.reporteActual || window.reporteActual.pagos.length === 0) {
        alert('No hay datos para imprimir');
        return;
    }
    
    let ticket = '';
    
    ticket += '='.repeat(32) + '\n';
    ticket += '   FUNDACIÓN FRANCISCO\n';
    ticket += '     LORENZO DE LA ROSA\n';
    ticket += '='.repeat(32) + '\n';
    ticket += 'Calle Principal #123, SDE\n';
    ticket += 'Tel: 809-555-1212\n\n';
    ticket += '-'.repeat(32) + '\n';
    ticket += `REPORTE DE PAGOS\n`;
    ticket += `Período: ${window.reporteActual.fechaInicio.toLocaleDateString()} - ${window.reporteActual.fechaFin.toLocaleDateString()}\n`;
    ticket += '-'.repeat(32) + '\n';
    ticket += `Total Cobrado:    RD$ ${window.reporteActual.total.toFixed(2)}\n`;
    ticket += `Cuotas Pagadas:   ${window.reporteActual.totalCuotas}\n`;
    ticket += `Transacciones:    ${window.reporteActual.pagos.length}\n`;
    ticket += '-'.repeat(32) + '\n';
    ticket += '   ¡GRACIAS POR SU TRABAJO!\n';
    ticket += '='.repeat(32) + '\n';
    ticket += '\n\n\n';
    
    const estiloTicket = `
        <style>
            @page { margin: 0; size: 80mm auto; }
            body { margin: 0; padding: 8px 4px; background: white; font-family: 'Courier New', monospace; }
            pre { margin: 0; padding: 0; font-family: 'Courier New', monospace; font-size: 12px; font-weight: bold; line-height: 1.3; white-space: pre-wrap; text-align: left; }
            @media print { body { margin: 0; padding: 0; } pre { font-size: 13px; font-weight: bold; } }
        </style>
    `;
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reporte de Pagos</title>
            ${estiloTicket}
        </head>
        <body>
            <pre>${ticket}</pre>
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                        setTimeout(function() {
                            window.parent.document.body.removeChild(window.frameElement);
                        }, 1500);
                    }, 300);
                };
            <\/script>
        </body>
        </html>
    `);
    iframeDoc.close();
};

// ========== RECORDATORIOS ==========
async function mostrarRecordatorios(container) {
    container.innerHTML = `
        <h2>📱 Envío Masivo de WhatsApp</h2>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:20px;">
            <div style="background:white; padding:30px; border-radius:12px; text-align:center; box-shadow:0 5px 15px rgba(0,0,0,0.05);">
                <i class="fa-solid fa-water" style="font-size:60px; color:#00a8ff;"></i>
                <h3 style="margin:15px 0;">Proyecto Agua</h3>
                <p style="margin-bottom:20px;">${clientesAgua.length} clientes</p>
                <button class="btn btn-success" onclick="abrirModalRecordatorio('agua')" style="width:100%;">
                    <i class="fa-brands fa-whatsapp"></i> Enviar recordatorio
                </button>
                <button class="btn btn-danger" onclick="abrirModalRecordatorioDeuda('agua')" style="width:100%; margin-top:10px;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Enviar a morosos
                </button>
            </div>
            <div style="background:white; padding:30px; border-radius:12px; text-align:center; box-shadow:0 5px 15px rgba(0,0,0,0.05);">
                <i class="fa-solid fa-graduation-cap" style="font-size:60px; color:#9b59b6;"></i>
                <h3 style="margin:15px 0;">Cursos</h3>
                <p style="margin-bottom:20px;">${clientesCursos.length} clientes</p>
                <button class="btn btn-success" onclick="abrirModalRecordatorio('cursos')" style="width:100%;">
                    <i class="fa-brands fa-whatsapp"></i> Enviar recordatorio
                </button>
            </div>
        </div>
    `;
}

window.abrirModalRecordatorio = function(tipo) {
    tipoRecordatorioSeleccionado = tipo;
    
    if (tipo === 'agua') {
        clientesFiltradosRecordatorio = clientesAgua;
    } else if (tipo === 'cursos') {
        clientesFiltradosRecordatorio = clientesCursos;
    } else {
        clientesFiltradosRecordatorio = todosClientes;
    }
    
    document.getElementById('totalClientesRecordatorio').textContent = clientesFiltradosRecordatorio.length;
    
    let listaHTML = '';
    clientesFiltradosRecordatorio.slice(0, 20).forEach(c => {
        listaHTML += `<div style="padding:8px; border-bottom:1px solid #e0e0e0;">
            <strong><i class="fa-solid fa-user"></i> ${c.nombre}</strong> 
            <span style="float:right;">${c.whatsapp || 'Sin WhatsApp'}</span>
        </div>`;
    });
    
    if (clientesFiltradosRecordatorio.length > 20) {
        listaHTML += `<div style="padding:8px; color:#666;">... y ${clientesFiltradosRecordatorio.length - 20} más</div>`;
    }
    
    document.getElementById('listaClientesRecordatorio').innerHTML = listaHTML;
    
    let mensajeDefault = '';
    if (tipo === 'agua') {
        mensajeDefault = `*FUNDACIÓN FRANCISCO LORENZO DE LA ROSA*
*RECORDATORIO DE PAGO - PROYECTO AGUA*

Estimado/a cliente, le recordamos que su cuota mensual se encuentra pendiente.

Cuota mensual: RD$ 500
Mes correspondiente: ${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}

Realice su pago para mantener su cuenta al día.
¡Gracias por su apoyo! 🙏`;
    } else if (tipo === 'cursos') {
        mensajeDefault = `*FUNDACIÓN FRANCISCO LORENZO DE LA ROSA*
*RECORDATORIO DE CURSOS*

Estimado/a participante, le recordamos nuestros próximos cursos:

📚 Inglés para principiantes
🎨 Manualidades
🍰 Repostería

Inscripciones abiertas.
¡Lo esperamos! 📚`;
    }
    
    document.getElementById('mensajeRecordatorio').value = mensajeDefault;
    document.getElementById('recordatorioDetalle').classList.remove('hidden');
    abrirModal('modalRecordatorio');
};

window.abrirModalRecordatorioDeuda = function(tipo) {
    tipoRecordatorioSeleccionado = tipo;
    
    if (tipo === 'agua') {
        clientesFiltradosRecordatorio = clientesAgua.filter(c => c.deuda > 0);
    } else {
        clientesFiltradosRecordatorio = clientesAgua.filter(c => c.deuda > 0);
    }
    
    if (clientesFiltradosRecordatorio.length === 0) {
        alert('No hay clientes con deuda pendiente');
        return;
    }
    
    document.getElementById('totalClientesRecordatorio').textContent = clientesFiltradosRecordatorio.length;
    
    let listaHTML = '';
    clientesFiltradosRecordatorio.slice(0, 20).forEach(c => {
        listaHTML += `<div style="padding:8px; border-bottom:1px solid #e0e0e0;">
            <strong><i class="fa-solid fa-user"></i> ${c.nombre}</strong> 
            <span style="float:right; color:#e74c3c;">Deuda: RD$ ${(c.deuda || 0).toFixed(2)}</span>
        </div>`;
    });
    
    if (clientesFiltradosRecordatorio.length > 20) {
        listaHTML += `<div style="padding:8px; color:#666;">... y ${clientesFiltradosRecordatorio.length - 20} más</div>`;
    }
    
    document.getElementById('listaClientesRecordatorio').innerHTML = listaHTML;
    
    const mensajeDefault = `*FUNDACIÓN FRANCISCO LORENZO DE LA ROSA*
*RECORDATORIO DE DEUDA - PROYECTO AGUA*

Estimado/a cliente, le informamos que tiene una deuda pendiente en el Proyecto Agua.

Por favor regularice su situación para mantener el servicio activo.

¡Gracias por su comprensión! 🙏`;
    
    document.getElementById('mensajeRecordatorio').value = mensajeDefault;
    document.getElementById('recordatorioDetalle').classList.remove('hidden');
    abrirModal('modalRecordatorio');
};

window.seleccionarTipoRecordatorio = function(tipo) {
    if (tipo === 'morosos') {
        abrirModalRecordatorioDeuda('agua');
    } else {
        abrirModalRecordatorio(tipo);
    }
};

window.enviarRecordatorios = function() {
    const mensaje = document.getElementById('mensajeRecordatorio').value;
    if (!mensaje) {
        alert('❌ Escriba un mensaje');
        return;
    }
    
    if (clientesFiltradosRecordatorio.length === 0) {
        alert('❌ No hay clientes para enviar');
        return;
    }
    
    if (!confirm(`¿Enviar recordatorio a ${clientesFiltradosRecordatorio.length} clientes?`)) {
        return;
    }
    
    let contador = 0;
    clientesFiltradosRecordatorio.forEach((cliente, index) => {
        if (cliente.whatsapp) {
            setTimeout(() => {
                const whatsappUrl = `https://wa.me/${cliente.whatsapp}?text=${encodeURIComponent(mensaje)}`;
                window.open(whatsappUrl, '_blank');
                contador++;
            }, index * 2000);
        }
    });
    
    alert(`✅ Abriendo WhatsApp para ${contador} clientes`);
    cerrarModal('modalRecordatorio');
};

window.enviarRecordatorioIndividual = function(clienteKey) {
    const cliente = todosClientes.find(c => c.firebaseKey === clienteKey);
    if (!cliente || !cliente.whatsapp) {
        alert('❌ Cliente sin WhatsApp');
        return;
    }
    
    const cuotasAtrasadas = cliente.cuotasAdeudadas || 0;
    const mensaje = `*FUNDACIÓN FRANCISCO LORENZO*
*RECORDATORIO DE PAGO*

Estimado/a ${cliente.nombre}, le recordamos que tiene:

• Cuota mensual: RD$ ${(cliente.cuotaMensual || 500).toFixed(2)}
• Cuotas atrasadas: ${cuotasAtrasadas}
• Deuda pendiente: *RD$ ${(cliente.deuda || 0).toFixed(2)}*

Por favor realice su pago a la mayor brevedad.
¡Gracias por su apoyo! 🙏`;

    const whatsappUrl = `https://wa.me/${cliente.whatsapp}?text=${encodeURIComponent(mensaje)}`;
    window.open(whatsappUrl, '_blank');
};

// ========== EXPORTAR PDF ==========
window.exportarPDF = function() {
    if (!window.reporteActual || window.reporteActual.pagos.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80);
    doc.text('Fundación Francisco Lorenzo', 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Reporte de Pagos`, 14, 30);
    doc.text(`Período: ${window.reporteActual.fechaInicio.toLocaleDateString()} - ${window.reporteActual.fechaFin.toLocaleDateString()}`, 14, 38);
    
    if (window.reporteActual.vendedor !== 'todos') {
        doc.text(`Vendedor: ${window.reporteActual.vendedor}`, 14, 46);
    }
    
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text('Resumen', 14, 54);
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Total Cobrado: RD$ ${window.reporteActual.total.toFixed(2)}`, 14, 62);
    doc.text(`Cuotas Pagadas: ${window.reporteActual.totalCuotas}`, 14, 70);
    doc.text(`Cantidad de Pagos: ${window.reporteActual.pagos.length}`, 14, 78);
    
    const tableColumn = ["Fecha", "Cliente", "Zona", "Cuotas", "Monto", "Vendedor"];
    const tableRows = [];
    
    window.reporteActual.pagos.slice(0, 50).forEach(p => {
        const fecha = new Date(p.fecha).toLocaleDateString();
        const cliente = p.clienteNombre;
        const zona = p.zona || 'N/A';
        const cuotas = p.cantidadCuotas || 1;
        const monto = `RD$ ${p.monto.toFixed(2)}`;
        const vendedor = p.registradoPor || 'Admin';
        tableRows.push([fecha, cliente, zona, cuotas.toString(), monto, vendedor]);
    });
    
    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 86,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [25, 118, 210], textColor: 255 }
    });
    
    doc.save(`reporte_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ========== MODALES ==========
window.abrirModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
};

window.cerrarModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
};

// ========== INICIALIZACIÓN ==========
window.onload = async function() {
    console.log('🚀 Iniciando Fundación Admin...');
    obtenerUsuario();
    await cargarDatos();
    await cambiarSeccion('inicio');
};

console.log('✅ Módulo de Fundación completamente cargado');