# Git & GitHub — a complete first lesson

Teaching materials for a live, two-person Git lesson. Two files, two different readers.

| File | Who reads it | What it is |
|---|---|---|
| [`index.html`](index.html) | **The student** | An interactive visual aid. Open it in any browser — no build step, no server, no dependencies. |
| [`LESSON-PLAN.md`](LESSON-PLAN.md) | **The teacher** | The run of show. Acts with minute budgets, exact commands, expected output, and a table of what will go wrong. |

Built around one idea: **a change lives in exactly one of four places, and every command just
moves it between them.**

## What's in the student's page

- **A working simulator.** Type `git init`, `add`, `commit`, `push`, `diff`, `restore` into a
  console and watch the file move between the working directory, staging, the local repo and the
  remote. The output is real git output, and the status colours match your terminal's.
- **An animated merge-vs-rebase graph.** Press rebase and the commit shas visibly change — the
  detail that makes "rewriting history" finally click.
- **A clickable conflict block** showing that `<<<<<<< HEAD` means *opposite* things in a merge
  and in a rebase, which is how people end up deleting their own work.
- A panic table of the errors beginners actually hit, 51 filterable commands, and a short quiz.

## The shape of the lesson

Two people, two machines, one shared repo, one `index.html` built together — the student added
as a **collaborator**, not working from a fork. Acts 0–5 are a complete lesson on their own
(~75 min). Act 6 stages a merge conflict on purpose; if the clock is against you, make it lesson
two rather than rushing it.

## One setup step worth doing first

```bash
git config --global init.defaultBranch main
```

Without it, `git init` creates a branch called `master` while GitHub expects `main`, and your
first push fails in a way that is genuinely confusing to explain mid-lesson. This repo's own
first push failed on exactly that.

## Hosting it

`index.html` is fully static and self-contained. Point any static host at the repo root and it
serves as-is — no build command, no output directory, no framework.

## Notes

Command output was captured from a real repository on git 2.44 rather than written from memory —
including the conflict markers, whose sides really do swap between merge and rebase.

Works offline. Remembers your checklist progress and theme in your own browser only.
