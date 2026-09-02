# Teaching guide — the solo course

**Companion to [git-lesson.sletchersystems.com](https://git-lesson.sletchersystems.com/).**
This is for the person *teaching*. The learner never opens this file — they work through the
site.

> **Two guides live in this repo, for two different situations.**
>
> | File | Use it when |
> |---|---|
> | **`LESSON-PLAN.md`** (this one) | The learner works through the **site** at their own pace and you coach. Works one-to-one, in a group, or over a call. |
> | [`LESSON-PLAN-PAIRED.md`](LESSON-PLAN-PAIRED.md) | You want the **original two-person lesson** — you and one learner sharing a repo, both pushing, conflicting with each other for real. |
>
> The paired version is the older, teacher-led design. It is still good and still accurate —
> it is just a different shape. Neither replaces the other.

---

## The one thing to understand before you start

**The site does the explaining. Your job is different — and it is harder to do well.**

With a self-guided page, you are not the source of information. You are there to do the four
things a web page cannot:

1. **Unstick** — when something breaks that the page didn't predict.
2. **Check understanding** — a ticked checkbox is not evidence of anything.
3. **Slow them down** — a learner racing to tick boxes has learned nothing.
4. **Reassure** — most beginner paralysis is fear of breaking something permanently.

### The rule that matters most

**Do not take the keyboard.** Ever. When they are stuck it is enormously tempting to lean over
and fix it in four seconds. Resist it every single time. The learner who typed the fix themselves
remembers it; the learner who watched you do it has learned that they need you.

When they are stuck, in this order:

1. *"What does the error actually say? Read it out loud."* — solves it maybe half the time,
   because Git error messages usually contain the exact command needed.
2. *"What does `git status` say?"* — solves most of the rest.
3. *"Which of the four boxes is your work in right now?"*
4. Only then, tell them what to type — and make them type it.

---

## Pre-flight

Ten minutes of your own time, before they arrive.

- [ ] The site loads for you, and you have worked through it **yourself, end to end, once**.
      Do not teach this cold — you want to have hit the errors before they do.
- [ ] They have a laptop they can install software on. **Check this.** A locked-down work
      machine kills step 01 and there is no way around it in the room.
- [ ] They have, or can make, a GitHub account. Making it in advance saves ten minutes.
- [ ] You know which OS they are on, so the page's OS switcher is set correctly from the start.
- [ ] You have a way to see their screen — sat next to them, or screen-share.

---

## Session shapes

The full course is about **two hours** of learner time. It does not have to be one sitting.

| Shape | Split |
|---|---|
| **One long session** (~2h) | Steps 00–08 with a real break after step 04. Ambitious for a true beginner. |
| **Two sessions** (~1h each) | **Session 1:** steps 00–04, ending with their work on GitHub — a genuinely satisfying stopping point. **Session 2:** steps 05–08. *This is the one I would pick.* |
| **Drop-in / async** | They work alone, you check in at the end of each step. The progress bar and checkboxes are built for exactly this. |

**If you are running out of time, stop after step 04.** Getting their own code onto GitHub is a
complete, satisfying outcome. A rushed conflict in step 07 is worse than no conflict at all.

---

## Step-by-step

Each step below assumes they are reading the site. You only add what is here.

### 00 · Open a terminal — 5 min

**What you add.** Almost nothing. If they already use a terminal, skip it entirely.

**Where they stall.** They open the wrong thing — Command Prompt instead of PowerShell, or a
Python REPL. Glance at their screen and confirm the prompt looks like the page's.

**Checkpoint.** *"Without looking — how do you go up one folder?"* (`cd ..`)

---

### 01 · Install Git and identity — 10 min

**What you add.** Patience. This is the least interesting step and the most likely to eat time.

**Where they stall — and this is the big one:**

- **They install Git, type `git --version`, and it still says "not recognized".** They did not
  open a *new* terminal. The old one does not know about newly installed programs. Tell them
  this **before** they install, not after.
- **They try `gh` and it doesn't exist.** GitHub CLI is a separate download from Git. They do
  not need it. The site does not use it. Skip it.
- **They skip `init.defaultBranch main`** because it looks optional. It is not — it produces a
  confusing failed push two steps later. **Watch them run it.**
- Corporate laptop blocks the installer. Nothing you can do in the room; reschedule.

**Checkpoint.** `git config --global --list` shows all three of their settings.

---

### 02 · First repository — 15 min

**What you add.** This is the conceptual heart of the course. Slow right down here.

Point at the four-box diagram and keep pointing at it. When they run `git add`, ask which box
the change moved to *before* they run `git status`.

**Say this, in your own words:** *"Nothing you have done so far has touched the internet. Git
works completely offline. GitHub is a website you'll bolt on later — they're two different
things, and most people's confusion comes from mixing them up."*

**Send them to the sandbox on the page for three minutes.** Watching the block move between
boxes does more than anything you can say.

**Where they stall.**

- Running commands in the wrong folder. `pwd` and `ls`/`dir` are the fix, not you.
- Making the file with the wrong extension — Notepad silently saves `notes.txt.txt`.
  If Git can't see the file, check this first.

**Checkpoint — the most important one in the course.** After they commit, ask:
*"Where is your work right now — which of the four boxes is it in?"* If they can't answer,
do not move on.

---

### 03 · The everyday loop — 10 min

**What you add.** Emphasis that this is *the whole job*. Everything after this step is occasional;
this loop is daily.

**Where they stall.** `git diff` showing nothing after `git add` — every single time, and they
assume they broke it. The page warns about it; they will still be surprised. Let it happen and
let them re-read the warning rather than pre-empting it.

**Do not skip the `.gitignore` and secrets part.** They will eventually put an API key in a
project. Better they hear now that committing a secret and deleting it later does not remove it
from history.

**Checkpoint.** *"Why did `git diff` show nothing?"*

---

### 04 · Put it on GitHub — 15 min

**What you add.** Calm, mostly. This step has the most moving parts and the most ways to fail.

**Where they stall.**

- **They tick "Add a README".** Watch the screen when they create the repo. If they tick it,
  you will spend fifteen minutes on `--allow-unrelated-histories` instead of teaching.
  **Prevention is the entire strategy here.**
- **The browser sign-in window opens and they panic**, or close it. Tell them in advance it is
  coming and that it is normal.
- **`fatal: ... has no upstream branch`.** This is a *gift*. Make them read it aloud and run the
  command it printed. Then say: *"Git errors usually contain the answer. Reading them is the
  single highest-value habit you can build today."*

**Checkpoint.** *"What's the difference between a commit and a push?"* (A commit saves locally;
a push uploads. You can commit a hundred times offline and push once.)

---

### 05 · Branches — 15 min

**What you add.** Answer the "why bother alone?" question honestly — the page does, but they'll
want it from a human too. Because you can bin a failed experiment instead of unpicking it,
because `main` stays working, and because every job expects it.

**The moment to watch for.** When they switch back to `main` and their change **vanishes from
the file**, some learners genuinely think they destroyed their work. Be ready. Let the panic
happen for a second, then have them switch back and watch it return. That five seconds teaches
branches better than any diagram.

**Checkpoint.** *"Your file changed when you switched branches. Was anything lost?"*

---

### 06 · Issues and pull requests — 20 min

**What you add.** Legitimacy. Doing a PR against your own repo feels silly and they will say so.
Be straight: plenty of solo developers commit straight to `main`, and that's fine — this is about
learning the *motion*, so joining a team later isn't the first time they've seen it.

**Where they stall.**

- **`Closes #1` in a PR comment instead of the description.** It only works from the description
  or a commit message. If the issue doesn't auto-close, this is why.
- Branch made from a stale `main`. `git switch main && git pull` first, every time.

**Worth doing properly:** make them actually read their own diff in *Files changed* before
merging. Reviewing your own work is a real skill and this is a free chance to practise it.

**Checkpoint.** Issue #1 closed by itself. Ask *why* it closed.

---

### 07 · Cause a conflict — 20 min

**The best part of the course. Don't skip it, and don't let it happen by accident.**

**Set expectations before they start.** *"We're about to make Git refuse to do something. That
is the intended outcome. A conflict is not an error and nothing gets lost."*

**What you add.** Steadiness. Conflicts are where beginners feel most out of control.

**Where they stall.**

- They panic at the markers and want to undo everything. Show them `git merge --abort` *first*,
  so they know the exit exists — then don't use it.
- **They delete the wrong half.** Watch for this. Ask *"which of those two versions is yours?"*
  before they touch it.
- They leave a `=======` in the file. It happens constantly. If something looks broken
  afterwards, search the file for `<<<` first.

**Make them fix it by hand once,** even though VS Code's buttons are right there. They need to
see what those buttons actually do before they trust them.

**Checkpoint.** *"Which half was yours, and how could you tell?"*

---

### 08 · Undo anything — 15 min

**What you add.** This step is emotional, not technical. Its whole purpose is removing fear.

**Lead with `git reflog`.** The belief that you can permanently destroy your work is what makes
beginners tentative around Git. Show them that a commit, once made, is very hard to lose.

Then be precise about the one real exception, because a vague reassurance is worse than none:
**`git reset --hard` destroys *uncommitted* changes and nothing recovers those.** Committed work
is recoverable; uncommitted work is not. Which is the entire argument for committing early.

**Checkpoint.** *"What's the one thing that genuinely can't be recovered?"*

---

## After

Their repository is real. Say so — most beginners don't realise what they just built.

**The one thing that decides whether any of this sticks:** they have to use it on something real,
within about a week. Get them to put their next project — however small — in a repo on day one.
Everything here becomes automatic in a fortnight of ordinary use, and evaporates in a month of none.

If they want a second person to practise with, that's [`LESSON-PLAN-PAIRED.md`](LESSON-PLAN-PAIRED.md),
and the site's final section maps what changes.

---

## Honest notes

- **The timings are optimistic.** Step 01 can eat 30 minutes on its own if a machine misbehaves.
  Steps 00–04 are a complete lesson; treat 05–08 as the second half, not a stretch goal.
- **A ticked checkbox proves nothing.** The checkpoint questions are the actual assessment.
  Ask them out loud.
- **You will be asked something you don't know.** *"Let's look it up"* followed by
  `git help <command>` together is a better lesson than a confident wrong answer — and it teaches
  the real skill.
- **Watch for the silent learner.** Someone who has stopped asking questions has usually stopped
  understanding, not started. Ask a checkpoint question rather than assuming progress.
