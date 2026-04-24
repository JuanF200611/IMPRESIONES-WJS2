/* ============================================
   ADMIN.JS - COMPLETO Y FUNCIONAL
   Panel Administrativo Impresiones WJS
   CON MENÚ OCULTABLE/EXPANDIBLE CORREGIDO
============================================ */

// ================= VARIABLES GLOBALES =================
let db;
let pedidosListener = null;
let pedidosPendientes = [];
let notificaciones = [];
let notificacionesNoLeidas = 0;
let productoSeleccionadoEtiqueta = null;

// ================= CONFIGURACIÓN FIREBASE =================
const firebaseConfig = {
    apiKey: "AIzaSyB3xTYP7wKgvFvySX8ZkHqm0Tly8y4LcM4",
    authDomain: "imprecioneswjs.firebaseapp.com",
    databaseURL: "https://imprecioneswjs-default-rtdb.firebaseio.com",
    projectId: "imprecioneswjs",
    storageBucket: "imprecioneswjs.appspot.com",
    appId: "1:923402098800:web:ef57d1e1bf1fdd758a3cb5"
};

// ================= FUNCIONES DEL MENÚ =================

/* =======================
   TOGGLE MENU - OCULTAR/EXPANDIR (VERSIÓN ÚNICA Y CORRECTA)
======================= */
function toggleMenu() {
    const sidebar = document.getElementById("sidebar");
    const menuBtn = document.getElementById("menuToggleBtn");
    
    console.log("toggleMenu llamado - sidebar:", sidebar);
    
    if (!sidebar) {
        console.log("Sidebar no encontrado");
        return;
    }
    
    // Alternar la clase 'hidden' en el sidebar
    sidebar.classList.toggle("hidden");
    
    // Cambiar el ícono del botón
    if (menuBtn) {
        const icon = menuBtn.querySelector("i");
        if (sidebar.classList.contains("hidden")) {
            if (icon) {
                icon.classList.remove("fa-bars");
                icon.classList.add("fa-arrow-right");
            }
            menuBtn.title = "Expandir menú";
            console.log("Menú ocultado");
        } else {
            if (icon) {
                icon.classList.remove("fa-arrow-right");
                icon.classList.add("fa-bars");
            }
            menuBtn.title = "Ocultar menú";
            console.log("Menú expandido");
        }
    }
    
    // Guardar estado en localStorage
    const isHidden = sidebar.classList.contains("hidden");
    localStorage.setItem('menuOculto', isHidden);
}

/* =======================
   INICIALIZAR ESTADO DEL MENÚ
======================= */
function inicializarMenu() {
    const sidebar = document.getElementById("sidebar");
    const menuBtn = document.getElementById("menuToggleBtn");
    
    console.log("inicializarMenu llamado - sidebar:", sidebar);
    
    if (!sidebar) return;
    
    // Recuperar preferencia guardada
    const menuOculto = localStorage.getItem('menuOculto') === 'true';
    
    if (menuOculto) {
        sidebar.classList.add("hidden");
        if (menuBtn) {
            const icon = menuBtn.querySelector("i");
            if (icon) {
                icon.classList.remove("fa-bars");
                icon.classList.add("fa-arrow-right");
            }
            menuBtn.title = "Expandir menú";
        }
        console.log("Menú inicializado como OCULTO");
    } else {
        sidebar.classList.remove("hidden");
        if (menuBtn) {
            const icon = menuBtn.querySelector("i");
            if (icon) {
                icon.classList.remove("fa-arrow-right");
                icon.classList.add("fa-bars");
            }
            menuBtn.title = "Ocultar menú";
        }
        console.log("Menú inicializado como EXPANDIDO");
    }
}

/* =======================
   CERRAR MENÚ EN MÓVIL
======================= */
function cerrarMenuMovil() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    
    if (window.innerWidth <= 768) {
        if (sidebar) sidebar.classList.remove("active");
        if (overlay) overlay.classList.remove("active");
    }
}

/* =======================
   SALIR
======================= */
function salir() {
    sessionStorage.clear();
    localStorage.clear();
    location.href = "index.html";
}

/* =======================
   GENERAR ID ÚNICO
======================= */
function generarIdProducto() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${timestamp}${random}`;
}

/* =======================
   ACTUALIZAR FECHA
======================= */
function actualizarFecha() {
    const fechaElement = document.getElementById('fechaActual');
    if (fechaElement) {
        const fecha = new Date();
        const opciones = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        fechaElement.textContent = fecha.toLocaleDateString('es-DO', opciones);
    }
}

/* =======================
   INICIAR FIREBASE
======================= */
async function iniciarFirebase() {
    if (!window.firebaseApp) {
        try {
            const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
            const { getDatabase } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            
            window.firebaseApp = initializeApp(firebaseConfig);
            db = getDatabase(window.firebaseApp);
            console.log('Firebase inicializado correctamente');
            return db;
        } catch (error) {
            console.error('Error al inicializar Firebase:', error);
            mostrarMensaje('Error al conectar con Firebase', 'error');
        }
    }
    return db;
}

/* =======================
   MANEJO DE IMÁGENES POR LINK
======================= */
function prepararCargaImagen() {
    const input = document.getElementById('imagenProducto');
    const preview = document.getElementById('previewImagen');
    const previewContainer = document.getElementById('previewContainer');

    if (input) {
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        newInput.id = 'imagenProducto';

        newInput.addEventListener('input', function() {
            const url = newInput.value.trim();
            
            if (url) {
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    if (preview) {
                        preview.src = url;
                        if (previewContainer) previewContainer.style.display = 'block';
                    }
                } else {
                    if (previewContainer) previewContainer.style.display = 'none';
                    mostrarMensaje('URL inválida (debe comenzar con http:// o https://)', 'warning');
                }
            } else {
                if (previewContainer) previewContainer.style.display = 'none';
                if (preview) preview.src = '';
            }
        });
    }
}

/* =======================
   ELIMINAR IMAGEN PREVISUALIZADA
======================= */
function eliminarImagenPrevisualizacion() {
    const input = document.getElementById('imagenProducto');
    const previewContainer = document.getElementById('previewContainer');
    const preview = document.getElementById('previewImagen');
    
    if (input) input.value = '';
    if (previewContainer) previewContainer.style.display = 'none';
    if (preview) preview.src = '';
}

/* =======================
   CARGAR SECCIONES
======================= */
async function cargar(seccion) {
    const content = document.getElementById("content");
    if (!content) return;

    switch (seccion) {
        case "inicio":
            const nombre = sessionStorage.getItem('nombreUsuario') || 'Usuario';
            const rol = sessionStorage.getItem('rolUsuario') || 'Administrador';
            content.innerHTML = `
                <h1>Bienvenido <span style="color:#7f00ff">${nombre}</span> 👋</h1>
                <p>Rol: ${rol}</p>
                <p>Seleccione una opción del menú para comenzar</p>
                <div style="margin-top:30px; padding:20px; background:#f8f9fa; border-radius:12px;">
                    <h3>📊 Resumen del Sistema</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
                        <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
                            <i class="fa-solid fa-boxes" style="font-size: 30px; color: #7f00ff;"></i>
                            <h4>Inventario</h4>
                            <p>Gestiona productos y stock</p>
                        </div>
                        <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
                            <i class="fa-solid fa-cash-register" style="font-size: 30px; color: #00c6ff;"></i>
                            <h4>Ventas</h4>
                            <p>Registra ventas y facturación</p>
                        </div>
                        <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
                            <i class="fa-solid fa-clipboard-list" style="font-size: 30px; color: #ff0066;"></i>
                            <h4>Pedidos</h4>
                            <p id="resumenPedidos">${pedidosPendientes.length} pedidos pendientes</p>
                        </div>
                    </div>
                </div>
            `;
            break;

        case "inventario":
            content.innerHTML = `
                <div class="inventario-container">
                    <h1><i class="fa-solid fa-boxes"></i> Gestión de Inventario</h1>
                    
                    <div class="form-inventario">
                        <h3><i class="fa-solid fa-plus-circle"></i> Agregar Nuevo Producto</h3>
                        <div class="form-grid">
                            <div>
                                <label>ID Producto (Automático)</label>
                                <input type="text" id="idProducto" placeholder="Se generará automáticamente" readonly>
                            </div>
                            <input type="text" id="nombreProducto" placeholder="Nombre del Producto *" required>
                            <input type="number" id="stockProducto" placeholder="Stock *" min="0" required>
                            <input type="number" id="precioCompra" placeholder="Precio de Compra *" step="0.01" min="0" required>
                            <input type="number" id="precioVenta" placeholder="Precio de Venta *" step="0.01" min="0" required>
                            
                            <div class="imagen-container">
                                <label>URL de la Imagen</label>
                                <input type="text" id="imagenProducto" placeholder="https://ejemplo.com/imagen.jpg">
                                <div id="previewContainer" style="display: none; margin-top: 10px;">
                                    <img id="previewImagen" style="max-width: 100px; max-height: 100px; border-radius: 8px; border: 2px solid #7f00ff;">
                                    <button type="button" onclick="eliminarImagenPrevisualizacion()" style="margin-left: 10px; padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">✖ Eliminar</button>
                                </div>
                                <small style="color: #666; display: block; margin-top: 5px;">Pega el link directo de la imagen (http:// o https://)</small>
                            </div>
                            
                            <select id="categoriaProducto">
                                <option value="">Seleccionar Categoría</option>
                                <option value="papeleria">Papelería</option>
                                <option value="impresiones">Impresiones</option>
                                <option value="toner">Tóner y Tinta</option>
                                <option value="oficina">Oficina</option>
                                <option value="electronica">Electrónica</option>
                                <option value="otros">Otros</option>
                            </select>
                            
                            <textarea id="descripcionProducto" placeholder="Descripción (Opcional)" rows="2"></textarea>
                        </div>
                        <button class="btn-agregar" onclick="agregarProducto()">
                            <i class="fa-solid fa-plus"></i> Agregar Producto
                        </button>
                        <div id="mensajeError" style="color: red; margin-top: 10px; display: none;"></div>
                    </div>
                    
                    <div class="tabla-wrapper">
                        <table class="tabla-inventario">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Imagen</th>
                                    <th>Producto</th>
                                    <th>Categoría</th>
                                    <th>Stock</th>
                                    <th>Precio Compra</th>
                                    <th>Precio Venta</th>
                                    <th>Ganancia/Unidad</th>
                                    <th>Valor Total</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="tablaInventario">
                                <tr><td colspan="10">Cargando inventario...</td</tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            setTimeout(() => {
                document.getElementById('idProducto').value = generarIdProducto();
                prepararCargaImagen();
                cargarInventario();
            }, 100);
            break;

        case "ventas":
            content.innerHTML = `
                <iframe 
                    src="ventas.html?nocache=${Date.now()}" 
                    style="width:100%; height:90vh; border:none;">
                </iframe>
            `;
            break;

        case "pedidos":
            content.innerHTML = `
                <iframe 
                    src="pedidos.html?nocache=${Date.now()}" 
                    style="width:100%; height:90vh; border:none;">
                </iframe>
            `;
            break;

        case "reportes":
            content.innerHTML = `
                <iframe 
                    src="reportes.html?nocache=${Date.now()}" 
                    style="width:100%; height:90vh; border:none;">
                </iframe>
            `;
            break;

        case "fundacion":
            content.innerHTML = `
                <iframe 
                    src="fundacion.html?nocache=${Date.now()}" 
                    style="width:100%; height:90vh; border:none;">
                </iframe>
            `;
            break;
            
        case "usuarios":
            content.innerHTML = `
                <iframe 
                    src="crear-usuario.html?nocache=${Date.now()}" 
                    style="width:100%; height:90vh; border:none;">
                </iframe>
            `;
            break;

        case "crearCV":
            try {
                const response = await fetch("cv-form.html");
                const html = await response.text();
                content.innerHTML = html;

                if (!document.getElementById("cv-css")) {
                    const link = document.createElement("link");
                    link.id = "cv-css";
                    link.rel = "stylesheet";
                    link.href = "cv-form.css";
                    document.head.appendChild(link);
                }

                if (!document.getElementById("cv-js")) {
                    const script = document.createElement("script");
                    script.id = "cv-js";
                    script.src = "cv-form.js";
                    document.body.appendChild(script);
                }
            } catch (err) {
                content.innerHTML = "<p>Error cargando el formulario</p>";
                console.error(err);
            }
            break;

        case "consultarCV":
            try {
                const response = await fetch("consultar-cv.html");
                const html = await response.text();
                content.innerHTML = html;

                if (!document.getElementById("consultar-css")) {
                    const link = document.createElement("link");
                    link.id = "consultar-css";
                    link.rel = "stylesheet";
                    link.href = "consultar-cv.css";
                    document.head.appendChild(link);
                }

                if (!document.getElementById("consultar-js")) {
                    const script = document.createElement("script");
                    script.id = "consultar-js";
                    script.src = "consultar-cv.js";
                    document.body.appendChild(script);
                }
            } catch (err) {
                content.innerHTML = "<p>Error cargando consulta</p>";
                console.error(err);
            }
            break;

        case "servicios":
            content.innerHTML = `
                <h1>Servicios Públicos</h1>

                <div class="cards">
                    <div class="card" onclick="abrirServicio('basico')">
                        <img src="ICONOS/educacion.png" onerror="this.src='https://via.placeholder.com/60x60?text=Educacion'">
                        <h3>Certificado Nivel Básico / Medio</h3>
                        <p>Ministerio de Educación</p>
                    </div>

                    <div class="card" onclick="abrirServicio('infotep')">
                        <img src="ICONOS/infotep.png" onerror="this.src='https://via.placeholder.com/60x60?text=INFOTEP'">
                        <h3>Certificados INFOTEP</h3>
                        <p>INFOTEP</p>
                    </div>

                    <div class="card" onclick="abrirServicio('conducta')">
                        <img src="ICONOS/justicia.png" onerror="this.src='https://via.placeholder.com/60x60?text=Justicia'">
                        <h3>Buena Conducta</h3>
                        <p>Ministerio Público</p>
                    </div>
                </div>

                <div id="visor" class="visor hidden">
                    <div class="visor-header">
                        <button onclick="volverServicios()">⬅ Regresar</button>
                    </div>
                    <iframe id="frame"></iframe>
                </div>
            `;
            break;

        case "cuentas":
            content.innerHTML = `
                <h1>Cuentas Digitales</h1>
                <p>Creación y acceso a cuentas digitales</p>

                <div class="cards">
                    <div class="card" onclick="abrirCuenta('google')">
                        <img src="ICONOS/google.png" onerror="this.src='https://via.placeholder.com/60x60?text=Google'">
                        <h3>Cuenta Google</h3>
                        <p>Gmail · YouTube · Drive</p>
                    </div>

                    <div class="card" onclick="abrirCuenta('apple')">
                        <img src="ICONOS/apple.png" onerror="this.src='https://via.placeholder.com/60x60?text=Apple'">
                        <h3>Apple ID</h3>
                        <p>iCloud · App Store</p>
                    </div>

                    <div class="card" onclick="abrirCuenta('facebook')">
                        <img src="ICONOS/facebook.png" onerror="this.src='https://via.placeholder.com/60x60?text=Facebook'">
                        <h3>Facebook</h3>
                        <p>Red Social</p>
                    </div>

                    <div class="card" onclick="abrirCuenta('tiktok')">
                        <img src="ICONOS/tiktok.png" onerror="this.src='https://via.placeholder.com/60x60?text=TikTok'">
                        <h3>TikTok</h3>
                        <p>Cuenta de video</p>
                    </div>
                </div>

                <div id="visor" class="visor hidden">
                    <div class="visor-header">
                        <button onclick="volverCuentas()">⬅ Regresar</button>
                    </div>
                    <iframe id="frame"></iframe>
                </div>
            `;
            break;
    }

    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.remove("active");
}

// ================= FUNCIONES DE INVENTARIO =================

/* =======================
   AGREGAR PRODUCTO
======================= */
async function agregarProducto() {
    await iniciarFirebase();
    
    try {
        const { ref, push } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        
        const nombre = document.getElementById('nombreProducto')?.value?.trim();
        const stock = parseInt(document.getElementById('stockProducto')?.value);
        const precioCompra = parseFloat(document.getElementById('precioCompra')?.value);
        const precioVenta = parseFloat(document.getElementById('precioVenta')?.value);
        const categoria = document.getElementById('categoriaProducto')?.value;
        const descripcion = document.getElementById('descripcionProducto')?.value;
        const imagenUrl = document.getElementById('imagenProducto')?.value?.trim();
        
        if (!nombre || isNaN(stock) || stock < 0 || 
            isNaN(precioCompra) || precioCompra < 0 || 
            isNaN(precioVenta) || precioVenta < 0) {
            mostrarError('Por favor complete todos los campos obligatorios (*) correctamente');
            return;
        }
        
        const idProducto = document.getElementById('idProducto')?.value || generarIdProducto();
        const gananciaUnidad = precioVenta - precioCompra;
        const valorTotal = precioCompra * stock;
        
        const producto = {
            id: idProducto,
            nombre,
            stock,
            precioCompra,
            precioVenta,
            gananciaUnidad,
            valorTotal,
            categoria: categoria || '',
            descripcion: descripcion || '',
            imagenUrl: (imagenUrl && (imagenUrl.startsWith('http://') || imagenUrl.startsWith('https://'))) ? imagenUrl : null,
            fechaCreacion: new Date().toISOString(),
            creadoPor: sessionStorage.getItem('nombreUsuario') || 'Admin',
            estado: 'activo'
        };
        
        await push(ref(db, 'inventario'), producto);
        
        limpiarFormulario();
        await cargarInventario();
        mostrarError('✅ Producto agregado exitosamente', 'success');
        
        setTimeout(() => {
            const idInput = document.getElementById('idProducto');
            if (idInput) idInput.value = generarIdProducto();
        }, 100);
        
    } catch (error) {
        console.error('Error al agregar producto:', error);
        mostrarError('❌ Error al agregar producto: ' + error.message);
    }
}

/* =======================
   LIMPIAR FORMULARIO
======================= */
function limpiarFormulario() {
    const nombre = document.getElementById('nombreProducto');
    const stock = document.getElementById('stockProducto');
    const precioCompra = document.getElementById('precioCompra');
    const precioVenta = document.getElementById('precioVenta');
    const categoria = document.getElementById('categoriaProducto');
    const descripcion = document.getElementById('descripcionProducto');
    const imagen = document.getElementById('imagenProducto');
    const previewContainer = document.getElementById('previewContainer');
    const preview = document.getElementById('previewImagen');
    
    if (nombre) nombre.value = '';
    if (stock) stock.value = '';
    if (precioCompra) precioCompra.value = '';
    if (precioVenta) precioVenta.value = '';
    if (categoria) categoria.value = '';
    if (descripcion) descripcion.value = '';
    if (imagen) imagen.value = '';
    if (previewContainer) previewContainer.style.display = 'none';
    if (preview) preview.src = '';
}

/* =======================
   MOSTRAR ERROR
======================= */
function mostrarError(mensaje, tipo = 'error') {
    const elemento = document.getElementById('mensajeError');
    if (elemento) {
        elemento.textContent = mensaje;
        elemento.style.color = tipo === 'success' ? '#28a745' : '#dc3545';
        elemento.style.display = 'block';
        elemento.style.padding = '12px';
        elemento.style.borderRadius = '8px';
        elemento.style.backgroundColor = tipo === 'success' ? '#d4edda' : '#f8d7da';
        elemento.style.border = tipo === 'success' ? '1px solid #c3e6cb' : '1px solid #f5c6cb';
        elemento.style.marginTop = '15px';
        
        setTimeout(() => {
            elemento.style.display = 'none';
        }, 4000);
    } else {
        alert(mensaje);
    }
}

/* =======================
   MOSTRAR MENSAJE FLOTANTE
======================= */
function mostrarMensaje(mensaje, tipo = 'info') {
    const mensajeDiv = document.createElement('div');
    mensajeDiv.className = `mensaje-flotante mensaje-${tipo}`;
    
    let icono = 'fa-info-circle';
    if (tipo === 'success') icono = 'fa-check-circle';
    if (tipo === 'error') icono = 'fa-exclamation-circle';
    if (tipo === 'warning') icono = 'fa-exclamation-triangle';
    
    mensajeDiv.innerHTML = `
        <i class="fa-solid ${icono}"></i>
        <span>${mensaje}</span>
    `;
    
    mensajeDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'success' ? '#4caf50' : tipo === 'error' ? '#f44336' : tipo === 'warning' ? '#ff9800' : '#2196f3'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideInRight 0.3s;
    `;
    
    document.body.appendChild(mensajeDiv);
    
    setTimeout(() => {
        mensajeDiv.style.animation = 'slideOutRight 0.3s';
        setTimeout(() => mensajeDiv.remove(), 300);
    }, 3000);
}

/* =======================
   CARGAR INVENTARIO
======================= */
async function cargarInventario() {
    await iniciarFirebase();
    
    try {
        const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        
        const snapshot = await get(ref(db, 'inventario'));
        const tbody = document.getElementById('tablaInventario');
        
        if (!tbody) return;
        
        if (!snapshot.exists()) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px;">No hay productos en el inventario</td</tr>';
            return;
        }
        
        let html = '';
        const productos = snapshot.val();
        let totalValorInventario = 0;
        
        for (const key in productos) {
            const p = productos[key];
            
            const imagenSrc = p.imagenUrl && (p.imagenUrl.startsWith('http://') || p.imagenUrl.startsWith('https://')) 
                ? p.imagenUrl 
                : 'https://via.placeholder.com/100x100?text=Sin+Imagen';
            
            const valorTotal = p.precioCompra * p.stock;
            totalValorInventario += valorTotal;
            
            let stockClass = 'stock-alto';
            if (p.stock <= 5) stockClass = 'stock-bajo';
            else if (p.stock <= 10) stockClass = 'stock-medio';
            
            html += `
                <tr>
                    <td><span class="id-producto">${p.id || 'N/A'}</span></td>
                    <td>
                        <img src="${imagenSrc}" 
                             alt="${p.nombre || 'Producto'}" 
                             class="img-producto"
                             style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;"
                             onerror="this.src='https://via.placeholder.com/100x100?text=Error'">
                    </td>
                    <td>
                        <strong>${p.nombre || 'Sin nombre'}</strong>
                        ${p.descripcion ? `<br><small style="color:#666;">${p.descripcion}</small>` : ''}
                    </td>
                    <td>${p.categoria || 'Sin categoría'}</td>
                    <td>
                        <span class="stock-badge ${stockClass}">
                            ${p.stock || 0} unidades
                        </span>
                    </td>
                    <td>$${(p.precioCompra || 0).toFixed(2)}</td>
                    <td>$${(p.precioVenta || 0).toFixed(2)}</td>
                    <td class="ganancia">$${(p.gananciaUnidad || 0).toFixed(2)}</td>
                    <td>$${valorTotal.toFixed(2)}</td>
                    <td>
                        <div class="acciones-btn">
                            <button class="btn-editar" onclick="editarProducto('${key}', '${p.id}')" title="Editar">
                                <i class="fa-solid fa-edit"></i>
                            </button>
                            <button class="btn-etiqueta" onclick="abrirModalEtiquetas('${key}', '${p.id}')" title="Generar Etiquetas">
                                <i class="fa-solid fa-tag"></i>
                            </button>
                            <button class="btn-eliminar" onclick="eliminarProducto('${key}', '${p.id}')" title="Eliminar">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        html += `
            <tr style="background: linear-gradient(45deg, #f8f9fa, #e9ecef); font-weight: bold;">
                <td colspan="8" style="text-align: right; font-size: 16px;">Valor Total del Inventario:</td>
                <td style="font-size: 16px; color: #7f00ff;">$${totalValorInventario.toFixed(2)}</td>
                <td></td>
            </tr>
        `;
        
        tbody.innerHTML = html;
    } catch (error) {
        console.error('Error al cargar inventario:', error);
        const tbody = document.getElementById('tablaInventario');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="10" style="color: #dc3545; text-align: center; padding: 40px;">Error al cargar inventario. Verifique su conexión.</td></tr>';
        }
    }
}

/* =======================
   ELIMINAR PRODUCTO
======================= */
async function eliminarProducto(key, idProducto) {
    if (!confirm('¿Está seguro de eliminar este producto?')) return;
    
    await iniciarFirebase();
    
    try {
        const { ref, remove } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        
        await remove(ref(db, `inventario/${key}`));
        
        await cargarInventario();
        mostrarError('✅ Producto eliminado exitosamente', 'success');
    } catch (error) {
        console.error('Error al eliminar:', error);
        mostrarError('❌ Error al eliminar producto');
    }
}

/* =======================
   EDITAR PRODUCTO
======================= */
async function editarProducto(key, idProducto) {
    await iniciarFirebase();
    
    try {
        const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        
        const snapshot = await get(ref(db, `inventario/${key}`));
        if (!snapshot.exists()) {
            mostrarError('Producto no encontrado');
            return;
        }
        
        const producto = snapshot.val();
        
        const idInput = document.getElementById('idProducto');
        const nombreInput = document.getElementById('nombreProducto');
        const stockInput = document.getElementById('stockProducto');
        const precioCompraInput = document.getElementById('precioCompra');
        const precioVentaInput = document.getElementById('precioVenta');
        const categoriaSelect = document.getElementById('categoriaProducto');
        const descripcionTextarea = document.getElementById('descripcionProducto');
        const imagenInput = document.getElementById('imagenProducto');
        const preview = document.getElementById('previewImagen');
        const previewContainer = document.getElementById('previewContainer');
        
        if (idInput) idInput.value = producto.id || '';
        if (nombreInput) nombreInput.value = producto.nombre || '';
        if (stockInput) stockInput.value = producto.stock || 0;
        if (precioCompraInput) precioCompraInput.value = producto.precioCompra || 0;
        if (precioVentaInput) precioVentaInput.value = producto.precioVenta || 0;
        if (categoriaSelect) categoriaSelect.value = producto.categoria || '';
        if (descripcionTextarea) descripcionTextarea.value = producto.descripcion || '';
        
        const imagenUrl = producto.imagenUrl || '';
        if (imagenInput && imagenUrl) {
            imagenInput.value = imagenUrl;
            if (preview && previewContainer && imagenUrl && imagenUrl !== 'https://via.placeholder.com/100x100?text=Sin+Imagen') {
                preview.src = imagenUrl;
                previewContainer.style.display = 'block';
            }
        }
        
        const boton = document.querySelector('.btn-agregar');
        if (boton) {
            boton.innerHTML = '<i class="fa-solid fa-save"></i> Actualizar Producto';
            boton.onclick = async function() {
                await actualizarProducto(key, idProducto);
            };
        }
        
        const form = document.querySelector('.form-inventario');
        if (form) form.scrollIntoView({behavior: 'smooth'});
        
        mostrarError('📝 Modo edición: Edite los campos y haga clic en Actualizar', 'success');
        
    } catch (error) {
        console.error('Error al cargar para editar:', error);
        mostrarError('❌ Error al cargar producto para editar');
    }
}

/* =======================
   ACTUALIZAR PRODUCTO
======================= */
async function actualizarProducto(key, idProducto) {
    await iniciarFirebase();
    
    try {
        const { ref, update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        
        const nombre = document.getElementById('nombreProducto')?.value?.trim();
        const stock = parseInt(document.getElementById('stockProducto')?.value);
        const precioCompra = parseFloat(document.getElementById('precioCompra')?.value);
        const precioVenta = parseFloat(document.getElementById('precioVenta')?.value);
        const categoria = document.getElementById('categoriaProducto')?.value;
        const descripcion = document.getElementById('descripcionProducto')?.value;
        const imagenUrl = document.getElementById('imagenProducto')?.value?.trim();
        
        if (!nombre || isNaN(stock) || stock < 0 || 
            isNaN(precioCompra) || precioCompra < 0 || 
            isNaN(precioVenta) || precioVenta < 0) {
            mostrarError('Por favor complete todos los campos obligatorios (*) correctamente');
            return;
        }
        
        const gananciaUnidad = precioVenta - precioCompra;
        const valorTotal = precioCompra * stock;
        
        const productoActualizado = {
            nombre,
            stock,
            precioCompra,
            precioVenta,
            gananciaUnidad,
            valorTotal,
            categoria: categoria || '',
            descripcion: descripcion || '',
            imagenUrl: (imagenUrl && (imagenUrl.startsWith('http://') || imagenUrl.startsWith('https://'))) ? imagenUrl : null,
            fechaActualizado: new Date().toISOString(),
            actualizadoPor: sessionStorage.getItem('nombreUsuario') || 'Admin'
        };
        
        await update(ref(db, `inventario/${key}`), productoActualizado);
        
        const boton = document.querySelector('.btn-agregar');
        if (boton) {
            boton.innerHTML = '<i class="fa-solid fa-plus"></i> Agregar Producto';
            boton.onclick = agregarProducto;
        }
        
        limpiarFormulario();
        
        const idInput = document.getElementById('idProducto');
        if (idInput) idInput.value = generarIdProducto();
        
        await cargarInventario();
        mostrarError('✅ Producto actualizado exitosamente', 'success');
    } catch (error) {
        console.error('Error al actualizar:', error);
        mostrarError('❌ Error al actualizar producto');
    }
}

// ================= FUNCIONES PARA ETIQUETAS =================

/* =======================
   ABRIR MODAL DE ETIQUETAS
======================= */
async function abrirModalEtiquetas(key, idProducto) {
    await iniciarFirebase();
    
    try {
        const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        
        const snapshot = await get(ref(db, `inventario/${key}`));
        if (!snapshot.exists()) {
            mostrarError('Producto no encontrado');
            return;
        }
        
        productoSeleccionadoEtiqueta = snapshot.val();
        productoSeleccionadoEtiqueta.firebaseKey = key;
        
        const imagenUrl = (productoSeleccionadoEtiqueta.imagenUrl && 
                          (productoSeleccionadoEtiqueta.imagenUrl.startsWith('http://') || 
                           productoSeleccionadoEtiqueta.imagenUrl.startsWith('https://'))) 
            ? productoSeleccionadoEtiqueta.imagenUrl 
            : 'https://via.placeholder.com/100x100?text=Sin+Imagen';
        
        const productoInfo = document.getElementById('productoEtiquetaInfo');
        if (productoInfo) {
            productoInfo.innerHTML = `
                <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 12px;">
                    <img src="${imagenUrl}" 
                         alt="${productoSeleccionadoEtiqueta.nombre || 'Producto'}" 
                         style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 2px solid #7f00ff;"
                         onerror="this.src='https://via.placeholder.com/100x100?text=Sin+Imagen'">
                    <div>
                        <h4 style="margin: 0 0 5px 0; color: #16213e; font-size: 18px;">${productoSeleccionadoEtiqueta.nombre || 'Producto'}</h4>
                        <p style="margin: 0; color: #666; font-size: 13px;">
                            <span style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${productoSeleccionadoEtiqueta.id || 'N/A'}</span>
                        </p>
                        <p style="margin: 8px 0 0 0; font-weight: bold; color: #4caf50; font-size: 16px;">
                            Precio: $${(productoSeleccionadoEtiqueta.precioVenta || 0).toFixed(2)}
                        </p>
                    </div>
                </div>
            `;
        }
        
        const cantidadInput = document.getElementById('cantidadEtiquetas');
        if (cantidadInput) cantidadInput.value = 1;
        
        const incluirNombre = document.getElementById('incluirNombre');
        const incluirId = document.getElementById('incluirId');
        const incluirPrecio = document.getElementById('incluirPrecio');
        const incluirLogo = document.getElementById('incluirLogo');
        
        if (incluirNombre) incluirNombre.checked = true;
        if (incluirId) incluirId.checked = true;
        if (incluirPrecio) incluirPrecio.checked = true;
        if (incluirLogo) incluirLogo.checked = true;
        
        const modal = document.getElementById('modalEtiquetas');
        const overlay = document.getElementById('overlay');
        
        if (modal) {
            modal.classList.remove('hidden');
            if (overlay) overlay.classList.add('active');
        }
        
    } catch (error) {
        console.error('Error al abrir modal de etiquetas:', error);
        mostrarError('❌ Error al cargar producto para etiquetas');
    }
}

/* =======================
   CERRAR MODAL DE ETIQUETAS
======================= */
function cerrarModalEtiquetas() {
    const modal = document.getElementById('modalEtiquetas');
    const overlay = document.getElementById('overlay');
    
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.remove('active');
    productoSeleccionadoEtiqueta = null;
}

/* =======================
   GENERAR ETIQUETAS PDF
======================= */
async function generarEtiquetas() {
    if (!productoSeleccionadoEtiqueta) {
        mostrarError('No hay producto seleccionado');
        return;
    }
    
    const cantidadInput = document.getElementById('cantidadEtiquetas');
    const cantidad = parseInt(cantidadInput?.value) || 1;
    
    if (cantidad < 1 || cantidad > 100) {
        mostrarError('La cantidad debe ser entre 1 y 100');
        return;
    }
    
    const incluirNombre = document.getElementById('incluirNombre')?.checked || false;
    const incluirId = document.getElementById('incluirId')?.checked || false;
    const incluirPrecio = document.getElementById('incluirPrecio')?.checked || false;
    const incluirLogo = document.getElementById('incluirLogo')?.checked || false;
    
    try {
        if (typeof window.jspdf === 'undefined') {
            await loadJsPDF();
        }
        
        const { jsPDF } = window.jspdf;
        
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const marginLeft = 5;
        const marginTop = 5;
        const labelWidth = 50;
        const labelHeight = 30;
        const labelsPerRow = 3;
        const labelsPerColumn = 9;
        
        let currentLabel = 0;
        
        for (let i = 0; i < cantidad; i++) {
            const row = Math.floor(currentLabel / labelsPerRow);
            const col = currentLabel % labelsPerRow;
            
            const x = marginLeft + (col * (labelWidth + marginLeft));
            const y = marginTop + (row * (labelHeight + marginTop / 2));
            
            if (row >= labelsPerColumn) {
                doc.addPage();
                currentLabel = 0;
                const newRow = Math.floor(currentLabel / labelsPerRow);
                const newCol = currentLabel % labelsPerRow;
                const newX = marginLeft + (newCol * (labelWidth + marginLeft));
                const newY = marginTop + (newRow * (labelHeight + marginTop / 2));
                
                await dibujarEtiqueta(doc, newX, newY, labelWidth, labelHeight, 
                              incluirNombre, incluirId, incluirPrecio, incluirLogo);
            } else {
                await dibujarEtiqueta(doc, x, y, labelWidth, labelHeight, 
                              incluirNombre, incluirId, incluirPrecio, incluirLogo);
            }
            
            currentLabel++;
        }
        
        const nombreArchivo = `etiquetas_${productoSeleccionadoEtiqueta.nombre || 'producto'}_${Date.now()}.pdf`
            .replace(/[^a-z0-9_.-]/gi, '_')
            .toLowerCase();
        
        doc.save(nombreArchivo);
        cerrarModalEtiquetas();
        mostrarError(`✅ ${cantidad} etiqueta(s) generada(s) exitosamente`, 'success');
        
    } catch (error) {
        console.error('Error generando etiquetas:', error);
        mostrarError('❌ Error al generar etiquetas: ' + error.message);
    }
}

/* =======================
   DIBUJAR ETIQUETA INDIVIDUAL
======================= */
async function dibujarEtiqueta(doc, x, y, width, height, 
                              incluirNombre, incluirId, incluirPrecio, incluirLogo) {
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(x, y, width, height);
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    doc.line(x, y + height - 8, x + width, y + height - 8);
    
    let yOffset = y + 5;
    
    if (incluirLogo) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(127, 0, 255);
        doc.text('WJS', x + width / 2, yOffset, { align: 'center' });
        
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Impresiones', x + width / 2, yOffset + 3, { align: 'center' });
        
        yOffset += 7;
    }
    
    if (incluirNombre) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        
        let nombre = productoSeleccionadoEtiqueta.nombre || 'Producto';
        
        if (nombre.length > 18) {
            nombre = nombre.substring(0, 16) + '...';
        }
        
        doc.text(nombre, x + width / 2, yOffset, { align: 'center' });
        yOffset += 5;
    }
    
    if (incluirId) {
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        
        let id = productoSeleccionadoEtiqueta.id || 'N/A';
        
        if (id.length > 20) {
            id = id.substring(0, 18) + '...';
        }
        
        doc.text(id, x + width / 2, yOffset, { align: 'center' });
        yOffset += 2;
    }
    
    try {
        if (typeof JsBarcode !== 'undefined') {
            const canvas = document.createElement('canvas');
            canvas.width = 150;
            canvas.height = 40;
            
            JsBarcode(canvas, productoSeleccionadoEtiqueta.id || '000000', {
                format: "CODE128",
                width: 1.2,
                height: 25,
                displayValue: false,
                fontSize: 0,
                margin: 0,
                background: "transparent"
            });
            
            const barcodeData = canvas.toDataURL('image/png');
            
            const barcodeWidth = 38;
            const barcodeHeight = 10;
            const barcodeX = x + (width - barcodeWidth) / 2;
            const barcodeY = y + 16;
            
            doc.addImage(barcodeData, 'PNG', barcodeX, barcodeY, barcodeWidth, barcodeHeight);
            yOffset += 8;
        }
    } catch (e) {
        console.warn('Error generando código de barras:', e);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(productoSeleccionadoEtiqueta.id || 'N/A', x + width / 2, y + 22, { align: 'center' });
        yOffset += 4;
    }
    
    if (incluirPrecio) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(76, 175, 80);
        
        const precio = productoSeleccionadoEtiqueta.precioVenta || 0;
        const precioFormateado = `RD$ ${precio.toFixed(2)}`;
        
        doc.text(precioFormateado, x + width - 4, y + height - 3, { align: 'right' });
    }
    
    if (productoSeleccionadoEtiqueta.stock !== undefined) {
        doc.setFontSize(5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text(`Stock: ${productoSeleccionadoEtiqueta.stock}`, x + 3, y + height - 3);
    }
}

/* =======================
   CARGAR JSPDF
======================= */
async function loadJsPDF() {
    return new Promise((resolve, reject) => {
        if (window.jspdf) {
            resolve(window.jspdf);
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
            if (typeof JsBarcode === 'undefined') {
                const barcodeScript = document.createElement('script');
                barcodeScript.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
                barcodeScript.onload = () => resolve(window.jspdf);
                barcodeScript.onerror = reject;
                document.head.appendChild(barcodeScript);
            } else {
                resolve(window.jspdf);
            }
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ================= FUNCIONES DE NOTIFICACIONES =================

/* =======================
   INICIAR ESCUCHA DE PEDIDOS
======================= */
async function iniciarEscuchaPedidos() {
    await iniciarFirebase();
    
    try {
        const { ref, onValue } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        
        if (pedidosListener) {
            pedidosListener();
        }
        
        const pedidosRef = ref(db, 'pedidosPendientes');
        
        pedidosListener = onValue(pedidosRef, (snapshot) => {
            pedidosPendientes = [];
            
            if (snapshot.exists()) {
                const pedidosData = snapshot.val();
                
                for (const key in pedidosData) {
                    const pedido = pedidosData[key];
                    if (pedido.estado !== 'completado' && pedido.estado !== 'entregado') {
                        pedidosPendientes.push({
                            firebaseKey: key,
                            id: key,
                            ...pedido
                        });
                    }
                }
            }
            
            actualizarBadgePedidos();
            generarNotificacionesPedidos();
            
            const resumenPedidos = document.getElementById('resumenPedidos');
            if (resumenPedidos) {
                resumenPedidos.textContent = `${pedidosPendientes.length} pedidos pendientes`;
            }
        });
    } catch (error) {
        console.error('Error al iniciar escucha de pedidos:', error);
    }
}

/* =======================
   ACTUALIZAR BADGE DE PEDIDOS
======================= */
function actualizarBadgePedidos() {
    const badge = document.getElementById('pedidosBadge');
    if (badge) {
        const cantidad = pedidosPendientes.length;
        badge.textContent = cantidad;
        badge.style.display = cantidad > 0 ? 'inline-block' : 'none';
    }
}

/* =======================
   GENERAR NOTIFICACIONES DE PEDIDOS
======================= */
function generarNotificacionesPedidos() {
    try {
        const notificacionesGuardadas = JSON.parse(localStorage.getItem('notificacionesLeidas') || '[]');
        const nuevasNotificaciones = [];
        
        pedidosPendientes.forEach(pedido => {
            const notificacionId = `pedido_${pedido.firebaseKey}`;
            
            if (!notificacionesGuardadas.includes(notificacionId)) {
                let titulo = 'Nuevo pedido';
                let mensaje = '';
                
                if (pedido.estado === 'recibido') {
                    titulo = '🆕 Pedido Recibido';
                    mensaje = `Nuevo pedido #${pedido.firebaseKey?.substring(0, 6) || 'N/A'} de ${pedido.cliente?.nombre || 'Cliente'}`;
                } else if (pedido.estado === 'proceso') {
                    titulo = '⚙️ Pedido en Proceso';
                    mensaje = `El pedido #${pedido.firebaseKey?.substring(0, 6) || 'N/A'} está siendo procesado`;
                } else if (pedido.estado === 'disponible') {
                    titulo = '✅ Pedido Disponible';
                    mensaje = `El pedido #${pedido.firebaseKey?.substring(0, 6) || 'N/A'} está listo para entrega`;
                }
                
                nuevasNotificaciones.push({
                    id: notificacionId,
                    titulo: titulo,
                    mensaje: mensaje,
                    tiempo: new Date().toISOString(),
                    leida: false,
                    pedidoId: pedido.firebaseKey
                });
            }
        });
        
        if (nuevasNotificaciones.length > 0) {
            notificaciones = [...nuevasNotificaciones, ...notificaciones].slice(0, 20);
            notificacionesNoLeidas = notificaciones.filter(n => !n.leida).length;
            actualizarBadgeNotificaciones();
            mostrarNotificacionToast(nuevasNotificaciones[0]);
        }
    } catch (error) {
        console.error('Error generando notificaciones:', error);
    }
}

/* =======================
   MOSTRAR NOTIFICACIÓN TOAST
======================= */
function mostrarNotificacionToast(notificacion) {
    const toast = document.createElement('div');
    toast.className = 'notificacion-toast';
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-bell" style="color: #7f00ff; font-size: 20px;"></i>
            <div style="flex: 1;">
                <strong style="display: block; margin-bottom: 3px;">${notificacion.titulo}</strong>
                <span style="font-size: 12px; color: #666;">${notificacion.mensaje}</span>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; cursor: pointer; padding: 5px;">
                <i class="fa-solid fa-times" style="color: #999; font-size: 16px;"></i>
            </button>
        </div>
    `;
    
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s;
        border-left: 4px solid #7f00ff;
        max-width: 350px;
        width: calc(100% - 40px);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

/* =======================
   ACTUALIZAR BADGE DE NOTIFICACIONES
======================= */
function actualizarBadgeNotificaciones() {
    const badge = document.getElementById('notificacionBadge');
    if (badge) {
        badge.textContent = notificacionesNoLeidas;
        badge.style.display = notificacionesNoLeidas > 0 ? 'flex' : 'none';
    }
}

/* =======================
   TOGGLE NOTIFICACIONES
======================= */
function toggleNotificaciones() {
    const panel = document.getElementById('notificacionesPanel');
    const overlay = document.getElementById('overlay');
    
    if (panel) {
        panel.classList.toggle('hidden');
        if (overlay) overlay.classList.toggle('active');
        
        if (!panel.classList.contains('hidden')) {
            renderizarNotificaciones();
        }
    }
}

/* =======================
   RENDERIZAR NOTIFICACIONES
======================= */
function renderizarNotificaciones() {
    const lista = document.getElementById('notificacionesLista');
    if (!lista) return;
    
    if (notificaciones.length === 0) {
        lista.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #999;">
                <i class="fa-regular fa-bell-slash" style="font-size: 48px; margin-bottom: 15px; color: #ddd;"></i>
                <p style="margin: 0; font-size: 16px;">No hay notificaciones nuevas</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    notificaciones.slice(0, 10).forEach(notif => {
        const tiempo = calcularTiempoRelativo(notif.tiempo);
        const claseNuevo = !notif.leida ? 'nuevo' : '';
        
        html += `
            <div class="notificacion-item ${claseNuevo}" data-id="${notif.id}" style="border-bottom: 1px solid #f0f0f0; padding: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                    <strong style="color: ${!notif.leida ? '#7f00ff' : '#666'};">${notif.titulo}</strong>
                    <span style="font-size: 11px; color: #999;">${tiempo}</span>
                </div>
                <div style="font-size: 13px; color: #666; margin-bottom: 10px;">${notif.mensaje}</div>
                ${notif.pedidoId ? `
                    <button onclick="cargarPedidoYNotificacion('${notif.pedidoId}')" 
                            style="background: none; border: 1px solid #7f00ff; color: #7f00ff; padding: 5px 12px; border-radius: 20px; font-size: 11px; cursor: pointer; transition: all 0.3s;">
                        Ver pedido
                    </button>
                ` : ''}
            </div>
        `;
    });
    
    lista.innerHTML = html;
}

/* =======================
   CALCULAR TIEMPO RELATIVO
======================= */
function calcularTiempoRelativo(fechaISO) {
    try {
        const fecha = new Date(fechaISO);
        const ahora = new Date();
        const diferencia = Math.floor((ahora - fecha) / 1000);
        
        if (diferencia < 60) return 'hace un momento';
        if (diferencia < 3600) return `hace ${Math.floor(diferencia / 60)} min`;
        if (diferencia < 86400) return `hace ${Math.floor(diferencia / 3600)} h`;
        if (diferencia < 2592000) return `hace ${Math.floor(diferencia / 86400)} d`;
        return fecha.toLocaleDateString('es-DO');
    } catch (e) {
        return 'fecha desconocida';
    }
}

/* =======================
   MARCAR TODAS LEÍDAS
======================= */
function marcarTodasLeidas() {
    notificaciones.forEach(n => n.leida = true);
    notificacionesNoLeidas = 0;
    actualizarBadgeNotificaciones();
    
    const leidas = notificaciones.map(n => n.id);
    localStorage.setItem('notificacionesLeidas', JSON.stringify(leidas));
    
    renderizarNotificaciones();
    mostrarMensaje('Todas las notificaciones marcadas como leídas', 'success');
}

/* =======================
   CARGAR PEDIDO DESDE NOTIFICACIÓN
======================= */
function cargarPedidoYNotificacion(pedidoId) {
    cargar('pedidos');
    
    setTimeout(() => {
        const notificacion = notificaciones.find(n => n.pedidoId === pedidoId);
        if (notificacion) {
            notificacion.leida = true;
            actualizarBadgeNotificaciones();
            renderizarNotificaciones();
        }
        
        toggleNotificaciones();
    }, 500);
}

/* =======================
   CERRAR TODOS LOS MODALES
======================= */
function cerrarTodosModales() {
    cerrarModalEtiquetas();
    
    const notificacionesPanel = document.getElementById('notificacionesPanel');
    if (notificacionesPanel) notificacionesPanel.classList.add('hidden');
    
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.remove('active');
}

// ================= SERVICIOS EXTERNOS =================

const urls = {
    basico: "https://certificado.ministeriodeeducacion.gob.do/",
    infotep: "https://servicios.infotep.gob.do/Certificados/",
    conducta: "https://portal.servicios.pgr.gob.do/certificadonoantecedentespenales/visualizarcnap/",
    google: "https://accounts.google.com/signup",
    apple: "https://appleid.apple.com/account",
    facebook: "https://www.facebook.com/r.php",
    tiktok: "https://www.tiktok.com/signup"
};

function abrirServicio(tipo) {
    abrirIframe(tipo);
}

function abrirCuenta(tipo) {
    abrirIframe(tipo);
}

function abrirIframe(tipo) {
    const url = urls[tipo];
    const cards = document.querySelector(".cards");
    const visor = document.getElementById("visor");
    const frame = document.getElementById("frame");
    
    if (cards) cards.style.display = "none";
    if (visor) visor.classList.remove("hidden");
    if (frame) frame.src = url;
}

function volverServicios() {
    cerrarIframe();
}

function volverCuentas() {
    cerrarIframe();
}

function cerrarIframe() {
    const frame = document.getElementById("frame");
    const visor = document.getElementById("visor");
    const cards = document.querySelector(".cards");
    
    if (frame) frame.src = "";
    if (visor) visor.classList.add("hidden");
    if (cards) cards.style.display = "grid";
}

// ================= INICIALIZACIÓN =================
window.onload = async function() {
    console.log('Inicializando panel administrativo...');
    
    // 🟢 IMPORTANTE: Inicializar el menú PRIMERO
    inicializarMenu();
    
    actualizarFecha();
    setInterval(actualizarFecha, 60000);
    
    const nombre = sessionStorage.getItem('nombreUsuario') || 'Usuario';
    const rol = sessionStorage.getItem('rolUsuario') || 'Administrador';
    
    const nombreElement = document.getElementById('nombreUsuario');
    const rolElement = document.getElementById('rolUsuario');
    const avatarImg = document.getElementById('avatarImg');
    const bienvenida = document.getElementById('bienvenida');
    
    if (nombreElement) nombreElement.textContent = nombre;
    if (rolElement) rolElement.textContent = rol;
    if (bienvenida) bienvenida.innerHTML = `Bienvenido <span style="color:#7f00ff">${nombre}</span> 👋`;
    
    if (avatarImg) {
        avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=7f00ff&color=fff&size=100`;
        avatarImg.onerror = function() {
            this.src = 'https://ui-avatars.com/api/?name=Usuario&background=7f00ff&color=fff&size=100';
        };
    }
    
    await iniciarFirebase();
    await iniciarEscuchaPedidos();
    
    if (typeof cargar === 'function') {
        cargar('inicio');
    }
    
    console.log('Panel administrativo inicializado correctamente');
};

// ================= EXPORTAR FUNCIONES GLOBALES =================
window.toggleMenu = toggleMenu;
window.salir = salir;
window.cargar = cargar;
window.generarIdProducto = generarIdProducto;
window.agregarProducto = agregarProducto;
window.cargarInventario = cargarInventario;
window.eliminarProducto = eliminarProducto;
window.editarProducto = editarProducto;
window.abrirModalEtiquetas = abrirModalEtiquetas;
window.cerrarModalEtiquetas = cerrarModalEtiquetas;
window.generarEtiquetas = generarEtiquetas;
window.abrirServicio = abrirServicio;
window.abrirCuenta = abrirCuenta;
window.volverServicios = volverServicios;
window.volverCuentas = volverCuentas;
window.toggleNotificaciones = toggleNotificaciones;
window.marcarTodasLeidas = marcarTodasLeidas;
window.cargarPedidoYNotificacion = cargarPedidoYNotificacion;
window.cerrarTodosModales = cerrarTodosModales;
window.mostrarError = mostrarError;
window.mostrarMensaje = mostrarMensaje;
window.eliminarImagenPrevisualizacion = eliminarImagenPrevisualizacion;