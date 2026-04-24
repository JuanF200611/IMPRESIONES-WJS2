// ================= FIREBASE =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  get
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
let ventas = [];
let reporteActual = null;
let productosInventario = [];
let filtros = {
  fechaInicio: '',
  fechaFin: '',
  vendedor: '',
  metodoPago: '',
  tipoReporte: 'resumen'
};

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', () => {
  console.log('Sistema de reportes cargado');
  inicializarApp();
});

async function inicializarApp() {
  try {
    configurarEventListeners();
    await cargarVendedores();
    await cargarProductosInventario();
    configurarFechasPorDefecto();
    await cargarVentas();
    console.log('App de reportes inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar app:', error);
    mostrarMensaje('Error al cargar reportes: ' + error.message, 'error');
  }
}

// ================= CONFIGURACIÓN DE EVENTOS =================
function configurarEventListeners() {
  document.getElementById('btnGenerarReporte').addEventListener('click', generarReporte);
  
  document.getElementById('btnHoy').addEventListener('click', () => establecerRangoFecha('hoy'));
  document.getElementById('btnSemana').addEventListener('click', () => establecerRangoFecha('semana'));
  document.getElementById('btnMes').addEventListener('click', () => establecerRangoFecha('mes'));
  document.getElementById('btnTrimestre').addEventListener('click', () => establecerRangoFecha('trimestre'));
  document.getElementById('btnLimpiarFiltros').addEventListener('click', limpiarFiltros);
  
  document.getElementById('btnGenerarPDF').addEventListener('click', exportarPDF);
  document.getElementById('btnExportarExcel').addEventListener('click', exportarExcel);
  document.getElementById('btnImprimirReporte').addEventListener('click', imprimirReportePersonalizado);
  
  document.getElementById('btnCerrarDetalles').addEventListener('click', cerrarModalDetalles);
  document.getElementById('btnCerrarModalDetalles').addEventListener('click', cerrarModalDetalles);
}

// ================= FUNCIONES DE CARGA DE DATOS =================
async function cargarProductosInventario() {
  try {
    const snapshot = await get(ref(db, 'inventario'));
    if (snapshot.exists()) {
      productosInventario = [];
      const productosData = snapshot.val();
      for (const key in productosData) {
        const producto = productosData[key];
        productosInventario.push({
          firebaseKey: key,
          ...producto,
          precioCompra: producto.precioCompra || 0,
          precioVenta: producto.precioVenta || producto.precio || 0
        });
      }
      console.log('Productos de inventario cargados:', productosInventario.length);
    }
  } catch (error) {
    console.error('Error cargando productos:', error);
  }
}

async function cargarVentas() {
  try {
    console.log('Cargando ventas...');
    
    const snapshot = await get(ref(db, 'ventas'));
    ventas = [];
    
    if (snapshot.exists()) {
      const ventasData = snapshot.val();
      
      for (const key in ventasData) {
        const venta = ventasData[key];
        
        if (venta.estado === 'completada') {
          let fechaVenta;
          
          if (venta.fecha) {
            if (typeof venta.fecha === 'number') {
              fechaVenta = new Date(venta.fecha);
            } else if (typeof venta.fecha === 'string') {
              if (venta.fecha.includes('T')) {
                const partes = venta.fecha.split('T')[0].split('-');
                const año = parseInt(partes[0]);
                const mes = parseInt(partes[1]) - 1;
                const dia = parseInt(partes[2]);
                fechaVenta = new Date(año, mes, dia);
              } else if (venta.fecha.includes('-')) {
                const partes = venta.fecha.split('-');
                const año = parseInt(partes[0]);
                const mes = parseInt(partes[1]) - 1;
                const dia = parseInt(partes[2]);
                fechaVenta = new Date(año, mes, dia);
              } else {
                fechaVenta = new Date(venta.fecha);
              }
            } else {
              fechaVenta = new Date();
            }
          } else {
            fechaVenta = new Date();
          }
          
          if (isNaN(fechaVenta.getTime())) {
            console.warn(`Fecha inválida para venta ${key}, usando fecha actual`);
            fechaVenta = new Date();
          }
          
          fechaVenta.setHours(0, 0, 0, 0);
          
          ventas.push({
            id: key,
            ...venta,
            fechaObj: fechaVenta,
            fechaOriginal: venta.fecha
          });
        }
      }
      
      console.log(`Ventas cargadas: ${ventas.length}`);
      
      generarReporte();
    } else {
      console.log('No hay ventas registradas');
      mostrarResultadosVacios();
    }
  } catch (error) {
    console.error('Error cargando ventas:', error);
    mostrarMensaje('Error cargando ventas: ' + error.message, 'error');
  }
}

async function cargarVendedores() {
  try {
    const ventasSnapshot = await get(ref(db, 'ventas'));
    const select = document.getElementById('filtroVendedor');
    
    if (ventasSnapshot.exists()) {
      const vendedoresSet = new Set();
      const ventasData = ventasSnapshot.val();
      
      for (const key in ventasData) {
        const venta = ventasData[key];
        if (venta.vendedor && venta.estado === 'completada') {
          vendedoresSet.add(venta.vendedor);
        }
      }
      
      const vendedores = Array.from(vendedoresSet).sort();
      
      vendedores.forEach(vendedor => {
        const option = document.createElement('option');
        option.value = vendedor;
        option.textContent = vendedor;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error cargando vendedores:', error);
  }
}

// ================= FUNCIONES DE FECHAS =================
function configurarFechasPorDefecto() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  inicioMes.setHours(0, 0, 0, 0);
  
  document.getElementById('fechaInicio').value = formatoFechaInput(inicioMes);
  document.getElementById('fechaFin').value = formatoFechaInput(hoy);
  
  filtros.fechaInicio = formatoFechaInput(inicioMes);
  filtros.fechaFin = formatoFechaInput(hoy);
}

function establecerRangoFecha(tipo) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  let fechaInicio = new Date(hoy);
  let fechaFin = new Date(hoy);
  
  switch(tipo) {
    case 'hoy':
      fechaInicio = new Date(hoy);
      fechaFin = new Date(hoy);
      break;
      
    case 'semana':
      const diaSemana = hoy.getDay();
      const diferenciaLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
      fechaInicio = new Date(hoy);
      fechaInicio.setDate(hoy.getDate() + diferenciaLunes);
      fechaFin = new Date(hoy);
      fechaFin.setDate(hoy.getDate() + (7 - diaSemana));
      break;
      
    case 'mes':
      fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      break;
      
    case 'trimestre':
      const mesActual = hoy.getMonth();
      const trimestre = Math.floor(mesActual / 3);
      fechaInicio = new Date(hoy.getFullYear(), trimestre * 3, 1);
      fechaFin = new Date(hoy.getFullYear(), (trimestre + 1) * 3, 0);
      break;
  }
  
  fechaInicio.setHours(0, 0, 0, 0);
  fechaFin.setHours(0, 0, 0, 0);
  
  document.getElementById('fechaInicio').value = formatoFechaInput(fechaInicio);
  document.getElementById('fechaFin').value = formatoFechaInput(fechaFin);
  
  setTimeout(() => generarReporte(), 100);
}

function limpiarFiltros() {
  document.getElementById('fechaInicio').value = '';
  document.getElementById('fechaFin').value = '';
  document.getElementById('filtroVendedor').value = '';
  document.getElementById('filtroPago').value = '';
  document.getElementById('filtroTipo').value = 'resumen';
  
  filtros = {
    fechaInicio: '',
    fechaFin: '',
    vendedor: '',
    metodoPago: '',
    tipoReporte: 'resumen'
  };
  
  mostrarMensaje('Filtros limpiados correctamente', 'exito');
  mostrarResultadosVacios();
}

// ================= 🟢 FUNCIÓN CORREGIDA PARA CALCULAR GANANCIA =================
function calcularGananciaVenta(venta) {
  let gananciaTotal = 0;
  
  if (!venta.productos || venta.productos.length === 0) {
    return 0;
  }
  
  for (const productoVenta of venta.productos) {
    // Buscar el producto en inventario por firebaseKey o por nombre
    let productoInventario = productosInventario.find(
      p => p.firebaseKey === productoVenta.firebaseKey || 
           p.id === productoVenta.id ||
           p.nombre === productoVenta.nombre
    );
    
    let precioCompra = 0;
    
    if (productoInventario) {
      precioCompra = productoInventario.precioCompra || 0;
    } else {
      // Si no encuentra el producto, estimar ganancia del 40%
      precioCompra = (productoVenta.precio || 0) * 0.6;
    }
    
    const cantidad = productoVenta.cantidad || 1;
    const precioVenta = productoVenta.precio || 0;
    const gananciaProducto = (precioVenta - precioCompra) * cantidad;
    gananciaTotal += gananciaProducto;
  }
  
  return gananciaTotal;
}

// ================= FUNCIÓN PRINCIPAL DE REPORTES =================
async function generarReporte() {
  try {
    filtros.fechaInicio = document.getElementById('fechaInicio').value;
    filtros.fechaFin = document.getElementById('fechaFin').value;
    filtros.vendedor = document.getElementById('filtroVendedor').value;
    filtros.metodoPago = document.getElementById('filtroPago').value;
    filtros.tipoReporte = document.getElementById('filtroTipo').value;
    
    if (!filtros.fechaInicio || !filtros.fechaFin) {
      mostrarMensaje('Selecciona un rango de fechas', 'error');
      return;
    }
    
    const fechaInicio = new Date(filtros.fechaInicio + 'T00:00:00');
    const fechaFin = new Date(filtros.fechaFin + 'T00:00:00');
    
    fechaInicio.setHours(0, 0, 0, 0);
    fechaFin.setHours(0, 0, 0, 0);
    
    if (fechaInicio > fechaFin) {
      mostrarMensaje('La fecha de inicio no puede ser mayor a la fecha fin', 'error');
      return;
    }
    
    let ventasFiltradas = ventas.filter(venta => {
      const fechaVenta = new Date(venta.fechaObj);
      fechaVenta.setHours(0, 0, 0, 0);
      
      if (fechaVenta < fechaInicio || fechaVenta > fechaFin) {
        return false;
      }
      
      if (filtros.vendedor && venta.vendedor !== filtros.vendedor) {
        return false;
      }
      
      if (filtros.metodoPago && venta.metodoPago !== filtros.metodoPago) {
        return false;
      }
      
      return true;
    });
    
    if (ventasFiltradas.length === 0) {
      mostrarMensaje('No hay ventas en el rango seleccionado', 'info');
      mostrarResultadosVacios();
      return;
    }
    
    switch (filtros.tipoReporte) {
      case 'resumen':
        generarReporteResumen(ventasFiltradas);
        break;
      case 'detallado':
        generarReporteDetallado(ventasFiltradas);
        break;
      case 'productos':
        generarReporteProductos(ventasFiltradas);
        break;
      case 'clientes':
        generarReporteClientes(ventasFiltradas);
        break;
      case 'pagos':
        generarReportePagos(ventasFiltradas);
        break;
    }
    
    actualizarResumenRapido(ventasFiltradas);
    actualizarDistribucionPagos(ventasFiltradas);
    
    console.log(`Reporte generado: ${ventasFiltradas.length} ventas`);
    
  } catch (error) {
    console.error('Error generando reporte:', error);
    mostrarMensaje('Error generando reporte: ' + error.message, 'error');
  }
}

// ================= FUNCIONES DE REPORTES =================
function generarReporteResumen(ventasFiltradas) {
  const resultados = document.getElementById('reporteResultados');
  
  let totalVentas = 0;
  let totalGanancia = 0;
  let totalInversion = 0;
  const ventasPorVendedor = {};
  
  for (const venta of ventasFiltradas) {
    totalVentas += venta.total;
    
    // 🟢 USAR FUNCIÓN CORREGIDA DE GANANCIA
    const gananciaVenta = calcularGananciaVenta(venta);
    totalGanancia += gananciaVenta;
    
    // Calcular inversión
    for (const productoVenta of venta.productos) {
      let productoInventario = productosInventario.find(
        p => p.firebaseKey === productoVenta.firebaseKey || 
             p.id === productoVenta.id ||
             p.nombre === productoVenta.nombre
      );
      
      let precioCompra = productoInventario?.precioCompra || (productoVenta.precio * 0.6);
      totalInversion += precioCompra * (productoVenta.cantidad || 1);
    }
    
    if (!ventasPorVendedor[venta.vendedor]) {
      ventasPorVendedor[venta.vendedor] = {
        ventas: 0,
        ganancia: 0,
        transacciones: 0
      };
    }
    
    ventasPorVendedor[venta.vendedor].ventas += venta.total;
    ventasPorVendedor[venta.vendedor].ganancia += gananciaVenta;
    ventasPorVendedor[venta.vendedor].transacciones += 1;
  }
  
  let html = `
    <div class="reporte-contenido">
      <div class="grafico-container">
        <div class="grafico-header">
          <h4><i class="fa-solid fa-chart-pie"></i> Resumen General</h4>
          <span class="periodo">${formatoFecha(new Date(filtros.fechaInicio))} - ${formatoFecha(new Date(filtros.fechaFin))}</span>
        </div>
        <div class="resumen-totales">
          <div class="total-grid">
            <div class="total-item">
              <span class="total-label">Ventas Totales</span>
              <span class="total-value">RD$ ${totalVentas.toFixed(2)}</span>
            </div>
            <div class="total-item">
              <span class="total-label">Ganancia Neta</span>
              <span class="total-value">RD$ ${totalGanancia.toFixed(2)}</span>
            </div>
            <div class="total-item">
              <span class="total-label">Para Reinversión</span>
              <span class="total-value">RD$ ${totalInversion.toFixed(2)}</span>
            </div>
            <div class="total-item">
              <span class="total-label">Transacciones</span>
              <span class="total-value">${ventasFiltradas.length}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="tabla-container">
        <h4><i class="fa-solid fa-user-tie"></i> Desempeño por Vendedor</h4>
        <table class="tabla-reporte">
          <thead>
            <tr>
              <th>Vendedor</th>
              <th>Total Ventas</th>
              <th>Ganancia Generada</th>
              <th>Transacciones</th>
              <th>Comisión (10%)</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  const vendedoresOrdenados = Object.entries(ventasPorVendedor).sort((a, b) => b[1].ventas - a[1].ventas);
  
  for (const [vendedor, datos] of vendedoresOrdenados) {
    const comision = datos.ganancia * 0.1;
    html += `
      <tr>
        <td><strong>${vendedor}</strong></td>
        <td>RD$ ${datos.ventas.toFixed(2)}</td>
        <td>RD$ ${datos.ganancia.toFixed(2)}</td>
        <td>${datos.transacciones}</td>
        <td>RD$ ${comision.toFixed(2)}</td>
        <td>
          <button class="btn-ver-detalles" onclick="mostrarDetallesVendedor('${vendedor.replace(/'/g, "\\'")}')">
            <i class="fa-solid fa-eye"></i> Ver Detalles
          </button>
         </td>
       </tr>
    `;
  }
  
  html += `
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td><strong>TOTALES</strong></td>
              <td><strong>RD$ ${totalVentas.toFixed(2)}</strong></td>
              <td><strong>RD$ ${totalGanancia.toFixed(2)}</strong></td>
              <td><strong>${ventasFiltradas.length}</strong></td>
              <td><strong>RD$ ${(totalGanancia * 0.1).toFixed(2)}</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
  
  resultados.innerHTML = html;
  
  reporteActual = {
    tipo: 'resumen',
    ventas: ventasFiltradas,
    totales: {
      ventas: totalVentas,
      ganancia: totalGanancia,
      inversion: totalInversion,
      transacciones: ventasFiltradas.length
    },
    porVendedor: ventasPorVendedor
  };
}

function generarReporteDetallado(ventasFiltradas) {
  const resultados = document.getElementById('reporteResultados');
  let html = `
    <div class="reporte-contenido">
      <div class="tabla-container">
        <h4><i class="fa-solid fa-list"></i> Reporte Detallado de Ventas</h4>
        <table class="tabla-reporte">
          <thead>
            <tr>
              <th>ID Venta</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th>Productos</th>
              <th>Método Pago</th>
              <th>Total</th>
              <th>Ganancia</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  for (const venta of ventasFiltradas) {
    const ganancia = calcularGananciaVenta(venta);
    const productosTexto = venta.productos.map(p => `${p.cantidad}x ${p.nombre.substring(0, 15)}`).join(', ');
    
    html += `
      <tr>
        <td>${venta.id.substring(0, 8)}</td>
        <td>${formatoFecha(venta.fechaObj)}</td>
        <td>${venta.cliente?.nombre || 'Cliente General'}</td>
        <td>${venta.vendedor || 'N/A'}</td>
        <td title="${venta.productos.map(p => `${p.cantidad}x ${p.nombre}`).join(', ')}">${productosTexto.substring(0, 30)}</td>
        <td><span class="badge-pago ${venta.metodoPago}">${venta.metodoPago || 'N/A'}</span></td>
        <td>RD$ ${venta.total.toFixed(2)}</td>
        <td>RD$ ${ganancia.toFixed(2)}</td>
      </tr>
    `;
  }
  
  html += `
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="6"><strong>TOTALES</strong></td>
              <td><strong>RD$ ${ventasFiltradas.reduce((sum, v) => sum + v.total, 0).toFixed(2)}</strong></td>
              <td><strong>RD$ ${ventasFiltradas.reduce((sum, v) => sum + calcularGananciaVenta(v), 0).toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
  
  resultados.innerHTML = html;
  
  reporteActual = {
    tipo: 'detallado',
    ventas: ventasFiltradas
  };
}

function generarReporteProductos(ventasFiltradas) {
  const resultados = document.getElementById('reporteResultados');
  const productosVendidos = {};
  
  for (const venta of ventasFiltradas) {
    for (const productoVenta of venta.productos) {
      const key = productoVenta.firebaseKey || productoVenta.id || `temp-${productoVenta.nombre}`;
      
      if (!productosVendidos[key]) {
        productosVendidos[key] = {
          nombre: productoVenta.nombre,
          cantidad: 0,
          totalVendido: 0,
          gananciaTotal: 0,
          precioVenta: productoVenta.precio || 0
        };
      }
      
      productosVendidos[key].cantidad += productoVenta.cantidad || 1;
      productosVendidos[key].totalVendido += (productoVenta.precio || 0) * (productoVenta.cantidad || 1);
      
      let productoInventario = productosInventario.find(p => p.firebaseKey === key || p.nombre === productoVenta.nombre);
      let precioCompra = productoInventario?.precioCompra || (productoVenta.precio * 0.6);
      const ganancia = ((productoVenta.precio || 0) - precioCompra) * (productoVenta.cantidad || 1);
      productosVendidos[key].gananciaTotal += ganancia;
      productosVendidos[key].precioCompra = precioCompra;
    }
  }
  
  const productosArray = Object.values(productosVendidos).sort((a, b) => b.cantidad - a.cantidad);
  
  let html = `
    <div class="reporte-contenido">
      <div class="tabla-container">
        <h4><i class="fa-solid fa-boxes"></i> Productos Más Vendidos</h4>
        <table class="tabla-reporte">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad Vendida</th>
              <th>Precio Compra</th>
              <th>Precio Venta</th>
              <th>Total Vendido</th>
              <th>Ganancia Total</th>
              <th>Margen %</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  let totalCantidad = 0;
  let totalVendido = 0;
  let totalGanancia = 0;
  
  for (const producto of productosArray) {
    const margen = producto.precioCompra > 0 
      ? ((producto.precioVenta - producto.precioCompra) / producto.precioCompra * 100).toFixed(1) 
      : 'N/A';
    
    html += `
      <tr>
        <td>${producto.nombre}</td>
        <td>${producto.cantidad}</td>
        <td>RD$ ${producto.precioCompra.toFixed(2)}</td>
        <td>RD$ ${producto.precioVenta.toFixed(2)}</td>
        <td>RD$ ${producto.totalVendido.toFixed(2)}</td>
        <td>RD$ ${producto.gananciaTotal.toFixed(2)}</td>
        <td>${margen}%</td>
       </tr>
    `;
    
    totalCantidad += producto.cantidad;
    totalVendido += producto.totalVendido;
    totalGanancia += producto.gananciaTotal;
  }
  
  html += `
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td><strong>TOTALES</strong></td>
              <td><strong>${totalCantidad}</strong></td>
              <td></td>
              <td></td>
              <td><strong>RD$ ${totalVendido.toFixed(2)}</strong></td>
              <td><strong>RD$ ${totalGanancia.toFixed(2)}</strong></td>
              <td><strong>${totalVendido ? ((totalGanancia / totalVendido) * 100).toFixed(1) : '0'}%</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
  
  resultados.innerHTML = html;
}

function generarReporteClientes(ventasFiltradas) {
  const resultados = document.getElementById('reporteResultados');
  const clientes = {};
  
  for (const venta of ventasFiltradas) {
    const clienteId = venta.cliente?.id || venta.cliente?.nombre || `cliente-${Math.random()}`;
    const clienteNombre = venta.cliente?.nombre || 'Cliente General';
    
    if (!clientes[clienteId]) {
      clientes[clienteId] = {
        nombre: clienteNombre,
        compras: 0,
        totalGastado: 0,
        ultimaCompra: venta.fechaObj,
        transacciones: 0
      };
    }
    
    clientes[clienteId].compras += 1;
    clientes[clienteId].totalGastado += venta.total;
    clientes[clienteId].transacciones += 1;
    
    if (venta.fechaObj > clientes[clienteId].ultimaCompra) {
      clientes[clienteId].ultimaCompra = venta.fechaObj;
    }
  }
  
  const clientesArray = Object.values(clientes).sort((a, b) => b.totalGastado - a.totalGastado);
  
  let html = `
    <div class="reporte-contenido">
      <div class="tabla-container">
        <h4><i class="fa-solid fa-users"></i> Clientes con Más Compras</h4>
        <table class="tabla-reporte">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Total Compras</th>
              <th>Total Gastado</th>
              <th>Promedio por Compra</th>
              <th>Última Compra</th>
              <th>Transacciones</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  for (const cliente of clientesArray) {
    const promedio = cliente.compras > 0 ? cliente.totalGastado / cliente.compras : 0;
    
    html += `
      <tr>
        <td><strong>${cliente.nombre}</strong></td>
        <td>${cliente.compras}</td>
        <td>RD$ ${cliente.totalGastado.toFixed(2)}</td>
        <td>RD$ ${promedio.toFixed(2)}</td>
        <td>${formatoFecha(cliente.ultimaCompra)}</td>
        <td>${cliente.transacciones}</td>
       </tr>
    `;
  }
  
  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  resultados.innerHTML = html;
}

function generarReportePagos(ventasFiltradas) {
  const resultados = document.getElementById('reporteResultados');
  const pagos = {
    efectivo: { total: 0, ventas: 0, porcentaje: 0 },
    tarjeta: { total: 0, ventas: 0, porcentaje: 0 },
    transferencia: { total: 0, ventas: 0, porcentaje: 0 },
    otros: { total: 0, ventas: 0, porcentaje: 0 }
  };
  
  for (const venta of ventasFiltradas) {
    const metodo = venta.metodoPago?.toLowerCase() || 'otros';
    
    if (pagos[metodo]) {
      pagos[metodo].total += venta.total;
      pagos[metodo].ventas += 1;
    } else {
      pagos.otros.total += venta.total;
      pagos.otros.ventas += 1;
    }
  }
  
  const totalGeneral = ventasFiltradas.reduce((sum, v) => sum + v.total, 0);
  
  for (const metodo in pagos) {
    pagos[metodo].porcentaje = totalGeneral > 0 ? (pagos[metodo].total / totalGeneral * 100) : 0;
  }
  
  let html = `
    <div class="reporte-contenido">
      <div class="tabla-container">
        <h4><i class="fa-solid fa-credit-card"></i> Análisis por Método de Pago</h4>
        <table class="tabla-reporte">
          <thead>
            <tr>
              <th>Método de Pago</th>
              <th>Total Recaudado</th>
              <th>Porcentaje del Total</th>
              <th>Cantidad de Ventas</th>
              <th>Promedio por Venta</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  for (const [metodo, datos] of Object.entries(pagos)) {
    if (datos.ventas > 0) {
      const promedio = datos.total / datos.ventas;
      
      html += `
        <tr>
          <td><span class="badge-pago ${metodo}">${metodo.toUpperCase()}</span></td>
          <td>RD$ ${datos.total.toFixed(2)}</td>
          <td>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${datos.porcentaje}%"></div>
              <span>${datos.porcentaje.toFixed(1)}%</span>
            </div>
          </td>
          <td>${datos.ventas}</td>
          <td>RD$ ${promedio.toFixed(2)}</td>
         </tr>
      `;
    }
  }
  
  html += `
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td><strong>TOTALES</strong></td>
              <td><strong>RD$ ${totalGeneral.toFixed(2)}</strong></td>
              <td><strong>100%</strong></td>
              <td><strong>${ventasFiltradas.length}</strong></td>
              <td><strong>RD$ ${(totalGeneral / ventasFiltradas.length).toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
  
  resultados.innerHTML = html;
}

// ================= FUNCIONES AUXILIARES =================
function actualizarResumenRapido(ventasFiltradas) {
  if (!ventasFiltradas || ventasFiltradas.length === 0) {
    resetResumenRapido();
    return;
  }
  
  let totalVentas = 0;
  let totalGanancia = 0;
  let totalInversion = 0;
  
  for (const venta of ventasFiltradas) {
    totalVentas += venta.total;
    totalGanancia += calcularGananciaVenta(venta);
    
    for (const productoVenta of venta.productos) {
      let productoInventario = productosInventario.find(
        p => p.firebaseKey === productoVenta.firebaseKey || 
             p.id === productoVenta.id ||
             p.nombre === productoVenta.nombre
      );
      let precioCompra = productoInventario?.precioCompra || (productoVenta.precio * 0.6);
      totalInversion += precioCompra * (productoVenta.cantidad || 1);
    }
  }
  
  document.querySelector('#resumenTotalVentas h3').textContent = `RD$ ${totalVentas.toFixed(2)}`;
  document.querySelector('#resumenGanancia h3').textContent = `RD$ ${totalGanancia.toFixed(2)}`;
  document.querySelector('#resumenInversion h3').textContent = `RD$ ${totalInversion.toFixed(2)}`;
  document.querySelector('#resumenVentas h3').textContent = ventasFiltradas.length;
}

function resetResumenRapido() {
  document.querySelector('#resumenTotalVentas h3').textContent = 'RD$ 0.00';
  document.querySelector('#resumenGanancia h3').textContent = 'RD$ 0.00';
  document.querySelector('#resumenInversion h3').textContent = 'RD$ 0.00';
  document.querySelector('#resumenVentas h3').textContent = '0';
}

function actualizarDistribucionPagos(ventasFiltradas) {
  if (!ventasFiltradas || ventasFiltradas.length === 0) {
    resetDistribucionPagos();
    return;
  }
  
  const totales = {
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
    otros: 0
  };
  
  for (const venta of ventasFiltradas) {
    const metodo = venta.metodoPago?.toLowerCase() || 'otros';
    if (totales[metodo] !== undefined) {
      totales[metodo] += venta.total;
    } else {
      totales.otros += venta.total;
    }
  }
  
  const totalGeneral = ventasFiltradas.reduce((sum, v) => sum + v.total, 0);
  
  document.querySelectorAll('.pago-item').forEach(item => {
    const tipo = item.classList.contains('efectivo') ? 'efectivo' :
                 item.classList.contains('tarjeta') ? 'tarjeta' :
                 item.classList.contains('transferencia') ? 'transferencia' : 'otros';
    
    const total = totales[tipo] || 0;
    const porcentaje = totalGeneral > 0 ? (total / totalGeneral * 100).toFixed(1) : '0';
    
    item.querySelector('h4').textContent = `RD$ ${total.toFixed(2)}`;
    item.querySelector('small').textContent = `${porcentaje}% del total`;
  });
}

function resetDistribucionPagos() {
  document.querySelectorAll('.pago-item').forEach(item => {
    item.querySelector('h4').textContent = 'RD$ 0.00';
    item.querySelector('small').textContent = '0% del total';
  });
}

function mostrarResultadosVacios() {
  const resultados = document.getElementById('reporteResultados');
  resultados.innerHTML = `
    <div class="reporte-vacio">
      <i class="fa-solid fa-chart-bar"></i>
      <h3>No hay ventas en el rango seleccionado</h3>
      <p>Intenta con otro rango de fechas o filtros diferentes</p>
    </div>
  `;
  
  resetResumenRapido();
  resetDistribucionPagos();
}

// ================= 🟢 FUNCIÓN PARA IMPRIMIR REPORTE - FORMATO CORTO 80mm =================
function imprimirReportePersonalizado() {
    if (!reporteActual) {
        mostrarMensaje('No hay datos para imprimir', 'error');
        return;
    }
    
    const fechaActual = new Date();
    const fechaInicio = filtros.fechaInicio ? formatoFecha(new Date(filtros.fechaInicio)) : 'Sin fecha';
    const fechaFin = filtros.fechaFin ? formatoFecha(new Date(filtros.fechaFin)) : 'Sin fecha';
    
    // Construir ticket CORTO para 80mm
    let ticket = '';
    
    ticket += '='.repeat(32) + '\n';
    ticket += '      IMPRESIONES WJS\n';
    ticket += '='.repeat(32) + '\n';
    ticket += 'Calle piragua #152, SDE,\n';
    ticket += 'SEGUNDO NIVEL BANCAS KIKO\n';
    ticket += 'Tel: 829-818-6772\n';
    ticket += '-'.repeat(32) + '\n';
    ticket += `Periodo: ${fechaInicio} - ${fechaFin}\n`;
    ticket += `Tipo: ${filtros.tipoReporte.toUpperCase()}\n`;
    ticket += '-'.repeat(32) + '\n';
    
    // Resumen de totales
    if (reporteActual.totales) {
        ticket += `Ventas:      RD$ ${reporteActual.totales.ventas?.toFixed(2) || '0.00'}\n`;
        ticket += `Ganancia:    RD$ ${reporteActual.totales.ganancia?.toFixed(2) || '0.00'}\n`;
        ticket += `Inversion:   RD$ ${reporteActual.totales.inversion?.toFixed(2) || '0.00'}\n`;
        ticket += `Transacciones: ${reporteActual.totales.transacciones || 0}\n`;
        ticket += '-'.repeat(32) + '\n';
    }
    
    ticket += '   ¡GRACIAS POR SU COMPRA!\n';
    ticket += '       VUELVA PRONTO\n';
    ticket += '='.repeat(32) + '\n';
    ticket += '\n\n\n';
    
    // Estilo para impresión 80mm
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
            <title>Reporte de Ventas - Impresiones WJS</title>
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
    
    mostrarMensaje('🖨️ Reporte enviado a impresión', 'exito');
}
// ================= MODAL DETALLES VENDEDOR =================
async function mostrarDetallesVendedor(vendedor) {
  const ventasFiltradas = filtrarVentasActuales();
  const ventasVendedor = ventasFiltradas.filter(v => v.vendedor === vendedor);
  
  if (ventasVendedor.length === 0) return;
  
  let totalVentas = 0;
  let totalGanancia = 0;
  
  for (const venta of ventasVendedor) {
    totalVentas += venta.total;
    totalGanancia += calcularGananciaVenta(venta);
  }
  
  document.getElementById('detalleVendedorNombre').textContent = vendedor;
  document.getElementById('detalleTotalVentas').textContent = `RD$ ${totalVentas.toFixed(2)}`;
  document.getElementById('detalleGanancia').textContent = `RD$ ${totalGanancia.toFixed(2)}`;
  document.getElementById('detalleComision').textContent = `RD$ ${(totalGanancia * 0.1).toFixed(2)}`;
  document.getElementById('detalleTransacciones').textContent = ventasVendedor.length;
  
  const tabla = document.getElementById('tablaVentasVendedor').querySelector('tbody');
  tabla.innerHTML = '';
  
  ventasVendedor.sort((a, b) => b.fechaObj - a.fechaObj);
  
  for (const venta of ventasVendedor.slice(0, 50)) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${venta.id.substring(0, 8)}</td>
      <td>${formatoFecha(venta.fechaObj)}</td>
      <td>${venta.cliente?.nombre || 'Cliente General'}</td>
      <td>RD$ ${venta.total.toFixed(2)}</td>
      <td><span class="badge-pago ${venta.metodoPago}">${venta.metodoPago || 'N/A'}</span></td>
    `;
    tabla.appendChild(row);
  }
  
  document.getElementById('modalDetallesVendedor').classList.remove('hidden');
}

function cerrarModalDetalles() {
  document.getElementById('modalDetallesVendedor').classList.add('hidden');
}

function filtrarVentasActuales() {
  if (!filtros.fechaInicio || !filtros.fechaFin) {
    return ventas;
  }
  
  const fechaInicio = new Date(filtros.fechaInicio + 'T00:00:00');
  const fechaFin = new Date(filtros.fechaFin + 'T00:00:00');
  
  fechaInicio.setHours(0, 0, 0, 0);
  fechaFin.setHours(0, 0, 0, 0);
  
  return ventas.filter(venta => {
    const fechaVenta = new Date(venta.fechaObj);
    fechaVenta.setHours(0, 0, 0, 0);
    
    if (fechaVenta < fechaInicio || fechaVenta > fechaFin) {
      return false;
    }
    
    if (filtros.vendedor && venta.vendedor !== filtros.vendedor) {
      return false;
    }
    
    if (filtros.metodoPago && venta.metodoPago !== filtros.metodoPago) {
      return false;
    }
    
    return true;
  });
}

// ================= FUNCIONES DE EXPORTACIÓN =================
function exportarPDF() {
  if (!reporteActual) {
    mostrarMensaje('No hay datos para exportar', 'error');
    return;
  }
  
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Reporte de Ventas - Impresiones WJS', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Fecha del reporte: ${formatoFecha(new Date())}`, 20, 30);
    doc.text(`Rango: ${formatoFecha(new Date(filtros.fechaInicio))} - ${formatoFecha(new Date(filtros.fechaFin))}`, 20, 40);
    
    let yPos = 50;
    
    doc.setFontSize(16);
    doc.text('Resumen Rápido', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    const totalVentas = document.querySelector('#resumenTotalVentas h3')?.textContent || 'RD$ 0.00';
    const ganancia = document.querySelector('#resumenGanancia h3')?.textContent || 'RD$ 0.00';
    const inversion = document.querySelector('#resumenInversion h3')?.textContent || 'RD$ 0.00';
    const transacciones = document.querySelector('#resumenVentas h3')?.textContent || '0';
    
    doc.text(`Total Ventas: ${totalVentas}`, 30, yPos);
    yPos += 7;
    doc.text(`Ganancia Neta: ${ganancia}`, 30, yPos);
    yPos += 7;
    doc.text(`Para Reinversión: ${inversion}`, 30, yPos);
    yPos += 7;
    doc.text(`Total Transacciones: ${transacciones}`, 30, yPos);
    yPos += 15;
    
    doc.setFontSize(14);
    doc.text(`Reporte: ${filtros.tipoReporte.toUpperCase()}`, 20, yPos);
    yPos += 10;
    
    const tabla = document.querySelector('.tabla-reporte');
    if (tabla) {
      const headers = [];
      const rows = [];
      
      tabla.querySelectorAll('thead th').forEach(th => {
        headers.push(th.textContent);
      });
      
      tabla.querySelectorAll('tbody tr').forEach(tr => {
        const row = [];
        tr.querySelectorAll('td').forEach(td => {
          row.push(td.textContent);
        });
        if (row.length > 0) {
          rows.push(row);
        }
      });
      
      doc.autoTable({
        head: [headers],
        body: rows,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }
      });
    }
    
    doc.save(`reporte_ventas_${new Date().toISOString().slice(0,10)}.pdf`);
    mostrarMensaje('PDF exportado correctamente', 'exito');
    
  } catch (error) {
    console.error('Error exportando PDF:', error);
    mostrarMensaje('Error exportando PDF: ' + error.message, 'error');
  }
}

function exportarExcel() {
  if (!reporteActual) {
    mostrarMensaje('No hay datos para exportar', 'error');
    return;
  }
  
  try {
    const tabla = document.querySelector('.tabla-reporte');
    if (!tabla) {
      mostrarMensaje('No hay tabla para exportar', 'error');
      return;
    }
    
    const datos = [];
    const headers = [];
    
    tabla.querySelectorAll('thead th').forEach(th => {
      headers.push(th.textContent);
    });
    datos.push(headers);
    
    tabla.querySelectorAll('tbody tr').forEach(tr => {
      const fila = [];
      tr.querySelectorAll('td').forEach(td => {
        fila.push(td.textContent);
      });
      if (fila.length > 0) {
        datos.push(fila);
      }
    });
    
    const ws = XLSX.utils.aoa_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    
    XLSX.writeFile(wb, `reporte_ventas_${new Date().toISOString().slice(0,10)}.xlsx`);
    mostrarMensaje('Excel exportado correctamente', 'exito');
    
  } catch (error) {
    console.error('Error exportando Excel:', error);
    mostrarMensaje('Error exportando Excel: ' + error.message, 'error');
  }
}

// ================= FUNCIONES DE UTILIDAD =================
function toggleDetalleVendedor(sectionId) {
  const detalle = document.getElementById(sectionId);
  const icono = document.getElementById(`btn-${sectionId}`)?.querySelector('i');
  
  if (detalle) {
    if (detalle.style.display === 'none' || !detalle.style.display) {
      detalle.style.display = 'block';
      if (icono) {
        icono.classList.remove('fa-chevron-down');
        icono.classList.add('fa-chevron-up');
      }
    } else {
      detalle.style.display = 'none';
      if (icono) {
        icono.classList.remove('fa-chevron-up');
        icono.classList.add('fa-chevron-down');
      }
    }
  }
}

function mostrarMensaje(texto, tipo = 'info') {
  const mensajeAnterior = document.querySelector('.mensaje-flotante');
  if (mensajeAnterior) mensajeAnterior.remove();
  
  const mensaje = document.createElement('div');
  mensaje.className = `mensaje-flotante ${tipo}`;
  mensaje.textContent = texto;
  mensaje.style.cssText = `
    position: fixed; top: 20px; right: 20px; padding: 12px 20px;
    border-radius: 8px; z-index: 1000; font-weight: bold;
    background: ${tipo === 'error' ? '#f8d7da' : tipo === 'exito' ? '#d4edda' : '#d1ecf1'};
    color: ${tipo === 'error' ? '#721c24' : tipo === 'exito' ? '#155724' : '#0c5460'};
    border: 1px solid ${tipo === 'error' ? '#f5c6cb' : tipo === 'exito' ? '#c3e6cb' : '#bee5eb'};
  `;
  
  document.body.appendChild(mensaje);
  
  setTimeout(() => {
    if (mensaje.parentNode) mensaje.remove();
  }, 3000);
}

function formatoFecha(fecha) {
  if (!fecha) return 'Sin fecha';
  const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
  if (isNaN(fechaObj.getTime())) return 'Fecha inválida';
  
  return fechaObj.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatoFechaInput(fecha) {
  if (!fecha) return '';
  const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
  if (isNaN(fechaObj.getTime())) return '';
  
  const año = fechaObj.getFullYear();
  const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
  const dia = String(fechaObj.getDate()).padStart(2, '0');
  
  return `${año}-${mes}-${dia}`;
}

// ================= EXPORTAR FUNCIONES GLOBALES =================
window.mostrarDetallesVendedor = mostrarDetallesVendedor;
window.toggleDetalleVendedor = toggleDetalleVendedor;
window.generarReporte = generarReporte;
window.imprimirReportePersonalizado = imprimirReportePersonalizado;