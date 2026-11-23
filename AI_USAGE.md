# AI usage

## Tools and models

| Tool                                    | Model                               | Used for                                                                  |
| --------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| Claude Code (VS Code extension)         | Claude Opus 5.5 (`claude-opus-5-5`) | Planning, implementation, tests, Docker, docs                             |
| Claude Code sub-agent (general-purpose) | Claude Opus 5.5                     | An independent code review with no access to the main session's reasoning |

The agent worked in the terminal and ran real commands: npm, the test runners, Docker, curl, and a
headless Edge browser for screenshots. It was not just generating text.

## Agent instruction files

- [CLAUDE.md](CLAUDE.md) (committed): commands, architecture rules (the boundaries in
  DECISIONS.md), conventions, test expectations, and gotchas found during the build. It is written
  so that the next agent session, or person, keeps the boundaries intact.

## Plan

[docs/PLAN.md](docs/PLAN.md) was written before any code. It covers the stack choice, the
ports-and-adapters boundaries for the three things the brief says will change, the API surface,
the assumptions to record, the risks found while planning, and the order of work. The
"corrections" section at the end records where reality differed from the plan.

## Key prompts and moments that shaped the solution

1. **The brief as the prompt.** The challenge PDF went in whole, with one extra constraint: _"Make
   it a git repo, commit, but don't push or set an origin."_ The agent was asked to plan before
   building.
2. **Probing the environment before designing.** Before writing code, the agent checked the
   toolchain and called the Fake Store API from both curl and Node. It found that Cloudflare
   returns a **403 to Node's built-in `fetch`**, but accepts `curl` and `node:https` with an honest
   User-Agent. That one finding drove two decisions: a small `node:https` client in the adapter,
   and an offline snapshot as a second `ProductRepository`. The snapshot proved the data-source
   boundary was real, and it also became the test fixture.
3. **Commit structure.** Mid-build instruction: _"Don't put all code in a single commit; add
   meaningful commits for each major piece of code."_ The history is therefore one commit per
   layer: scaffold, catalogue domain, Fake Store adapter, enquiries, HTTP layer, web client, web
   pages, enquiry UI, Docker, CI, docs. Then the review fixes.
4. **Search semantics.** The first idea was substring matching. Checking it against the real data
   showed that `men` would return women's clothing, so the rule became "every word must match the
   start of a word". There is a test for that exact case.
5. **Verifying rather than trusting green tests.** All 61 API tests passed on the first run, which
   proves little on its own. The agent deliberately broke three rules (substring search, picks
   ranked below ratings, swallowed email failure) and confirmed that the tests failed each time.
   It then ran the Docker stack, checked headers with curl, submitted an enquiry, read it back from
   Mailpit's API, and screenshotted each page in headless Edge.

## Where the AI got things wrong, and how it was caught

| What went wrong                                                                                                                                                                                                                 | How it was caught                                                                                 | Fix                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lost security headers in nginx.** The CSP and `nosniff` headers were declared at server level, but the `location` blocks added their own `Cache-Control` with `add_header`. nginx then silently drops every inherited header. | `curl -D -` against the running container showed only `Server: nginx`. The config _looked_ right. | Caching set with `expires`, which doesn't use `add_header`. Re-verified on `/`, client routes and `/assets/*`. Recorded as a gotcha in CLAUDE.md. |
| **Enquiry state leaked between products.** React Router reuses the `ProductPage` instance when only `:id` changes. Going back from product A to product B would have kept A's open form or "Thank you".                         | Self-review of the component before writing its tests.                                            | The details component is keyed by `id`.                                                                                                           |
| **The plan assumed `fetch` would work against Fake Store.**                                                                                                                                                                     | Checked with curl and node before writing the adapter (moment 2 above).                           | `node:https` client plus an explicit fixture source.                                                                                              |
| **A side effect during render in a test helper.** It reassigned a module-level variable to track location.                                                                                                                      | `eslint-plugin-react-hooks` (`react-hooks/globals`).                                              | Location is reported from an effect into a variable scoped to each `renderApp` call.                                                              |
| **Noisy logs.** Docker's health check hit `/api/health` every 10s and every hit was logged.                                                                                                                                     | Reading the container logs while verifying the stack.                                             | pino-http ignores the health route.                                                                                                               |
| **A stale path in `.prettierignore`** pointed at a file that didn't exist.                                                                                                                                                      | Prettier reformatted the snapshot it was meant to skip.                                           | The entry was removed; formatted JSON diffs better anyway.                                                                                        |

### Independent review

A second agent was given the brief and the code, but not my reasoning, and was asked to be
skeptical. It made no changes. I reproduced each finding before acting on it. The fixes are in a
separate commit, after the build commits.

| #   | Finding                                                                                                                                                                                                                                                                                                            | Verdict                                                                                                                               | What was done                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **The web tests failed (13 of 18) on Windows when the working directory's drive letter was lowercase** (`c:\`, as a VS Code terminal gives you). jest-dom loaded a second copy of vitest and registered its matchers on the wrong `expect`. My runs never showed it, because Git Bash normalises the drive letter. | **Real, and the most valuable catch.** A Windows reviewer would have seen failing tests. Reproduced from `cmd` with a lowercase `cd`. | jest-dom is inlined in `vite.config.ts`. 18/18 pass from both `c:\` and `C:\`.                                                                                                                                                         |
| 2   | **A search with no letters or digits (`!!!`, `-`, blank) returned the whole catalogue**, because `[].every()` is `true`. My test "does not match on punctuation alone" actually tested `zzz`, so it hid the bug.                                                                                                   | Real: an acceptance-criterion bug hidden by a misnamed test.                                                                          | Such a search now matches nothing. The misleading test was renamed, and tests were added at unit and HTTP level.                                                                                                                       |
| 3   | **After the cache expired, a failed refresh was retried on every request**, so each page waited for the 5s timeout.                                                                                                                                                                                                | Real.                                                                                                                                 | The adapter backs off for 30s after a failure while serving the cached copy. Tested with a fake clock.                                                                                                                                 |
| 4   | **The default Docker run depended on Cloudflare letting the reviewer's network through.**                                                                                                                                                                                                                          | Agreed in part. A silent fallback in production would still hide outages.                                                             | Added `FAKESTORE_FALLBACK=snapshot`, which serves the snapshot with a warning only if Fake Store has _never_ been reachable. It is off by default in the API and on in `docker-compose.yml`. Verified against an unreachable upstream. |
| 5   | **The README said Fake Store is "only ever called by the backend", but the browser loads its images.** The CSP image host was hard-coded, so DECISIONS.md's claim that this is "a backend change only" was wrong.                                                                                                  | Real. The wording overclaimed.                                                                                                        | The README and DECISIONS.md were corrected. The CSP image origin is now config (`PRODUCT_IMAGE_ORIGIN`), rendered by the nginx image's template step.                                                                                  |
| 6   | **`WEB_PORT=8081` still produced `:8080` links in emails.**                                                                                                                                                                                                                                                        | Real.                                                                                                                                 | `PUBLIC_WEB_URL` now defaults to the `WEB_PORT` value; checked with `docker compose config`.                                                                                                                                           |
| 7   | **Mailpit's inbox (customer PII) was published on all network interfaces.**                                                                                                                                                                                                                                        | Real.                                                                                                                                 | It is bound to `127.0.0.1`.                                                                                                                                                                                                            |
| 8   | **A mistyped top rated id was silently replaced.**                                                                                                                                                                                                                                                                 | Real.                                                                                                                                 | The API logs the missing picks at startup. I kept "any number of picks" rather than exactly 5: extra picks can feature products on category pages.                                                                                     |
| 9   | **Test gaps:** the "don't retry 4xx" rule was never exercised; rate limiting behind nginx was untested; the Docker build type-checked test files.                                                                                                                                                                  | Real.                                                                                                                                 | Added a retry-policy test and an `X-Forwarded-For` spoofing test (one trusted hop). The production build now type-checks `src` only.                                                                                                   |

The reviewer also listed what it checked and found sound: proxy trust, email header injection,
error leakage, CORS and CSRF, CSP, the build output and the image tags. That's useful, because it
says where _not_ to spend more time.

One more mistake, made while writing this section: a shell one-liner used to edit this file let
bash expand the Markdown backticks as commands. The commands it ran were harmless (they only
printed errors and help text), but the section was garbled. I spotted it on reading the file back
and rewrote the section using the editor tool.

## Human review and ownership

All code changes were made through Claude Code. My part was to direct the scope, the process and
the decisions that were mine to make:

- **Brief and constraints.** I gave the agent the challenge PDF and the recruiter's instructions,
  plus one constraint of my own: make it a git repository and commit, but don't push or set a
  remote. I create and push the GitHub repository myself.
- **Commit history.** I asked for meaningful commits for each major piece of code instead of one
  large commit. The history is structured around that.
- **Git identity.** I chose the author identity for the commits: my personal address, because
  the repository will be public.
- **Commit permission stayed with me.** My Claude Code permission settings blocked the agent's
  `git commit` calls throughout. Rather than loosen that, the agent prepared a script that
  creates the history for me to run (`.git/commit-history/make-commits.sh`).
- **This section.** I asked Claude to write it from the session record, so it lists only what
  actually happened in the session.

The independent review above is the review of the AI's output that happened in this session.

## Time spent

Everything happened in one session, from 11:06 to about 12:10 UTC on 23 Nov 2026. I directed
the session while the agent worked. The phases overlapped, so the split below is approximate.

| Phase                  | Time        | Notes                                                                                                |
| ---------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| Planning               | ~10 min     | Read the brief, probed the toolchain and Fake Store, wrote the plan                                  |
| Building               | ~25 min     | API, web, Docker, CI                                                                                 |
| Testing                | ~10 min     | Automated tests, mutation checks, Docker stack and headless-browser checks                           |
| Review, fixes and docs | ~20 min     | Independent review (about 12 min, running alongside the docs), 9 fixes, README, DECISIONS, this file |
| **Total**              | **~65 min** | Wall clock, from session timestamps. This is under the 2–3 hour time-box.                            |
