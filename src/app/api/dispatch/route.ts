import { NextRequest, NextResponse } from "next/server";

const INPUT_WEBHOOK_URL = process.env.INPUT_WEBHOOK_URL;
const PUBLIC_APP_BASE_URL = process.env.PUBLIC_APP_BASE_URL;

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as {
    form: Record<string, string>;
    entryWebhook?: string;
  };

  if (!payload?.form) {
    return NextResponse.json(
      { error: "No se recibieron datos de formulario" },
      { status: 400 }
    );
  }

  const origin = request.headers.get("origin");
  const callbackBase = PUBLIC_APP_BASE_URL ?? origin;
  const callbackUrl = callbackBase
    ? new URL("/api/results", callbackBase).toString()
    : null;

  const entryWebhook =
    typeof payload.entryWebhook === "string" &&
    payload.entryWebhook.trim().length > 0
      ? payload.entryWebhook.trim()
      : INPUT_WEBHOOK_URL;

  if (!entryWebhook) {
    return NextResponse.json(
      { error: "No hay webhook de entrada configurado" },
      { status: 500 }
    );
  }

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
