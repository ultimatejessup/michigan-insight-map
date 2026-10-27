import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { pageHead } from "@/lib/seo";
import {
  countRemainingPii,
  describeCounts,
  redactBillText,
  type PiiCounts,
} from "@/lib/bill/redact";

export const Route = createFileRoute("/bill-check")({
  head: () =>
    pageHead(
      "/bill-check",
      "Bill Explainer — Michigan Essentials Watch",
      "Read your Michigan utility bill on your own device, hide personal details, review the text, then get a plain-language explanation of each charge.",
    ),
  component: BillCheckPage,
});

const ERROR_MARKER = "\u0000ERROR:";
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_CHARS = 30_000;

type Step = "choose" | "reading" | "review";
type ExplainStatus = "idle" | "working" | "done" | "error" | "stopped";

const EMPTY_COUNTS: PiiCounts = { account: 0, address: 0, name: 0, phone: 0, email: 0, custom: 0 };

function addCounts(a: PiiCounts, b: PiiCounts): PiiCounts {
  return {
    account: a.account + b.account,
    address: a.address + b.address,
    name: a.name + b.name,
    phone: a.phone + b.phone,
    email: a.email + b.email,
    custom: a.custom + b.custom,
  };
}

const splitWords = (s: string) =>
  s
    .split(/[,\n]/)
    .map((w) => w.trim())
    .filter(Boolean);

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const items = ["Choose your bill", "Review the text", "Get the explanation"];
  return (
    <ol className="mt-6 grid gap-2 sm:grid-cols-3" aria-label="Steps">
      {items.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = n === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
              active
                ? "border-primary bg-surface font-semibold text-primary"
                : "text-muted-foreground"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                active ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
              aria-hidden="true"
            >
              {n}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

function BillCheckPage() {
  const [step, setStep] = useState<Step>("choose");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<{ message: string; fraction?: number | undefined }>({
    message: "",
  });
  const [reviewText, setReviewText] = useState("");
  const [hidden, setHidden] = useState<PiiCounts>(EMPTY_COUNTS);
  const [hideWords, setHideWords] = useState("");
  const [appliedWords, setAppliedWords] = useState<string[]>([]);
  const [readNote, setReadNote] = useState("");
  const [warnRemaining, setWarnRemaining] = useState(0);

  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<ExplainStatus>("idle");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const working = status === "working";
  const reading = step === "reading";
  const currentStep: 1 | 2 | 3 =
    output || working || status === "stopped" ? 3 : step === "review" ? 2 : 1;

  const resetAll = () => {
    abortRef.current?.abort();
    setStep("choose");
    setFile(null);
    setReviewText("");
    setHidden(EMPTY_COUNTS);
    setHideWords("");
    setAppliedWords([]);
    setReadNote("");
    setWarnRemaining(0);
    setOutput("");
    setStatus("idle");
    setError("");
  };

  const goToReview = (text: string, note: string) => {
    const r = redactBillText(text);
    setReviewText(r.text);
    setHidden(r.counts);
    setReadNote(note);
    setAppliedWords([]);
    setHideWords("");
    setWarnRemaining(0);
    setStep("review");
  };

  const onRead = async () => {
    if (!file) {
      setError("Choose a photo or PDF of your bill first.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Files must be smaller than 10 MB.");
      return;
    }
    setError("");
    setOutput("");
    setStatus("idle");
    setStep("reading");
    setProgress({ message: "Getting ready…" });
    try {
      const { extractBillText } = await import("@/lib/bill/extract");
      const result = await extractBillText(file, (message, fraction) =>
        setProgress({ message, fraction }),
      );
      if (result.text.replace(/\s/g, "").length < 40) {
        throw new Error("no-text");
      }
      const how =
        result.method === "pdf-text"
          ? "Read from the text inside your PDF."
          : "Read from your picture with on-device text recognition, which can misread numbers. Please check the amounts against your bill.";
      const more = result.truncated ? " Only the first pages were read." : "";
      goToReview(result.text, how + more);
    } catch (err) {
      console.error("bill read failed", err);
      setStep("choose");
      // Technical reason only (error type and message); never any bill text.
      const reason =
        err instanceof Error && err.message !== "no-text"
          ? ` (Technical detail: ${err.name}: ${err.message.slice(0, 120)})`
          : "";
      setError(
        `We couldn't read text from that file on this device. Try a clearer photo or a PDF, or choose “Paste the text instead”.${reason}`,
      );
    }
  };

  const onPaste = () => {
    setError("");
    setOutput("");
    setStatus("idle");
    setFile(null);
    goToReview(
      "",
      "Paste or type the text from your bill below. Personal details are hidden for you when you press the button.",
    );
  };

  const applyHideWords = () => {
    const words = splitWords(hideWords);
    if (!words.length) return;
    const r = redactBillText(reviewText, [...appliedWords, ...words]);
    setReviewText(r.text);
    setHidden((h) => addCounts(h, r.counts));
    setAppliedWords((w) => [...new Set([...w, ...words])]);
    setHideWords("");
    setWarnRemaining(0);
  };

  const hideAgain = () => {
    const r = redactBillText(reviewText, appliedWords);
    setReviewText(r.text);
    setHidden((h) => addCounts(h, r.counts));
    setWarnRemaining(0);
  };

  const explain = async (skipCheck = false) => {
    const text = reviewText.trim();
    if (text.length < 40) {
      setError("There isn't enough text to explain yet. Add more of your bill.");
      return;
    }
    if (text.length > MAX_CHARS) {
      setError("That's too much text. Remove pages you don't need (for example the back page).");
      return;
    }
    if (!skipCheck) {
      const remaining = countRemainingPii(text, appliedWords);
      if (remaining > 0) {
        setWarnRemaining(remaining);
        return;
      }
    }
    setWarnRemaining(0);
    setError("");
    setOutput("");
    setStatus("working");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/bill-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const idx = acc.indexOf(ERROR_MARKER);
        if (idx !== -1) {
          setOutput(acc.slice(0, idx));
          throw new Error(acc.slice(idx + ERROR_MARKER.length));
        }
        setOutput(acc);
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

  const hiddenSummary = describeCounts(hidden);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold text-primary sm:text-4xl">
        Understand your utility bill
      </h1>
      <p className="mt-3 max-w-2xl text-base text-muted-foreground">
        Choose your electric, gas, water or internet bill. We read it on your own device and hide
        personal details. You check the text, and only then does our AI-powered explainer walk
        through each charge in plain language and flag anything you may want to ask your provider
        about.
      </p>

      <Steps current={currentStep} />

      {/* Step 1 */}
      {step !== "review" ? (
        <section className="mt-6 rounded-lg border bg-card p-6 shadow-card" aria-labelledby="step1">
          <h2 id="step1" className="text-xl font-bold text-primary">
            Step 1 · Choose your bill
          </h2>
          <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Your photo or PDF stays on this device. We read the text here in your browser; the
              file itself is never uploaded.
            </span>
          </p>

          <Label htmlFor="bill-file" className="mt-5 block text-base font-semibold">
            Your bill (photo or PDF, up to 10 MB)
          </Label>
          <Input
            id="bill-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="mt-2"
            disabled={reading}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError("");
            }}
          />

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button variant="accent" size="lg" onClick={onRead} disabled={reading || !file}>
              {reading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {reading ? "Reading on this device…" : "Read my bill on this device"}
            </Button>
            <Button variant="outlinePrimary" size="lg" onClick={onPaste} disabled={reading}>
              Paste the text instead
            </Button>
          </div>

          {reading ? (
            <p role="status" aria-live="polite" className="mt-4 text-sm text-muted-foreground">
              {progress.message}
              {typeof progress.fraction === "number"
                ? ` ${Math.round(progress.fraction * 100)}%`
                : ""}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Step 2 */}
      {step === "review" ? (
        <section className="mt-6 rounded-lg border bg-card p-6 shadow-card" aria-labelledby="step2">
          <h2 id="step2" className="text-xl font-bold text-primary">
            Step 2 · Review the text
          </h2>
          <p className="mt-2 rounded-md bg-surface p-3 text-sm">
            <strong>Nothing has been sent yet.</strong> Only the text in the box below will be sent
            to our AI service, and only when you press “Send this text”. You can change anything in
            it.
          </p>

          {readNote ? <p className="mt-3 text-sm text-muted-foreground">{readNote}</p> : null}

          <div
            className="mt-4 rounded-md border-l-4 border-primary bg-surface p-3 text-sm"
            role="status"
          >
            {hiddenSummary.length ? (
              <>
                <strong>We hid {hiddenSummary.join(", ")}.</strong> They show as [REDACTED].
              </>
            ) : (
              <strong>We didn’t find personal details to hide.</strong>
            )}{" "}
            Automatic hiding isn’t perfect, so read the text below and remove anything else you
            don’t want to share. City, state and ZIP are left in on purpose.
          </div>

          <Label htmlFor="bill-text" className="mt-5 block text-base font-semibold">
            The text that will be sent
          </Label>
          <Textarea
            id="bill-text"
            value={reviewText}
            onChange={(e) => {
              setReviewText(e.target.value);
              setWarnRemaining(0);
            }}
            rows={16}
            spellCheck={false}
            className="mt-2 font-mono text-xs leading-relaxed"
            disabled={working}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {reviewText.length.toLocaleString()} of {MAX_CHARS.toLocaleString()} characters
          </p>

          <div className="mt-5">
            <Label htmlFor="hide-words" className="text-sm font-semibold">
              Hide more (optional): your name, street name or anything else, separated by commas
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <Input
                id="hide-words"
                value={hideWords}
                onChange={(e) => setHideWords(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyHideWords();
                  }
                }}
                placeholder="e.g. Jordan Smith, Maple"
                className="max-w-sm"
                disabled={working}
              />
              <Button
                type="button"
                variant="outlinePrimary"
                onClick={applyHideWords}
                disabled={working || !splitWords(hideWords).length}
              >
                Hide these words
              </Button>
            </div>
          </div>

          <p className="mt-5 text-sm text-muted-foreground">
            Privacy: this text is sent to our AI service only to create your explanation. It is not
            saved on this site. We can’t speak for how the AI provider handles data, so don’t send
            anything you’re not comfortable sharing.
          </p>

          {warnRemaining > 0 ? (
            <div
              role="alert"
              className="mt-4 rounded-lg border-l-4 border-destructive bg-surface p-4 text-sm"
            >
              <p className="font-semibold">
                This text still looks like it has {warnRemaining} personal detail
                {warnRemaining === 1 ? "" : "s"} (such as a number, address or name).
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button type="button" variant="accent" onClick={hideAgain}>
                  Hide them for me
                </Button>
                <Button type="button" variant="outlinePrimary" onClick={() => explain(true)}>
                  Send as it is
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="accent"
              size="lg"
              onClick={() => explain(false)}
              disabled={working || !reviewText.trim()}
            >
              {working ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {working ? "Reading your bill…" : "Send this text and explain my bill"}
            </Button>
            {working ? (
              <Button
                type="button"
                variant="outlinePrimary"
                size="lg"
                onClick={() => abortRef.current?.abort()}
              >
                Stop
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="lg" onClick={resetAll} disabled={working}>
              Start over
            </Button>
          </div>
        </section>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-6 rounded-lg border-l-4 border-destructive bg-surface p-4 text-base"
        >
          {error}
        </div>
      ) : null}

      {/* Step 3 */}
      {output || working ? (
        <section
          aria-live="polite"
          aria-label="Bill explanation"
          className="mt-8 rounded-lg border bg-card p-6 shadow-card"
        >
          <h2 className="mb-3 text-xl font-bold text-primary">Step 3 · Your explanation</h2>
          {output ? (
            <div className="bill-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Reading your bill.
              This can take up to a minute.
            </p>
          )}
          {status === "stopped" ? (
            <p className="mt-4 text-sm text-muted-foreground">Stopped.</p>
          ) : null}
          <p className="mt-6 border-t pt-4 text-sm text-muted-foreground">
            Source: the text you reviewed and sent, explained by AI. AI can make mistakes — check
            every figure against your bill before acting. This is general information, not legal or
            financial advice.
          </p>
        </section>
      ) : null}

      <p className="mt-10 text-base">
        Want your experience counted?{" "}
        <Link
          to="/survey"
          className="font-semibold text-primary underline underline-offset-2 hover:text-accent-strong"
        >
          Take the survey
        </Link>
        .
      </p>
    </div>
  );
}
