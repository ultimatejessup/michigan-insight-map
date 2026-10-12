import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { countyNames, issueOptions, utilityTypeOptions } from "@/data/utility-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const STORY_MAX = 1500;

const storySchema = z.object({
  utility_type: z.enum(["electric", "gas", "water", "broadband"]),
  utility_name: z.string().trim().max(120).optional(),
  county: z.string().trim().min(1, "Choose your county"),
  city: z.string().trim().max(80).optional(),
  story: z.string().trim().min(10, "Please tell us a little more").max(STORY_MAX),
  monthly_bill: z.string().trim().optional(),
  display_name: z.string().trim().max(80).optional(),
  email: z.string().trim().email("Enter a valid email").max(255).optional().or(z.literal("")),
  consent_public: z.literal(true, {
    errorMap: () => ({ message: "Consent is required to submit your story" }),
  }),
});

export function StoryForm() {
  const [utilityType, setUtilityType] = useState("electric");
  const [story, setStory] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [consentPublic, setConsentPublic] = useState(false);
  const [firstNameOnly, setFirstNameOnly] = useState(false);
  const [consentUpdates, setConsentUpdates] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const toggleIssue = (issue: string) =>
    setIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue],
    );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);

    // Honeypot: real people leave this empty.
    if ((fd.get("website") as string)?.length) return;

    const parsed = storySchema.safeParse({
      utility_type: utilityType,
      utility_name: fd.get("utility_name"),
      county: fd.get("county"),
      city: fd.get("city"),
      story,
      monthly_bill: fd.get("monthly_bill"),
      display_name: anonymous ? "" : fd.get("display_name"),
      email: fd.get("email"),
      consent_public: consentPublic,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] = issue.message;
      }
      setErrors(next);
      toast.error("Please check the highlighted fields.");
      return;
    }

    setErrors({});
    setSubmitted(true);
    form.reset();
    setStory("");
    setIssues([]);
    setConsentPublic(false);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div>
        {submitted ? (
          <div
            role="status"
            className="rounded-lg border-l-4 border-accent bg-surface p-5 text-base"
          >
            <p className="font-semibold">
              Thank you. Your story has been received and will appear after review.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Note: no database is connected yet, so this submission was not saved. Connect a
              database and stories will be stored for review.
            </p>
            <Button className="mt-4" variant="outlinePrimary" onClick={() => setSubmitted(false)}>
              Share another story
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Utility type (required)</legend>
              <div className="flex flex-wrap gap-2">
                {utilityTypeOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={`cursor-pointer rounded-md border px-3 py-2 text-sm font-medium ${
                      utilityType === opt.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background"
                    }`}
                  >
                    <input
                      type="radio"
                      name="utility_type"
                      value={opt.value}
                      checked={utilityType === opt.value}
                      onChange={() => setUtilityType(opt.value)}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="utility_name">Utility company name (optional)</Label>
                <Input id="utility_name" name="utility_name" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="city">City (optional)</Label>
                <Input id="city" name="city" className="mt-1" />
              </div>
            </div>

            <div>
              <Label htmlFor="county">County (required)</Label>
              <select
                id="county"
                name="county"
                defaultValue=""
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                aria-describedby={errors['county'] ? "county-error" : undefined}
              >
                <option value="">Select your county</option>
                {countyNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              {errors['county'] ? (
                <p id="county-error" className="mt-1 text-sm text-destructive">
                  {errors['county']}
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="story">Your story (required)</Label>
              <Textarea
                id="story"
                name="story"
                rows={6}
                maxLength={STORY_MAX}
                value={story}
                onChange={(e) => setStory(e.target.value)}
                className="mt-1"
                aria-describedby="story-count"
              />
              <p id="story-count" className="mt-1 text-xs text-muted-foreground">
                {story.length} / {STORY_MAX} characters
              </p>
              {errors['story'] ? (
                <p className="text-sm text-destructive">{errors['story']}</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="monthly_bill">Monthly bill amount (optional)</Label>
              <Input
                id="monthly_bill"
                name="monthly_bill"
                type="number"
                min="0"
                step="1"
                className="mt-1 max-w-40"
              />
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">What happened? (optional)</legend>
              <div className="flex flex-wrap gap-2">
                {issueOptions.map((issue) => (
                  <label
                    key={issue}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                      issues.includes(issue)
                        ? "border-accent-strong bg-accent text-accent-foreground"
                        : "border-input"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={issues.includes(issue)}
                      onChange={() => toggleIssue(issue)}
                    />
                    {issue}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="display_name">Name (optional)</Label>
                <Input
                  id="display_name"
                  name="display_name"
                  className="mt-1"
                  disabled={anonymous}
                />
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={anonymous}
                    onCheckedChange={(v) => setAnonymous(v === true)}
                  />
                  Stay anonymous
                </label>
              </div>
              <div>
                <Label htmlFor="email">Email (optional, never published)</Label>
                <Input id="email" name="email" type="email" className="mt-1" />
                {errors['email'] ? (
                  <p className="mt-1 text-sm text-destructive">{errors['email']}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-3 rounded-lg bg-surface p-4">
              <label className="flex items-start gap-3 text-sm">
                <Checkbox
                  className="mt-0.5"
                  checked={consentPublic}
                  onCheckedChange={(v) => setConsentPublic(v === true)}
                  aria-describedby="consent-error"
                />
                <span>
                  I agree that my story may be shared publicly on this site and used in
                  Liberation Caucus communications. (required)
                </span>
              </label>
              {errors['consent_public'] ? (
                <p id="consent-error" className="text-sm text-destructive">
                  {errors['consent_public']}
                </p>
              ) : null}
              <label className="flex items-start gap-3 text-sm">
                <Checkbox
                  className="mt-0.5"
                  checked={firstNameOnly}
                  onCheckedChange={(v) => setFirstNameOnly(v === true)}
                />
                <span>Please display my first name only.</span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox
                  className="mt-0.5"
                  checked={consentUpdates}
                  onCheckedChange={(v) => setConsentUpdates(v === true)}
                />
                <span>Keep me updated on this campaign.</span>
              </label>
            </div>

            <Button type="submit" variant="accent" size="lg">
              Submit my story
            </Button>

            <p className="max-w-2xl rounded-md border-l-4 border-primary bg-surface p-4 text-sm">
              Michigan ratepayers should have a direct voice in who regulates their utilities. We
              also support giving the state's utility regulator clear authority over broadband
              service.
            </p>
          </form>
        )}
      </div>

      <aside aria-label="Recent stories">
        <h3 className="font-display text-lg font-bold">Recent stories</h3>
        <div className="mt-3 rounded-lg border border-dashed bg-surface p-6">
          <p className="font-semibold">No stories published yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Approved stories will appear here with the utility type, county, and the storyteller's
            first name or "Anonymous". Be the first to share what you pay.
          </p>
        </div>
      </aside>
    </div>
  );
}
