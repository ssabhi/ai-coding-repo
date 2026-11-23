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

Findings from the independent review agent, and what was done about each, are listed below.

### Independent review

_Pending: added once the review completes._

## Human review and ownership

The brief says the submitter owns every line. To be completed by the author before submission:
what you reviewed, anything you changed or pushed back on, and the time it took.

## Time spent

| Phase                | Time                            | Notes                                                                         |
| -------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| Planning             | ~10 min                         | Read the brief, probed the toolchain and Fake Store, wrote the plan           |
| Building             | ~30 min                         | API, web, Docker, CI                                                          |
| Testing              | ~10 min                         | 79 automated tests, mutation checks, Docker stack and headless-browser checks |
| Reviewing and docs   | ~15 min                         | Independent review agent, fixes, README, DECISIONS, this file                 |
| **AI session total** | **~65 min**                     | Measured from session timestamps                                              |
| Author review        | _to be completed by the author_ |                                                                               |
