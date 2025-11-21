import { NextRequest, NextResponse } from "next/server";

const DEFAULT_N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ??
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ??
  "https://dria02.app.n8n.cloud/webhook/c2ad2cd4-a402-47af-a955-d5ca8551381f";

const RESULTS_CALLBACK_FALLBACK =
  process.env.NEXT_PUBLIC_RESULTS_CALLBACK_URL ??
  "https://yuyay-investigacion-politica.vercel.app/api/results";

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as {
    form: Record<string, string>;
    entryWebhook?: string;
    callbackUrl?: string;
  };

  if (!payload?.form) {
    return NextResponse.json(
      { error: "No se recibieron datos de formulario" },
      { status: 400 }
    );
  }

  const entryWebhook =
    typeof payload.entryWebhook === "string" &&
    payload.entryWebhook.trim().length > 0
      ? payload.entryWebhook.trim()
      : DEFAULT_N8N_WEBHOOK_URL;

  const callbackOverride =
    typeof payload.callbackUrl === "string" && payload.callbackUrl.trim().length > 0
      ? payload.callbackUrl.trim()
      : null;

  if (!entryWebhook) {
    return NextResponse.json(
      { error: "No hay webhook de entrada configurado" },
      { status: 500 }
    );
  }

  const origin =
    request.headers.get("origin") ??
    request.headers.get("referer") ??
    request.headers.get("x-forwarded-host");
  const callbackUrl =
    callbackOverride ??
    (origin
      ? new URL("/api/results", origin.startsWith("http") ? origin : `https://${origin}`).toString()
      : RESULTS_CALLBACK_FALLBACK);

  const proxyBody = {
    request: [payload.form],
    callbackUrl,
    requestedAt: new Date().toISOString(),
    ui: "Yuyay Investigator",
  };

  try {
    const forwarded = await fetch(entryWebhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(proxyBody),
    });

    const raw = await forwarded.text();
    let parsed: unknown = raw;

    try {
      parsed = JSON.parse(raw);
    } catch {
      // ignore - remote webhook can answer with texto plano
    }

    if (!forwarded.ok) {
      return NextResponse.json(
        {
          error: "El webhook remoto devolvió un error",
          status: forwarded.status,
          body: parsed,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      forwardedTo: entryWebhook,
      callbackUrl,
      response: parsed,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "No se pudo contactar al webhook remoto", details: `${error}` },
      { status: 500 }
    );
  }
}
