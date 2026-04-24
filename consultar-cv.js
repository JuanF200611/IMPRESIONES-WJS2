window.buscarCV = function () {

    const id = document.getElementById("filtroId").value.toUpperCase();
    const nombre = document.getElementById("filtroNombre").value.toLowerCase();
    const cedula = document.getElementById("filtroCedula").value;

    const tabla = document.getElementById("tablaCV");
    tabla.innerHTML = "";

    // 🔹 DATOS DE PRUEBA (luego BD)
    const cvs = [
        {
            id: "WJS-001",
            foto: "ICONOS/user.png",
            cedula: "001-1234567-8",
            nombre: "Juan Pérez"
        },
        {
            id: "WJS-002",
            foto: "ICONOS/user.png",
            cedula: "002-7654321-9",
            nombre: "María Rodríguez"
        }
    ];

    const resultados = cvs.filter(cv =>
        cv.id.includes(id) &&
        cv.nombre.toLowerCase().includes(nombre) &&
        cv.cedula.includes(cedula)
    );

    if (resultados.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:20px;">
                    No se encontraron resultados
                </td>
            </tr>
        `;
        return;
    }

    resultados.forEach(cv => {
        tabla.innerHTML += `
            <tr>
                <td>${cv.id}</td>
                <td><img src="${cv.foto}"></td>
                <td>${cv.cedula}</td>
                <td>${cv.nombre}</td>
                <td>
                    <div class="acciones-btn">
                        <button class="btn-ver" onclick="verCV('${cv.id}')">👁</button>
                        <button class="btn-editar" onclick="editarCV('${cv.id}')">✏️</button>
                        <button class="btn-eliminar" onclick="eliminarCV('${cv.id}')">🗑</button>
                        <button class="btn-imprimir" onclick="imprimirCV('${cv.id}')">🖨</button>
                        <button class="btn-pdf" disabled>📄</button>
                    </div>
                </td>
            </tr>
        `;
    });
};

// 🔽 ACCIONES (por ahora demo)
window.verCV = id => alert("Ver CV " + id);
window.editarCV = id => alert("Editar CV " + id);
window.eliminarCV = id => confirm("¿Eliminar CV " + id + "?");
window.imprimirCV = id => alert("Imprimir CV " + id);
