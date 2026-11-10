/* ====== EDITA AQUÍ ====== */
window.CONFIG = {
  whatsapp: "58XXXXXXXXXX",   // Tu número con código de país, sin + ni espacios. Ej: 584121234567
  currency: "$"
};

/* soldOut: true  -> aparece "Agotado" y no se puede pedir
   badge: texto de la etiqueta (ej. "LA FAVORITA")
   image: ruta dentro de /images */
window.PRODUCTS = [
  { id: 1, name: "Hamburguesa Wasaro Suprema", category: "Hamburguesas", price: 8.5,
    description: "Doble carne, queso cheddar, tocineta crocante y lechuga fresca.",
    image: "images/hamburguesa.jpg", badge: "LA FAVORITA", soldOut: false },
  { id: 2, name: "Perrito Caliente Especial", category: "Perritos Calientes", price: 5,
    description: "Salchicha premium, repollo, cebolla caramelizada y salsas de la casa.",
    image: "images/perrito.jpg", badge: "", soldOut: false },
  { id: 3, name: "Salchipapa Mixta", category: "Combos", price: 7,
    description: "Papas, salchichas, queso rallado y salsas.",
    image: "images/salchipapa.jpg", badge: "", soldOut: true },
  { id: 4, name: "Combo Quesitos Urbanos", category: "Combos", price: 6,
    description: "Bolitas de queso fundido con dip cremoso.",
    image: "images/quesitos.jpg", badge: "", soldOut: false }
];
