import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* Datos del negocio */
export const SETTINGS = {
  business: "Dondecamila",
  whatsapp: "584161825375",   // formato internacional, sin +
  phone: "0416-1825375",
  currency: "$"
};

/* Colección de pedidos de Dondecamila (no usar "orders": ya la usa ServiDO) */
export const ORDERS = "dc_pedidos";

/* Colecciones de la tienda: "Nombre visible": "nombre exacto de la colección en Firestore"
   La tienda y el panel SOLO leen estas colecciones. Si una está vacía, no se muestra nada. */
export const COLLECTIONS = {
  "Hamburguesas": "hamburguesas",
  "Perros Calientes": "perros_calientes",
  "Pequeños": "pequenos",
  "Salchipapas": "salchipapas"
};

/* Configuración de Firebase */
const firebaseConfig = {
  apiKey: "AIzaSyA-8fZI-cBgMBqfMsXRFw8Q30tnllTPFE8",
  authDomain: "widestudio.firebaseapp.com",
  projectId: "widestudio",
  storageBucket: "widestudio.firebasestorage.app",
  messagingSenderId: "413590440117",
  appId: "1:413590440117:web:b23dcb333cb721e23816fc",
  measurementId: "G-2WM078QJG4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
