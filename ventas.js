// ================= FIREBASE =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  push,
  update,
  remove,
  query,
  orderByChild,
  onValue
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB3xTYP7wKgvFvySX8ZkHqm0Tly8y4LcM4",
  authDomain: "imprecioneswjs.firebaseapp.com",
  databaseURL: "https://imprecioneswjs-default-rtdb.firebaseio.com",
  projectId: "imprecioneswjs",
  storageBucket: "imprecioneswjs.appspot.com",
  appId: "1:923402098800:web:ef57d1e1bf1fdd758a3cb5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ================= VARIABLES GLOBALES =================
let carrito = [];
let productoSeleccionado = null;
let clienteActual = {
  id: "general",
  nombre: "Publico general",
  tipo: "general"
};
let productosDisponibles = [];
let vendedorNombre = "";
let ventasParaAnular = [];
let ventaSeleccionadaAnular = null;
let impresoraPredeterminada = null;

// ================= CONFIGURACION DE IMPRESORA =================
function guardarImpresoraPredeterminada() {
    try {
        impresoraPredeterminada = {
            nombre: 'Impresora Termica 80mm',
            tipo: 'termica',
            ancho: '80mm'
        };
        localStorage.setItem('impresoraPredeterminada', JSON.stringify(impresoraPredeterminada));
        mostrarMensaje('✅ Impresora configurada', 'success');
        
        const btnImpresora = document.getElementById('btnConfigurarImpresora');
        if (btnImpresora) {
            btnImpresora.innerHTML = '🖨️ Impresora Lista';
            btnImpresora.style.background = '#28a745';
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function cargarImpresoraPredeterminada() {
    try {
        const guardada = localStorage.getItem('impresoraPredeterminada');
        if (guardada) {
            impresoraPredeterminada = JSON.parse(guardada);
            const btnImpresora = document.getElementById('btnConfigurarImpresora');
            if (btnImpresora) {
                btnImpresora.innerHTML = '🖨️ Impresora Lista';
                btnImpresora.style.background = '#28a745';
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ================= FUNCIONES DE FECHA/HORA =================
function obtenerFechaHoraRD() {
  const ahora = new Date();
  const fechaISO = ahora.toISOString();
  
  const opciones = {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  const formatter = new Intl.DateTimeFormat('es-DO', opciones);
  const partes = formatter.formatToParts(ahora);
  
  let fechaObj = {};
  partes.forEach(parte => {
    fechaObj[parte.type] = parte.value;
  });
  
  const fechaCompleta = `${fechaObj.day}/${fechaObj.month}/${fechaObj.year} ${fechaObj.hour}:${fechaObj.minute}:${fechaObj.second}`;
  const fechaCorta = `${fechaObj.day}/${fechaObj.month}/${fechaObj.year}`;
  const horaFormato = `${fechaObj.hour}:${fechaObj.minute}:${fechaObj.second}`;
  
  return {
    iso: fechaISO,
    completa: fechaCompleta,
    fecha: fechaCorta,
    hora: horaFormato
  };
}

// ================= INICIALIZACION =================
document.addEventListener('DOMContentLoaded', () => {
  console.log('Sistema de ventas cargado');
  inicializarApp();
});

async function inicializarApp() {
  try {
    cargarVendedor();
    cargarImpresoraPredeterminada();
    await cargarProductos();
    await cargarClientes();
    configurarEventListeners();
    actualizarVistaTicket();
    console.log('App inicializada');
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al inicializar: ' + error.message, 'error');
  }
}

// ================= FUNCIONES DEL VENDEDOR =================
function cargarVendedor() {
  try {
    vendedorNombre = sessionStorage.getItem('nombreUsuario') || 'Administrador';
    const vendedorElement = document.getElementById('vendedorNombre');
    if (vendedorElement) vendedorElement.textContent = vendedorNombre;
  } catch (error) {
    vendedorNombre = 'Administrador';
  }
}

// ================= FUNCIONES DE PRODUCTOS =================
async function cargarProductos() {
  try {
    console.log('Cargando productos...');
    const snapshot = await get(ref(db, 'inventario'));
    
    if (snapshot.exists()) {
      productosDisponibles = [];
      const productosData = snapshot.val();
      
      for (const key in productosData) {
        const producto = productosData[key];
        if (producto && producto.estado !== 'inactivo' && producto.stock > 0) {
          productosDisponibles.push({
            ...producto,
            firebaseKey: key,
            precioVenta: producto.precioVenta || producto.precio || 0,
            id: producto.id || key,
            imagenUrl: producto.imagenUrl || null
          });
        }
      }
      
      console.log(`Productos: ${productosDisponibles.length}`);
      renderProductos();
    } else {
      mostrarMensaje('No hay productos', 'warning');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error cargando productos', 'error');
  }
}

function renderProductos() {
  const grid = document.getElementById('productosGrid');
  if (!grid) return;
  
  if (productosDisponibles.length === 0) {
    grid.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <p>No hay productos disponibles</p>
      </div>
    `;
    return;
  }
  
  let html = '';
  productosDisponibles.forEach(producto => {
    let imagenSrc = producto.imagenUrl && (producto.imagenUrl.startsWith('http://') || producto.imagenUrl.startsWith('https://'))
      ? producto.imagenUrl
      : 'https://via.placeholder.com/80x80?text=Producto';
    
    html += `
      <div class="producto-card" data-key="${producto.firebaseKey}" data-nombre="${producto.nombre.toLowerCase()}" data-id="${(producto.id || producto.firebaseKey).toLowerCase()}" style="cursor: pointer; border: 1px solid #ddd; border-radius: 8px; padding: 10px; margin: 8px; display: inline-block; width: calc(25% - 16px); min-width: 170px; vertical-align: top; background: white;">
        <div style="text-align: center; height: 80px; display: flex; align-items: center; justify-content: center;">
          <img src="${imagenSrc}" style="max-width: 70px; max-height: 70px; object-fit: contain;" onerror="this.src='https://via.placeholder.com/70x70?text=No'">
        </div>
        <div style="text-align: center; margin-top: 8px;">
          <div style="font-weight: bold; font-size: 13px;">${producto.nombre.substring(0, 25)}</div>
          <div style="color: #7f00ff; font-weight: bold; margin: 5px 0;">RD$${producto.precioVenta.toFixed(2)}</div>
          <div style="font-size: 11px; color: #666;">Stock: ${producto.stock}uds</div>
        </div>
      </div>
    `;
  });
  
  grid.innerHTML = html;
  
  document.querySelectorAll('.producto-card').forEach(card => {
    card.addEventListener('click', () => {
      const key = card.getAttribute('data-key');
      seleccionarProducto(key);
    });
  });
}

// ================= 🟢 BUSCADOR CORREGIDO Y FUNCIONAL =================
function buscarProductos() {
  const busqueda = document.getElementById('buscarProducto');
  if (!busqueda) return;
  
  const textoBusqueda = busqueda.value.toLowerCase().trim();
  const categoria = document.getElementById('filtroCategoria')?.value || '';
  
  console.log('Buscando:', textoBusqueda);
  
  let productosFiltrados = [...productosDisponibles];
  
  // Filtrar por búsqueda
  if (textoBusqueda !== '') {
    productosFiltrados = productosFiltrados.filter(producto => {
      const nombreMatch = producto.nombre && producto.nombre.toLowerCase().includes(textoBusqueda);
      const idMatch = (producto.id || producto.firebaseKey) && (producto.id || producto.firebaseKey).toLowerCase().includes(textoBusqueda);
      return nombreMatch || idMatch;
    });
    
    // 🟢 NUEVO: Si la búsqueda es exacta por ID o nombre, agregar directamente al carrito
    if (productosFiltrados.length === 1) {
      const productoEncontrado = productosFiltrados[0];
      if (productoEncontrado) {
        console.log('Producto encontrado exactamente, agregando al carrito:', productoEncontrado.nombre);
        agregarProductoDirectoAlCarrito(productoEncontrado);
        // Limpiar el campo de búsqueda después de agregar
        busqueda.value = '';
        return;
      }
    }
  }
  
  // Filtrar por categoría
  if (categoria) {
    productosFiltrados = productosFiltrados.filter(producto => producto.categoria === categoria);
  }
  
  renderProductosFiltrados(productosFiltrados);
}

// 🟢 NUEVA FUNCIÓN: Agregar producto directamente al carrito sin abrir modal
function agregarProductoDirectoAlCarrito(producto) {
  if (!producto) {
    mostrarMensaje('Producto no encontrado', 'error');
    return;
  }
  
  // Verificar stock
  if (producto.stock <= 0) {
    mostrarMensaje(`Stock insuficiente: ${producto.nombre}`, 'error');
    return;
  }
  
  const existente = carrito.find(item => item.firebaseKey === producto.firebaseKey);
  
  if (existente) {
    // Verificar que no exceda el stock
    if (existente.cantidad + 1 > producto.stock) {
      mostrarMensaje(`Stock insuficiente para ${producto.nombre}. Máximo: ${producto.stock}`, 'error');
      return;
    }
    existente.cantidad += 1;
  } else {
    carrito.push({
      firebaseKey: producto.firebaseKey,
      nombre: producto.nombre,
      precio: producto.precioVenta,
      cantidad: 1
    });
  }
  
  actualizarVistaTicket();
  mostrarMensaje(`✅ ${producto.nombre} agregado al carrito`, 'success');
}

function renderProductosFiltrados(productos) {
  const grid = document.getElementById('productosGrid');
  if (!grid) return;
  
  if (productos.length === 0) {
    grid.innerHTML = '<div style="text-align: center; padding: 40px;">No hay productos que coincidan con la búsqueda</div>';
    return;
  }
  
  let html = '';
  productos.forEach(p => {
    let imagenSrc = p.imagenUrl || 'https://via.placeholder.com/70x70?text=Producto';
    html += `
      <div class="producto-card" data-key="${p.firebaseKey}" style="cursor: pointer; border: 1px solid #ddd; border-radius: 8px; padding: 10px; margin: 8px; display: inline-block; width: calc(25% - 16px); min-width: 160px; text-align: center; background: white;">
        <div style="height: 70px; display: flex; align-items: center; justify-content: center;">
          <img src="${imagenSrc}" style="max-width: 60px; max-height: 60px; object-fit: contain;" onerror="this.src='https://via.placeholder.com/60x60?text=No'">
        </div>
        <div style="font-weight: bold; margin-top: 8px; font-size: 12px;">${p.nombre.substring(0, 25)}</div>
        <div style="color: #7f00ff; font-weight: bold; margin: 5px 0;">RD$${p.precioVenta.toFixed(2)}</div>
        <div style="font-size: 11px; color: #666;">Stock: ${p.stock}uds</div>
      </div>
    `;
  });
  grid.innerHTML = html;
  
  document.querySelectorAll('.producto-card').forEach(card => {
    card.addEventListener('click', () => {
      const key = card.getAttribute('data-key');
      seleccionarProducto(key);
    });
  });
}

async function seleccionarProducto(key) {
  try {
    const snapshot = await get(ref(db, `inventario/${key}`));
    
    if (snapshot.exists()) {
      productoSeleccionado = {
        firebaseKey: key,
        ...snapshot.val(),
        precioVenta: snapshot.val().precioVenta || snapshot.val().precio || 0
      };
      
      document.getElementById('productoModalNombre').textContent = productoSeleccionado.nombre;
      document.getElementById('productoModalPrecio').textContent = `RD$${productoSeleccionado.precioVenta.toFixed(2)}`;
      document.getElementById('cantidadInput').value = 1;
      document.getElementById('modalCantidad').classList.remove('hidden');
    }
  } catch (error) {
    mostrarMensaje('Error al cargar producto', 'error');
  }
}

// ================= CARRITO =================
function actualizarVistaTicket() {
  const ticketItems = document.getElementById('ticketItems');
  const totalElement = document.getElementById('totalVenta');
  
  if (!ticketItems || !totalElement) return;
  
  if (carrito.length === 0) {
    ticketItems.innerHTML = `<div style="text-align: center; padding: 40px;">Agrega productos al carrito</div>`;
    totalElement.textContent = '0.00';
    return;
  }
  
  let html = '';
  let total = 0;
  
  carrito.forEach((item, index) => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;
    
    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee;">
        <div style="flex: 2;">
          <div><strong>${item.nombre}</strong></div>
          <div style="font-size: 11px; color: #666;">${item.cantidad} x RD$${item.precio.toFixed(2)}</div>
        </div>
        <div style="text-align: right;">
          <div><strong>RD$${subtotal.toFixed(2)}</strong></div>
          <div style="display: flex; gap: 5px; margin-top: 5px;">
            <button onclick="modificarCantidad(${index}, -1)" style="width: 28px; border: 1px solid #ddd; background: white; border-radius: 4px;">-</button>
            <span style="min-width: 30px; text-align: center;">${item.cantidad}</span>
            <button onclick="modificarCantidad(${index}, 1)" style="width: 28px; border: 1px solid #ddd; background: white; border-radius: 4px;">+</button>
            <button onclick="eliminarDelCarrito(${index})" style="background: none; border: none; color: #c62828;">❌</button>
          </div>
        </div>
      </div>
    `;
  });
  
  ticketItems.innerHTML = html;
  totalElement.textContent = total.toFixed(2);
}

function agregarAlCarrito() {
  if (!productoSeleccionado) {
    mostrarMensaje('Seleccione un producto', 'error');
    return;
  }
  
  const cantidad = parseInt(document.getElementById('cantidadInput').value);
  if (isNaN(cantidad) || cantidad < 1) {
    mostrarMensaje('Cantidad invalida', 'error');
    return;
  }
  
  // Verificar stock
  if (cantidad > productoSeleccionado.stock) {
    mostrarMensaje(`Stock insuficiente. Disponible: ${productoSeleccionado.stock}`, 'error');
    return;
  }
  
  const existente = carrito.find(item => item.firebaseKey === productoSeleccionado.firebaseKey);
  
  if (existente) {
    if (existente.cantidad + cantidad > productoSeleccionado.stock) {
      mostrarMensaje(`Stock insuficiente. Máximo: ${productoSeleccionado.stock - existente.cantidad}`, 'error');
      return;
    }
    existente.cantidad += cantidad;
  } else {
    carrito.push({
      firebaseKey: productoSeleccionado.firebaseKey,
      nombre: productoSeleccionado.nombre,
      precio: productoSeleccionado.precioVenta,
      cantidad: cantidad
    });
  }
  
  actualizarVistaTicket();
  cerrarModalCantidad();
  mostrarMensaje('Producto agregado', 'success');
}

function modificarCantidad(index, cambio) {
  if (index < 0 || index >= carrito.length) return;
  const nuevaCantidad = carrito[index].cantidad + cambio;
  if (nuevaCantidad < 1) {
    eliminarDelCarrito(index);
  } else {
    carrito[index].cantidad = nuevaCantidad;
    actualizarVistaTicket();
  }
}

function eliminarDelCarrito(index) {
  carrito.splice(index, 1);
  actualizarVistaTicket();
}

function limpiarCarrito() {
  if (carrito.length === 0) return;
  if (confirm('¿Limpiar todo el carrito?')) {
    carrito = [];
    actualizarVistaTicket();
  }
}

// ================= FUNCIONES DE CLIENTES =================
async function cargarClientes() {
  try {
    const snapshot = await get(ref(db, 'usuarios/clientes'));
    if (!snapshot.exists()) return;
    
    const clientesData = snapshot.val();
    let html = '';
    
    for (const key in clientesData) {
      const c = clientesData[key];
      if (c && c.usuario) {
        html += `
          <div class="cliente-item" data-id="${c.usuario}" style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;">
            <div style="font-weight: bold;">${c.nombre || ''} ${c.apellido || ''}</div>
            <div style="font-size: 11px; color: #666;">${c.telefono || 'Sin telefono'}</div>
          </div>
        `;
      }
    }
    
    const clientesLista = document.getElementById('clientesLista');
    if (clientesLista) {
      clientesLista.innerHTML = html || '<div style="padding: 20px;">No hay clientes</div>';
    }
    
    document.querySelectorAll('.cliente-item').forEach(item => {
      item.addEventListener('click', () => {
        seleccionarCliente(item.getAttribute('data-id'), item.querySelector('div:first-child').textContent);
      });
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

function seleccionarCliente(id, nombre) {
  clienteActual = { id, nombre, tipo: 'registrado' };
  const clienteNombreElem = document.getElementById('clienteNombre');
  if (clienteNombreElem) clienteNombreElem.textContent = nombre;
  cerrarModalClientes();
  mostrarMensaje(`Cliente: ${nombre}`, 'success');
}

function seleccionarClienteGeneral() {
  clienteActual = { id: 'general', nombre: 'Publico general', tipo: 'general' };
  const clienteNombreElem = document.getElementById('clienteNombre');
  if (clienteNombreElem) clienteNombreElem.textContent = 'Publico general';
  cerrarModalClientes();
}

// ================= FUNCIONES DE VENTA =================
async function guardarVenta() {
  if (carrito.length === 0) {
    mostrarMensaje('Agregue productos', 'error');
    return;
  }
  
  const esPedido = document.getElementById('pedidoDespues').checked;
  
  if (esPedido) {
    const ventaId = await guardarVentaEnFirebase('pendiente');
    if (ventaId) {
      mostrarMensaje(`Pedido #${ventaId.substring(0, 6)}`, 'success');
      limpiarDespuesDeVenta();
    }
  } else {
    abrirModalCobro();
  }
}

function abrirModalCobro() {
  const total = parseFloat(document.getElementById('totalVenta').textContent);
  if (total <= 0) {
    mostrarMensaje('No hay productos', 'error');
    return;
  }
  const totalCobroElem = document.getElementById('totalCobro');
  if (totalCobroElem) totalCobroElem.textContent = total.toFixed(2);
  const efectivoRecibidoElem = document.getElementById('efectivoRecibido');
  if (efectivoRecibidoElem) efectivoRecibidoElem.value = '';
  const cambioInfoElem = document.getElementById('cambioInfo');
  if (cambioInfoElem) cambioInfoElem.textContent = 'Cambio: RD$0.00';
  const modalCobro = document.getElementById('modalCobro');
  if (modalCobro) modalCobro.classList.remove('hidden');
}

async function finalizarCobro() {
  if (carrito.length === 0) {
    mostrarMensaje('No hay productos', 'error');
    return;
  }
  
  const metodoPago = document.querySelector('input[name="metodoPago"]:checked');
  if (!metodoPago) {
    mostrarMensaje('Seleccione metodo de pago', 'error');
    return;
  }
  
  const total = parseFloat(document.getElementById('totalVenta').textContent);
  
  if (metodoPago.value === 'efectivo') {
    const efectivo = parseFloat(document.getElementById('efectivoRecibido').value) || 0;
    if (efectivo < total) {
      mostrarMensaje('Monto insuficiente', 'error');
      return;
    }
  }
  
  const esPedido = document.getElementById('pedidoDespues').checked;
  const ventaId = await guardarVentaEnFirebase('completada');
  
  if (ventaId) {
    if (!esPedido) await actualizarStock();
    else await crearPedidoPagado(ventaId);
    
    imprimirTicket(ventaId);
    limpiarDespuesDeVenta();
    cerrarModalCobro();
    mostrarMensaje(`Venta #${ventaId.substring(0, 6)} completada`, 'success');
  }
}

function limpiarDespuesDeVenta() {
  carrito = [];
  actualizarVistaTicket();
  const pedidoDespues = document.getElementById('pedidoDespues');
  if (pedidoDespues) pedidoDespues.checked = false;
  const comentarioPedido = document.getElementById('comentarioPedido');
  if (comentarioPedido) comentarioPedido.value = '';
  const comentarioContainer = document.getElementById('comentarioContainer');
  if (comentarioContainer) comentarioContainer.style.display = 'none';
}

async function guardarVentaEnFirebase(estado) {
  try {
    const total = parseFloat(document.getElementById('totalVenta').textContent);
    const metodoPago = document.querySelector('input[name="metodoPago"]:checked')?.value || 'efectivo';
    const esPedido = document.getElementById('pedidoDespues').checked;
    const fecha = obtenerFechaHoraRD();
    
    const ventaData = {
      fecha: fecha.iso,
      fechaHora: fecha.completa,
      cliente: clienteActual,
      productos: carrito.map(item => ({
        nombre: item.nombre,
        precio: item.precio,
        cantidad: item.cantidad,
        subtotal: item.precio * item.cantidad
      })),
      total: total,
      estado: estado,
      vendedor: vendedorNombre,
      metodoPago: metodoPago,
      esPedido: esPedido
    };
    
    const ruta = (esPedido && estado === 'pendiente') ? 'pedidosPendientes' : 'ventas';
    const refVenta = await push(ref(db, ruta), ventaData);
    return refVenta.key;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

async function crearPedidoPagado(ventaId) {
  const esPedido = document.getElementById('pedidoDespues').checked;
  if (!esPedido) return;
  
  const total = parseFloat(document.getElementById('totalVenta').textContent);
  const fecha = obtenerFechaHoraRD();
  
  await push(ref(db, 'pedidosPendientes'), {
    fecha: fecha.iso,
    fechaHora: fecha.completa,
    cliente: clienteActual,
    productos: carrito.map(item => ({
      nombre: item.nombre,
      precio: item.precio,
      cantidad: item.cantidad,
      subtotal: item.precio * item.cantidad
    })),
    total: total,
    estado: 'recibido',
    vendedor: vendedorNombre,
    pagado: true
  });
}

async function actualizarStock() {
  for (const item of carrito) {
    const snapshot = await get(ref(db, `inventario/${item.firebaseKey}`));
    if (snapshot.exists()) {
      const nuevoStock = snapshot.val().stock - item.cantidad;
      await update(ref(db, `inventario/${item.firebaseKey}`), { stock: nuevoStock });
    }
  }
  setTimeout(() => cargarProductos(), 1000);
}

// ================= TICKET CORREGIDO =================
function imprimirTicket(ventaId = '') {
    if (carrito.length === 0 && !ventaId) {
        mostrarMensaje('No hay productos', 'error');
        return;
    }

    const total = parseFloat(document.getElementById('totalVenta').textContent);
    const esPedido = document.getElementById('pedidoDespues').checked;
    const fecha = obtenerFechaHoraRD();
    const metodoPago = document.querySelector('input[name="metodoPago"]:checked')?.value || 'efectivo';
    const efectivo = parseFloat(document.getElementById('efectivoRecibido')?.value || 0);
    const cambio = metodoPago === 'efectivo' ? efectivo - total : 0;
    const comentario = document.getElementById('comentarioPedido')?.value || '';
    const vendedorNombreLocal = sessionStorage.getItem('nombreUsuario') || 'Administrador';

    let ticket = '';

    ticket += '='.repeat(32) + '\n';
    ticket += '      IMPRESIONES WJS\n';
    ticket += '='.repeat(32) + '\n';
    ticket += 'Calle piragua #152, SDE,\n';
    ticket += 'SEGUNDO NIVEL BANCAS KIKO,\n';
    ticket += 'Tel: 829-818-6772\n\n';
    ticket += '-'.repeat(32) + '\n';
    ticket += `Fecha: ${fecha.completa}\n`;
    ticket += `Pedido: ${ventaId || 'VENTA-' + Date.now().toString().slice(-6)}\n`;
    ticket += `Vendedor: ${vendedorNombreLocal}\n`;
    ticket += `Cliente: ${clienteActual.nombre}\n`;
    ticket += '-'.repeat(32) + '\n';
    ticket += '\n';
    ticket += 'Cant  Producto          Importe\n';
    ticket += '-'.repeat(32) + '\n';

    const productosLista = carrito.length > 0 ? carrito : (ventaSeleccionadaAnular?.productos || []);

    productosLista.forEach(item => {
        const nombre = (item.nombre || 'Producto').substring(0, 18);
        const cantidad = (item.cantidad || 0).toFixed(2);
        const subtotal = (item.precio || 0) * (item.cantidad || 0);
        const importe = `RD$${subtotal.toFixed(2)}`;

        ticket += `${cantidad.padStart(4)}  ${nombre.padEnd(18)} ${importe.padStart(10)}\n`;
    });

    ticket += '-'.repeat(32) + '\n';
    ticket += `${'TOTAL:'.padStart(22)} RD$${total.toFixed(2).padStart(10)}\n`;
    ticket += '-'.repeat(32) + '\n';
    ticket += `Pago: ${metodoPago.toUpperCase()}\n`;

    if (metodoPago === 'efectivo') {
        ticket += `Efectivo: RD$${efectivo.toFixed(2)}\n`;
        ticket += `Cambio: RD$${cambio.toFixed(2)}\n`;
        ticket += '-'.repeat(32) + '\n';
    }

    if (esPedido) {
        ticket += '   *** PEDIDO PENDIENTE ***\n';
        ticket += '-'.repeat(32) + '\n';
        ticket += `Pendiente de cobro: RD$${total.toFixed(2)}\n`;
        ticket += '-'.repeat(32) + '\n';
    }

    if (comentario) {
        ticket += `Comentario: ${comentario.substring(0, 28)}\n`;
        ticket += '-'.repeat(32) + '\n';
    }

    ticket += '='.repeat(32) + '\n';
    ticket += '   ¡GRACIAS POR SU COMPRA!\n';
    ticket += '       VUELVA PRONTO\n';
    ticket += '='.repeat(32) + '\n';
    ticket += '\n\n\n';

    const estiloTicket = `
        <style>
            @page { margin: 0; size: 80mm auto; }
            body { 
                margin: 0; 
                padding: 8px 4px; 
                background: white; 
                font-family: 'Courier New', monospace; 
            }
            pre { 
                margin: 0; 
                padding: 0; 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                font-weight: bold; 
                line-height: 1.3; 
                white-space: pre-wrap; 
                text-align: left;
            }
            @media print { 
                body { margin: 0; padding: 0; } 
                pre { 
                    font-size: 13px; 
                    font-weight: bold; 
                } 
            }
        </style>
    `;

    const impresoraGuardada = localStorage.getItem('impresoraPredeterminada');
    
    if (impresoraGuardada) {
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
                <title>Imprimiendo Ticket</title>
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
        mostrarMensaje('🖨️ Ticket enviado a impresión', 'success');
    } else {
        mostrarVistaPreviaTicket(ticket);
    }
}

function mostrarVistaPreviaTicket(ticket) {
    const ventana = window.open('', '_blank', 'width=450,height=650');
    
    ventana.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Ticket - Impresiones WJS</title>
            <style>
                @page { margin: 0; size: 80mm auto; }
                @media print { .btn-container { display: none; } }
                
                body {
                    margin: 0;
                    padding: 20px 0;
                    background: #e0e0e0;
                    display: flex;
                    justify-content: center;
                }
                
                .btn-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    background: white;
                    padding: 10px;
                    text-align: center;
                    z-index: 100;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                }
                
                button {
                    padding: 8px 15px;
                    margin: 0 5px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .btn-print { background: #7f00ff; color: white; }
                .btn-config { background: #ff9800; color: white; }
                .btn-close { background: #666; color: white; }
                
                .ticket {
                    background: white;
                    margin: 70px auto 20px auto;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                    width: auto;
                    display: inline-block;
                }
                
                pre {
                    margin: 0;
                    padding: 12px;
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.3;
                    white-space: pre-wrap;
                    text-align: left;
                    font-weight: bold;
                }
            </style>
        </head>
        
        <body>
            <div class="btn-container">
                <button class="btn-print" onclick="window.print();">🖨️ IMPRIMIR</button>
                <button class="btn-config" onclick="if(window.opener)window.opener.guardarImpresoraPredeterminada();alert('Impresora configurada');">⚙️ CONFIGURAR</button>
                <button class="btn-close" onclick="window.close();">❌ CERRAR</button>
            </div>
            
            <div class="ticket">
                <pre>${ticket}</pre>
            </div>
        </body>
        </html>
    `);
    
    ventana.document.close();
}

// ================= FUNCIONES DE ANULACION =================
async function mostrarVentasParaAnular() {
  try {
    const snapshot = await get(ref(db, 'ventas'));
    if (!snapshot.exists()) {
      mostrarMensaje('No hay ventas', 'info');
      return;
    }
    
    ventasParaAnular = [];
    const data = snapshot.val();
    for (const key in data) {
      if (data[key].estado === 'completada') {
        ventasParaAnular.push({ id: key, ...data[key] });
      }
    }
    
    const listaVentasAnular = document.getElementById('listaVentasAnular');
    if (listaVentasAnular) {
      renderVentasParaAnular();
    }
    const modalAnularVentas = document.getElementById('modalAnularVentas');
    if (modalAnularVentas) modalAnularVentas.classList.remove('hidden');
  } catch (error) {
    mostrarMensaje('Error cargando ventas', 'error');
  }
}

function renderVentasParaAnular() {
  const lista = document.getElementById('listaVentasAnular');
  if (!lista) return;
  
  if (ventasParaAnular.length === 0) {
    lista.innerHTML = '<div style="padding: 20px; text-align: center;">No hay ventas</div>';
    return;
  }
  
  let html = '';
  ventasParaAnular.forEach(v => {
    html += `
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 10px; margin-bottom: 10px;">
        <div><strong>#${v.id.substring(0, 6)}</strong> - ${v.fechaHora || 'Sin fecha'}</div>
        <div>${v.cliente?.nombre || 'Sin cliente'} - RD$${v.total?.toFixed(2) || '0'}</div>
        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <button onclick="verDetallesVenta('${v.id}')" style="flex:1; padding: 5px; background: #7f00ff; color: white; border: none; border-radius: 4px;">Ver</button>
          <button onclick="confirmarAnularVenta('${v.id}')" style="flex:1; padding: 5px; background: #dc3545; color: white; border: none; border-radius: 4px;">Anular</button>
        </div>
      </div>
    `;
  });
  lista.innerHTML = html;
}

function verDetallesVenta(ventaId) {
  const venta = ventasParaAnular.find(v => v.id === ventaId);
  if (!venta) return;
  
  ventaSeleccionadaAnular = venta;
  const detalleVentaId = document.getElementById('detalleVentaId');
  if (detalleVentaId) detalleVentaId.textContent = `#${venta.id.substring(0, 6)}`;
  const detalleVentaFecha = document.getElementById('detalleVentaFecha');
  if (detalleVentaFecha) detalleVentaFecha.textContent = venta.fechaHora || 'Sin fecha';
  const detalleVentaCliente = document.getElementById('detalleVentaCliente');
  if (detalleVentaCliente) detalleVentaCliente.textContent = venta.cliente?.nombre || 'Sin cliente';
  const detalleVentaTotal = document.getElementById('detalleVentaTotal');
  if (detalleVentaTotal) detalleVentaTotal.textContent = `RD$${venta.total?.toFixed(2) || '0.00'}`;
  
  let prodHtml = '';
  if (venta.productos) {
    venta.productos.forEach(p => {
      prodHtml += `<div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee;"><span>${p.nombre}</span><span>${p.cantidad} x RD$${p.precio?.toFixed(2)} = RD$${p.subtotal?.toFixed(2)}</span></div>`;
    });
  }
  const detalleVentaProductos = document.getElementById('detalleVentaProductos');
  if (detalleVentaProductos) detalleVentaProductos.innerHTML = prodHtml;
  const modalDetallesVenta = document.getElementById('modalDetallesVenta');
  if (modalDetallesVenta) modalDetallesVenta.classList.remove('hidden');
}

function confirmarAnularVenta(ventaId) {
  const venta = ventasParaAnular.find(v => v.id === ventaId);
  if (!venta) return;
  ventaSeleccionadaAnular = venta;
  const confirmacionAnularTexto = document.getElementById('confirmacionAnularTexto');
  if (confirmacionAnularTexto) confirmacionAnularTexto.textContent = `¿Anular venta #${venta.id.substring(0, 6)} por RD$${venta.total?.toFixed(2)}?`;
  const modalConfirmarAnular = document.getElementById('modalConfirmarAnular');
  if (modalConfirmarAnular) modalConfirmarAnular.classList.remove('hidden');
}

async function anularVenta() {
  if (!ventaSeleccionadaAnular) return;
  
  try {
    const motivo = document.getElementById('motivoAnulacion').value || 'Sin motivo';
    await update(ref(db, `ventas/${ventaSeleccionadaAnular.id}`), {
      estado: 'anulado',
      motivoAnulacion: motivo,
      fechaAnulacion: obtenerFechaHoraRD().iso
    });
    
    mostrarMensaje('Venta anulada', 'success');
    cerrarModalConfirmarAnular();
    cerrarModalDetallesVenta();
    await mostrarVentasParaAnular();
  } catch (error) {
    mostrarMensaje('Error al anular', 'error');
  }
}

// ================= FUNCIONES AUXILIARES =================
function mostrarMensaje(mensaje, tipo = 'info') {
  const div = document.createElement('div');
  div.textContent = mensaje;
  div.style.cssText = `position: fixed; bottom: 20px; right: 20px; background: ${tipo === 'success' ? '#28a745' : tipo === 'error' ? '#dc3545' : '#7f00ff'}; color: white; padding: 10px 15px; border-radius: 8px; z-index: 9999; animation: slideIn 0.3s;`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

function calcularCambio() {
  const total = parseFloat(document.getElementById('totalCobro')?.textContent || 0);
  const recibido = parseFloat(document.getElementById('efectivoRecibido')?.value || 0);
  const cambio = recibido - total;
  const el = document.getElementById('cambioInfo');
  if (el) el.textContent = cambio >= 0 ? `Cambio: RD$${cambio.toFixed(2)}` : `Faltan: RD$${Math.abs(cambio).toFixed(2)}`;
}

// ================= MODALES =================
function cerrarModalCantidad() { 
  const modal = document.getElementById('modalCantidad');
  if (modal) modal.classList.add('hidden');
  productoSeleccionado = null;
}
function cerrarModalClientes() { 
  const modal = document.getElementById('modalClientes');
  if (modal) modal.classList.add('hidden');
}
function cerrarModalCobro() { 
  const modal = document.getElementById('modalCobro');
  if (modal) modal.classList.add('hidden');
}
function cerrarModalAnularVentas() { 
  const modal = document.getElementById('modalAnularVentas');
  if (modal) modal.classList.add('hidden');
  ventasParaAnular = [];
  ventaSeleccionadaAnular = null;
}
function cerrarModalDetallesVenta() { 
  const modal = document.getElementById('modalDetallesVenta');
  if (modal) modal.classList.add('hidden');
}
function cerrarModalConfirmarAnular() { 
  const modal = document.getElementById('modalConfirmarAnular');
  if (modal) modal.classList.add('hidden');
  const motivo = document.getElementById('motivoAnulacion');
  if (motivo) motivo.value = '';
}

// ================= EVENT LISTENERS =================
function configurarEventListeners() {
  const btnSeleccionarCliente = document.getElementById('btnSeleccionarCliente');
  if (btnSeleccionarCliente) {
    btnSeleccionarCliente.addEventListener('click', () => {
      const modal = document.getElementById('modalClientes');
      if (modal) modal.classList.remove('hidden');
    });
  }
  
  const btnCambiarCliente = document.getElementById('btnCambiarCliente');
  if (btnCambiarCliente) {
    btnCambiarCliente.addEventListener('click', () => {
      const modal = document.getElementById('modalClientes');
      if (modal) modal.classList.remove('hidden');
    });
  }
  
  const btnCerrarClientes = document.getElementById('btnCerrarClientes');
  if (btnCerrarClientes) btnCerrarClientes.addEventListener('click', cerrarModalClientes);
  
  const btnClienteGeneral = document.getElementById('btnClienteGeneral');
  if (btnClienteGeneral) btnClienteGeneral.addEventListener('click', seleccionarClienteGeneral);
  
  const btnDisminuirCantidad = document.getElementById('btnDisminuirCantidad');
  if (btnDisminuirCantidad) {
    btnDisminuirCantidad.addEventListener('click', () => { 
      let i = document.getElementById('cantidadInput'); 
      if(i && parseInt(i.value)>1) i.value = parseInt(i.value)-1; 
    });
  }
  
  const btnAumentarCantidad = document.getElementById('btnAumentarCantidad');
  if (btnAumentarCantidad) {
    btnAumentarCantidad.addEventListener('click', () => { 
      let i = document.getElementById('cantidadInput'); 
      if(i) i.value = parseInt(i.value)+1; 
    });
  }
  
  const btnCancelarCantidad = document.getElementById('btnCancelarCantidad');
  if (btnCancelarCantidad) btnCancelarCantidad.addEventListener('click', cerrarModalCantidad);
  
  const btnConfirmarCantidad = document.getElementById('btnConfirmarCantidad');
  if (btnConfirmarCantidad) btnConfirmarCantidad.addEventListener('click', agregarAlCarrito);
  
  const btnLimpiarTicket = document.getElementById('btnLimpiarTicket');
  if (btnLimpiarTicket) btnLimpiarTicket.addEventListener('click', limpiarCarrito);
  
  const btnGuardarVenta = document.getElementById('btnGuardarVenta');
  if (btnGuardarVenta) btnGuardarVenta.addEventListener('click', guardarVenta);
  
  const btnCobrarVenta = document.getElementById('btnCobrarVenta');
  if (btnCobrarVenta) btnCobrarVenta.addEventListener('click', abrirModalCobro);
  
  const btnAnularVenta = document.getElementById('btnAnularVenta');
  if (btnAnularVenta) btnAnularVenta.addEventListener('click', mostrarVentasParaAnular);
  
  const btnConfigurarImpresora = document.getElementById('btnConfigurarImpresora');
  if (btnConfigurarImpresora) btnConfigurarImpresora.addEventListener('click', guardarImpresoraPredeterminada);
  
  const btnImprimirTicket = document.getElementById('btnImprimirTicket');
  if (btnImprimirTicket) btnImprimirTicket.addEventListener('click', () => imprimirTicket());
  
  const pedidoDespues = document.getElementById('pedidoDespues');
  if (pedidoDespues) {
    pedidoDespues.addEventListener('change', function() { 
      const comentarioContainer = document.getElementById('comentarioContainer');
      if (comentarioContainer) comentarioContainer.style.display = this.checked ? 'block' : 'none'; 
    });
  }
  
  const btnCancelarCobro = document.getElementById('btnCancelarCobro');
  if (btnCancelarCobro) btnCancelarCobro.addEventListener('click', cerrarModalCobro);
  
  const btnFinalizarCobro = document.getElementById('btnFinalizarCobro');
  if (btnFinalizarCobro) btnFinalizarCobro.addEventListener('click', finalizarCobro);
  
  const efectivoRecibido = document.getElementById('efectivoRecibido');
  if (efectivoRecibido) efectivoRecibido.addEventListener('input', calcularCambio);
  
  const btnCerrarAnularVentas = document.getElementById('btnCerrarAnularVentas');
  if (btnCerrarAnularVentas) btnCerrarAnularVentas.addEventListener('click', cerrarModalAnularVentas);
  
  const btnCerrarDetallesVenta = document.getElementById('btnCerrarDetallesVenta');
  if (btnCerrarDetallesVenta) btnCerrarDetallesVenta.addEventListener('click', cerrarModalDetallesVenta);
  
  const btnCancelarAnular = document.getElementById('btnCancelarAnular');
  if (btnCancelarAnular) btnCancelarAnular.addEventListener('click', cerrarModalConfirmarAnular);
  
  const btnConfirmarAnular = document.getElementById('btnConfirmarAnular');
  if (btnConfirmarAnular) btnConfirmarAnular.addEventListener('click', anularVenta);
  
  // 🟢 BUSCADOR CORREGIDO
  const buscarProductoInput = document.getElementById('buscarProducto');
  if (buscarProductoInput) {
    buscarProductoInput.addEventListener('input', buscarProductos);
    buscarProductoInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        buscarProductos();
      }
    });
  }
  
  const filtroCategoria = document.getElementById('filtroCategoria');
  if (filtroCategoria) filtroCategoria.addEventListener('change', buscarProductos);
  
  const buscarCliente = document.getElementById('buscarCliente');
  if (buscarCliente) {
    buscarCliente.addEventListener('input', function() {
      const busqueda = this.value.toLowerCase();
      document.querySelectorAll('.cliente-item').forEach(c => {
        c.style.display = c.textContent.toLowerCase().includes(busqueda) ? 'flex' : 'none';
      });
    });
  }
  
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => { if(e.target === modal) modal.classList.add('hidden'); });
  });
}

// ================= EXPORTAR =================
window.modificarCantidad = modificarCantidad;
window.eliminarDelCarrito = eliminarDelCarrito;
window.verDetallesVenta = verDetallesVenta;
window.confirmarAnularVenta = confirmarAnularVenta;
window.guardarImpresoraPredeterminada = guardarImpresoraPredeterminada;
window.buscarProductos = buscarProductos;

console.log('✅ Modulo de ventas listo');