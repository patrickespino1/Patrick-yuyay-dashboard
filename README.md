# Yuyay Investigator – Sistema de investigación política asistida por IA

## Descripción general
Yuyay Investigator es una aplicación web dark-mode que permite a los analistas cargar los datos clave de una persona (nombre, país, redes sociales y contexto) para que un flujo automatizado en n8n ejecute una investigación asistida por IA. El flujo recopila y sintetiza información de medios, redes sociales y otras fuentes para devolver un informe político estructurado que la UI presenta inmediatamente, junto con su historial y controles administrativos.

## Arquitectura general
1. **Frontend (Next.js 16 + React 19, desplegado en Vercel)**  
   - Renderiza el formulario “Datos para disparar la investigación”, administra el estado del agente y muestra el informe completo.
2. **Orquestador (n8n en la nube)**  
   - Webhook de entrada: `https://dria02.app.n8n.cloud/webhook/c2ad2cd4-a402-47af-a955-d5ca8551381f`.  
   - Ejecuta búsquedas, consultas y llamadas a modelos de IA para construir el briefing.
3. **Callback hacia la UI**  
   - Al finalizar, n8n envía un POST a `https://yuyay-investigacion-politica.vercel.app/api/results`.  
   - El cuerpo es un arreglo con un único elemento que incluye `callbackUrl`, `meta` y `payload`.
4. **Visualización del briefing**  
   - La UI abre un `EventSource` a `/api/results/stream` para recibir el informe y actualizar el panel de resultados y el historial.

_Resumen del JSON devuelto por n8n:_  
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
    meta: {
      requestedAt: "...",
      ui: "Yuyay Investigator",
      sourceWebhookUrl: "..."
    }
  }
]
```

## Flujo de datos
- **profile**: biografía, cargos actuales y anteriores, noticias relevantes, controversias.
- **media_influence**: posicionamiento en medios, temas recurrentes, riesgos reputacionales, sectores con presencia.
- **social_opinion**: narrativa social, temas clave, emociones predominantes, arquetipos de audiencia, controversias sociales.
- **risks_opportunities**: riesgos en medios y redes, oportunidades en prensa y audiencia.
- **narrative_summary**: síntesis narrativa generada por el agente.
- **recommended_strategy**: líneas de acción sugeridas.
- **missing_data**: limitaciones o vacíos detectados durante la investigación.

El frontend transforma cada bloque en secciones visuales del panel “Resultados de la investigación”, con tarjetas, timelines y etiquetas que facilitan una lectura ejecutiva.

## Interfaz de usuario
1. **Formulario de entrada**  
   - Campos base (nombre, idioma, país, ocupación) y URLs de redes sociales.  
   - Extracción automática de usuarios/handles a partir de cada enlace.
2. **Panel “Resultados de la investigación”**  
   - Encabezado con el sujeto, partido, país y fecha del informe.  
   - Secciones: Perfil/biografía, cobertura mediática, opinión social, riesgos y oportunidades, narrativa y estrategia, datos faltantes.  
   - Animación “Investigando” mientras se espera la respuesta del agente.
3. **Historial de investigaciones**  
   - Lista de reportes previos con fecha y fuente, accesibles en un clic.
4. **Panel interno (Modo Admin)**  
   - Estado del stream (Online/Offline), URLs configurables para el webhook de entrada y el callback de salida, botón de copia y edición mediante PIN `3333`.

## Configuración y variables de entorno
Crear un archivo `.env.local` en el directorio `client/` con las variables necesarias:
```
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://dria02.app.n8n.cloud/webhook/c2ad2cd4-a402-47af-a955-d5ca8551381f
NEXT_PUBLIC_RESULTS_CALLBACK_URL=https://yuyay-investigacion-politica.vercel.app/api/results
RESULT_WEBHOOK_TOKEN=<opcional, para validar llamadas entrantes a /api/results>
```
- **NEXT_PUBLIC_N8N_WEBHOOK_URL**: URL del webhook de n8n que recibe las solicitudes (mostrada en la UI).  
- **NEXT_PUBLIC_RESULTS_CALLBACK_URL**: callback predeterminado que n8n llamará al finalizar. La UI permite editarlo desde el panel Admin si se necesita otro entorno.  
- Variables adicionales (solo servidor) se administran desde el dashboard de Vercel o n8n según corresponda.

## Ejecución en entorno local
1. Clonar el repositorio:
   ```bash
   git clone <URL-del-repo>
   cd Yuyay/client
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar `.env.local` con las variables descritas arriba.  
4. Ejecutar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
5. Abrir `http://localhost:3000` y usar el formulario para disparar investigaciones (se pueden apuntar a la instancia productiva o a otra instancia de n8n).

## Despliegue en Vercel
- El proyecto está conectado a GitHub; cada `git push` a la rama configurada dispara un deploy automático.  
- En el panel de Vercel configurar las mismas variables de entorno (`NEXT_PUBLIC_N8N_WEBHOOK_URL`, `NEXT_PUBLIC_RESULTS_CALLBACK_URL`, `RESULT_WEBHOOK_TOKEN`).  
- Verificar que `/api/results` sea accesible públicamente para que n8n pueda enviar los informes.  
- El dominio desplegado actual: `https://yuyay-investigacion-politica.vercel.app`.

## Mantenimiento y extensiones futuras
- **Extender el flujo n8n**: se pueden añadir pasos de análisis adicionales (otras fuentes de datos, más prompts de IA, scoring, etc.) conservando el mismo contrato JSON.  
- **Ajustes de UI**: el panel de resultados acepta nuevas secciones mientras el payload mantenga la estructura principal; basta con ampliar el componente `BriefingResults`.  
- **Automatizaciones**: es posible programar investigaciones recurrentes o notificaciones usando n8n sin modificar el frontend.  
- **Seguridad**: se puede reforzar la validación de `/api/results` con firmas o tokens personalizados si la organización lo requiere.

Este README resume los elementos clave para que un supervisor comprenda el objetivo del sistema, la relación entre la UI y n8n, y los pasos necesarios para operarlo y desplegarlo.
