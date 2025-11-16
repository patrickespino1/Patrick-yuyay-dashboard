# Yuyay – Briefing de investigación política

Herramienta interna que centraliza la captura de datos, ejecución y visualización de informes de investigación política. Orquesta un agente de IA (vía flujos n8n) para analizar fuentes públicas: redes sociales, noticias, eventos mediáticos y opinión digital.

## Características principales

- Formulario guiado para configurar los datos del sujeto investigado.
- Panel de resultados dark-mode donde se muestra el informe completo generado por el agente.
- Historial de investigaciones guardadas con acceso rápido a informes anteriores.
- Panel interno con estado del agente (Online / Offline) y monitoreo básico.
- Modo Admin protegido con contraseña (PIN `3333`) para configurar webhooks de entrada y salida.
- Diseño OLED con branding personalizado de Yuyay.

## Arquitectura general

- **Frontend**: Next.js 16 (React 19) renderiza la aplicación, gestiona el formulario y la interfaz dark-mode.
- **Comunicación**: la app envía los formularios al webhook del flujo n8n. El flujo procesa la investigación usando IA y múltiples fuentes públicas.
- **Resultados**: los informes se reciben mediante un webhook de callback (`/api/results`). La UI procesa el JSON estructurado, actualiza el panel de resultados y registra la entrada en el historial.

## Requisitos previos

- Node.js 18.18+ (recomendado 20.x).
- npm (el proyecto incluye `package-lock.json`).
- Variables de entorno en `.env.local`:
  - `INPUT_WEBHOOK_URL`: URL del webhook de entrada (n8n).
  - `PUBLIC_APP_BASE_URL`: URL pública de esta app para construir el callback.
  - `RESULT_WEBHOOK_TOKEN`: token opcional para validar llamadas a `/api/results`.
  - `NEXT_PUBLIC_ENTRY_WEBHOOK`: referencia visible en el formulario.

## Instalación y ejecución

```bash
git clone <repo-url>
cd client
npm install
npm run dev
```

Visita `http://localhost:3000` para ver la aplicación en modo desarrollo.

## Configuración de webhooks

- El **Modo Admin** (botón de engrane en el panel interno) permite editar las URLs de entrada y salida sin tocar el código.
- PIN de acceso: `3333`.
- Los cambios se guardan localmente y se aplican de inmediato para los flujos n8n o cualquier orquestador conectado.

## Flujo de uso

1. Completa el formulario “Datos para disparar la investigación”.
2. Verifica que el estado indique “Online”.
3. Pulsa **Iniciar** para enviar la solicitud.
4. Espera a que el agente procese el caso y envíe el informe.
5. Revisa el panel “Resultados de la investigación” para ver el briefing completo.
6. Consulta el **Historial** para acceder a investigaciones anteriores o volver a cargar un informe.

## Roadmap / mejoras futuras

- Filtros avanzados y etiquetas en el historial.
- Exportación de informes a PDF y formatos editables.
- Integración con nuevas fuentes de datos (bases de datos públicas, hemerotecas).
- Panel de administración ampliado (roles, logs, auditoría).
- Panel de métricas y alertas en tiempo real.
- Automatización de recordatorios o flujos recurrentes.

## Licencia

Uso interno / privado de Yuyay. Consultar con el equipo legal antes de distribuir.
