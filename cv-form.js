let plantillaSeleccionada = "clasica";

function seleccionarPlantilla(nombre, el){
    plantillaSeleccionada = nombre;
    document.querySelectorAll(".plantilla").forEach(p => p.classList.remove("active"));
    el.classList.add("active");
}

/* EDUCACIÓN */
function agregarEducacion(){
    document.getElementById("educacion").insertAdjacentHTML("beforeend", filaEducacion());
}

function filaEducacion(){
    return `
    <div class="grid">
        <input placeholder="Institución">
        <input placeholder="Título obtenido">
        <button class="btn-eliminar" onclick="eliminar(this)">✖</button>
    </div>`;
}

/* EXPERIENCIA */
function agregarExperiencia(){
    document.getElementById("experiencia").insertAdjacentHTML("beforeend", filaExperiencia());
}

function filaExperiencia(){
    return `
    <div class="grid">
        <input placeholder="Empresa">
        <input placeholder="Función / Puesto">
        <button class="btn-eliminar" onclick="eliminar(this)">✖</button>
    </div>`;
}

/* CURSOS */
function agregarCurso(){
    document.getElementById("cursos").insertAdjacentHTML("beforeend", filaCurso());
}

function filaCurso(){
    return `
    <div class="grid">
        <input placeholder="Nombre del curso">
        <input placeholder="Institución">
        <button class="btn-eliminar" onclick="eliminar(this)">✖</button>
    </div>`;
}

/* REFERENCIAS */
function agregarReferencia(){
    const ref = document.getElementById("referencias");
    if(ref.children.length >= 3){
        alert("Máximo 3 referencias");
        return;
    }
    ref.insertAdjacentHTML("beforeend", filaReferencia());
}

function filaReferencia(){
    return `
    <div class="grid">
        <input placeholder="Nombre completo">
        <input placeholder="Teléfono">
        <button class="btn-eliminar" onclick="eliminar(this)">✖</button>
    </div>`;
}

/* ELIMINAR */
function eliminar(btn){
    btn.parentElement.remove();
}

/* GUARDAR */
function guardarCV(){
    const data = {
        usuario: document.getElementById("usuario").value,
        plantilla: plantillaSeleccionada
    };
    localStorage.setItem("cv_"+data.usuario, JSON.stringify(data));
    alert("Curriculum guardado correctamente");
}

/* PREVIEW */
function verPreview(){
    window.open("cv-preview.html", "_blank");
}
