import { createFileRoute } from "@tanstack/react-router";
import { StoryForm } from "@/components/site/story-form";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/survey")({
  head: () =>
    pageHead(
      "/survey",
      "Ratepayer Survey — Michigan Essentials Watch",
      "Tell us what you pay and what you've faced with your electric, gas, water or broadband service in Michigan.",
    ),
  component: SurveyPage,
});

function SurveyPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold text-primary">Share Your Utility Story</h1>
      <p className="mt-2 max-w-3xl text-base text-muted-foreground">
        Your story helps show what ratepayers are facing. Tell us about your electric, natural gas,
        water or broadband experience.
      </p>
      <div className="mt-8">
        <StoryForm />
      </div>
    </div>
  );
}
