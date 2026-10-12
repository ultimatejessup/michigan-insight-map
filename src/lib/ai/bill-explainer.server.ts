import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, streamText } from "ai";

import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./run-id.server";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

export const MAX_BILL_BYTES = 10 * 1024 * 1024;
export const ALLOWED_BILL_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

/** Sentinel the browser looks for to show an error instead of partial output. */
export const STREAM_ERROR_MARKER = "\u0000ERROR:";

const INSTRUCTIONS = `You help Michigan residents understand a utility bill they uploaded (electric, natural gas, water/sewer, or internet).

Rules:
- Use ONLY what is printed on the bill. Never invent, estimate, or look up rates, amounts, dates, or averages. If something is unreadable or missing, say so plainly.
- Explain every line item in plain language at about an 8th-grade reading level.
- Flag charges the person may want to ask their provider about, such as: late fees, reconnection or disconnection fees, estimated (not actual) meter reads, sudden jumps versus a prior period shown on the bill, duplicate or unfamiliar charges, past-due balances carried forward, deposits, or optional add-ons/protection plans. Explain why each is worth asking about. Do not accuse the provider of wrongdoing.
- Do not mention any legislation, bill numbers, political parties, candidates, or policy proposals.
- If helpful context: electric and natural gas rates from investor-owned utilities are regulated by the Michigan Public Service Commission (MPSC); water and sewer rates in Michigan are generally set locally, not by the MPSC. Do not give phone numbers or web addresses.
- Do not repeat full account numbers, addresses, or other personal details from the bill; refer to them generically.
- This is general information, not legal or financial advice.
- If the upload is not a utility bill, say so briefly and stop.

Format your answer in Markdown with these sections:
## Quick summary
(provider type, billing period, total due, due date — only if printed)
## Line items explained
(a table: Charge | Amount | What it means)
## Charges you may want to ask about
(bulleted, each with why)
## Questions to ask your provider
(short numbered list the person can read aloud on a call)`;

function friendlyError(error: unknown): string {
  const status = APICallError.isInstance(error) ? error.statusCode : undefined;
  if (status === 402) {
    return "The bill explainer is temporarily unavailable because the site's AI credits have run out. Please try again later.";
  }
  if (status === 429) {
    return "The bill explainer is busy right now. Please wait a minute and try again.";
  }
  if (status === 403) {
    return "The bill explainer can't process this request right now.";
  }
  if (status === 400) {
    return "We couldn't read that file. Try a clearer photo or a PDF of your bill.";
  }
  return "Something went wrong while reading your bill. Please try again.";
}

export async function handleBillExplain(request: Request): Promise<Response> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return Response.json({ error: "The bill explainer is not configured yet." }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Please upload a bill file." }, { status: 400 });
  }

  const file = form.get("bill");
  if (!(file instanceof File)) {
    return Response.json({ error: "Please upload a bill file." }, { status: 400 });
  }
  if (!(ALLOWED_BILL_TYPES as readonly string[]).includes(file.type)) {
    return Response.json(
      { error: "Please upload a PDF, JPG, PNG or WebP file." },
      { status: 400 },
    );
  }
  if (file.size === 0 || file.size > MAX_BILL_BYTES) {
    return Response.json({ error: "Files must be smaller than 10 MB." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const result = streamText({
    model: provider.responses(MODEL),
    instructions: INSTRUCTIONS,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Please explain this utility bill and flag anything I may want to ask my provider about.",
          },
          {
            type: "file",
            data: bytes,
            mediaType: file.type,
            filename: file.type === "application/pdf" ? "bill.pdf" : undefined,
          },
        ],
      },
    ],
    abortSignal: request.signal,
    maxRetries: 0,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "medium",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let sawText = false;
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            sawText = true;
            controller.enqueue(encoder.encode(part.text));
          } else if (part.type === "error") {
            console.error("bill explainer stream error", part.error);
            controller.enqueue(encoder.encode(STREAM_ERROR_MARKER + friendlyError(part.error)));
            controller.close();
            return;
          }
        }
        if (!sawText) {
          controller.enqueue(
            encoder.encode(
              STREAM_ERROR_MARKER +
                "We couldn't produce an explanation for this file. Try a clearer photo or a PDF.",
            ),
          );
        }
        controller.close();
      } catch (error) {
        if (request.signal.aborted) {
          controller.close();
          return;
        }
        console.error("bill explainer failed", error);
        controller.enqueue(encoder.encode(STREAM_ERROR_MARKER + friendlyError(error)));
        controller.close();
      }
    },
  });

  return withLovableAiGatewayRunIdHeader(
    new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
      },
    }),
    runIdFetch,
  );
}
