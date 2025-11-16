import { NextResponse } from "next/server";
import { getResults, subscribe } from "@/lib/result-store";

export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      getResults()
        .slice()
        .reverse()
        .forEach(send);

      const unsubscribe = subscribe(send);

      controller.enqueue(
        encoder.encode(`event: heartbeat\ndata: connected\n\n`)
      );

      const ping = setInterval(() => {
        controller.enqueue(encoder.encode(`event: heartbeat\ndata: ping\n\n`));
      }, 25000);

      cleanup = () => {
        clearInterval(ping);
        unsubscribe();
      };
    },
    cancel() {
      cleanup?.();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
