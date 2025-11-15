# Patrick Yuyay Dashboard

Panel OLED para coordinar investigaciones políticas: captura datos del sujeto, dispara el webhook de entrada (n8n/IA) y muestra el reporte que envía el agente con visualizaciones amigables.

## Stack principal

- [Next.js 16](https://nextjs.org/) (App Router, API Routes y streaming SSE)
- React 19 + TypeScript
- Tailwind CSS 4 (modo `@theme inline`)
- Diseño negro OLED con acentos `#2DE0CB` / `#5B7CEF`

## Estructura

```
client/
├── src/app/page.tsx          // UI principal (form + resultados)
├── src/app/api/dispatch      // Proxy hacia el webhook del flujo
├── src/app/api/results       // Endpoint y stream SSE para los resultados
├── src/components/
│   └── investigation-report-view.tsx   // Vista visual del JSON del agente
└── src/lib/result-store.ts  // Almacenamiento in‑memory + EventEmitter
```

## Variables de entorno

Copiar `.env.local.example` a `.env.local` y ajustar:

| Variable | Descripción |
| --- | --- |
| `INPUT_WEBHOOK_URL` | Webhook de entrada (Producción en n8n). |
| `PUBLIC_APP_BASE_URL` | URL pública del dashboard (para construir `/api/results`). |
| `RESULT_WEBHOOK_TOKEN` | Token opcional para validar el webhook de resultados (x-webhook-secret). |
| `NEXT_PUBLIC_ENTRY_WEBHOOK` | Se muestra en la UI como referencia para el equipo. |

## Desarrollo local

```bash
cd client
npm install
npm run dev
```

La app queda en `http://localhost:3000`. El servidor guarda los eventos SSE en memoria, así que basta con exponer `POST /api/results` al flujo y mantener la pestaña abierta para ver las respuestas.

## Flujo n8n / IA

1. El formulario envía la ficha del sujeto a `/api/dispatch`.
2. El proxy reenvía la información al webhook configurado (`INPUT_WEBHOOK_URL`) incluyendo `callbackUrl`.
3. Cuando el agente termina, responde a `POST {callbackUrl}` (nuestro `/api/results`) con el JSON estructurado del informe.
4. `InvestigationReportView` lo parsea y renderiza tarjetas: perfil, influencers, noticias, controversias, opinión social, riesgos/opportunidades, etc.
5. El panel lateral guarda hasta 20 ejecuciones para referencia/trazabilidad.

## Despliegue en Vercel

1. Conecta el repositorio (`patrickespino1/Patrick-yuyay-dashboard`) a Vercel.
2. Ajusta el directorio raíz a `client/`.
3. Define las mismas variables de entorno en **Project Settings → Environment Variables**.
4. El comando y output por defecto (`npm run build` / `.next`) funcionan sin ajustes.

## Scripts útiles

| Script | Descripción |
| --- | --- |
| `npm run dev` | Desarrollo con hot reload. |
| `npm run build` | Build de producción (Next.js). |
| `npm start` | Sirve el build generado. |

---

Mantén abierta la sección de resultados para monitorear el SSE; si necesitas resetear la UI, usa el botón “Nueva investigación” cuando el reporte ya esté renderizado. Para integrar nuevos campos del agente, amplía `InvestigationReport` y añade tarjetas en `InvestigationReportView`.
