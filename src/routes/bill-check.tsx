import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/bill-check")({
  head: () =>
    pageHead(
      "/bill-check",
      "Bill Explainer — Michigan Essentials Watch",
      "Upload a Michigan utility bill and get a plain-language explanation of each charge, plus questions to ask your provider.",
    ),
  component: BillCheckPage,
});

const ERROR_MARKER = "\u0000ERROR:";
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

type Status = "idle" | "working" | "done" | "error" | "stopped";

function BillCheckPage() {
  const [file, setFile] = useState<File | null>(null);
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Choose a bill to upload first.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Files must be smaller than 10 MB.");
      return;
    }
    setError("");
    setOutput("");
    setStatus("working");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const fd = new FormData();
      fd.append("bill", file);
      const res = await fetch("/api/bill-explain", {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        const idx = text.indexOf(ERROR_MARKER);
        if (idx !== -1) {
          setOutput(text.slice(0, idx));
          throw new Error(text.slice(idx + ERROR_MARKER.length));
        }
        setOutput(text);
      }
      setStatus("done");
    } catch (err) {
      if (controller.signal.aborted) {
        setStatus("stopped");
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    } finally {
      abortRef.current = null;
    }
  };

  const working = status === "working";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold text-primary sm:text-4xl">Understand your utility bill</h1>
      <p className="mt-3 max-w-2xl text-base text-muted-foreground">
        Upload a photo or PDF of your electric, gas, water or internet bill. Our AI-powered
        explainer walks through each charge in plain language and flags anything you may want to
        ask your provider about.
      </p>

      <form onSubmit={onSubmit} className="mt-8 rounded-lg border bg-card p-6 shadow-card">
        <Label htmlFor="bill" className="text-base font-semibold">
          Your bill (PDF, JPG, PNG or WebP, up to 10 MB)
        </Label>
        <label
          htmlFor="bill"
          className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-surface px-4 py-8 text-center hover:border-primary"
        >
          {file ? (
            <>
              <FileText className="h-8 w-8 text-primary" aria-hidden="true" />
              <span className="font-semibold">{file.name}</span>
              <span className="text-sm text-muted-foreground">Click to choose a different file</span>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-primary" aria-hidden="true" />
              <span className="font-semibold">Choose a file or take a photo</span>
              <span className="text-sm text-muted-foreground">Make sure every charge is readable</span>
            </>
          )}
        </label>
        <input
          id="bill"
          name="bill"
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={working}
        />

        <p className="mt-4 text-sm text-muted-foreground">
          Privacy: your bill is sent to our AI service only to create this explanation. It is not
          saved on this site. You can cover your account number before uploading.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="submit" variant="accent" size="lg" disabled={working || !file}>
            {working ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {working ? "Reading your bill…" : "Explain my bill"}
          </Button>
          {working ? (
            <Button type="button" variant="outlinePrimary" size="lg" onClick={() => abortRef.current?.abort()}>
              Stop
            </Button>
          ) : null}
        </div>
      </form>

      {error ? (
        <div role="alert" className="mt-6 rounded-lg border-l-4 border-destructive bg-surface p-4 text-base">
          {error}
        </div>
      ) : null}

      {output || working ? (
        <section aria-live="polite" aria-label="Bill explanation" className="mt-8 rounded-lg border bg-card p-6 shadow-card">
          {output ? (
            <div className="bill-markdown">
              <ReactMarkdown>{output}</ReactMarkdown>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Reading your bill. This
              can take up to a minute.
            </p>
          )}
          {status === "stopped" ? (
            <p className="mt-4 text-sm text-muted-foreground">Stopped.</p>
          ) : null}
          <p className="mt-6 border-t pt-4 text-sm text-muted-foreground">
            Source: your uploaded bill, explained by AI. AI can make mistakes — check every figure
            against your bill before acting. This is general information, not legal or financial
            advice.
          </p>
        </section>
      ) : null}

      <p className="mt-10 text-base">
        Want your experience counted?{" "}
        <Link to="/survey" className="font-semibold text-primary underline underline-offset-2 hover:text-accent-strong">
          Take the survey
        </Link>
        .
      </p>
    </div>
  );
}
