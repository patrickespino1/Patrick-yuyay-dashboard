import { NextRequest, NextResponse } from "next/server";
import { addResult, getResults } from "@/lib/result-store";

const RESULT_WEBHOOK_TOKEN = process.env.RESULT_WEBHOOK_TOKEN;

function extractIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return (request as NextRequest & { ip?: string }).ip ?? null;
}

export async function POST(request: NextRequest) {
  if (RESULT_WEBHOOK_TOKEN) {
    const incoming = request.headers.get("x-webhook-secret");
    if (incoming !== RESULT_WEBHOOK_TOKEN) {
      return NextResponse.json(
        { error: "Cabecera x-webhook-secret inválida" },
        { status: 401 }
      );
    }
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    const rawText = await request.text();
    payload = { raw: rawText, parserError: `${error}` };
  }

  const entry = addResult(payload, { sourceIp: extractIp(request) });

  return NextResponse.json({ ok: true, entryId: entry.id });
}

export async function GET() {
  return NextResponse.json({ results: getResults() });
}
