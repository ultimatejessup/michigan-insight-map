<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Bill explainer runs entirely in the browser (changed Nov 18; the AI server route and key were removed). Bills are read on the resident's device (`src/lib/bill/`), personal details are hidden, the resident checks the text, and `analyze.ts` explains charges from the reviewed glossary in `glossary.ts`. No bill text is sent anywhere or stored. If AI is ever reintroduced, it needs the owner's sign-off and updated disclosures.
- Keep navigation and footer in the shared site components so every content page has the same links and notices.
- Keep detailed legal notices on the public Disclaimers route; the shared footer links to it and retains the short non-endorsement statement to keep notices consistent without repeating long text.
- Keep Claude handoff guidance in root `CLAUDE.md`; it distinguishes current behavior from unapproved future work.
- Build and Origins are separate public content routes with their own metadata; Build uses an explicit email-request flow until signup storage and delivery are connected, avoiding false enrollment confirmations.
