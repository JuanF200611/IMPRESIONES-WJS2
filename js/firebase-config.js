// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    update,
    remove,
    push,
    query,
    orderByChild,
    equalTo,
    onValue 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { 
    getStorage, 
    ref as storageRef, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyB3xTYP7wKgvFvySX8ZkHqm0Tly8y4LcM4",
    authDomain: "imprecioneswjs.firebaseapp.com",
    databaseURL: "https://imprecioneswjs-default-rtdb.firebaseio.com",
    projectId: "imprecioneswjs",
    storageBucket: "imprecioneswjs.appspot.com",
    appId: "1:923402098800:web:ef57d1e1bf1fdd758a3cb5"
};

let app;
let db;
let storage;

try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    storage = getStorage(app);
    console.log('Firebase inicializado correctamente');
} catch (error) {
    console.error('Error inicializando Firebase:', error);
}

export { 
    db, 
    storage, 
    ref, 
    set, 
    get, 
    update, 
    remove, 
    push, 
    query, 
    orderByChild, 
    equalTo,
    onValue,
    storageRef, 
    uploadBytes, 
    getDownloadURL 
};