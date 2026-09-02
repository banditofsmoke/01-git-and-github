# Git & GitHub — an interactive teaching aid

One self-contained HTML file. Open [`index.html`](index.html) in any browser — no build step,
no server, no dependencies.

Built for someone learning Git for the first time, around one idea: **a change lives in exactly
one of four places, and every command just moves it between them.**

## What's in it

- **A working simulator.** Type `git init`, `add`, `commit`, `push`, `diff`, `restore` into a
  console and watch the file move between the working directory, staging, the local repo and the
  remote. The output is real git output, and the status colours match your terminal's.
- **An animated merge-vs-rebase graph.** Press rebase and the commit shas visibly change — the
  detail that makes "rewriting history" finally click.
- **A clickable conflict block** showing that `<<<<<<< HEAD` means *opposite* things in a merge
  and in a rebase, which is how people end up deleting their own work.
- A panic table of the errors beginners actually hit, 51 filterable commands, and a short quiz.

## One setup step worth doing first

```bash
git config --global init.defaultBranch main
```

Without it, `git init` creates a branch called `master` while GitHub expects `main`, and your
first push fails in a way that is genuinely confusing. This repo's own first push failed on it.

## Notes

Command output was captured from a real repository on git 2.44 rather than written from memory —
including the conflict markers, whose sides really do swap between merge and rebase.

Works offline. Remembers your checklist progress and theme in your own browser only.
