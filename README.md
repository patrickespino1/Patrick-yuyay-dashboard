# Yuyay Investigator – Sistema de investigación política asistida por IA

## 1. Descripción general
Yuyay Investigator es un tablero OLED dark-mode que centraliza la captura, ejecución y presentación de investigaciones políticas. El usuario ingresa datos clave del sujeto (perfil público, país, redes sociales) y la app dispara un flujo en n8n que consulta fuentes abiertas, procesa modelos de IA y devuelve un briefing estratégico que se visualiza en tiempo real en la UI.

## 2. Problema que resuelve
- Reduce el tiempo para consolidar inteligencia política proveniente de múltiples canales (prensa, redes, narrativas).
- Evita duplicidad de esfuerzos manuales para compilar reportes ad hoc.
- Ofrece un formato unificado y accionable para decisiones de comunicación o investigación.

## 3. Alcance y segmento objetivo
- Equipos de análisis político, comunicación estratégica y auditoría reputacional.
- Think tanks y células de investigación que requieren resúmenes rápidos sobre figuras públicas.
- Consultoras o agencias que necesitan monitorear narrativas sociales y riesgos.

## 4. Ejemplos de uso
1. **Briefing exprés** antes de reuniones con actores políticos.
2. **Monitoreo diario** de reputación en medios y redes.
3. **Evaluación de riesgos** para definir líneas estratégicas de discurso.
4. **Auditoría de campaña** previa a anuncios o debates.

## 5. Límites y buenas prácticas (qué evitar)
- No utilizarlo como fuente única para decisiones legales sin verificación adicional.
- Evitar cargar datos sensibles que excedan el alcance público del sujeto.
- No sustituye entrevistas o investigación cualitativa profunda: es un insumo inicial.
- Requiere supervisión humana para contextualizar hallazgos.

## 6. Recomendaciones de estandarización, trabajo en equipo y seguridad
- **Estandarización**: definir plantillas de prompts/formularios compartidos para capturar variables uniformes (ej. país, cargo, periodo).
- **Trabajo en equipo**: documentar en cada investigación qué miembro la disparó y compartir hallazgos vía historial para evitar duplicados.
- **Seguridad**:
  - Mantener las URLs del webhook en entornos seguros (solo panel Admin con PIN `3333`).
  - Limitar quién tiene acceso al despliegue y a las variables de entorno en Vercel/n8n.
  - Auditar periódicamente los tokens y cabeceras (`RESULT_WEBHOOK_TOKEN`) para validar callbacks.
- **Información compartida**: usar canales cifrados para remitir enlaces del informe, y revocar accesos cuando un colaborador deja el equipo.

## 7. Arquitectura general y flujo técnico
1. **UI (Next.js 16 / React 19 en Vercel)**  
   - Formulario “Datos para disparar la investigación”.  
   - Panel “Resultados de la investigación” (virtualizado, responsive, lazy-loaded).  
   - Historial persistente y panel Admin para URLs.
2. **Webhook de entrada (n8n cloud)**  
   - URL por defecto y recomendada:  
     `https://dria02.app.n8n.cloud/webhook/c2ad2cd4-a402-47af-a955-d5ca8551381f`  
   - Se puede sobreescribir desde el panel oculto; prioridad:  
     1) Webhook personalizado guardado  
     2) Variable `NEXT_PUBLIC_WEBHOOK_URL`  
     3) Constante `DEFAULT_WEBHOOK_URL`.
3. **Ejecución en n8n**  
   - Búsquedas abiertas + modelos de IA que generan el JSON del briefing.
4. **Callback a la UI**  
   - n8n envía el reporte a `https://yuyay-investigacion-politica.vercel.app/api/results`.  
   - La UI consume los datos vía SSE (`/api/results/stream`) y actualiza el panel.

_Estructura del JSON devuelto:_
```
[
  {
    callbackUrl: ".../api/results",
    payload: {
      profile: {...},
      media_influence: {...},
      social_opinion: {...},
      risks_opportunities: {...},
      narrative_summary: "...",
      recommended_strategy: "...",
      missing_data: [...]
    },
    meta: { requestedAt: "...", ui: "Yuyay Investigator", sourceWebhookUrl: "..." }
  }
]
```

## 8. Flujo UI → n8n → UI (detallado)
1. El usuario completa el formulario y pulsa **Iniciar**.  
   - La app arma el payload (`request`, `callbackUrl`, `requestedAt`, `ui`) y lo envía al webhook activo.  
2. n8n procesa la investigación, recopila datos con IA y genera el JSON.  
3. El flujo n8n responde al `callbackUrl` con el arreglo anterior.  
4. `/api/results` normaliza el payload y lo guarda en el store SSE.  
5. El `EventSource` del frontend recibe el briefing, actualiza el historial y el panel principal.  
6. La vista usa virtualización, lazy sections e IntersectionObserver para renderizar cada bloque (Perfil, Medios, Opinión social, Riesgos, Narrativa, Estrategia, Datos faltantes) sin lag ni pantallas negras.

## 9. Configuración y variables de entorno
Crear `client/.env.local` con:
```
NEXT_PUBLIC_WEBHOOK_URL=https://dria02.app.n8n.cloud/webhook/c2ad2cd4-a402-47af-a955-d5ca8551381f
NEXT_PUBLIC_RESULTS_CALLBACK_URL=https://yuyay-investigacion-politica.vercel.app/api/results
RESULT_WEBHOOK_TOKEN=<opcional, para validar llamadas entrantes a /api/results>
```
- Si `NEXT_PUBLIC_WEBHOOK_URL` no existe, la app usa `DEFAULT_WEBHOOK_URL`.  
- Los usuarios avanzados pueden fijar manualmente otro webhook desde el panel Admin; se persiste en `localStorage` y tiene prioridad sobre cualquier valor global.

## 10. Ejecución local
```bash
git clone https://github.com/patrickespino1/Patrick-yuyay-dashboard.git
cd Yuyay/client
npm install
npm run dev
# Abrir http://localhost:3000
```
Recomendado configurar `.env.local` para apuntar al webhook productivo o a una instancia propia de n8n. El Historial y las URLs personalizadas se guardan en el navegador.

## 11. Despliegue en Vercel
- La app está conectada al repositorio en GitHub; **cada push a `main` dispara automáticamente un despliegue**.  
- En Vercel, definir las variables de entorno (mismas que en local).  
- Confirmar que n8n puede alcanzar `https://yuyay-investigacion-politica.vercel.app/api/results`.  
- Si se requiere otro entorno (staging), basta con crear otro webhook en n8n y cambiarlo desde el panel Admin o en la configuración del entorno correspondiente.

## 12. Estado actual del frontend
- Panel de resultados optimizado con virtualización manual (`VirtualizedItems`), IntersectionObserver y memoización para scroll fluido.  
- Diseño responsive mobile-first, sin scroll horizontal y con jerarquía visual clara (Perfil, Medios, Opinión social, Riesgos, Narrativa).  
- Panel Admin con PIN `3333` que permite editar las URLs de entrada/salida sin tocar el código, respetando el orden de prioridad.  
- Historial persistente que permite recuperar investigaciones previas y volver a cargarlas al instante.

Con esta estructura, un supervisor puede entender claramente los objetivos del proyecto, sus límites operativos y cómo coordinar al equipo para mantenerlo vigente y seguro.
