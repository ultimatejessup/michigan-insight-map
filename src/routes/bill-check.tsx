import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { pageHead } from "@/lib/seo";
import { describeCounts, redactBillText, type PiiCounts } from "@/lib/bill/redact";
import { analyzeBill, type BillAnalysis } from "@/lib/bill/analyze";
import { SOURCES, type SourceKey } from "@/lib/bill/glossary";

export const Route = createFileRoute("/bill-check")({
  head: () =>
    pageHead(
      "/bill-check",
      "Bill Explainer — Michigan Essentials Watch",
      "Read your Michigan utility bill on your own device, check the text, then get a plain-language explanation of each charge. Nothing is sent anywhere.",
    ),
  component: BillCheckPage,
});

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_CHARS = 30_000;

type Step = "choose" | "reading" | "review";

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
  const items = ["Choose your bill", "Check the text", "See the explanation"];
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

const UTILITY_LABEL = {
  electric: "Electric",
  gas: "Natural gas",
  water: "Water / sewer",
  internet: "Internet",
  combined: "Electric and natural gas",
  unknown: "Not sure",
} as const;

function Explanation({ analysis, onBack }: { analysis: BillAnalysis; onBack: () => void }) {
  const a = analysis;
  const sourceKeys = [
    ...new Set(a.items.map((i) => i.entry?.source).filter((s): s is SourceKey => !!s)),
  ];
  const summary: [string, string][] = [
    ["Type of bill", UTILITY_LABEL[a.utility]],
    ...(a.period ? ([["Billing period", a.period]] as [string, string][]) : []),
    ...(a.totalDue
      ? ([[a.autopay ? "Amount to be withdrawn" : "Total due", a.totalDue]] as [string, string][])
      : []),
    ...(a.dueDate
      ? ([[a.autopay ? "Automatic withdrawal date" : "Due date", a.dueDate]] as [string, string][])
      : []),
    ...(a.currentCharges
      ? ([["Total current charges", a.currentCharges]] as [string, string][])
      : []),
  ];

  return (
    <section
      aria-live="polite"
      aria-label="Bill explanation"
      className="mt-8 rounded-lg border bg-card p-6 shadow-card"
    >
      <h2 className="mb-3 text-xl font-bold text-primary">Step 3 · Your explanation</h2>

      <h3 className="mt-4 text-lg font-bold">Quick summary</h3>
      <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {summary.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {k}
            </dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      {a.items.length === 0 ? (
        <p className="mt-4 rounded-md bg-surface p-3 text-sm">
          We couldn’t find charge lines with dollar amounts in this text. Go back and check that the
          lines and amounts from your bill are in the box, one charge per line.
        </p>
      ) : null}

      {a.items.length > 0 ? (
        <>
          <h3 className="mt-6 text-lg font-bold">Line items explained</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="py-2 pr-3">
                    Charge
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    Amount
                  </th>
                  <th scope="col" className="py-2">
                    What it means
                  </th>
                </tr>
              </thead>
              <tbody>
                {a.items.map((i, idx) => (
                  <tr key={`${i.label}-${idx}`} className="border-b align-top">
                    <td className="py-2 pr-3 font-semibold">{i.label}</td>
                    <td className="whitespace-nowrap py-2 pr-3">{i.amount}</td>
                    <td className="py-2">
                      {i.entry ? (
                        i.entry.meaning
                      ) : (
                        <span className="text-muted-foreground">
                          Not in our list of common charges. Ask your provider (see below).
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {a.flags.length > 0 ? (
        <>
          <h3 className="mt-6 text-lg font-bold">Charges you may want to ask about</h3>
          <ul className="mt-2 list-disc space-y-3 pl-5 text-sm">
            {a.flags.map((f, idx) => (
              <li key={`${f.id}-${idx}`}>
                <strong>
                  {f.title}
                  {f.label && f.amount ? ` (${f.label}, ${f.amount})` : ""}.
                </strong>{" "}
                {f.why}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {a.questions.length > 0 ? (
        <>
          <h3 className="mt-6 text-lg font-bold">Questions to ask your provider</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
            {a.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </>
      ) : null}

      <div className="mt-6 border-t pt-4 text-sm text-muted-foreground">
        <p>
          How this was made: on your device, from the text you checked, using a reviewed list of
          common Michigan bill terms. Amounts are copied as printed; we do not add up, estimate or
          look up any figures. Provider bills differ, so confirm anything important with your
          provider. This is general information, not legal or financial advice.
        </p>
        {sourceKeys.length > 0 ? (
          <p className="mt-2">
            Sources for the descriptions:{" "}
            {sourceKeys.map((k, idx) => (
              <span key={k}>
                {idx > 0 ? "; " : ""}
                <a
                  href={SOURCES[k].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  {SOURCES[k].label}
                </a>
              </span>
            ))}
            .
          </p>
        ) : null}
        <div className="mt-4">
          <Button type="button" variant="outlinePrimary" onClick={onBack}>
            Go back and edit the text
          </Button>
        </div>
      </div>
    </section>
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

  const [analysis, setAnalysis] = useState<BillAnalysis | null>(null);
  const [error, setError] = useState("");

  const reading = step === "reading";
  const currentStep: 1 | 2 | 3 = analysis ? 3 : step === "review" ? 2 : 1;

  const resetAll = () => {
    setStep("choose");
    setFile(null);
    setReviewText("");
    setHidden(EMPTY_COUNTS);
    setHideWords("");
    setAppliedWords([]);
    setReadNote("");
    setAnalysis(null);
    setError("");
  };

  const goToReview = (text: string, note: string) => {
    const r = redactBillText(text);
    setReviewText(r.text);
    setHidden(r.counts);
    setReadNote(note);
    setAppliedWords([]);
    setHideWords("");
    setAnalysis(null);
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
    setAnalysis(null);
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
    setAnalysis(null);
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
  };

  const explain = () => {
    const text = reviewText.trim();
    if (text.length < 40) {
      setError("There isn't enough text to explain yet. Add more of your bill.");
      return;
    }
    if (text.length > MAX_CHARS) {
      setError("That's too much text. Remove pages you don't need (for example the back page).");
      return;
    }
    setError("");
    setAnalysis(analyzeBill(text));
  };

  const hiddenSummary = describeCounts(hidden);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold text-primary sm:text-4xl">
        Understand your utility bill
      </h1>
      <p className="mt-3 max-w-2xl text-base text-muted-foreground">
        Choose your electric, gas, water or internet bill. We read it on your own device, you check
        the text, and we explain each charge in plain language and flag anything you may want to ask
        your provider about. Nothing you choose or type here is sent anywhere.
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
            Step 2 · Check the text
          </h2>
          <p className="mt-2 rounded-md bg-surface p-3 text-sm">
            <strong>Nothing leaves your device.</strong> Your bill is read and explained here in
            your browser. Check that the amounts below match your bill, because photos can be
            misread. You can change anything in the box.
          </p>

          {readNote ? <p className="mt-3 text-sm text-muted-foreground">{readNote}</p> : null}

          <div
            className="mt-4 rounded-md border-l-4 border-primary bg-surface p-3 text-sm"
            role="status"
          >
            {hiddenSummary.length ? (
              <>
                <strong>We hid {hiddenSummary.join(", ")}.</strong> They show as [REDACTED], which
                is handy if you share a screenshot.
              </>
            ) : (
              <strong>We didn’t find personal details to hide.</strong>
            )}{" "}
            Automatic hiding isn’t perfect, so remove anything else before you share this text with
            anyone. City, state and ZIP are left in on purpose.
          </div>

          <Label htmlFor="bill-text" className="mt-5 block text-base font-semibold">
            Your bill text
          </Label>
          <Textarea
            id="bill-text"
            value={reviewText}
            onChange={(e) => {
              setReviewText(e.target.value);
              setAnalysis(null);
            }}
            rows={16}
            spellCheck={false}
            className="mt-2 font-mono text-xs leading-relaxed"
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
              />
              <Button
                type="button"
                variant="outlinePrimary"
                onClick={applyHideWords}
                disabled={!splitWords(hideWords).length}
              >
                Hide these words
              </Button>
            </div>
          </div>

          <p className="mt-5 text-sm text-muted-foreground">
            Privacy: this page does not send your bill, or the text you type here, to our servers or
            to any AI service, and nothing is saved. The explanation is made in your browser from a
            reviewed list of common Michigan bill terms, so it can only explain charges it
            recognizes.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="accent"
              size="lg"
              onClick={explain}
              disabled={!reviewText.trim()}
            >
              Explain my bill
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={resetAll}>
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
      {analysis ? <Explanation analysis={analysis} onBack={() => setAnalysis(null)} /> : null}

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
