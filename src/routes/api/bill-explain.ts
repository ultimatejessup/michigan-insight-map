import { createFileRoute } from "@tanstack/react-router";
import { handleBillExplain } from "@/lib/ai/bill-explainer.server";

export const Route = createFileRoute("/api/bill-explain")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Same-origin only: reject cross-site form posts.
        const origin = request.headers.get("origin");
        if (origin && origin !== new URL(request.url).origin) {
          return Response.json({ error: "Not allowed." }, { status: 403 });
        }
        try {
          return await handleBillExplain(request);
        } catch (error) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          throw error;
        }
      },
    },
  },
});
