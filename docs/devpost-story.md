## Inspiration

Job hunting in Vietnam often feels like shouting into the void. You send a CV, and then… nothing. Salaries hide behind *"thoả thuận"* (negotiable), fake postings ask candidates for "deposit fees", and after applying your phone number starts receiving spam calls. The big job boards are huge — but huge doesn't mean trustworthy.

We asked ourselves a simple question: **what if a job site competed on honesty instead of volume?** That became our tagline — **Real jobs. Clear pay. Real replies.** — and JobPortal is our attempt to build it for three groups at once: candidates, employers, and the admins who keep the marketplace clean.

## What it does

JobPortal is a job marketplace for Vietnam that connects **candidates**, **employers** and **admins**, with transparency built into every step.

**For candidates**
- Search jobs by keyword, location, industry, salary, level and experience. Search ignores Vietnamese diacritics, and you can filter to *Fast responders only*.
- **⚡ One-click apply** with the default CV. No CV yet? A PDF CV is generated from the profile and submitted in the same click.
- **Online CV builder:** 3 templates, custom colors, live PDF preview, and save to "My CVs".
- **AI job recommendations:** a match percentage, the skills you have and the ones you're missing, and a short explanation written by Claude.
- Track every application's status in real time, chat with the recruiter, save jobs, follow companies, get job alerts, and write anonymous company reviews.

**For employers**
- Create a company profile and get it **verified** with a business license.
- Post jobs and move applicants through a clear pipeline: *Submitted → Viewed → Shortlisted → Interview → Offer / Rejected*. Interview invites and rejection letters notify the candidate automatically.
- Message candidates, keep private notes, and invite teammates as owners or members.
- See a dashboard with views, applications, a hiring funnel, and the company's **public response score**.
- Buy plans with **VietQR** bank transfer to feature jobs at the top of search and unlock contact details of candidates found in "Search CVs".

**For admins**
- Moderate jobs, verify companies, handle reports, approve reviews, and confirm payments.
- Manage users, categories, site content and settings, with an audit log of every admin action.
- Answer a **customer-support inbox** and maintain the FAQ that powers the chatbot.

**For everyone**
- A floating **support chatbot** answers instantly from the FAQ (using Claude if configured) and hands the conversation to a human admin when needed.
- Realtime notifications, mobile-friendly UI, and privacy by default: anonymized AI input, CVs only through short-lived signed links, and contact details hidden until a candidate applies or opts in.

## How we built it

**Stack:** NestJS 11 + TypeORM on **SQL Server**, React 19 + Vite + Tailwind 4 + TanStack Query, Server-Sent Events for realtime, Docker + Caddy for deployment, GitHub Actions CI.

We started from a written plan (`todo.md`) and a full PRD with requirement IDs (AUTH-xx, CAN-xx, EMP-xx, ADM-xx), then built feature by feature, ticking boxes as we went. Every feature shipped with unit tests; the core hiring flow is covered end-to-end against a real SQL Server database (11/11 E2E, 120+ unit tests). We also wrote 307 manual test cases traced back to the PRD.

### Job matching

Recommendations use a transparent scoring model first, so the result is explainable and free. For a candidate $c$ and job $j$:

$$
S(c,j) = 40\,s_{\text{skill}} + 15\,s_{\text{title}} + 15\,s_{\text{category}} + 10\,s_{\text{location}} + 10\,s_{\text{exp}} + 10\,s_{\text{salary}}
$$

where $s_{\text{skill}} = \dfrac{|K_c \cap K_j|}{|K_j|}$ is the share of the job's required skills the candidate already has, and the other terms are in $[0,1]$. Only jobs with $S \ge 25$ are shown. Claude is then asked (with an **anonymized** profile — no name, email or phone) to write a short reason and an improvement tip for the top 8.

### Response score

For each company, over applications from the last 90 days that were either answered or are older than 3 days:

$$
R = \frac{\#\{\text{answered}\}}{\#\{\text{eligible}\}}, \qquad
\bar{t} = \frac{1}{n}\sum_{i=1}^{n}\left(t^{\text{reply}}_i - t^{\text{apply}}_i\right)
$$

A company is a **Fast responder** when $R \ge 0.8$ and $\bar{t} \le 72\,\text{h}$, with at least 5 applications so small samples can't game it. "Answered" means moving an applicant past *Viewed* or sending them a message. A background job recomputes the scores hourly and nudges recruiters about applications waiting more than 3 days.

### Security & privacy by default

Hashed passwords (scrypt), short-lived JWTs with rotating refresh tokens (token-reuse detection), CVs served only through **HMAC-signed links that expire in 5 minutes**, magic-byte file checks, sanitized rich text, rate limits per endpoint, and "404 instead of 403" so nobody can probe for other companies' data.

## Challenges we ran into

- **SQL Server on Windows.** Before writing any feature we had to enable TCP on port 1433, switch to mixed-mode auth and reset the `sa` login. Later, SQL Server rejected some foreign keys ("multiple cascade paths"), so we had to design the cascade rules carefully.
- **The 7-hour bug.** `created_at` was filled by SQL Server's `GETDATE()` (local time, UTC+7) while Node wrote other timestamps in UTC. "Applied 2 hours ago" could be off by 7 hours, and daily charts landed on the wrong day. We switched the driver to local time, wrote a migration that shifts the old data by

  $$\Delta = \text{GETDATE()} - \text{GETUTCDATE()}$$

  (zero on a UTC server, +7h on a Vietnamese Windows machine), and added a startup check that warns if Node and SQL Server disagree.
- **Vietnamese text.** Users type "quen mat khau" for "quên mật khẩu". We normalize text (NFD, strip diacritics, đ→d) for both search and FAQ matching.
- **Keeping the chatbot honest.** The assistant may only answer from the FAQ. It must never claim it changed an account, and it signals a handoff with a marker that we strip before display. If there's no API key or the AI call fails, it falls back to keyword FAQ matching, so support never goes dark.
- **Tooling surprises:** an ESM-only HTML parser broke Jest; Vite 6 blocked ngrok hostnames until we allow-listed them; and SQL Server needs ≥ 2 GB of *real* RAM, so a 2 GB VPS isn't enough.
- **Our own process.** Several "it doesn't work" moments came from schema migrations that hadn't been generated yet. We made the update script fail loudly instead of quietly skipping that step.

## Accomplishments that we're proud of

- **A complete three-sided product, not a demo screen.** Candidates, employers and admins each have a full workflow: apply → screen → interview → offer, job moderation, company verification, reports, reviews, plans and payments, and customer support.
- **The ⚡ Fast responder badge.** It turns "will anyone ever reply?" into a number candidates can filter by. We think it is the most honest feature on the site, and it gives recruiters a reason to reply.
- **One-click apply that works even without a CV.** If a candidate hasn't uploaded one, we generate a clean PDF from their profile and submit it in the same tap.
- **AI that explains itself and degrades gracefully.** Job matches come with a score breakdown and missing skills, and the support bot answers only from the FAQ. With no API key, both features still work on rules alone.
- **Privacy by design.** Data sent to the AI is anonymized. CVs are only reachable through 5-minute signed links. Candidate contact details stay hidden unless the candidate applies or opts in.
- **Quality we can show.** 120+ unit tests, an end-to-end test of the full hiring flow against real SQL Server (11/11 passing), 307 manual test cases traced to PRD requirement IDs, CI on every push, and a one-command VPS setup with HTTPS and daily backups.
- **Built for Vietnam.** Diacritic-insensitive search, VietQR payment codes, Vietnamese-first UI, and time handling we fixed carefully so that "2 hours ago" means 2 hours ago in UTC+7.

## What we learned

- **Trust is a feature you can measure.** Showing a response rate changes behavior on both sides of the marketplace more than any UI polish.
- Use an **explainable baseline before AI.** The scoring model works with zero cost and zero latency; the LLM only adds wording on top. The same goes for support: FAQ first, AI second, human last.
- Time zones, character encodings and database quirks are where "it works on my machine" lives. Write tests and startup checks for them.
- Writing the PRD and test cases *before* polishing made it much easier to say "done" with confidence.

## What's next

Deploying the demo on a VPS with HTTPS, a real payment gateway (VNPay/MoMo) to replace manual transfer confirmation, Vietnamese/English UI, Zalo job alerts, and salary benchmarks built from posted jobs.
