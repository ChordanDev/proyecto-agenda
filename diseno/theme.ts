/**
 * Tema visual de "Agenda de iglesia" (React Native).
 * Valores tomados del diseño aprobado (ver diseno/pantallas/*.html).
 * Usar SIEMPRE estos tokens en lugar de repetir valores sueltos.
 */

export const colors = {
  // Marca (azules institucionales)
  azulMarca: '#2F557F',      // inicio del degradado, día seleccionado, toggles, radios activos
  azulOscuro: '#1B3550',     // botones principales, barra de navegación, burbujas del usuario, logo
  azulNavActivo: '#27496C',  // pastilla del ítem activo en la barra de navegación
  azulSuave: '#E3EAF2',      // botones secundarios, chips, avatares

  // Fondos
  fondoClaro: '#E6EBF1',     // fondo liso (Chat) y punto medio del degradado
  fondoOscuro: '#C9D4E0',    // final del degradado
  superficie: '#FFFFFF',     // tarjetas
  campo: '#EEF1F5',          // fondo de inputs dentro de tarjetas
  separador: '#EEEEEE',

  // Texto
  texto: '#222222',
  textoTitulo: '#000000',    // títulos del encabezado sobre el degradado
  textoSecundario: '#4A4A4A',
  textoTenue: '#717171',
  textoSobreOscuro: '#FFFFFF',

  // Estados
  peligro: '#B3123F',        // "Cerrar sesión", "Quitar de mi calendario"
  peligroSuave: '#FBE9EE',
  aviso: '#8A6400',          // ícono de alertas (sin encargado / sin pastor)
  avisoTexto: '#6B4E00',
  avisoSuave: '#FFF1CC',
  exitoSuave: '#E2F7EA',     // "Guardado en el calendario"
  radioInactivo: '#9AA3AE',
} as const;

/**
 * Degradado de fondo de las pantallas (usar con expo-linear-gradient).
 * El Chat NO lleva degradado: usa colors.fondoClaro liso.
 * locations: azulMarca arriba → fondoClaro a ~190 px → fondoOscuro al final.
 * Como locations es proporcional, calcularlo según el alto de pantalla:
 *   locations={[0, 190 / altoPantalla, 1]}
 */
export const degradadoFondo = {
  colors: [colors.azulMarca, colors.fondoClaro, colors.fondoOscuro],
  cortePx: 190,
} as const;

/** Categorías de evento: 4 énfasis + actividad regular. Cada una tiene forma y color. */
export type Forma = 'circulo' | 'triangulo' | 'd' | 'cuadrado' | 'rombo';

export const categorias = {
  S: { lema: 'Somos',      nombre: 'Identidad',           forma: 'circulo',   color: '#E8175D', fondoSuave: '#FDE7EF' },
  F: { lema: 'Formamos',   nombre: 'Liderazgo',           forma: 'triangulo', color: '#3AAFF0', fondoSuave: '#E3F3FD' },
  I: { lema: 'Integramos', nombre: 'Nuevas Generaciones', forma: 'd',         color: '#FFD84D', fondoSuave: '#FFF4CC' },
  H: { lema: 'Hacemos',    nombre: 'Discipulado',         forma: 'cuadrado',  color: '#2DC86E', fondoSuave: '#E2F7EA' },
  R: { lema: 'Actividad regular', nombre: 'Cultos de oración, Escuela Sabática…', forma: 'rombo', color: '#6B7685', fondoSuave: '#EEF1F5' },
} as const;
// Nota: el amarillo (#FFD84D) lleva un borde sutil rgba(0,0,0,0.15) para que se vea sobre blanco.
// Formas: dibujarlas con react-native-svg (triángulo, "D" = rectángulo con lado derecho semicircular, rombo = cuadrado rotado 45°).

export const fonts = {
  // Noto Sans (guía de marca adventista). Cargar con @expo-google-fonts/noto-sans.
  regular: 'NotoSans_400Regular',
  semibold: 'NotoSans_600SemiBold',
  bold: 'NotoSans_700Bold',
  // Oswald: solo para la fila de lemas de la bienvenida (SOMOS · FORMAMOS · …).
  lemas: 'Oswald_500Medium',
} as const;

export const fontSize = {
  tituloPantalla: 28, // h1 de pantallas internas (34 en la bienvenida)
  tituloEncabezado: 20,
  subtitulo: 15,
  cuerpo: 17,
  cuerpoGrande: 18,
  secundario: 15,
  chico: 14,
  nav: 13,
} as const;

export const radius = {
  tarjeta: 20,
  boton: 14,
  campo: 12,
  pastilla: 999,
  hoja: 24, // bottom sheet (panel de filtro)
} as const;

export const spacing = {
  pantallaHorizontal: 16,
  entreTarjetas: 14,
  tarjetaPadding: 16,
} as const;

/** Accesibilidad: público de todas las edades. */
export const accesibilidad = {
  alturaMinTactil: 44,     // ningún botón por debajo de esto
  alturaBotonPrincipal: 58,
  alturaCampo: 56,
} as const;
