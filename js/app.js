// ELEMENTOS
const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");
const modal = document.getElementById("modal");

const nombre = document.getElementById("nombre");
const apellido = document.getElementById("apellido");
const telefono = document.getElementById("telefono");
const direccion = document.getElementById("direccion");
const usuarioGen = document.getElementById("usuarioGen");
const claveReg = document.getElementById("claveReg");

const loginUser = document.getElementById("loginUser");
const loginPass = document.getElementById("loginPass");

const mUser = document.getElementById("mUser");
const mPass = document.getElementById("mPass");

// DATA
let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

// MOSTRAR REGISTRO
function mostrarRegistro(){
    loginBox.classList.add("hidden");
    registerBox.classList.remove("hidden");

    usuarioGen.value = "WJS-" + String(usuarios.length + 1).padStart(4,"0");
}

// MOSTRAR LOGIN
function mostrarLogin(){
    registerBox.classList.add("hidden");
    loginBox.classList.remove("hidden");
}

// REGISTRAR
function registrar(){
    if(!nombre.value || !apellido.value || !telefono.value || !direccion.value || !claveReg.value){
        alert("Completa todos los campos");
        return;
    }

    usuarios.push({
        usuario: usuarioGen.value,
        clave: claveReg.value,
        nombre: nombre.value
    });

    localStorage.setItem("usuarios", JSON.stringify(usuarios));

    mUser.innerText = usuarioGen.value;
    mPass.innerText = claveReg.value;

    modal.classList.remove("hidden");
}

// CERRAR MODAL
function cerrarModal(){
    modal.classList.add("hidden");
    limpiarRegistro();
    mostrarLogin();
}

// LIMPIAR FORM
function limpiarRegistro(){
    nombre.value="";
    apellido.value="";
    telefono.value="";
    direccion.value="";
    claveReg.value="";
}

// LOGIN
function login(){
    const encontrado = usuarios.find(u =>
        u.usuario === loginUser.value &&
        u.clave === loginPass.value
    );

    if(encontrado){
        alert("✅ Bienvenido " + encontrado.nombre);
    }else{
        alert("❌ Usuario o contraseña incorrectos");
    }
}
