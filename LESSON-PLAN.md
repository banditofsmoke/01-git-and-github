# Lesson 01 — Git & GitHub, two people, one file

**Teacher's run-of-show.** This is the script you follow. The student never reads this file —
he reads `index.html` (open it in a browser), which is the visual companion.

| | |
|---|---|
| Shape | Two people, two machines, one shared repo, one `index.html` |
| Core path | Acts 0–5, about 75 minutes |
| The good bit | Act 6 — a *deliberately staged* merge conflict, about 25 minutes |
| Stretch | Act 7, as far as time allows |
| Verified against | git 2.44.0.windows.1, gh 2.55.0 — your machine, checked 2026-09-02 |

> **Two different `index.html` files exist today. Don't mix them up.**
> `01-git-and-github/index.html` (this folder) is the **teaching aid** — it is not in the lesson repo.
> The `index.html` you and the student build live is a **brand new file in a brand new repo**.

---

## The one idea the whole lesson hangs on

Git has **four places** a change can live. Every command in this lesson is just moving a change
between them. If he leaves understanding only this, the lesson worked:

```
  WORKING DIRECTORY  ──git add──▶  STAGING (index)  ──git commit──▶  LOCAL REPO  ──git push──▶  REMOTE
         ▲                               │                              │                         │
         └────git restore────────────────┘                              │                         │
         └────────────────git reset ─────────────────────────────────────┘                        │
         └────────────────────────────────git pull ─────────────────────────────────────────────────┘
```

Almost every beginner problem is *"I thought my change was in a different place than it was."*
Keep pointing at this diagram. It is the first panel of the visual aid, and it's interactive —
he can type commands into it and watch the file move.

**Teach `git status` as the answer to everything.** Run it after literally every command in Act 1.
It tells you which of the four places your work is sitting in, and it *suggests the next command*.
A student who reflexively types `git status` is a student who can get himself unstuck.

---

## Act 0 — Pre-flight (do this BEFORE he arrives, 10 min)

Do not burn lesson time on installs. Ten minutes now saves forty later.

**On both machines:**

```bash
git --version
```

**Set the default branch name — this one matters.** Your machine currently has
`init.defaultBranch` unset, which means plain `git init` creates a branch called `master`, while
GitHub expects `main`. That mismatch produces a confusing failed push later. Fix it on both machines:

```bash
git config --global init.defaultBranch main
```

**Identity** (his machine — the name here is what shows up on every commit forever):

```bash
git config --global user.name "His Name"
git config --global user.email "his-github-email@example.com"
```

> **Privacy note worth teaching:** his email goes into every commit, publicly, permanently.
> GitHub gives him a proxy address at **Settings → Emails → Keep my email address private**
> (looks like `12345678+username@users.noreply.github.com`). Use that instead of a personal address.

**Authentication.** He cannot push with a GitHub password — that was removed in 2021. Easiest path,
in order of preference:

1. `gh auth login` and follow the browser prompts, or
2. just run the first `git push` — Git for Windows ships Git Credential Manager, which pops a
   browser window automatically. **Tell him in advance that a browser window opening is normal
   and expected, not an error.**

**Checklist before he sits down:**

- [ ] Git installed both machines, `init.defaultBranch` set to `main` on both
- [ ] He has a GitHub account and is logged in on the web
- [ ] `user.name` / `user.email` set on his machine
- [ ] You have decided the repo name (`git-lesson` below — anything is fine)
- [ ] Both of you can open `01-git-and-github/index.html` in a browser
- [ ] He knows how to open a terminal in a folder

---

## Act 1 — Local only. No GitHub yet. (20 min)

**Do this on your screen, shared, while he does it in parallel on his.** No remote yet — this is
deliberate. GitHub is a *sync service bolted onto git*, and conflating the two is the single
biggest reason people find git confusing. He should feel git working with no internet involved.

```bash
mkdir git-lesson
cd git-lesson
git init
```

> **Say:** "That made one hidden folder called `.git`. That folder *is* the repository —
> the entire history lives there. Delete it and this becomes an ordinary folder again.
> Nothing has been sent anywhere. There is no internet involved yet."

Show him it's real: `ls -a` (or `dir /a` in cmd) — there's `.git`.

```bash
git status
```

Expected — memorise this shape, you'll see it a lot:

```
On branch main

No commits yet

nothing to commit (create/copy files and use "git add" to track)
```

Now create the file. Keep it tiny — the lesson is git, not HTML:

```html
<!doctype html>
<html>
  <head>
    <title>Our Git Lesson</title>
  </head>
  <body>
    <h1>Our Git Lesson</h1>
  </body>
</html>
```

```bash
git status
```

```
Untracked files:
  (use "git add <file>..." to include in what will be committed)
        index.html

nothing added to commit but untracked files present (use "git add" to track)
```

> **Say:** "*Untracked* means git can see the file but is ignoring it. Git never touches a file
> you haven't explicitly told it about. That's on purpose."

```bash
git add index.html
git status
```

```
Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
        new file:   index.html
```

> **This is the moment to spend time on.** `git add` does **not** save anything. It moves the
> change into the **staging area** — a shopping basket. You put things in the basket, and
> `git commit` is the checkout. The reason git makes you do this is that it lets you commit
> *some* of your changes and not others — you fixed a bug and also renamed a variable, and those
> should be two separate commits.
>
> **Let him play with the simulator in `index.html` (section 1) here.** Three minutes of typing
> `git add` and `git restore --staged` and watching the block move is worth ten minutes of you
> explaining it.

```bash
git commit -m "Add page skeleton"
```

```
[main (root-commit) d191e37] Add page skeleton
 1 file changed, 1 insertion(+)
 create mode 100644 index.html
```

> **Say:** "`d191e37` is the commit's name. It's a hash of the content. Remember that it exists —
> it comes back in Act 6 and it's the key to understanding rebase."
>
> **Always use `-m`.** Without it, git opens VS Code (your `core.editor` is set to it) and a
> student staring at an editor he didn't ask for will assume he broke something.

Now the loop that is 90% of daily git. Change the `<h1>` text, then:

```bash
git status          # modified, not staged
git diff            # what changed, unstaged
git add index.html
git diff            # NOTHING. This confuses everyone.
git diff --staged   # there it is
git commit -m "Change the heading"
git log --oneline
```

> **`git diff` showing nothing after `git add` is a guaranteed stumble.** Get ahead of it:
> plain `git diff` compares working directory against **staging**, so once you've staged, they
> match and there's nothing to show. `git diff --staged` compares staging against the last commit.
> Two different questions.

**Safety net — show him he can always undo, before he's scared of breaking things:**

```bash
# made a mess in the file, want it back as it was:
git restore index.html

# staged something by accident:
git restore --staged index.html
```

**Commands covered in Act 1:** `git init`, `git status`, `git add`, `git commit`, `git log`,
`git diff`, `git diff --staged`, `git restore`, `git restore --staged`, `git config`

---

## Act 2 — Bolt on the remote (10 min)

On GitHub: **New repository**, name it `git-lesson`, **Private** is fine.

> ### ⚠️ Do NOT tick "Add a README", .gitignore, or a licence. Leave it completely empty.
>
> If you tick any of those, GitHub makes a commit, and your local repo and the GitHub repo now
> have two unrelated histories. Your first push is rejected and the fix (`--allow-unrelated-histories`)
> is a genuinely confusing thing to explain in minute nine of a first lesson.
> **See the Panic Table if this happens anyway.**

GitHub shows you the commands. Use them, but explain them rather than pasting blindly:

```bash
git remote add origin https://github.com/<you>/git-lesson.git
git push -u origin main
```

> **Say:** "`origin` is just a nickname for that URL — nothing magic about the word, it's the
> conventional name for 'the main copy'. `-u` links your local `main` to the remote `main`, which
> is why from now on you can type just `git push` and `git pull` with nothing after them."

```bash
git remote -v      # show me what origin actually points at
```

**Now add him as a collaborator** — Settings → Collaborators → Add people.

> **He must open the email/notification and ACCEPT the invite before he can push.** This is a
> very common ten-minute stall. Watch him click accept.

**On his machine:**

```bash
git clone https://github.com/<you>/git-lesson.git
cd git-lesson
git log --oneline
```

> **Say:** "`clone` is `init` + `remote add` + `pull`, in one. You've got the entire history —
> every commit, not just the latest files. That's what 'distributed' means. Your laptop has a
> complete backup of the project right now."

**Commands covered:** `git remote add`, `git remote -v`, `git push -u`, `git clone`

---

## Act 3 — The issue (10 min)

On GitHub → **Issues** → **New issue**. Have *him* write it. Title and body:

```
Title: Add a page header and a short intro paragraph

The page is currently just an <h1>. It needs a real header block
and one sentence explaining what the page is.

Acceptance criteria:
- [ ] A <header> element containing the title
- [ ] One <p> under it explaining the page in one sentence
```

> **Say:** "The issue is the *conversation*. It says what should be true when we're done, and
> it does not say how. Notice it got a number — **#1**. That number is the thread that ties the
> issue, the branch, the pull request and the merge together. That's the whole workflow."

Assign it to him. Show him Labels and Milestones exist, don't dwell.

---

## Act 4 — Branch → commit → pull request → review → merge (25 min)

**The core of the lesson.** He drives on his machine; you watch and narrate.

```bash
git switch -c feat/1-page-header
```

> **Say:** "A branch is not a copy of the folder. It is a *sticky note pointing at a commit*.
> Making one is instant and free — that's why we make them constantly. The `1` in the name is the
> issue number, so in six months anyone can trace this branch back to why it existed."
>
> `git switch` is the modern command (git 2.23+). You'll see `git checkout -b` everywhere online —
> it does the same thing plus a dozen unrelated jobs, which is exactly why they split it up.

He edits `index.html` to satisfy the issue, then:

```bash
git status
git add index.html
git commit -m "Add page header and intro paragraph"
git push
```

The first push on a new branch errors helpfully — **let it happen, don't pre-empt it**:

```
fatal: The current branch feat/1-page-header has no upstream branch.
To push the current branch and set the remote-tracking branch, use

    git push --set-upstream origin feat/1-page-header
```

> **Teaching moment: git error messages usually contain the exact command you need.** Beginners
> panic at red text and stop reading. Make him read it out loud and then run what it says. This
> single habit will save him more time than anything else today.

On GitHub, the repo now shows a **"Compare & pull request"** banner. Click it. Body — this is
Sletcher Systems house standard (`PR-BODY-TEMPLATE.md`), trimmed to beginner size:

```markdown
Closes #1.

## The change
Adds a <header> block with the page title, and one <p> under it describing the page.

## Tests
| test | pins | fails without the change |
|---|---|---|
| Open index.html in a browser | header and paragraph both render | **yes** |
```

> **Say:** "`Closes #1` is not a comment. GitHub reads it, and the moment this PR merges it will
> close issue #1 automatically. It only works from the PR description or a commit message —
> not from a comment underneath."
>
> On `## Tests`: "'Test' here means *how would someone check you actually did it*. Opening the file
> in a browser counts. The column that matters is **fails without the change** — a check that passes
> either way isn't proving anything."

**You review it.** Files changed → click a line number → leave a comment → **Request changes**.
Ask for something real but tiny ("the paragraph should mention it's a git lesson").

> Note: you cannot approve your own pull request. That's why he opened this one — and why the
> roles swap in Act 6.

**He fixes it on the same branch:**

```bash
# edit the file
git add index.html
git commit -m "Mention the lesson in the intro paragraph"
git push
```

> **Refresh the PR page.** The new commit is already there. **This is a genuine "oh!" moment for
> most people** — a PR is not a snapshot you submitted, it's a *live view of a branch*. Push again
> and the PR updates itself.

You **Approve**, then **Merge**. Show him the dropdown has three options and explain honestly:

| Button | What it does | When |
|---|---|---|
| **Create a merge commit** | Keeps every commit, adds one merge commit joining the two lines | Default. Honest history. |
| **Squash and merge** | Flattens all the branch's commits into one commit on `main` | Most teams' default — keeps `main` readable when a PR has 14 "wip" commits |
| **Rebase and merge** | Replays each commit onto `main`, no merge commit | Linear history, no merge bubbles |

**Use "Create a merge commit" today**, so the graph in Act 6 actually shows a merge.

Watch issue #1 close by itself. Point at it.

**Commands covered:** `git switch -c`, `git push --set-upstream`, PR, review, merge, `Closes #N`

---

## Act 5 — Sync and clean up (10 min)

**Both of you:**

```bash
git switch main
git pull
git log --oneline --graph --all
```

> **`git pull` is two commands.** It is `git fetch` (download the new commits, change nothing)
> followed by `git merge` (join them into your branch). Show him:
>
> ```bash
> git fetch origin
> git status        # "Your branch is behind 'origin/main' by 2 commits"
> git merge origin/main
> ```
>
> Same result, but now he knows what `pull` was doing. **This matters** — half of all confusing
> git situations are a `pull` doing a merge the person didn't know was happening.

Clean up the merged branch:

```bash
git branch                    # list local branches
git branch -d feat/1-page-header
git fetch --prune             # drop stale remote-tracking branches GitHub already deleted
```

> **Gotcha worth naming:** `-d` is the safe delete — it refuses if the branch isn't merged.
> `-D` is the force delete. **If you had used "Squash and merge", `-d` would refuse**, because
> the branch's actual commits never appear on `main` — a single new one does. That's not a bug;
> it's the honest consequence of squashing.

**Commands covered:** `git pull`, `git fetch`, `git merge`, `git branch`, `git branch -d`,
`git fetch --prune`, `git log --graph`

---

## Act 6 — The staged conflict, and rebase (25 min)

**The best part of the lesson. Do not skip it, and do not let it happen by accident —
choreograph it.**

> **Say up front:** "We are now going to break it on purpose. A merge conflict is not an error
> and you have not done anything wrong. It is git saying: two people changed the same line, and
> I am not willing to guess which one wins. It's the one moment git refuses to be clever."

**Both start from an up-to-date `main`.** Both make a branch. **Both edit the same line** — the
`<h1>`. Agree the line in advance.

```bash
# YOU
git switch main && git pull
git switch -c feat/teacher-title
# edit the <h1> to "Git Lesson — Sletcher Systems"
git commit -am "Set the page title"
git push -u origin feat/teacher-title
```

```bash
# HIM — same line, different text
git switch main && git pull
git switch -c feat/student-title
# edit the SAME <h1> to something else
git commit -am "Set the page title"
git push -u origin feat/student-title
```

> `git commit -am` = add all **already-tracked** modified files and commit, in one. It does
> **not** pick up brand new untracked files. Worth saying out loud, because it bites people.

**Open both PRs. Merge yours first.** His PR page now says: **"This branch has conflicts that
must be resolved."**

Now he fixes it, **with rebase**, on his machine:

```bash
git switch feat/student-title
git fetch origin
git rebase origin/main
```

```
Auto-merging index.html
CONFLICT (content): Merge conflict in index.html
error: could not apply 36043ba... Set the page title
hint: Resolve all conflicts manually, mark them as resolved with
hint: "git add/rm <conflicted_files>", then run "git rebase --continue".
```

The file now contains:

```
<<<<<<< HEAD
<h1>Git Lesson — Sletcher Systems</h1>
=======
<h1>His version of the title</h1>
>>>>>>> 36043ba (Set the page title)
```

> ### ⚠️ The trap. Teach this explicitly — it is why people accidentally delete their own work.
>
> **In a `merge`, `HEAD` is your branch.** In a **`rebase`, `HEAD` is the OTHER branch** — the one
> you're rebasing onto — and *your* commit is the one on the bottom.
>
> | | top (`HEAD`) side is | bottom side is |
> |---|---|---|
> | `git merge` | **yours** | theirs — labelled with a **branch name** |
> | `git rebase` | **theirs** (`main`) | **yours** — labelled with a **commit sha + message** |
>
> **The tell:** look at the bottom marker. A **branch name** (`>>>>>>> feat/x`) means you're in a
> merge. A **sha and a commit message** (`>>>>>>> 36043ba (Set the page title)`) means you're in a
> rebase. If you're ever unsure which one you're in, `git status` says so in its first line.
>
> *(Both tables above were verified by running it on this machine, not recalled from memory.)*

Resolve it: **delete all three marker lines** and leave the file as you want it. VS Code's
"Accept Current / Accept Incoming / Accept Both" buttons do exactly this — but make him do it by
hand once, so he knows what the buttons are doing.

```bash
git add index.html
git rebase --continue          # VS Code opens for the commit message — save and close the tab
git log --oneline --graph
git push --force-with-lease
```

> **Why a force push, and why he must not be scared of it here.** Rebase does not move his commit —
> it makes a **brand new commit with the same changes and a different sha**, on top of the new
> `main`. The old commit is still sitting on GitHub. The two histories genuinely disagree, so a
> normal push is correctly refused.
>
> **`--force-with-lease`, never plain `--force`.** With-lease refuses if anyone else has pushed to
> that branch since your last fetch. Plain `--force` silently destroys their work. Treat
> `--force` as a word you don't type.
>
> **The rule that keeps you safe: never rebase a branch other people are building on.** Rebasing
> your own feature branch is routine and fine. Rebasing `main` is how you ruin a Friday.

**Then show the difference visually.** Both graphs, side by side — the visual aid animates this in
section 3, and it's much clearer there than in a terminal:

```bash
git log --oneline --graph --all
```

**Merge** keeps both lines of work and joins them with a merge commit — history as it *actually
happened*. **Rebase** rewrites your commits to pretend you started from the latest `main` — a
straight line, a tidier story, but a story that isn't literally true.

> Neither is "better". Merge is honest, rebase is readable. Teams pick one and stay consistent.

**And the panic button, which he should learn now, calmly:**

```bash
git rebase --abort      # puts everything back exactly as it was
git merge --abort       # same, for a merge
```

**Commands covered:** `git rebase`, `git rebase --continue`, `git rebase --abort`,
`git push --force-with-lease`, conflict resolution, `git commit -am`

---

## Act 7 — Stretch, if time (as far as you get)

Pick from these — each is 3–5 minutes standalone. They're in the visual aid's command reference too.

| Command | The one-line pitch |
|---|---|
| `git stash` / `git stash pop` | "Put my mess in a drawer, I need to switch branches right now" |
| `git revert <sha>` | Undo a commit **that's already public** — makes a *new* commit that reverses it. Safe. |
| `git reset --soft HEAD~1` | Undo the commit, keep the changes staged |
| `git reset --mixed HEAD~1` | Undo the commit, changes back in the working directory (the default) |
| `git reset --hard HEAD~1` | Undo the commit **and destroy the changes**. The only genuinely dangerous one. |
| `git reflog` | **The undo button for git itself.** Every position HEAD has been in, ~90 days. Recovers "lost" commits after a bad reset. |
| `.gitignore` | Files git should never track. **Does not affect already-tracked files** — for those you need `git rm --cached <file>`. |
| `git blame index.html` | Who last changed each line, and in which commit |
| `git tag -a v1.0 -m "..."` | A permanent name for a commit. Releases. Note: `git push` does **not** push tags — `git push --tags`. |
| `git cherry-pick <sha>` | Copy one commit from another branch onto this one |

> **If you teach only one of these, teach `git reflog`.** The reason beginners are frightened of
> git is the belief that they can permanently destroy work. Show him that a commit, once made,
> is essentially impossible to lose. **The one real exception: `reset --hard` destroys
> *uncommitted* changes and nothing can bring them back.** Commit early — a commit is a save point.

---

## What will go wrong — the Panic Table

Keep this open. Every one of these is common; none is a disaster.

| Symptom | What actually happened | Fix |
|---|---|---|
| `warning: LF will be replaced by CRLF` | Windows vs Unix line endings. **Harmless.** | Ignore it. It fires on your machine — I checked. |
| `Updates were rejected because the remote contains work you do not have` | Someone pushed since your last pull | `git pull` then push again |
| `refusing to merge unrelated histories` | You ticked "Add a README" when creating the repo | `git pull origin main --allow-unrelated-histories`, resolve, push |
| `fatal: not a git repository` | Wrong folder | `cd` into the project. `git status` to confirm |
| `Please tell me who you are` | `user.name`/`user.email` not set | The `git config --global` lines from Act 0 |
| `error: failed to push some refs` after a rebase | Expected — the shas changed | `git push --force-with-lease` |
| An editor opened and he's stuck | VS Code opened for a commit/rebase message | Type the message, **save**, close the tab. Git resumes. |
| Support for password authentication was removed | Using a password to push | `gh auth login`, or let Credential Manager pop the browser |
| `git branch -d` says "not fully merged" | The PR was **squash**-merged | Confirm it merged on GitHub, then `git branch -D` |
| Everything is on fire | | `git rebase --abort` / `git merge --abort`, or `git reflog` and reset to a known-good sha |

---

## Coverage check — everything you asked to cover

| You asked for | Covered in |
|---|---|
| `git init` | Act 1 |
| `git add` | Act 1 (+ the interactive simulator) |
| Make an issue | Act 3 |
| Solve it with a PR | Act 4 |
| Merge | Act 4 (three merge strategies), Act 6 |
| Rebase | Act 6, with a real conflict and the graph comparison |
| Both people on one repo | Acts 2–6 throughout — collaborator, not fork |

Also covered, because they're unavoidable in a real flow: `status`, `commit`, `log`, `diff`,
`restore`, `switch`, `branch`, `clone`, `remote`, `push`, `pull`, `fetch`, `--force-with-lease`,
`config`, and the whole of Act 7.

---

## Honest notes on the plan

- **Timing is optimistic.** Act 4 alone can eat 40 minutes if authentication misbehaves. Acts 0–5
  are a complete, satisfying lesson on their own — if you're running out of road, **stop after
  Act 5 and do Act 6 as lesson two.** A rushed conflict is worse than no conflict.
- **He should type every command himself.** Watching you type teaches nothing.
- **Resist explaining the object model** — blobs, trees, refs. It's fascinating and it is not what
  makes someone productive on day one. The four-places model is enough.
- **You'll be asked something you don't know.** "Let's find out" and then reading `git help <cmd>`
  together is a better lesson than a confident wrong answer — and it teaches him the actual skill.
