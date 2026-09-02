# Git From Zero

A self-paced walkthrough that takes someone from *never having opened a terminal* to a real
repository on GitHub — with branches, a pull request, and a merge conflict they caused on
purpose and fixed.

### → **[git-lesson.sletchersystems.com](https://git-lesson.sletchersystems.com/)**

That link is the thing. This repo just holds it.

## Who it's for

Anyone with zero Git experience, working **alone**. Most Git tutorials assume you already know
what a terminal is, or that a second person is available to practise with. This one assumes
neither: it starts at "here is how to open a terminal" and every exercise works solo, including
the merge conflict.

## What's in it

- **A live sandbox.** Type `git init`, `add`, `commit`, `push`, `diff`, `restore` into a fake
  terminal and watch a file move between the four places a change can live. Real Git output.
- **A merge-vs-rebase visualiser** where the commit IDs visibly change on rebase — the detail
  that makes "rewriting history" finally click.
- **A clickable conflict block** showing that `<<<<<<< HEAD` means *opposite things* in a merge
  and in a rebase, which is how people end up deleting their own work.
- Per-OS commands (Windows / macOS / Linux), a table of the errors beginners actually hit,
  54 filterable commands, and a quiz.

## Running it yourself

One file, no build step, no dependencies, no package manager:

```bash
git clone https://github.com/banditofsmoke/01-git-and-github.git
cd 01-git-and-github
```

Then just open `index.html` in a browser. That's it — it works offline, including the sandbox.
To serve it over HTTP instead:

```bash
python -m http.server 8000
```

## Built with

Nothing. Hand-written HTML, CSS and vanilla JavaScript in a single file. The only external
request is to Google Fonts; block it and the page falls back to system fonts and still works.

## Privacy

No accounts, no analytics, no tracking, no database, no server-side anything. Your progress,
your chosen OS and your theme are kept in your own browser's `localStorage` and never leave your
machine. If your browser blocks site storage, the page says so and everything still works —
you just don't get progress saved.

## Teaching it to someone else

Two guides, for two different situations. Both are current; neither replaces the other.

| Guide | Use it when |
|---|---|
| [`LESSON-PLAN.md`](LESSON-PLAN.md) | The learner works through **the site** at their own pace and you coach. One-to-one, a group, or over a call. Mirrors the site's nine steps and adds timings, what to say, where people stall, and a checkpoint question for each. |
| [`LESSON-PLAN-PAIRED.md`](LESSON-PLAN-PAIRED.md) | You want the **two-person lesson** — you and one learner sharing a repo, both pushing, conflicting with each other for real. Needs two machines and two GitHub accounts. |

The short version of both: the site does the explaining, so the teacher's job is unsticking,
checking understanding, and **not taking the keyboard.**

## Notes

Command output was captured from a real repository rather than written from memory — including
the conflict markers, whose sides genuinely do swap between a merge and a rebase. Install
instructions were checked against [git-scm.com/install](https://git-scm.com/install/) rather
than assumed; the old `git-scm.com/downloads` URL now redirects, and the macOS binary installer
was discontinued in 2021.

Icons (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`) are generated from
[`icon-512.png`](icon-512.png) — a commit node branching to another, in the page's own amber
and steel.
