
# AVM · Calculadora pronóstica (prototipo PWA)

## Estado científico y límites
Este paquete es un prototipo técnico. `model.json` conserva `status: "demo"` y parámetros de estimación nulos. No contiene coeficientes, puntos, supervivencia basal, centrado ni tabla de riesgo inventados. En ese estado, la aplicación bloquea la estimación y muestra DEMO. Las fixtures sintéticas de `tests.js` existen exclusivamente para probar la aritmética y nunca son importadas por la app.

## Contenido
- `index.html`: interfaz responsive, accesible y sin dependencias/CDN.
- `calc.js`: elegibilidad, validaciones, predictores y cálculo.
- `model.json`: configuración editable.
- `manifest.webmanifest`, `sw.js`, iconos PNG: instalación/offline.
- `tests.js`: cinco pruebas con fixture sintética DEMO.
- `package.json`: comando `npm test` (requiere Node.js).

## Ejecutar localmente y probar
La PWA y el service worker necesitan servir los archivos por HTTP(S), no abrir `index.html` con `file://`.
1. Instala Node.js LTS desde nodejs.org.
2. Descomprime el ZIP.
3. Abre una terminal en la carpeta y ejecuta `npm test`.
4. Para vista previa: `npx http-server .` (requiere instalar el paquete) o usa una extensión de servidor local. Para no añadir dependencias al producto, el runtime no carga bibliotecas externas.

## Instalar en Android
1. Publica la carpeta en un hosting HTTPS (GitHub Pages o Netlify).
2. Abre la URL en Chrome Android.
3. Menú ⋮ → **Instalar app** o **Añadir a pantalla de inicio**.
4. Acepta. Abre desde el icono; tras la primera carga, los recursos precacheados funcionan offline.
5. Para actualizar, incrementa `CACHE` en `sw.js` y vuelve a publicar.

## Generar APK/AAB
### Opción A: PWABuilder / TWA
1. Publica la PWA en HTTPS con dominio estable.
2. Abre PWABuilder y pega la URL publicada.
3. Ejecuta el análisis de PWA; corrige los avisos obligatorios.
4. Selecciona Android / Trusted Web Activity y genera el paquete.
5. Sigue el asistente de firma para crear/usar un keystore. Guarda el keystore y contraseñas en un lugar seguro; no los incluyas en el repositorio.
6. Configura Digital Asset Links (`/.well-known/assetlinks.json`) con el fingerprint SHA-256 del certificado de firma.
7. Genera APK para pruebas o AAB para Google Play; instala el APK en un dispositivo de prueba antes de distribuir.

### Opción B: Capacitor + Android Studio
1. Instala Node.js y Android Studio (incluye Android SDK).
2. En la carpeta del proyecto: `npm install @capacitor/core @capacitor/cli @capacitor/android`.
3. Ejecuta `npx cap init AVM org.example.avm --web-dir .`.
4. Ejecuta `npx cap add android` y `npx cap sync android`.
5. Ejecuta `npx cap open android`.
6. En Android Studio: Build → Generate Signed Bundle / APK → crea o selecciona keystore → genera APK/AAB.
7. No se ha generado una firma ni un APK en este paquete.

## Actualizar el modelo tras capítulo III (sin tocar código)
Editar únicamente `model.json`:
1. Cambiar `status` a `derivado` cuando el modelo y la escala estén formalmente derivados; usar `validado_interno` solo tras completar y documentar la validación interna.
2. Completar cada predictor con `beta` y/o `puntos`, conservando IDs exactos (`edad65`, `hta`, `dm`, `dosis240`, `qtd50`, `tpe100`, `fevi50`, `rwt042`).
3. Para Cox, usar `riskMethod: "cox"`, `baselineSurvival24` como S0(24), `lpCentrado` como LP de referencia, y β de la parametrización final. El cálculo es `1 - S0(24) ^ exp(LP - LP_centrado)`.
4. Alternativamente, `riskMethod: "points"` requiere `puntos` por predictor y `tablaPuntosRiesgo: [{"puntos":0,"riesgo24":...}, ...]` con riesgo en porcentaje entre 0 y 100, calibrada para 24 meses.
5. No cambiar cortes por conveniencia: confirmar la selección final de predictores/cortes, codificación, unidades y dirección de efecto con el equipo estadístico.
6. `status: "validado_externo"` solo tras validación en cohorte independiente.

## Esquema de `model.json`
- `status`: `demo | derivado | validado_interno | validado_externo`.
- `horizonteMeses`: horizonte de predicción (actualmente 24).
- `predictores[]`: `id`, `nombre`, `dominio`, `tipo`, `corte`, `beta`, `puntos`, `adverso`.
- `baselineSurvival24`: S0(24), nulo hasta estimación.
- `lpCentrado`: LP de referencia, nulo hasta definir.
- `riskMethod`: `cox | points`, nulo hasta seleccionar.
- `tablaPuntosRiesgo`: pares puntaje-riesgo calibrados, nulo hasta obtener.
- `categorias`: rangos porcentuales de la especificación inicial.
- `version`, `fecha`: trazabilidad.
- `dosisEquivalentes`: factores configurables; comprobar contra la referencia ESC 2022/protocolo antes de congelar.

## Qué debe aportar el doctorando del capítulo III
- β finales, codificación exacta y unidades de cada predictor.
- Conversión β→puntos y escala entera definitiva (si se adopta).
- S0(24) y definición de tiempo cero / población de riesgo; o tabla calibrada puntos→riesgo.
- LP de centrado / predictor de referencia.
- Tratamiento de muerte competitiva: estimando elegido (Cox causa-específica + CIF/Fine–Gray) y coherencia entre el modelo y el riesgo absoluto.
- C-index (Harrell/Uno), calibración a 24 meses, pendiente/intercepto y evaluación interna (bootstrap/cross-validation), intervalos de confianza.
- Número de eventos, EPV, manejo de datos faltantes, coeficientes penalizados y estabilidad.
- Validación externa si se pretende `validado_externo`.
- Definición operacional final de AVM, adjudicación, momento basal/dinámico y selección definitiva de variables.

## Nota metodológica
El capítulo II de la tesis especifica como modelo primario Cox causa-específica y, para el riesgo absoluto en presencia de muerte competitiva, Fine–Gray / incidencia acumulada. La ecuación de supervivencia Cox solicitada en el brief no debe confundirse automáticamente con la CIF de AVM cuando existe riesgo competitivo. El estadístico debe entregar una estimación absoluta coherente con el estimando clínico elegido antes de activar riesgo numérico.
\n\n## Equivalencia de antraciclinas\nLa Tabla 5 de la guía ESC 2022 confirma la relación de toxicidad cardiovascular doxorrubicina 1,0 y epirrubicina 0,8. La propia guía advierte que las dosis isoequivalentes se derivan de supervivientes pediátricos; el umbral de 240 mg/m² de este proyecto es un corte de la especificación de investigación y no debe confundirse con el umbral ESC de 250 mg/m² para considerar mayor riesgo cardiovascular. citeturn714829search0turn714829search1\n\n\n## Privacidad y exportación\nLa aplicación no incorpora analítica, servidor, identificadores ni historial persistente. No almacena evaluaciones; la comparación de tendencia vive solo en memoria durante la sesión. El resumen se imprime como PDF desde el navegador y puede exportarse como PNG o texto, sin datos identificables.\n