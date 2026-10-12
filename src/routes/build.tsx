import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/build")({
  head: () => pageHead("/build", "Build — Join Michigan Essentials Watch", "Join the Michigan Essentials Watch advocacy campaign and request newsletter or SMS updates."),
  component: BuildPage,
});

function BuildPage() {
  const [campaign, setCampaign] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [sms, setSms] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!campaign && !newsletter && !sms) {
      setError("Choose at least one way to stay involved.");
      return;
    }
    const data = new FormData(event.currentTarget);
    const body = [
      "I would like to get involved with Michigan Essentials Watch.",
      `Name: ${String(data.get("name") ?? "").trim()}`,
      `Email: ${String(data.get("email") ?? "").trim()}`,
      `Join the campaign: ${campaign ? "Yes" : "No"}`,
      `Newsletter updates: ${newsletter ? "Yes" : "No"}`,
      `SMS updates: ${sms ? "Yes" : "No"}`,
      ...(sms ? [`Phone: ${String(data.get("phone") ?? "").trim()}`, "Please contact me with the SMS terms and opt-in instructions before enrolling me."] : []),
    ].join("\n");
    setError("");
    setPrepared(true);
    window.location.href = `mailto:power@miutilitieswatch.com?subject=${encodeURIComponent("Michigan Essentials Watch — signup request")}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="font-semibold text-accent-strong">Michigan Essentials Watch</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold text-primary">Build with us</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">Join the campaign for accountable utility service in Michigan. Choose how you want to stay involved.</p>
      <form onSubmit={submit} className="mt-8 space-y-6 border-t pt-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div><Label htmlFor="signup-name">Name</Label><Input id="signup-name" name="name" autoComplete="name" maxLength={120} className="mt-2" /></div>
          <div><Label htmlFor="signup-email">Email (required)</Label><Input id="signup-email" name="email" type="email" autoComplete="email" required maxLength={254} className="mt-2" /></div>
        </div>
        <fieldset className="space-y-4">
          <legend className="mb-4 text-lg font-semibold">I’d like to…</legend>
          <label className="flex items-start gap-3"><Checkbox checked={campaign} onCheckedChange={(v) => setCampaign(v === true)} className="mt-1" /><span>Join the campaign</span></label>
          <label className="flex items-start gap-3"><Checkbox checked={newsletter} onCheckedChange={(v) => setNewsletter(v === true)} className="mt-1" /><span>Receive the email newsletter</span></label>
          <label className="flex items-start gap-3"><Checkbox checked={sms} onCheckedChange={(v) => setSms(v === true)} className="mt-1" /><span>Request SMS updates</span></label>
        </fieldset>
        {sms ? <div><Label htmlFor="signup-phone">Mobile number (required for SMS requests)</Label><Input id="signup-phone" name="phone" type="tel" autoComplete="tel" required maxLength={30} className="mt-2" /><p className="mt-2 text-sm text-muted-foreground">This requests SMS signup instructions; it does not enroll you in texts. SMS terms and consent will need to be confirmed before enrollment.</p></div> : null}
        <p className="text-base leading-relaxed text-muted-foreground">Signup is currently handled by email. Your request opens in your email app; you must send it to reach the team. Contact details are not published on this site.</p>
        {error ? <p role="alert" className="text-destructive">{error}</p> : null}
        <Button type="submit" variant="accent" size="lg"><Mail aria-hidden="true" /> Request to join <ArrowRight aria-hidden="true" /></Button>
        {prepared ? <p role="status" className="border-l-4 border-accent bg-surface p-4">Your email draft is ready. Send it from your email app to submit your request. If no draft opened, email <a href="mailto:power@miutilitieswatch.com" className="break-all font-semibold text-primary underline">power@miutilitieswatch.com</a> with your preferred updates.</p> : null}
      </form>
    </div>
  );
}