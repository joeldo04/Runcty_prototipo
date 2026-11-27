// Lo que no se entrega en esta versión queda oculto, no borrado.
// Cambiar a true vuelve a mostrar Mis rutas, compartir ubicación, novedades, tutorial y demás.
export const SHOW_FUTURE = false

// Microsoft Clarity queda apagado hasta que el club autorice la analítica de uso.
export const CLARITY_ENABLED = false

// Funciones que sí se entregan aunque SHOW_FUTURE siga apagado (decisión con el club).
// Cada una se enciende por separado para no mostrar lo demás que sigue oculto.
// Entrenar: libre por defecto + "Elegir ruta" (solo rutas del club) con línea guía y valoración al terminar.
export const SHOW_ROUTE_TRAINING = true
// Distancia, tiempo y ritmo en vivo mientras se graba.
export const SHOW_LIVE_METRICS = true
// Botón "Reportar" durante el entrenamiento; el reporte se completa ahí o al terminar.
export const SHOW_TRAINING_REPORT = true
// Resumen: porcentaje de lo recorrido por condición de seguridad.
export const SHOW_CONDITION_BREAKDOWN = true
// "¿Olvidaste tu contraseña?" con su pantalla de recuperación (Google sigue oculto).
export const SHOW_PASSWORD_RECOVERY = true
// Pestaña "Mis reportes" con el estado de cada reporte.
export const SHOW_MY_REPORTS = true
