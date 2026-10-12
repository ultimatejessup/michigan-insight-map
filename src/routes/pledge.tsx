import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/pledge")({
  head: () =>
    pageHead(
      "/pledge",
      "Pledge to Support an Elected Michigan Public Service Commission",
      "Elected officials and candidates can publicly pledge support for an elected Michigan Public Service Commission.",
    ),
  component: PledgePage,
});

const pledgeSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(120),
  office: z.string().trim().min(1, "Office is required").max(160),
  jurisdiction: z.string().trim().min(1, "Jurisdiction / district is required").max(160),
  party: z.string().trim().max(60).optional(),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(30).optional(),
  public_statement: z.string().trim().max(1500).optional(),
  signature_name: z.string().trim().min(1, "Type your name as your signature").max(120),
  signed_at: z.string().min(1, "Date is required"),
  consent_public: z.literal(true, {
    errorMap: () => ({ message: "Consent is required to sign" }),
  }),
});

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1">{children}</div>
      {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function PledgePage() {
  const today = new Date().toISOString().slice(0, 10);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if ((fd.get("website") as string)?.length) return;
    const parsed = pledgeSchema.safeParse({
      ...Object.fromEntries(fd.entries()),
      consent_public: consent,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] = i.message;
      setErrors(next);
      toast.error("Please check the highlighted fields.");
      return;
    }
    setErrors({});
    setDone(true);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold text-primary sm:text-4xl">
        Pledge to Support an Elected Michigan Public Service Commission
      </h1>

      <div className="mt-6 space-y-4 text-base">
        <p>
          Michigan's Public Service Commission, the body that sets your electric, gas, and water
          rates, is entirely appointed by the Governor, not elected. Michigan ratepayers have no
          direct vote on who makes these decisions.
        </p>
        <p>
          Legislation currently pending in Michigan, HB 5676–5677, would replace the current
          3-member appointed commission with a 5-member nonpartisan elected commission beginning
          January 1, 2029.
        </p>
        <p>
          Elected officials and candidates for office are invited to publicly pledge their support
          for an elected Public Service Commission. Your response will be shared on this site and
          may be used in Liberation Caucus communications about this reform.
        </p>
      </div>

      <blockquote className="mt-8 rounded-lg border border-l-8 border-l-primary bg-card p-6 text-lg leading-relaxed">
        I support reforming the Michigan Public Service Commission from an appointed body to an
        elected one, so that Michigan ratepayers have direct accountability over who regulates
        their utility rates and service quality. I acknowledge HB 5676–5677 as current legislation
        advancing this goal, and I commit to supporting efforts, through this legislation or future
        proposals, to establish an elected commission and to communicating the importance of this
        reform to my constituents and colleagues.
      </blockquote>

      <div className="mt-4 rounded-lg bg-surface p-5 text-sm leading-relaxed">
        The Liberation Caucus is a non-partisan, non-profit organization. Signing this pledge does
        not constitute an endorsement of any signer by the Liberation Caucus or Liberation Caucus
        PAC, nor does it constitute the signer's endorsement of any other Liberation Caucus
        position, campaign, or candidate. This pledge reflects support for the concept of an
        elected Michigan Public Service Commission, and acknowledgment of HB 5676–5677 as current
        legislation toward that goal. It does not bind the signer to every specific provision of
        that legislation or to any future proposal.
      </div>

      <section aria-labelledby="sign-heading" className="mt-10">
        <h2 id="sign-heading" className="text-2xl font-bold">
          Sign the pledge
        </h2>
        {done ? (
          <div role="status" className="mt-4 rounded-lg border-l-4 border-accent bg-surface p-5">
            <p className="font-semibold">Thank you. Your pledge has been received and will appear after review.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Note: the database isn't connected yet, so this pledge was not saved.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <Field id="full_name" label="Full name (required)" error={errors['full_name']}>
              <Input id="full_name" name="full_name" autoComplete="name" />
            </Field>
            <Field id="office" label="Current office held, or office currently seeking (required)" error={errors['office']}>
              <Input id="office" name="office" placeholder="e.g., State Representative, District 8" />
            </Field>
            <Field id="jurisdiction" label="Jurisdiction / district (required)" error={errors['jurisdiction']}>
              <Input id="jurisdiction" name="jurisdiction" />
            </Field>
            <Field id="party" label="Political party (optional, for internal tracking only — never shown publicly)">
              <Input id="party" name="party" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="email" label="Email address (required, not published)" error={errors['email']}>
                <Input id="email" name="email" type="email" autoComplete="email" />
              </Field>
              <Field id="phone" label="Phone number (optional, not published)">
                <Input id="phone" name="phone" type="tel" autoComplete="tel" />
              </Field>
            </div>
            <Field
              id="public_statement"
              label="Optional public statement: In your own words, why does an elected MPSC matter to your constituents?"
            >
              <Textarea id="public_statement" name="public_statement" rows={4} maxLength={1500} />
            </Field>
            <label className="flex items-start gap-3 rounded-lg bg-surface p-4 text-sm">
              <Checkbox className="mt-0.5" checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
              <span>
                I agree that my name, office, and (if provided) statement above may be published on
                this site and used in Liberation Caucus communications. (required)
              </span>
            </label>
            {errors['consent_public'] ? <p className="text-sm text-destructive">{errors['consent_public']}</p> : null}
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Field id="signature_name" label="Typed name as signature (required)" error={errors['signature_name']}>
                <Input id="signature_name" name="signature_name" className="font-display italic" />
              </Field>
              <Field id="signed_at" label="Date" error={errors['signed_at']}>
                <Input id="signed_at" name="signed_at" type="date" defaultValue={today} />
              </Field>
            </div>
            <Button type="submit" variant="accent" size="lg">
              Sign the pledge
            </Button>
          </form>
        )}
      </section>

      <section aria-labelledby="signers-heading" className="mt-12">
        <h2 id="signers-heading" className="text-2xl font-bold">
          Signers
        </h2>
        <div className="mt-3 rounded-lg border border-dashed bg-surface p-6">
          <p className="font-semibold">No signers published yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Approved signers will appear here with their name, office, jurisdiction and optional
            statement.
          </p>
        </div>
      </section>

      <aside className="mt-12 rounded-lg bg-muted p-5 text-muted-foreground">
        <p className="font-semibold text-foreground">Pledge #2 is coming soon.</p>
        <p className="mt-1 text-sm">
          Additional pledges on the structure of the commission will be announced after this year's
          legislative session.
        </p>
      </aside>
    </div>
  );
}
