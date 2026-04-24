// ================= FIREBASE =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getDatabase,
    ref,
    get,
    update,
    remove,
    onValue,
    set,
    push
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
let pedidos = [];
let pedidoSeleccionado = null;
let pedidosListener = null;
let filtrosActivos = {
    busqueda: '',
    estado: '',
    fecha: '',
    ubicacion: ''
};

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Sistema de pedidos cargado');
    inicializarApp();
});

async function inicializarApp() {
    try {
        configurarEventListeners();
        iniciarEscuchaPedidos();
        console.log('App de pedidos inicializada correctamente');
    } catch (error) {
        console.error('Error al inicializar app:', error);
        mostrarMensaje('Error al cargar pedidos: ' + error.message, 'error');
    }
}

// ================= FUNCIONES DE ESCUCHA EN TIEMPO REAL =================
function iniciarEscuchaPedidos() {
    console.log('Iniciando escucha en tiempo real de pedidos...');
    
    const pedidosRef = ref(db, 'pedidosPendientes');
    
    if (pedidosListener) {
        pedidosListener();
    }
    
    pedidosListener = onValue(pedidosRef, (snapshot) => {
        procesarPedidos(snapshot);
    }, (error) => {
        console.error('Error en escucha de pedidos:', error);
        mostrarMensaje('Error en conexión con Firebase', 'error');
    });
}

function procesarPedidos(snapshot) {
    pedidos = [];
    
    if (snapshot.exists()) {
        const pedidosData = snapshot.val();
        
        for (const key in pedidosData) {
            const pedido = pedidosData[key];
            
            const shouldInclude = pedido.estado !== 'completado';
            
            if (shouldInclude) {
                let fechaFormateada = 'Fecha no disponible';
                try {
                    if (pedido.fecha) {
                        fechaFormateada = new Date(pedido.fecha).toLocaleDateString('es-DO', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                } catch (e) {
                    console.error('Error formateando fecha:', e);
                }
                
                pedidos.push({
                    firebaseKey: key,
                    id: key,
                    ...pedido,
                    fechaFormateada: fechaFormateada
                });
            }
        }
        
        console.log(`Pedidos cargados: ${pedidos.length}`);
        actualizarEstadisticas();
        aplicarFiltros();
    } else {
        console.log('No hay pedidos pendientes');
        mostrarListaVacia();
        actualizarEstadisticas();
    }
}

// ================= FUNCIONES DE ESTADO =================
function getEstadoTexto(estado) {
    const estados = {
        'recibido': 'Recibido',
        'proceso': 'En proceso',
        'revision': 'En revisión',
        'disponible': 'Disponible',
        'entregado': 'Entregado',
        'completado': 'Completado'
    };
    return estados[estado] || estado;
}

function getEstadoIcono(estado) {
    const iconos = {
        'recibido': 'fa-inbox',
        'proceso': 'fa-print',
        'revision': 'fa-eye',
        'disponible': 'fa-box-open',
        'entregado': 'fa-check-circle',
        'completado': 'fa-check-double'
    };
    return iconos[estado] || 'fa-clock';
}

function getUbicacionTexto(ubicacion) {
    const ubicaciones = {
        'wjs': '🏢 Impresiones WJS',
        'kiko': '🏠 Casa de Kiko',
        'banca': '🏪 La Banca',
        'despacho': '🚚 Para despacho'
    };
    return ubicaciones[ubicacion] || ubicacion || 'No especificada';
}

function getProgresoEstado(estado) {
    const progresos = {
        'recibido': 20,
        'proceso': 40,
        'revision': 60,
        'disponible': 80,
        'entregado': 100,
        'completado': 100
    };
    return progresos[estado] || 0;
}

// ================= FUNCIONES DE ESTADÍSTICAS =================
function actualizarEstadisticas() {
    const stats = {
        recibidos: 0,
        proceso: 0,
        revision: 0,
        disponibles: 0,
        pagados: 0,
        pendientesPago: 0
    };
    
    pedidos.forEach(pedido => {
        if (pedido.estado === 'recibido') stats.recibidos++;
        if (pedido.estado === 'proceso') stats.proceso++;
        if (pedido.estado === 'revision') stats.revision++;
        if (pedido.estado === 'disponible') stats.disponibles++;
        
        if (pedido.pagado === true) stats.pagados++;
        if (pedido.pagado === false || pedido.pagado === undefined) stats.pendientesPago++;
    });
    
    actualizarStatElement('statRecibidos', stats.recibidos);
    actualizarStatElement('statProceso', stats.proceso);
    actualizarStatElement('statRevision', stats.revision);
    actualizarStatElement('statDisponibles', stats.disponibles);
    actualizarStatElement('statPagados', stats.pagados);
    actualizarStatElement('statPendientesPago', stats.pendientesPago);
}

function actualizarStatElement(statId, valor) {
    const statCard = document.getElementById(statId);
    if (statCard) {
        const h3 = statCard.querySelector('h3');
        if (h3) h3.textContent = valor;
    }
}

// ================= FUNCIONES DE FILTROS =================
function aplicarFiltros() {
    let pedidosFiltrados = [...pedidos];
    
    if (filtrosActivos.busqueda) {
        const busqueda = filtrosActivos.busqueda.toLowerCase();
        pedidosFiltrados = pedidosFiltrados.filter(pedido => {
            const idMatch = pedido.id && pedido.id.toLowerCase().includes(busqueda);
            const clienteMatch = pedido.cliente && pedido.cliente.nombre && 
                               pedido.cliente.nombre.toLowerCase().includes(busqueda);
            const productoMatch = pedido.productos && pedido.productos.some(p => 
                p && p.nombre && p.nombre.toLowerCase().includes(busqueda)
            );
            return idMatch || clienteMatch || productoMatch;
        });
    }
    
    if (filtrosActivos.estado) {
        pedidosFiltrados = pedidosFiltrados.filter(pedido => 
            pedido.estado === filtrosActivos.estado
        );
    }
    
    if (filtrosActivos.ubicacion) {
        pedidosFiltrados = pedidosFiltrados.filter(pedido => 
            pedido.ubicacion === filtrosActivos.ubicacion
        );
    }
    
    if (filtrosActivos.fecha) {
        pedidosFiltrados = filtrarPorFecha(pedidosFiltrados, filtrosActivos.fecha);
    }
    
    const totalElement = document.getElementById('totalPedidos');
    if (totalElement) {
        totalElement.textContent = `${pedidosFiltrados.length} pedidos encontrados`;
    }
    
    renderPedidos(pedidosFiltrados);
}

function filtrarPorFecha(pedidosLista, filtroFecha) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    
    return pedidosLista.filter(pedido => {
        if (!pedido.fecha) return false;
        
        try {
            const fechaPedido = new Date(pedido.fecha);
            fechaPedido.setHours(0, 0, 0, 0);
            
            switch (filtroFecha) {
                case 'hoy':
                    return fechaPedido.getTime() === hoy.getTime();
                case 'ayer':
                    return fechaPedido.getTime() === ayer.getTime();
                case 'semana':
                    return fechaPedido >= inicioSemana;
                case 'mes':
                    return fechaPedido.getMonth() === hoy.getMonth() && 
                           fechaPedido.getFullYear() === hoy.getFullYear();
                default:
                    return true;
            }
        } catch (e) {
            console.error('Error filtrando por fecha:', e);
            return false;
        }
    });
}

// ================= FUNCIONES DE RENDERIZADO =================
function renderPedidos(pedidosLista) {
    const lista = document.getElementById('pedidosLista');
    if (!lista) return;
    
    if (pedidosLista.length === 0) {
        mostrarListaVacia();
        return;
    }
    
    let html = '';
    
    pedidosLista.forEach(pedido => {
        try {
            html += renderPedidoCard(pedido);
        } catch (e) {
            console.error('Error renderizando pedido:', e, pedido);
        }
    });
    
    lista.innerHTML = html;
    configurarEventListenersPedidos();
}

function renderPedidoCard(pedido) {
    const total = calcularTotalPedido(pedido);
    const estadoClass = `estado-${pedido.estado || 'recibido'}`;
    const estadoTexto = getEstadoTexto(pedido.estado);
    const estadoIcono = getEstadoIcono(pedido.estado);
    
    const esDespacho = pedido.paraDespacho === true || 
                      pedido.tipo === 'despacho' || 
                      pedido.ubicacion === 'despacho';
    
    const estaPagado = pedido.pagado === true;
    const textoPago = estaPagado ? 'Pagado' : 'Pendiente de pago';
    const clasePago = estaPagado ? 'estado-pagado' : 'estado-pendiente';
    const iconoPago = estaPagado ? 'fa-check-circle' : 'fa-clock';
    
    const metodoPago = pedido.metodoPago === 'transferencia' ? 'Transferencia' : 
                      pedido.metodoPago === 'efectivo' ? 'Efectivo' : 'No especificado';
    
    return `
        <div class="pedido-card" data-id="${pedido.firebaseKey || pedido.id}">
            <div class="pedido-header">
                <div class="pedido-info">
                    <div class="pedido-id">
                        <i class="fa-solid fa-receipt"></i>
                        Pedido #${(pedido.id || pedido.firebaseKey || '').substring(0, 8)}
                        <span class="badge-pago ${clasePago}">
                            <i class="fa-solid ${iconoPago}"></i>
                            ${textoPago}
                        </span>
                        ${esDespacho ? '<span class="badge-despacho"><i class="fa-solid fa-truck"></i> Despacho</span>' : ''}
                    </div>
                    <div class="pedido-cliente">
                        <i class="fa-solid fa-user"></i>
                        ${pedido.cliente?.nombre || 'Sin nombre'}
                    </div>
                    <div style="font-size: 12px; color: #666; margin-top: 5px;">
                        <i class="fa-solid fa-credit-card"></i> ${metodoPago}
                    </div>
                </div>
                <div class="pedido-estado">
                    <span class="estado-badge ${estadoClass}">
                        <i class="fa-solid ${estadoIcono}"></i>
                        ${estadoTexto}
                    </span>
                    ${pedido.ubicacion ? renderUbicacionBadge(pedido.ubicacion) : ''}
                    <button class="btn-expandir">
                        <i class="fa-solid fa-chevron-down"></i>
                    </button>
                </div>
            </div>
            
            <div class="pedido-detalles">
                <div class="detalles-grid">
                    <div class="detalle-item">
                        <span class="detalle-label">ID Cliente</span>
                        <span class="detalle-value">${pedido.cliente?.id || 'N/A'}</span>
                    </div>
                    <div class="detalle-item">
                        <span class="detalle-label">Fecha</span>
                        <span class="detalle-value">${pedido.fechaFormateada || 'N/A'}</span>
                    </div>
                    <div class="detalle-item">
                        <span class="detalle-label">Vendedor</span>
                        <span class="detalle-value">${pedido.vendedor || 'N/A'}</span>
                    </div>
                    <div class="detalle-item">
                        <span class="detalle-label">Total</span>
                        <span class="detalle-value">RD$ ${total.toFixed(2)}</span>
                    </div>
                    <div class="detalle-item">
                        <span class="detalle-label">Estado de pago</span>
                        <span class="detalle-value ${clasePago}">
                            <i class="fa-solid ${iconoPago}"></i>
                            ${textoPago}
                        </span>
                    </div>
                </div>
                
                ${renderProductosSeccion(pedido)}
                
                <div class="pedido-total">
                    TOTAL: RD$ ${total.toFixed(2)}
                </div>
                
                <div class="pedido-acciones">
                    ${renderAccionesPedido(pedido, estaPagado)}
                </div>
            </div>
        </div>
    `;
}

function renderUbicacionBadge(ubicacion) {
    let icono = 'fa-location-dot';
    let texto = getUbicacionTexto(ubicacion);
    
    switch(ubicacion) {
        case 'wjs':
            icono = 'fa-store';
            break;
        case 'kiko':
            icono = 'fa-home';
            break;
        case 'banca':
            icono = 'fa-building';
            break;
        case 'despacho':
            icono = 'fa-truck';
            break;
    }
    
    return `<span class="ubicacion-info">
        <i class="fa-solid ${icono}"></i> ${texto}
    </span>`;
}

function renderProductosSeccion(pedido) {
    if (!pedido.productos || pedido.productos.length === 0) {
        return '<div class="pedido-productos">No hay productos en este pedido</div>';
    }
    
    return `
        <div class="pedido-productos">
            <div class="productos-header">
                <h4><i class="fa-solid fa-boxes"></i> Productos (${pedido.productos.length})</h4>
                <button class="btn-expandir-productos">
                    <i class="fa-solid fa-chevron-down"></i>
                </button>
            </div>
            <div class="productos-lista">
                ${pedido.productos.map(producto => renderProductoItem(producto)).join('')}
            </div>
        </div>
    `;
}

function renderProductoItem(producto) {
    const cantidad = producto.cantidad || 0;
    const precio = producto.precio || 0;
    const subtotal = cantidad * precio;
    
    return `
        <div class="producto-item">
            <span class="producto-nombre">${producto.nombre || 'Producto'}</span>
            <span class="producto-cantidad">${cantidad} uds</span>
            <span class="producto-precio-unit">RD$ ${precio.toFixed(2)} c/u</span>
            <span class="producto-subtotal">RD$ ${subtotal.toFixed(2)}</span>
        </div>
    `;
}

function renderAccionesPedido(pedido, estaPagado) {
    const pedidoId = pedido.firebaseKey || pedido.id;
    
    let acciones = `
        <button class="btn-accion btn-detalles" data-id="${pedidoId}">
            <i class="fa-solid fa-eye"></i> Ver Detalles
        </button>
        <button class="btn-accion btn-estado" data-id="${pedidoId}">
            <i class="fa-solid fa-exchange-alt"></i> Cambiar Estado
        </button>
    `;
    
    if (!estaPagado) {
        acciones += `
            <button class="btn-accion btn-validar-transferencia" data-id="${pedidoId}">
                <i class="fa-solid fa-money-check"></i> Validar Transferencia
            </button>
            <button class="btn-accion btn-pagar" data-id="${pedidoId}">
                <i class="fa-solid fa-check-circle"></i> Marcar Pagado
            </button>
        `;
    } else {
        acciones += `
            <button class="btn-accion btn-marcar-pendiente" data-id="${pedidoId}">
                <i class="fa-solid fa-clock"></i> Marcar Pendiente
            </button>
        `;
    }
    
    acciones += `
        <button class="btn-accion btn-eliminar" data-id="${pedidoId}">
            <i class="fa-solid fa-trash"></i> Eliminar
        </button>
    `;
    
    return acciones;
}

function calcularTotalPedido(pedido) {
    if (!pedido.productos) return 0;
    return pedido.productos.reduce((sum, p) => {
        const precio = p.precio || 0;
        const cantidad = p.cantidad || 0;
        return sum + (precio * cantidad);
    }, 0);
}

function mostrarListaVacia() {
    const lista = document.getElementById('pedidosLista');
    if (lista) {
        lista.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-clipboard-list"></i>
                <h3>No hay pedidos pendientes</h3>
                <p>Todos los pedidos están completados o no hay pedidos registrados</p>
            </div>
        `;
    }
}

// ================= 🟢 FUNCIONES DE PAGO CON TICKET Y VENTA =================
async function marcarComoPagado(pedidoId) {
    if (!pedidoId) {
        mostrarMensaje('ID de pedido no válido', 'error');
        return;
    }
    
    try {
        const pedido = pedidos.find(p => p.firebaseKey === pedidoId || p.id === pedidoId);
        if (!pedido) {
            mostrarMensaje('Pedido no encontrado', 'error');
            return;
        }
        
        // Marcar como pagado en Firebase
        const updates = {
            [`pedidosPendientes/${pedidoId}/pagado`]: true,
            [`pedidosPendientes/${pedidoId}/fechaPago`]: new Date().toISOString(),
            [`pedidosPendientes/${pedidoId}/metodoPago`]: pedido.metodoPago || 'efectivo',
            [`pedidosPendientes/${pedidoId}/estadoPago`]: 'pagado'
        };
        
        await update(ref(db), updates);
        
        // ACTUALIZAR pedidoSeleccionado para el ticket
        pedidoSeleccionado = {
            ...pedido,
            pagado: true,
            fechaPago: new Date().toISOString()
        };
        
        mostrarMensaje('✅ Pedido marcado como pagado', 'success');
        
        // 🟢 IMPRIMIR TICKET DEL PEDIDO
        imprimirTicketPedido(pedidoId);
        
        // 🟢 GUARDAR COMO VENTA COMPLETADA
        await guardarPedidoComoVenta(pedidoId);
        
    } catch (error) {
        console.error('Error marcando como pagado:', error);
        mostrarMensaje('❌ Error marcando como pagado: ' + error.message, 'error');
    }
}

async function validarTransferencia(pedidoId) {
    if (!pedidoId) {
        mostrarMensaje('ID de pedido no válido', 'error');
        return;
    }
    
    try {
        const pedido = pedidos.find(p => p.firebaseKey === pedidoId || p.id === pedidoId);
        if (!pedido) {
            mostrarMensaje('Pedido no encontrado', 'error');
            return;
        }
        
        pedidoSeleccionado = pedido;
        
        mostrarConfirmacion(
            'Validar Transferencia',
            `¿Confirmar que la transferencia del pedido #${(pedido.id || pedido.firebaseKey).substring(0, 8)} ha sido recibida y validada? Se imprimirá el ticket automáticamente.`,
            'validarTransferencia'
        );
        
    } catch (error) {
        console.error('Error validando transferencia:', error);
        mostrarMensaje('Error validando transferencia: ' + error.message, 'error');
    }
}

async function marcarTransferenciaValidada(pedidoId) {
    if (!pedidoId) {
        mostrarMensaje('ID de pedido no válido', 'error');
        return;
    }
    
    try {
        const pedido = pedidos.find(p => p.firebaseKey === pedidoId || p.id === pedidoId);
        if (!pedido) {
            mostrarMensaje('Pedido no encontrado', 'error');
            return;
        }
        
        // Actualizar estado de pago
        const updates = {
            [`pedidosPendientes/${pedidoId}/pagado`]: true,
            [`pedidosPendientes/${pedidoId}/fechaPago`]: new Date().toISOString(),
            [`pedidosPendientes/${pedidoId}/metodoPago`]: 'transferencia',
            [`pedidosPendientes/${pedidoId}/validado`]: true,
            [`pedidosPendientes/${pedidoId}/validadoPor`]: 'Administrador',
            [`pedidosPendientes/${pedidoId}/fechaValidacion`]: new Date().toISOString(),
            [`pedidosPendientes/${pedidoId}/estadoPago`]: 'pagado'
        };
        
        await update(ref(db), updates);
        
        // ACTUALIZAR pedidoSeleccionado para el ticket
        pedidoSeleccionado = {
            ...pedido,
            pagado: true,
            metodoPago: 'transferencia',
            fechaPago: new Date().toISOString()
        };
        
        mostrarMensaje('✅ Transferencia validada - Pedido marcado como pagado', 'success');
        
        // 🟢 IMPRIMIR TICKET DEL PEDIDO
        imprimirTicketPedido(pedidoId);
        
        // 🟢 GUARDAR COMO VENTA COMPLETADA
        await guardarPedidoComoVenta(pedidoId);
        
    } catch (error) {
        console.error('Error validando transferencia:', error);
        mostrarMensaje('❌ Error validando transferencia: ' + error.message, 'error');
    }
}

// ================= 🟢 FUNCIÓN PARA GUARDAR PEDIDO COMO VENTA =================
async function guardarPedidoComoVenta(pedidoId) {
    try {
        const pedidoRef = ref(db, `pedidosPendientes/${pedidoId}`);
        const snapshot = await get(pedidoRef);
        
        if (!snapshot.exists()) {
            console.error('Pedido no encontrado');
            return;
        }
        
        const pedido = snapshot.val();
        const fechaHora = obtenerFechaHoraActual();
        
        // Crear registro de venta
        const ventaData = {
            fecha: new Date().toISOString(),
            fechaHora: fechaHora.completa,
            fechaFormato: fechaHora.fecha,
            horaFormato: fechaHora.hora,
            cliente: pedido.cliente || { id: 'general', nombre: 'Publico general' },
            productos: pedido.productos || [],
            total: calcularTotalPedido(pedido),
            estado: 'completada',
            vendedor: pedido.vendedor || 'Administrador',
            metodoPago: pedido.metodoPago || 'efectivo',
            esPedido: true,
            comentario: pedido.comentario || '',
            fechaRegistro: new Date().toISOString(),
            pagado: true,
            fechaPago: new Date().toISOString(),
            pedidoOriginal: pedidoId,
            ubicacion: pedido.ubicacion || 'despacho',
            paraDespacho: true
        };
        
        // Guardar en ventas
        const ventasRef = ref(db, 'ventas');
        const nuevaVenta = await push(ventasRef, ventaData);
        const ventaId = nuevaVenta.key;
        
        console.log(`Pedido #${pedidoId} guardado como venta #${ventaId}`);
        
        // Actualizar stock
        await actualizarStockPedido(pedido);
        
        // Marcar pedido como completado
        await update(ref(db), {
            [`pedidosPendientes/${pedidoId}/estado`]: 'completado',
            [`pedidosPendientes/${pedidoId}/fechaCompletado`]: new Date().toISOString(),
            [`pedidosPendientes/${pedidoId}/ventaAsociada`]: ventaId
        });
        
        mostrarMensaje('✅ Pedido guardado como venta exitosamente', 'success');
        
    } catch (error) {
        console.error('Error guardando pedido como venta:', error);
        mostrarMensaje('❌ Error al guardar como venta: ' + error.message, 'error');
    }
}

async function actualizarStockPedido(pedido) {
    try {
        const updates = {};
        
        if (pedido.productos) {
            for (const producto of pedido.productos) {
                if (producto.firebaseKey) {
                    const productoRef = ref(db, `inventario/${producto.firebaseKey}`);
                    const snapshot = await get(productoRef);
                    
                    if (snapshot.exists()) {
                        const productoData = snapshot.val();
                        const stockActual = productoData.stock || 0;
                        const nuevoStock = stockActual - (producto.cantidad || 0);
                        
                        if (nuevoStock >= 0) {
                            updates[`inventario/${producto.firebaseKey}/stock`] = nuevoStock;
                            updates[`inventario/${producto.firebaseKey}/ultimaVenta`] = new Date().toISOString();
                            updates[`inventario/${producto.firebaseKey}/fechaActualizado`] = new Date().toISOString();
                        }
                    }
                }
            }
        }
        
        if (Object.keys(updates).length > 0) {
            await update(ref(db), updates);
            console.log('Stock actualizado correctamente');
        }
    } catch (error) {
        console.error('Error actualizando stock:', error);
    }
}

function obtenerFechaHoraActual() {
    const ahora = new Date();
    
    const opciones = {
        timeZone: 'America/Santo_Domingo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    
    const formatter = new Intl.DateTimeFormat('es-DO', opciones);
    const partes = formatter.formatToParts(ahora);
    
    let fechaObj = {};
    partes.forEach(parte => {
        fechaObj[parte.type] = parte.value;
    });
    
    const fechaCompleta = `${fechaObj.day}/${fechaObj.month}/${fechaObj.year} ${fechaObj.hour}:${fechaObj.minute}:${fechaObj.second} ${fechaObj.dayPeriod || ''}`;
    const fechaCorta = `${fechaObj.day}/${fechaObj.month}/${fechaObj.year}`;
    const horaFormato = `${fechaObj.hour}:${fechaObj.minute}:${fechaObj.second}`;
    
    return {
        completa: fechaCompleta,
        fecha: fechaCorta,
        hora: horaFormato
    };
}

// ================= 🟢 FUNCIÓN PARA IMPRIMIR TICKET DEL PEDIDO =================
function imprimirTicketPedido(pedidoId) {
    const pedido = pedidoSeleccionado || pedidos.find(p => p.firebaseKey === pedidoId || p.id === pedidoId);
    
    if (!pedido) {
        mostrarMensaje('No hay pedido para imprimir', 'error');
        return;
    }
    
    const total = calcularTotalPedido(pedido);
    const fecha = obtenerFechaHoraActual();
    const metodoPago = pedido.metodoPago || 'efectivo';
    const vendedorNombre = pedido.vendedor || 'Administrador';
    const clienteNombre = pedido.cliente?.nombre || 'Publico general';
    const comentario = pedido.comentario || '';
    
    // Construir ticket
    let ticket = '';
    
    ticket += '='.repeat(32) + '\n';
    ticket += '      IMPRESIONES WJS\n';
    ticket += '='.repeat(32) + '\n';
  ticket += 'Calle piragua #152, SDE,\n';
  ticket += 'SEGUNDO NIVEL BANCAS KIKO,\n';
  ticket += 'Tel: 829-818-6772\n\n';
    ticket += '-'.repeat(32) + '\n';
    ticket += `Fecha: ${fecha.completa}\n`;
    ticket += `Pedido: #${(pedido.id || pedido.firebaseKey).substring(0, 8)}\n`;
    ticket += `Vendedor: ${vendedorNombre}\n`;
    ticket += `Cliente: ${clienteNombre}\n`;
    ticket += '-'.repeat(32) + '\n';
    ticket += '\n';
    ticket += 'Cant  Producto          Importe\n';
    ticket += '-'.repeat(32) + '\n';
    
    if (pedido.productos) {
        pedido.productos.forEach(item => {
            const nombre = (item.nombre || 'Producto').substring(0, 18);
            const cantidad = (item.cantidad || 0).toFixed(2);
            const subtotal = (item.precio || 0) * (item.cantidad || 0);
            const importe = `RD$${subtotal.toFixed(2)}`;
            
            ticket += `${cantidad.padStart(4)}  ${nombre.padEnd(18)} ${importe.padStart(10)}\n`;
        });
    }
    
    ticket += '-'.repeat(32) + '\n';
    ticket += `${'TOTAL:'.padStart(22)} RD$${total.toFixed(2).padStart(10)}\n`;
    ticket += '-'.repeat(32) + '\n';
    ticket += `Pago: ${metodoPago.toUpperCase()}\n`;
    ticket += '='.repeat(32) + '\n';
    ticket += '   ¡GRACIAS POR SU COMPRA!\n';
    ticket += '       VUELVA PRONTO\n';
    ticket += '='.repeat(32) + '\n';
    ticket += '\n\n\n';
    
// Estilo para impresión (ligeramente reducido)
const estiloTicket = `
    <style>
        @page { margin: 0; size: 80mm auto; }
        body { margin: 0; padding: 8px 4px; background: white; font-family: 'Courier New', monospace; }
        pre { 
            margin: 0; 
            padding: 0; 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            font-weight: bold; 
            line-height: 1.3; 
            white-space: pre-wrap; 
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
            <title>Ticket Pedido ${(pedido.id || pedido.firebaseKey).substring(0, 8)}</title>
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
}

async function marcarComoPendiente(pedidoId) {
    if (!pedidoId) {
        mostrarMensaje('ID de pedido no válido', 'error');
        return;
    }
    
    try {
        const updates = {
            [`pedidosPendientes/${pedidoId}/pagado`]: false,
            [`pedidosPendientes/${pedidoId}/fechaPago`]: null,
            [`pedidosPendientes/${pedidoId}/estadoPago`]: 'pendiente_pago'
        };
        
        await update(ref(db), updates);
        
        mostrarMensaje('✅ Pedido marcado como pendiente de pago', 'success');
        
    } catch (error) {
        console.error('Error marcando como pendiente:', error);
        mostrarMensaje('❌ Error marcando como pendiente: ' + error.message, 'error');
    }
}

async function eliminarPedido(pedidoId) {
    if (!pedidoId) {
        mostrarMensaje('ID de pedido no válido', 'error');
        return;
    }
    
    try {
        await remove(ref(db, `pedidosPendientes/${pedidoId}`));
        mostrarMensaje('✅ Pedido eliminado correctamente', 'success');
    } catch (error) {
        console.error('Error eliminando pedido:', error);
        mostrarMensaje('❌ Error eliminando pedido: ' + error.message, 'error');
    }
}

async function cambiarEstadoPedido(pedidoId, nuevoEstado, ubicacion = '', comentario = '') {
    if (!pedidoId) {
        mostrarMensaje('ID de pedido no válido', 'error');
        return;
    }
    
    try {
        const updates = {
            [`pedidosPendientes/${pedidoId}/estado`]: nuevoEstado,
            [`pedidosPendientes/${pedidoId}/fechaActualizado`]: new Date().toISOString()
        };
        
        if (ubicacion) {
            updates[`pedidosPendientes/${pedidoId}/ubicacion`] = ubicacion;
        }
        
        if (comentario) {
            updates[`pedidosPendientes/${pedidoId}/comentarioEstado`] = comentario;
        }
        
        if (nuevoEstado === 'entregado') {
            updates[`pedidosPendientes/${pedidoId}/pagado`] = true;
            updates[`pedidosPendientes/${pedidoId}/fechaEntrega`] = new Date().toISOString();
        }
        
        await update(ref(db), updates);
        
        mostrarMensaje(`✅ Estado actualizado a: ${getEstadoTexto(nuevoEstado)}`, 'success');
        
        if (nuevoEstado === 'entregado') {
            await guardarPedidoComoVenta(pedidoId);
        }
        
    } catch (error) {
        console.error('Error cambiando estado:', error);
        mostrarMensaje('❌ Error cambiando estado: ' + error.message, 'error');
    }
}

// ================= MODALES =================
function mostrarDetallesPedido(pedidoId) {
    const pedido = pedidos.find(p => p.firebaseKey === pedidoId || p.id === pedidoId);
    if (!pedido) {
        mostrarMensaje('Pedido no encontrado', 'error');
        return;
    }
    
    pedidoSeleccionado = pedido;
    
    const total = calcularTotalPedido(pedido);
    const estaPagado = pedido.pagado === true;
    
    actualizarElemento('detalleId', `#${(pedido.id || pedido.firebaseKey).substring(0, 8)}`);
    actualizarElemento('detalleCliente', pedido.cliente?.nombre || 'Sin nombre');
    actualizarElemento('detalleFecha', pedido.fechaFormateada || 'N/A');
    actualizarElemento('detalleVendedor', pedido.vendedor || 'N/A');
    actualizarElemento('detalleTotal', total.toFixed(2));
    actualizarElemento('detalleComentario', pedido.comentario || 'Sin comentarios');
    
    renderDetalleProductos(pedido.productos);
    renderEstadoActual(pedido, estaPagado);
    configurarBotonesDetalle(pedido.firebaseKey || pedido.id, estaPagado);
    
    const modal = document.getElementById('modalDetalles');
    if (modal) modal.classList.remove('hidden');
}

function actualizarElemento(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = valor;
}

function renderDetalleProductos(productos) {
    const container = document.getElementById('detalleProductos');
    if (!container) return;
    
    if (productos && productos.length > 0) {
        let html = '';
        productos.forEach(p => {
            const subtotal = (p.precio || 0) * (p.cantidad || 0);
            html += `
                <div class="producto-detalle">
                    <span>${p.nombre || 'Producto'}</span>
                    <span>${p.cantidad || 0} x RD$ ${(p.precio || 0).toFixed(2)} = RD$ ${subtotal.toFixed(2)}</span>
                </div>
            `;
        });
        container.innerHTML = html;
    } else {
        container.innerHTML = '<div class="producto-detalle">No hay productos</div>';
    }
}

function renderEstadoActual(pedido, estaPagado) {
    const container = document.getElementById('estadoActual');
    if (!container) return;
    
    const estadoTexto = getEstadoTexto(pedido.estado);
    const estadoIcono = getEstadoIcono(pedido.estado);
    const estadoClass = `estado-${pedido.estado || 'recibido'}`;
    
    const textoPago = estaPagado ? 'Pagado' : 'Pendiente de pago';
    const iconoPago = estaPagado ? 'fa-check-circle' : 'fa-clock';
    const colorPago = estaPagado ? '#4CAF50' : '#FF9800';
    
    const ubicacionHTML = pedido.ubicacion ? 
        `<div style="margin-top: 10px;">
            <i class="fa-solid ${getUbicacionIcono(pedido.ubicacion)}"></i> 
            ${getUbicacionTexto(pedido.ubicacion)}
        </div>` : '';
    
    container.innerHTML = `
        <div class="estado-badge ${estadoClass}" style="display: inline-flex;">
            <i class="fa-solid ${estadoIcono}"></i>
            ${estadoTexto}
        </div>
        <div style="margin-top: 10px;">
            <i class="fa-solid ${iconoPago}" style="color: ${colorPago};"></i>
            ${textoPago}
            ${pedido.metodoPago ? ` (${pedido.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo'})` : ''}
        </div>
        ${ubicacionHTML}
    `;
}

function getUbicacionIcono(ubicacion) {
    const iconos = {
        'wjs': 'fa-store',
        'kiko': 'fa-home',
        'banca': 'fa-building',
        'despacho': 'fa-truck'
    };
    return iconos[ubicacion] || 'fa-location-dot';
}

function configurarBotonesDetalle(pedidoId, estaPagado) {
    const btnMarcarPagado = document.getElementById('btnMarcarPagado');
    const btnValidarTransferencia = document.getElementById('btnValidarTransferencia');
    
    if (btnMarcarPagado) {
        btnMarcarPagado.style.display = estaPagado ? 'none' : 'flex';
        btnMarcarPagado.onclick = () => {
            mostrarConfirmacion(
                'Marcar como Pagado',
                `¿Marcar el pedido #${pedidoSeleccionado?.id?.substring(0, 8)} como pagado? Se imprimirá el ticket automáticamente.`,
                'pagar'
            );
        };
    }
    
    if (btnValidarTransferencia) {
        btnValidarTransferencia.style.display = (estaPagado || pedidoSeleccionado?.metodoPago !== 'transferencia') ? 'none' : 'flex';
        btnValidarTransferencia.onclick = () => {
            validarTransferencia(pedidoId);
        };
    }
}

function mostrarModalEstado(pedidoId) {
    const pedido = pedidos.find(p => p.firebaseKey === pedidoId || p.id === pedidoId);
    if (!pedido) {
        mostrarMensaje('Pedido no encontrado', 'error');
        return;
    }
    
    pedidoSeleccionado = pedido;
    
    actualizarElemento('estadoActualTexto', getEstadoTexto(pedido.estado));
    
    const estadoPagoTexto = pedido.pagado ? 'Pagado' : `Pendiente de pago (${pedido.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo'})`;
    const estadoPagoElement = document.getElementById('estadoPagoTexto');
    if (estadoPagoElement) {
        estadoPagoElement.innerHTML = `<strong>Estado de pago:</strong> ${estadoPagoTexto}`;
    }
    
    resetearSeleccionesEstado(pedido);
    
    const ubicacionContainer = document.getElementById('ubicacionContainer');
    if (ubicacionContainer) {
        ubicacionContainer.style.display = pedido.estado === 'disponible' ? 'block' : 'none';
    }
    
    const modal = document.getElementById('modalEstado');
    if (modal) modal.classList.remove('hidden');
}

function resetearSeleccionesEstado(pedido) {
    document.querySelectorAll('input[name="nuevoEstado"]').forEach(radio => {
        radio.checked = radio.value === pedido.estado;
    });
    
    document.querySelectorAll('input[name="ubicacion"]').forEach(radio => {
        radio.checked = radio.value === pedido.ubicacion;
    });
    
    const comentario = document.getElementById('comentarioEstado');
    if (comentario) comentario.value = pedido.comentarioEstado || '';
}

function mostrarConfirmacion(titulo, mensaje, accion) {
    const tituloElement = document.getElementById('confirmacionTitulo');
    const mensajeElement = document.getElementById('confirmacionMensaje');
    const btnConfirmar = document.getElementById('btnConfirmarAccion');
    
    if (tituloElement) tituloElement.textContent = titulo;
    if (mensajeElement) mensajeElement.textContent = mensaje;
    if (btnConfirmar) btnConfirmar.dataset.action = accion;
    
    const modal = document.getElementById('modalConfirmacion');
    if (modal) modal.classList.remove('hidden');
}

// ================= EVENT LISTENERS =================
function configurarEventListeners() {
    // Búsqueda
    const buscarPedido = document.getElementById('buscarPedido');
    if (buscarPedido) {
        buscarPedido.addEventListener('input', function(e) {
            filtrosActivos.busqueda = e.target.value;
            aplicarFiltros();
        });
    }
    
    // Filtros
    const filtroEstado = document.getElementById('filtroEstado');
    if (filtroEstado) {
        filtroEstado.addEventListener('change', function(e) {
            filtrosActivos.estado = e.target.value;
            aplicarFiltros();
        });
    }
    
    const filtroFecha = document.getElementById('filtroFecha');
    if (filtroFecha) {
        filtroFecha.addEventListener('change', function(e) {
            filtrosActivos.fecha = e.target.value;
            aplicarFiltros();
        });
    }
    
    const filtroUbicacion = document.getElementById('filtroUbicacion');
    if (filtroUbicacion) {
        filtroUbicacion.addEventListener('change', function(e) {
            filtrosActivos.ubicacion = e.target.value;
            aplicarFiltros();
        });
    }
    
    const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');
    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener('click', limpiarFiltros);
    }
    
    configurarCierreModales();
    configurarCambioEstado();
    configurarCierreClickFuera();
    
    const btnConfirmarAccion = document.getElementById('btnConfirmarAccion');
    if (btnConfirmarAccion) {
        btnConfirmarAccion.addEventListener('click', ejecutarAccionConfirmada);
    }
}

function limpiarFiltros() {
    filtrosActivos = {
        busqueda: '',
        estado: '',
        fecha: '',
        ubicacion: ''
    };
    
    const buscarPedido = document.getElementById('buscarPedido');
    if (buscarPedido) buscarPedido.value = '';
    
    const filtroEstado = document.getElementById('filtroEstado');
    if (filtroEstado) filtroEstado.value = '';
    
    const filtroFecha = document.getElementById('filtroFecha');
    if (filtroFecha) filtroFecha.value = '';
    
    const filtroUbicacion = document.getElementById('filtroUbicacion');
    if (filtroUbicacion) filtroUbicacion.value = '';
    
    aplicarFiltros();
    mostrarMensaje('Filtros limpiados', 'info');
}

function configurarCierreModales() {
    const btnCerrarDetalles = document.getElementById('btnCerrarDetalles');
    const btnCerrarModalDetalles = document.getElementById('btnCerrarModalDetalles');
    
    if (btnCerrarDetalles) btnCerrarDetalles.addEventListener('click', cerrarModalDetalles);
    if (btnCerrarModalDetalles) btnCerrarModalDetalles.addEventListener('click', cerrarModalDetalles);
    
    const btnCerrarEstado = document.getElementById('btnCerrarEstado');
    const btnCancelarEstado = document.getElementById('btnCancelarEstado');
    
    if (btnCerrarEstado) btnCerrarEstado.addEventListener('click', cerrarModalEstado);
    if (btnCancelarEstado) btnCancelarEstado.addEventListener('click', cerrarModalEstado);
    
    const btnCancelarConfirmacion = document.getElementById('btnCancelarConfirmacion');
    if (btnCancelarConfirmacion) {
        btnCancelarConfirmacion.addEventListener('click', cerrarModalConfirmacion);
    }
    
    const btnEliminarPedido = document.getElementById('btnEliminarPedido');
    if (btnEliminarPedido) {
        btnEliminarPedido.addEventListener('click', () => {
            if (pedidoSeleccionado) {
                mostrarConfirmacion(
                    'Eliminar Pedido',
                    `¿Estás seguro de eliminar el pedido #${pedidoSeleccionado.id?.substring(0, 8)}? Esta acción no se puede deshacer.`,
                    'eliminar'
                );
            }
        });
    }
    
    const btnMarcarPagado = document.getElementById('btnMarcarPagado');
    if (btnMarcarPagado) {
        btnMarcarPagado.addEventListener('click', () => {
            if (pedidoSeleccionado) {
                mostrarConfirmacion(
                    'Marcar como Pagado',
                    `¿Marcar el pedido #${pedidoSeleccionado.id?.substring(0, 8)} como pagado? Se imprimirá el ticket automáticamente.`,
                    'pagar'
                );
            }
        });
    }
    
    const btnCambiarEstado = document.getElementById('btnCambiarEstado');
    if (btnCambiarEstado) {
        btnCambiarEstado.addEventListener('click', () => {
            if (pedidoSeleccionado) {
                mostrarModalEstado(pedidoSeleccionado.firebaseKey || pedidoSeleccionado.id);
            }
        });
    }
    
    const btnValidarTransferencia = document.getElementById('btnValidarTransferencia');
    if (btnValidarTransferencia) {
        btnValidarTransferencia.addEventListener('click', () => {
            if (pedidoSeleccionado) {
                validarTransferencia(pedidoSeleccionado.firebaseKey || pedidoSeleccionado.id);
            }
        });
    }
}

function configurarCambioEstado() {
    document.querySelectorAll('input[name="nuevoEstado"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const ubicacionContainer = document.getElementById('ubicacionContainer');
            if (ubicacionContainer) {
                ubicacionContainer.style.display = this.value === 'disponible' ? 'block' : 'none';
            }
        });
    });
    
    const btnConfirmarEstado = document.getElementById('btnConfirmarEstado');
    if (btnConfirmarEstado) {
        btnConfirmarEstado.addEventListener('click', async () => {
            const nuevoEstado = document.querySelector('input[name="nuevoEstado"]:checked');
            const ubicacion = document.querySelector('input[name="ubicacion"]:checked');
            const comentario = document.getElementById('comentarioEstado')?.value || '';
            
            if (!nuevoEstado) {
                mostrarMensaje('Selecciona un estado', 'error');
                return;
            }
            
            if (nuevoEstado.value === 'disponible' && !ubicacion) {
                mostrarMensaje('Selecciona una ubicación para pedidos disponibles', 'error');
                return;
            }
            
            if (pedidoSeleccionado) {
                const pedidoId = pedidoSeleccionado.firebaseKey || pedidoSeleccionado.id;
                await cambiarEstadoPedido(
                    pedidoId,
                    nuevoEstado.value,
                    ubicacion ? ubicacion.value : '',
                    comentario
                );
            }
            
            cerrarModalEstado();
            cerrarModalDetalles();
        });
    }
}

async function ejecutarAccionConfirmada() {
    const btnConfirmar = document.getElementById('btnConfirmarAccion');
    const accion = btnConfirmar?.dataset.action;
    
    if (!pedidoSeleccionado) return;
    
    const pedidoId = pedidoSeleccionado.firebaseKey || pedidoSeleccionado.id;
    
    switch (accion) {
        case 'eliminar':
            await eliminarPedido(pedidoId);
            break;
        case 'pagar':
            await marcarComoPagado(pedidoId);
            break;
        case 'marcarPendiente':
            await marcarComoPendiente(pedidoId);
            break;
        case 'validarTransferencia':
            await marcarTransferenciaValidada(pedidoId);
            break;
    }
    
    cerrarModalConfirmacion();
    cerrarModalDetalles();
}

function configurarCierreClickFuera() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                if (this.id === 'modalDetalles') cerrarModalDetalles();
                if (this.id === 'modalEstado') cerrarModalEstado();
                if (this.id === 'modalConfirmacion') cerrarModalConfirmacion();
            }
        });
    });
}

function configurarEventListenersPedidos() {
    document.querySelectorAll('.btn-expandir').forEach(btn => {
        btn.removeEventListener('click', toggleExpandPedido);
        btn.addEventListener('click', toggleExpandPedido);
    });
    
    document.querySelectorAll('.btn-expandir-productos').forEach(btn => {
        btn.removeEventListener('click', toggleExpandProductos);
        btn.addEventListener('click', toggleExpandProductos);
    });
    
    configurarBotonesAccion();
}

function toggleExpandPedido(e) {
    e.stopPropagation();
    const pedidoCard = this.closest('.pedido-card');
    if (pedidoCard) pedidoCard.classList.toggle('expanded');
}

function toggleExpandProductos(e) {
    e.stopPropagation();
    const productosLista = this.closest('.pedido-productos')?.querySelector('.productos-lista');
    if (productosLista) productosLista.classList.toggle('expanded');
}

function configurarBotonesAccion() {
    document.querySelectorAll('.btn-detalles').forEach(btn => {
        btn.removeEventListener('click', handleDetallesClick);
        btn.addEventListener('click', handleDetallesClick);
    });
    
    document.querySelectorAll('.btn-estado').forEach(btn => {
        btn.removeEventListener('click', handleEstadoClick);
        btn.addEventListener('click', handleEstadoClick);
    });
    
    document.querySelectorAll('.btn-validar-transferencia').forEach(btn => {
        btn.removeEventListener('click', handleValidarTransferenciaClick);
        btn.addEventListener('click', handleValidarTransferenciaClick);
    });
    
    document.querySelectorAll('.btn-pagar').forEach(btn => {
        btn.removeEventListener('click', handlePagarClick);
        btn.addEventListener('click', handlePagarClick);
    });
    
    document.querySelectorAll('.btn-marcar-pendiente').forEach(btn => {
        btn.removeEventListener('click', handleMarcarPendienteClick);
        btn.addEventListener('click', handleMarcarPendienteClick);
    });
    
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.removeEventListener('click', handleEliminarClick);
        btn.addEventListener('click', handleEliminarClick);
    });
}

function handleDetallesClick() {
    const pedidoId = this.dataset.id;
    mostrarDetallesPedido(pedidoId);
}

function handleEstadoClick() {
    const pedidoId = this.dataset.id;
    mostrarModalEstado(pedidoId);
}

function handleValidarTransferenciaClick() {
    const pedidoId = this.dataset.id;
    const pedido = pedidos.find(p => p.firebaseKey === pedidoId || p.id === pedidoId);
    if (pedido) {
        pedidoSeleccionado = pedido;
        validarTransferencia(pedidoId);
    }
}

function handlePagarClick() {
    const pedidoId = this.dataset.id;
    const pedido = pedidos.find(p => p.firebaseKey === pedidoId || p.id === pedidoId);
    if (pedido) {
        pedidoSeleccionado = pedido;
        mostrarConfirmacion(
            'Marcar como Pagado',
            `¿Marcar el pedido #${(pedido.id || pedido.firebaseKey).substring(0, 8)} como pagado? Se imprimirá el ticket automáticamente.`,
            'pagar'
        );
    }
}

function handleMarcarPendienteClick() {
    const pedidoId = this.dataset.id;
    const pedido = pedidos.find(p => p.firebaseKey === pedidoId || p.id === pedidoId);
    if (pedido) {
        pedidoSeleccionado = pedido;
        mostrarConfirmacion(
            'Marcar como Pendiente',
            `¿Marcar el pedido #${(pedido.id || pedido.firebaseKey).substring(0, 8)} como pendiente de pago?`,
            'marcarPendiente'
        );
    }
}

function handleEliminarClick() {
    const pedidoId = this.dataset.id;
    const pedido = pedidos.find(p => p.firebaseKey === pedidoId || p.id === pedidoId);
    if (pedido) {
        pedidoSeleccionado = pedido;
        mostrarConfirmacion(
            'Eliminar Pedido',
            `¿Estás seguro de eliminar el pedido #${(pedido.id || pedido.firebaseKey).substring(0, 8)}? Esta acción no se puede deshacer.`,
            'eliminar'
        );
    }
}

// ================= FUNCIONES AUXILIARES =================
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
    
    document.body.appendChild(mensajeDiv);
    
    setTimeout(() => mensajeDiv.classList.add('show'), 10);
    
    setTimeout(() => {
        mensajeDiv.classList.remove('show');
        setTimeout(() => mensajeDiv.remove(), 300);
    }, 3000);
}

function cerrarModalDetalles() {
    const modal = document.getElementById('modalDetalles');
    if (modal) modal.classList.add('hidden');
    pedidoSeleccionado = null;
}

function cerrarModalEstado() {
    const modal = document.getElementById('modalEstado');
    if (modal) modal.classList.add('hidden');
}

function cerrarModalConfirmacion() {
    const modal = document.getElementById('modalConfirmacion');
    if (modal) modal.classList.add('hidden');
    pedidoSeleccionado = null;
}

// ================= EXPORTAR FUNCIONES =================
window.cargarPedidos = iniciarEscuchaPedidos;
window.mostrarDetallesPedido = mostrarDetallesPedido;
window.mostrarModalEstado = mostrarModalEstado;
window.validarTransferencia = validarTransferencia;
window.marcarComoPagado = marcarComoPagado;

console.log('✅ Módulo de pedidos cargado correctamente');