/*
 * Unit tests for the sandbox state machine in index.html.
 *
 *   node test.js
 *
 * No dependencies and no build step, on purpose — the whole project is one HTML
 * file you can open from disk, and the tests should not change that. So instead
 * of importing a module, this reads index.html and pulls the engine out from
 * between the GIT-ENGINE sentinels. If someone edits the engine, these run
 * against the edit; if someone deletes the sentinels, this fails loudly.
 */

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/\/\* ==GIT-ENGINE-START==[\s\S]*?\*\/([\s\S]*?)\/\* ==GIT-ENGINE-END== \*\//);
if (!m) {
  console.error('Could not find the engine sentinels in index.html.');
  console.error('Expected /* ==GIT-ENGINE-START== ... */ ... /* ==GIT-ENGINE-END== */');
  process.exit(1);
}
// Wrapped in an IIFE so the engine's own `function createGit` declaration stays
// in its own scope instead of colliding with the const receiving it.
// eslint-disable-next-line no-eval
const createGit = eval('(function(){' + m[1] + '\nreturn createGit;})()');

/* ---------- tiny harness ---------- */
let pass = 0, fail = 0, group = '';
const failures = [];

function describe(name, fn) { group = name; fn(); }
function it(name, fn) {
  try { fn(); pass++; process.stdout.write('.'); }
  catch (e) {
    fail++; process.stdout.write('X');
    failures.push({ group, name, msg: e.message });
  }
}
function eq(actual, expected, what) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${what || 'value'}: expected ${b}, got ${a}`);
}
function ok(v, what) { if (!v) throw new Error(what || 'expected truthy'); }
function includes(lines, needle, what) {
  const joined = lines.map(l => l.t).join('\n');
  if (joined.indexOf(needle) === -1) {
    throw new Error(`${what || 'output'}: expected to contain ${JSON.stringify(needle)}\n--- got ---\n${joined}`);
  }
}
function excludes(lines, needle, what) {
  const joined = lines.map(l => l.t).join('\n');
  if (joined.indexOf(needle) !== -1) {
    throw new Error(`${what || 'output'}: expected NOT to contain ${JSON.stringify(needle)}`);
  }
}

/* deterministic shas so assertions are stable */
let n = 0;
const fresh = () => createGit({ sha: () => 'sha' + String(++n).padStart(4, '0') });

/* a repo with one commit already made */
function committed() {
  const g = fresh();
  g.exec('git init'); g.editFile();
  g.exec('git add notes.txt'); g.exec('git commit -m "first"');
  return g;
}
/* a repo already connected and pushed */
function pushed() {
  const g = committed();
  g.exec('git remote add origin https://github.com/you/git-practice.git');
  g.exec('git push -u origin main');
  return g;
}

/* ================= tests ================= */

describe('a fresh sandbox', () => {
  it('starts with nothing', () => {
    const s = fresh().snapshot();
    eq(s.init, false, 'init'); eq(s.exists, false, 'exists');
    eq(s.commits, 0, 'commits'); eq(s.hasRemote, false, 'hasRemote');
  });
  it('refuses every command before git init', () => {
    const g = fresh();
    ['git status', 'git add notes.txt', 'git log', 'git push'].forEach(c => {
      const r = g.exec(c);
      eq(r.ok, false, c + ' should fail');
      includes(r.lines, 'not a git repository', c);
    });
  });
  it('will not let you edit a file before init', () => {
    eq(fresh().editFile().ok, false, 'editFile before init');
  });
});

describe('box 1 → box 2 → box 3', () => {
  it('git init makes a repo on main', () => {
    const g = fresh(); const r = g.exec('git init');
    ok(r.ok); eq(g.snapshot().init, true, 'init');
    includes(r.lines, 'Initialized empty Git repository');
    includes(r.lines, "called 'main'", 'explains the branch name');
  });
  it('a new file is untracked', () => {
    const g = fresh(); g.exec('git init'); g.editFile();
    const s = g.snapshot();
    eq(s.untracked, true, 'untracked'); eq(s.staged, false, 'staged');
    includes(g.exec('git status').lines, 'Untracked files:');
  });
  it('git add moves it to staging and says nothing', () => {
    const g = fresh(); g.exec('git init'); g.editFile();
    const r = g.exec('git add notes.txt');
    eq(r.moved, 'add', 'moved'); eq(g.snapshot().staged, true, 'staged');
    includes(r.lines, 'silent');
  });
  it('git add on a missing file fails with pathspec', () => {
    const g = fresh(); g.exec('git init');
    const r = g.exec('git add notes.txt');
    eq(r.ok, false); includes(r.lines, 'did not match any files');
  });
  it('git commit records it and empties the basket', () => {
    const g = fresh(); g.exec('git init'); g.editFile(); g.exec('git add notes.txt');
    const r = g.exec('git commit -m "hello"');
    eq(r.moved, 'commit', 'moved');
    const s = g.snapshot();
    eq(s.commits, 1, 'commits'); eq(s.staged, false, 'basket emptied');
    includes(r.lines, 'root-commit'); includes(r.lines, 'hello');
  });
  it('refuses to commit with an empty basket', () => {
    const g = fresh(); g.exec('git init'); g.editFile();
    const r = g.exec('git commit -m "nope"');
    eq(r.ok, false); eq(g.snapshot().commits, 0, 'no commit made');
  });
  it('only the first commit is a root-commit', () => {
    const g = committed();
    g.editFile(); g.exec('git add notes.txt');
    excludes(g.exec('git commit -m "second"').lines, 'root-commit');
  });
});

describe('the classic git diff confusion', () => {
  it('git diff shows changes before staging', () => {
    const g = committed(); g.editFile();
    includes(g.exec('git diff').lines, 'notes.txt, version');
  });
  it('git diff shows NOTHING after staging, and explains why', () => {
    const g = committed(); g.editFile(); g.exec('git add notes.txt');
    const r = g.exec('git diff');
    includes(r.lines, 'you already staged it');
    includes(r.lines, 'git diff --staged', 'points at the right command');
  });
  it('git diff --staged shows them instead', () => {
    const g = committed(); g.editFile(); g.exec('git add notes.txt');
    includes(g.exec('git diff --staged').lines, 'notes.txt, version');
  });
});

describe('undo', () => {
  it('git restore throws away unstaged edits', () => {
    const g = committed(); g.editFile();
    eq(g.snapshot().modified, true, 'modified before');
    g.exec('git restore notes.txt');
    eq(g.snapshot().modified, false, 'clean after');
  });
  it('git restore --staged empties the basket but keeps the edit', () => {
    const g = committed(); g.editFile(); g.exec('git add notes.txt');
    g.exec('git restore --staged notes.txt');
    const s = g.snapshot();
    eq(s.staged, false, 'unstaged'); eq(s.modified, true, 'edit survives');
  });
});

describe('box 4 — the remote', () => {
  it('push without a remote fails', () => {
    const g = committed();
    const r = g.exec('git push');
    eq(r.ok, false); includes(r.lines, "'origin' does not appear to be a git repository");
  });
  it('remote add connects but sends nothing', () => {
    const g = committed();
    const r = g.exec('git remote add origin https://github.com/you/git-practice.git');
    ok(r.ok);
    const s = g.snapshot();
    eq(s.hasRemote, true, 'hasRemote'); eq(s.pushed, 0, 'nothing pushed yet');
  });
  it('adding origin twice errors', () => {
    const g = committed();
    g.exec('git remote add origin https://x.git');
    eq(g.exec('git remote add origin https://x.git').ok, false);
  });
  it('bare push with no upstream fails AND prints the exact fix', () => {
    const g = committed();
    g.exec('git remote add origin https://github.com/you/git-practice.git');
    const r = g.exec('git push');
    eq(r.ok, false);
    includes(r.lines, 'has no upstream branch');
    includes(r.lines, 'git push --set-upstream origin main', 'hands over the command');
    eq(g.snapshot().pushed, 0, 'still nothing pushed');
  });
  it('push -u uploads and sets upstream', () => {
    const g = committed();
    g.exec('git remote add origin https://github.com/you/git-practice.git');
    const r = g.exec('git push -u origin main');
    eq(r.moved, 'push', 'moved');
    const s = g.snapshot();
    eq(s.upstream, true, 'upstream'); eq(s.pushed, 1, 'pushed'); eq(s.ahead, 0, 'ahead');
    includes(r.lines, "set up to track");
  });
  it('pushing twice says everything up-to-date', () => {
    const g = pushed();
    includes(g.exec('git push').lines, 'Everything up-to-date');
  });
  it('new local commits show as ahead until pushed', () => {
    const g = pushed();
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "second"');
    eq(g.snapshot().ahead, 1, 'ahead');
    includes(g.exec('git status').lines, 'ahead of');
    g.exec('git push');
    eq(g.snapshot().ahead, 0, 'ahead after push');
  });
});

describe('when GitHub is ahead of you', () => {
  it('a website edit lands only on the remote', () => {
    const g = pushed(); g.remoteCommit();
    const s = g.snapshot();
    eq(s.remoteOnly, 1, 'remoteOnly'); eq(s.fetched, false, 'not fetched yet');
  });
  it('cannot happen before a remote exists', () => {
    eq(committed().remoteCommit().ok, false, 'remoteCommit without origin');
  });
  it('push is REJECTED, and says why', () => {
    const g = pushed(); g.remoteCommit();
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "mine"');
    const r = g.exec('git push');
    eq(r.ok, false);
    includes(r.lines, '[rejected]');
    includes(r.lines, 'fetch first');
    includes(r.lines, 'protecting you');
  });
  it('git fetch downloads without touching your folder', () => {
    const g = pushed(); g.remoteCommit();
    const before = g.snapshot().commits;
    const r = g.exec('git fetch');
    ok(r.ok);
    const s = g.snapshot();
    eq(s.fetched, true, 'fetched');
    eq(s.commits, before, 'local commits unchanged by fetch');
    eq(s.remoteOnly, 1, 'still not merged');
  });
  it('git pull fast-forwards when you have nothing of your own', () => {
    const g = pushed(); g.remoteCommit();
    const r = g.exec('git pull');
    includes(r.lines, 'Fast-forward');
    const s = g.snapshot();
    eq(s.remoteOnly, 0, 'caught up'); eq(s.ahead, 0, 'nothing to push');
    eq(s.commits, 2, 'their commit is now local');
  });
  it('git pull merges cleanly when the two sides touched DIFFERENT files', () => {
    const g = pushed(); g.remoteCommit();
    g.editFile('todo.txt'); g.exec('git add todo.txt'); g.exec('git commit -m "mine"');
    const r = g.exec('git pull');
    includes(r.lines, 'Merge made by');
    includes(r.lines, 'DIFFERENT files');
    const s = g.snapshot();
    eq(s.remoteOnly, 0, 'caught up');
    ok(s.ahead > 0, 'merge leaves you ahead, so you still have to push');
  });
  it('after a divergent pull, origin still counts the commits it already had', () => {
    // Caught from the UI: box 4 read "nothing pushed" straight after a merge,
    // even though origin plainly still held commits.
    const g = pushed();          // origin has 1
    g.remoteCommit();            // origin has 2, we have 1
    g.editFile('todo.txt'); g.exec('git add todo.txt'); g.exec('git commit -m "mine"');
    g.exec('git pull');
    const s = g.snapshot();
    eq(s.pushed, 2, 'origin still holds the 2 commits it had');
    eq(s.commits, 4, 'local: 2 originals + theirs + the merge commit');
    eq(s.ahead, 2, 'only our commit and the merge commit are unpushed');
  });

  it('push succeeds again after pulling', () => {
    const g = pushed(); g.remoteCommit();
    g.editFile('todo.txt'); g.exec('git add todo.txt'); g.exec('git commit -m "mine"');
    g.exec('git pull');
    ok(g.exec('git push').ok, 'push after pull');
    eq(g.snapshot().ahead, 0, 'ahead');
  });
});

describe('more than one file — what staging is actually for', () => {
  it('you can stage one file and leave another alone', () => {
    const g = committed();
    g.editFile('notes.txt'); g.editFile('todo.txt');
    g.exec('git add todo.txt');
    const s = g.snapshot();
    eq(s.stagedList, ['todo.txt'], 'only todo is staged');
    eq(s.modifiedList, ['notes.txt'], 'notes is still just modified');
  });
  it('so a commit takes only what you staged', () => {
    const g = committed();
    g.editFile('notes.txt'); g.editFile('todo.txt');
    g.exec('git add todo.txt'); g.exec('git commit -m "just the todo"');
    const s = g.snapshot();
    ok(s.tree['todo.txt'] !== undefined, 'todo made it in');
    eq(s.modifiedList, ['notes.txt'], 'the notes edit is still waiting');
  });
  it('git add . takes everything', () => {
    const g = committed();
    g.editFile('notes.txt'); g.editFile('todo.txt');
    g.exec('git add .');
    eq(g.snapshot().modifiedList.length, 0, 'nothing left unstaged');
    eq(g.snapshot().stagedList.length, 2, 'both staged');
  });
  it('status reports each file in its own section', () => {
    const g = committed();
    g.editFile('notes.txt'); g.editFile('todo.txt'); g.exec('git add todo.txt');
    const r = g.exec('git status');
    includes(r.lines, 'Changes to be committed:');
    includes(r.lines, 'Changes not staged for commit:');
  });
});

describe('.gitignore', () => {
  it('a secret shows up as untracked until you ignore it', () => {
    const g = committed();
    g.editFile('secrets.env');
    eq(g.snapshot().untrackedList, ['secrets.env'], 'git is offering to commit your secret');
    g.addIgnore();
    eq(g.snapshot().untrackedList.indexOf('secrets.env'), -1, 'now invisible to git');
  });
  it('git add . skips ignored files', () => {
    const g = committed();
    g.editFile('secrets.env'); g.addIgnore();
    g.exec('git add .');
    eq(g.snapshot().stagedList.indexOf('secrets.env'), -1, 'secret not staged');
    ok(g.snapshot().stagedList.indexOf('.gitignore') > -1, 'but .gitignore itself is');
  });
  it('naming an ignored file explicitly is refused, with the reason', () => {
    const g = committed();
    g.editFile('secrets.env'); g.addIgnore();
    const r = g.exec('git add secrets.env');
    eq(r.ok, false); includes(r.lines, 'ignored by one of your .gitignore files');
  });
  it('ignoring does NOT untrack something already committed — rm --cached does', () => {
    const g = committed();
    g.editFile('secrets.env');
    g.exec('git add secrets.env'); g.exec('git commit -m "oops, committed a secret"');
    ok(g.snapshot().tree['secrets.env'] !== undefined, 'the secret is in history');
    g.addIgnore();
    ok(g.snapshot().tree['secrets.env'] !== undefined, 'gitignore did not help — still tracked');
    ok(g.exec('git rm --cached secrets.env').ok, 'rm --cached is the fix');
    ok(g.snapshot().stagedList.indexOf('secrets.env') > -1, 'staged as a deletion');
  });
});

describe('merging depends on WHICH files changed', () => {
  function twoBranches(fileA, fileB) {
    const g = committed();
    g.exec('git switch -c feature');
    g.editFile(fileA); g.exec('git add ' + fileA); g.exec('git commit -m "feature"');
    g.exec('git switch main');
    g.editFile(fileB); g.exec('git add ' + fileB); g.exec('git commit -m "main"');
    return g;
  }
  it('different files merge cleanly, with no conflict at all', () => {
    const g = twoBranches('todo.txt', 'notes.txt');
    const r = g.exec('git merge feature');
    ok(r.ok, 'merged without asking');
    includes(r.lines, 'DIFFERENT files');
    eq(g.snapshot().merging, false, 'no conflict state');
    const t = g.snapshot().tree;
    ok(t['todo.txt'] !== undefined && t['notes.txt'] !== undefined, 'both sides kept');
  });
  it('the SAME file is what actually conflicts', () => {
    const g = twoBranches('notes.txt', 'notes.txt');
    const r = g.exec('git merge feature');
    eq(r.ok, false);
    eq(g.snapshot().conflicts, ['notes.txt'], 'and it names the file');
  });
});

describe('branches', () => {
  it('needs a commit before you can branch', () => {
    const g = fresh(); g.exec('git init'); g.editFile();
    const r = g.exec('git switch -c feature');
    eq(r.ok, false); includes(r.lines, 'must commit something');
  });
  it('switch -c creates one and moves you onto it', () => {
    const g = committed();
    const r = g.exec('git switch -c feature');
    ok(r.ok); includes(r.lines, "Switched to a new branch 'feature'");
    eq(g.snapshot().branch, 'feature', 'branch');
  });
  it('git checkout -b is accepted as the old spelling', () => {
    const g = committed();
    ok(g.exec('git checkout -b feature').ok);
    eq(g.snapshot().branch, 'feature', 'branch');
  });
  it('refuses a name that already exists', () => {
    const g = committed(); g.exec('git switch -c feature'); g.exec('git switch main');
    const r = g.exec('git switch -c feature');
    eq(r.ok, false); includes(r.lines, 'already exists');
  });
  it('committing on a branch does not move main', () => {
    const g = committed();
    const mainTip = g.snapshot().lastSha;
    g.exec('git switch -c feature');
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "on branch"');
    ok(g.snapshot().lastSha !== mainTip, 'feature moved');
    g.exec('git switch main');
    eq(g.snapshot().lastSha, mainTip, 'main did not move');
  });
  it('switching rewrites the working file to that branch', () => {
    const g = committed();
    const v0 = g.snapshot().wd;
    g.exec('git switch -c feature');
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "on branch"');
    const v1 = g.snapshot().wd;
    ok(v1 !== v0, 'file changed on the branch');
    g.exec('git switch main');
    eq(g.snapshot().wd, v0, 'file went back when we switched away');
    g.exec('git switch feature');
    eq(g.snapshot().wd, v1, 'and returned when we switched back — nothing lost');
  });
  it('refuses to switch with uncommitted changes', () => {
    const g = committed(); g.exec('git switch -c feature'); g.exec('git switch main');
    g.editFile();
    const r = g.exec('git switch feature');
    eq(r.ok, false);
    includes(r.lines, 'would be overwritten by checkout');
    eq(g.snapshot().branch, 'main', 'stayed put');
  });
  it('git branch lists them and marks the current one', () => {
    const g = committed(); g.exec('git switch -c feature');
    const r = g.exec('git branch');
    includes(r.lines, '* feature'); includes(r.lines, '  main');
  });
});

describe('merging branches', () => {
  /* main untouched since the branch point */
  function branchAhead() {
    const g = committed();
    g.exec('git switch -c feature');
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "feature work"');
    g.exec('git switch main');
    return g;
  }
  it('fast-forwards when main has not moved', () => {
    const g = branchAhead();
    const r = g.exec('git merge feature');
    ok(r.ok); includes(r.lines, 'Fast-forward');
    eq(g.snapshot().merging, false, 'no merge in progress');
  });
  it('says already up to date when there is nothing to take', () => {
    const g = branchAhead(); g.exec('git merge feature');
    includes(g.exec('git merge feature').lines, 'Already up to date.');
  });
  it('conflicts when BOTH sides moved', () => {
    const g = branchAhead();
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "main work"');
    const r = g.exec('git merge feature');
    eq(r.ok, false);
    includes(r.lines, 'CONFLICT (content)');
    eq(g.snapshot().merging, true, 'left in a merging state');
  });
  it('will not commit a conflict until you stage the fix', () => {
    const g = branchAhead();
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "main work"');
    g.exec('git merge feature');
    const r = g.exec('git commit -m "merge"');
    eq(r.ok, false); includes(r.lines, 'unmerged files');
  });
  it('add then commit finishes the merge, with two parents', () => {
    const g = branchAhead();
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "main work"');
    g.exec('git merge feature');
    g.editFile();                       // resolve by editing
    ok(g.exec('git add notes.txt').ok, 'stage the resolution');
    ok(g.exec('git commit -m "Merge feature"').ok, 'commit it');
    eq(g.snapshot().merging, false, 'merge finished');
    const merge = g.snapshot().graph.nodes.filter(n => n.merge);
    eq(merge.length, 1, 'one merge commit exists');
  });
  it('merge --abort puts everything back', () => {
    const g = branchAhead();
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "main work"');
    const before = g.snapshot().lastSha;
    g.exec('git merge feature');
    ok(g.exec('git merge --abort').ok);
    eq(g.snapshot().merging, false, 'not merging');
    eq(g.snapshot().lastSha, before, 'back where we were');
  });
  it('aborting when nothing is merging is an error', () => {
    eq(committed().exec('git merge --abort').ok, false);
  });
});

describe('deleting branches', () => {
  it('-d refuses a branch that is not merged', () => {
    const g = committed();
    g.exec('git switch -c feature');
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "work"');
    g.exec('git switch main');
    const r = g.exec('git branch -d feature');
    eq(r.ok, false); includes(r.lines, 'not fully merged');
  });
  it('-D forces it anyway', () => {
    const g = committed();
    g.exec('git switch -c feature');
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "work"');
    g.exec('git switch main');
    ok(g.exec('git branch -D feature').ok);
    eq(g.snapshot().branches.indexOf('feature'), -1, 'gone');
  });
  it('-d succeeds once it IS merged', () => {
    const g = committed();
    g.exec('git switch -c feature');
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "work"');
    g.exec('git switch main'); g.exec('git merge feature');
    ok(g.exec('git branch -d feature').ok, 'safe delete after merge');
  });
  it('cannot delete the branch you are standing on', () => {
    const g = committed();
    const r = g.exec('git branch -d main');
    eq(r.ok, false); includes(r.lines, 'Cannot delete branch');
  });
});

describe('rebase', () => {
  /* feature branched off, then main moved on — the classic setup */
  function diverged() {
    const g = committed();
    g.exec('git switch -c feature');
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "feature work"');
    g.exec('git switch main');
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "main work"');
    g.exec('git switch feature');
    return g;
  }
  it('replays your commits with BRAND NEW ids', () => {
    const g = diverged();
    const before = g.snapshot().lastSha;
    const r = g.exec('git rebase main');
    ok(r.ok);
    const after = g.snapshot().lastSha;
    ok(before !== after, 'the commit id changed — it is a new commit, not a moved one');
    includes(r.lines, 'became');
    includes(r.lines, 'abandoned the originals');
  });
  it('leaves the abandoned originals as orphans, not as your work', () => {
    const g = diverged();
    g.exec('git rebase main');
    const orphans = g.snapshot().graph.nodes.filter(n => n.kind === 'orphan');
    eq(orphans.length, 1, 'the replaced commit is now unreachable');
  });
  it('puts your work on top of main', () => {
    const g = diverged();
    g.exec('git rebase main');
    g.exec('git switch main');
    // main is now an ancestor of feature, so the merge is a clean fast-forward
    includes(g.exec('git merge feature').lines, 'Fast-forward');
  });
  it('says up to date when there is nothing to replay onto', () => {
    const g = committed();
    g.exec('git switch -c feature');
    includes(g.exec('git rebase main').lines, 'up to date');
  });
  it('refuses with unstaged changes', () => {
    const g = diverged(); g.editFile();
    const r = g.exec('git rebase main');
    eq(r.ok, false); includes(r.lines, 'unstaged changes');
  });
  it('rejects a plain push afterwards, but accepts --force-with-lease', () => {
    const g = committed();
    g.exec('git remote add origin https://x.git');
    g.exec('git push -u origin main');
    g.exec('git switch -c feature');
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "work"');
    g.exec('git switch main');
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "main work"');
    g.exec('git push');
    g.exec('git switch feature');
    g.exec('git push -u origin feature');
    g.exec('git rebase main');
    const bad = g.exec('git push');
    eq(bad.ok, false, 'plain push refuses after a rebase');
    ok(g.exec('git push --force-with-lease').ok, 'force-with-lease gets through');
  });
});

describe('stash', () => {
  it('refuses when there is nothing to stash', () => {
    eq(committed().exec('git stash').ok, false);
  });
  it('hides your changes and gives them back', () => {
    const g = committed();
    g.editFile();
    const dirtyVer = g.snapshot().wd;
    ok(g.exec('git stash').ok);
    eq(g.snapshot().modified, false, 'working tree is clean again');
    g.exec('git stash pop');
    eq(g.snapshot().wd, dirtyVer, 'changes came back');
    eq(g.snapshot().modified, true, 'and are unstaged again');
  });
  it('is the answer to being unable to switch branches', () => {
    const g = committed();
    g.exec('git switch -c feature'); g.exec('git switch main');
    g.editFile();
    eq(g.exec('git switch feature').ok, false, 'blocked by the dirty tree');
    g.exec('git stash');
    ok(g.exec('git switch feature').ok, 'stashing unblocks it');
  });
});

describe('reset, and getting it back', () => {
  function twoCommits() {
    const g = committed();
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "second"');
    return g;
  }
  it('--soft keeps the changes staged', () => {
    const g = twoCommits();
    g.exec('git reset --soft HEAD~1');
    eq(g.snapshot().commits, 1, 'one commit undone');
    eq(g.snapshot().staged, true, 'changes still in the basket');
  });
  it('--mixed drops them back into the folder', () => {
    const g = twoCommits();
    g.exec('git reset --mixed HEAD~1');
    eq(g.snapshot().staged, false, 'not staged');
    eq(g.snapshot().modified, true, 'but still in the file');
  });
  it('--hard destroys them', () => {
    const g = twoCommits();
    g.exec('git reset --hard HEAD~1');
    eq(g.snapshot().commits, 1, 'commit undone');
    eq(g.snapshot().modified, false, 'and the changes are gone');
  });
  it('reflog still holds what --hard threw away, so it can be recovered', () => {
    const g = twoCommits();
    const lost = g.snapshot().lastSha;
    g.exec('git reset --hard HEAD~1');
    ok(g.snapshot().lastSha !== lost, 'we really did lose it');
    const log = g.exec('git reflog');
    includes(log.lines, lost, 'the reflog still names it');
    g.exec('git reset --hard ' + lost);
    eq(g.snapshot().lastSha, lost, 'and it comes straight back');
  });
});

describe('revert and amend', () => {
  it('revert adds a commit rather than removing one', () => {
    const g = committed();
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "the bad one"');
    const n = g.snapshot().commits;
    const bad = g.snapshot().lastSha;
    ok(g.exec('git revert ' + bad).ok);
    eq(g.snapshot().commits, n + 1, 'history got longer, not shorter');
    ok(g.snapshot().graph.nodes.some(x => x.msg.indexOf('Revert') === 0), 'a revert commit exists');
  });
  it('amend replaces the last commit with a new id', () => {
    const g = committed();
    const before = g.snapshot().lastSha;
    ok(g.exec('git commit --amend -m "better message"').ok);
    ok(g.snapshot().lastSha !== before, 'the id changed — it is a replacement');
    ok(g.snapshot().graph.nodes.some(x => x.msg === 'better message'), 'new message stuck');
  });
});

describe('the history graph', () => {
  const g2 = g => g.snapshot().graph;

  it('is empty before anything happens', () => {
    const s = g2(fresh());
    eq(s.total, 0, 'total'); eq(s.diverged, false, 'diverged');
  });
  it('a new commit is local-only until pushed', () => {
    const g = committed();
    eq(g2(g).shared.length, 0, 'shared');
    eq(g2(g).localOnly.length, 1, 'localOnly');
  });
  it('pushing moves it from local-only to shared', () => {
    const g = pushed();
    eq(g2(g).shared.length, 1, 'shared');
    eq(g2(g).localOnly.length, 0, 'localOnly');
    eq(g2(g).diverged, false, 'diverged');
  });
  it('a website edit shows as remote-only, and is NOT a fork on its own', () => {
    const g = pushed(); g.remoteCommit();
    const s = g2(g);
    eq(s.remoteOnly.length, 1, 'remoteOnly');
    eq(s.localOnly.length, 0, 'localOnly');
    eq(s.diverged, false, 'origin merely being ahead is not a divergence');
  });
  it('commits on BOTH sides is what counts as diverged', () => {
    const g = pushed(); g.remoteCommit();
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "mine"');
    const s = g2(g);
    eq(s.diverged, true, 'diverged');
    eq(s.localOnly.length, 1, 'localOnly');
    eq(s.remoteOnly.length, 1, 'remoteOnly');
    // and this is exactly the state in which push refuses
    eq(g.exec('git push').ok, false, 'push refuses while diverged');
  });
  it('pulling heals the fork', () => {
    const g = pushed(); g.remoteCommit();
    g.editFile('todo.txt'); g.exec('git add todo.txt'); g.exec('git commit -m "mine"');
    g.exec('git pull');
    const s = g2(g);
    eq(s.diverged, false, 'no longer forked');
    eq(s.remoteOnly.length, 0, 'nothing left on origin only');
    ok(s.localOnly.length > 0, 'but you now have commits to push');
  });
  it('pushing after the pull leaves everything shared', () => {
    const g = pushed(); g.remoteCommit();
    g.editFile('todo.txt'); g.exec('git add todo.txt'); g.exec('git commit -m "mine"');
    g.exec('git pull'); g.exec('git push');
    const s = g2(g);
    eq(s.localOnly.length, 0, 'localOnly');
    eq(s.remoteOnly.length, 0, 'remoteOnly');
    eq(s.shared.length, s.total, 'everything is shared');
  });
  it('every commit carries a sha and a message for the labels', () => {
    const s = g2(committed());
    ok(s.localOnly[0].sha, 'sha');
    ok(s.localOnly[0].msg, 'msg');
  });
});

describe('the guided "do the next thing" button', () => {
  it('suggests init first, and edit second', () => {
    const g = fresh();
    eq(g.suggest().cmd, 'git init', 'first suggestion');
    g.exec('git init');
    eq(g.suggest().cmd, '@edit', 'second suggestion');
  });

  /* This is the regression test for the bug Glen found: clicking through the
     buttons could never reach box 4, because nothing offered `git remote add`
     or `git push -u`. Driving ONLY the suggestions must get all the way to a
     pushed state. */
  it('reaches box 4 by suggestion alone, with no typing', () => {
    const g = fresh();
    for (let i = 0; i < 12; i++) {
      const s = g.suggest();
      if (s.cmd === '@edit') g.editFile(); else g.exec(s.cmd);
      if (g.snapshot().pushed > 0) break;
    }
    const s = g.snapshot();
    eq(s.pushed > 0, true, 'reached box 4 by clicking alone');
    eq(s.hasRemote, true, 'connected a remote');
    eq(s.upstream, true, 'set upstream');
  });

  it('suggests pulling first when GitHub is ahead', () => {
    const g = pushed(); g.remoteCommit();
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "mine"');
    eq(g.suggest().cmd, 'git pull', 'must pull before pushing');
  });

  it('every suggestion it makes actually succeeds', () => {
    const g = fresh();
    for (let i = 0; i < 20; i++) {
      const s = g.suggest();
      const r = s.cmd === '@edit' ? g.editFile() : g.exec(s.cmd);
      ok(r.ok, `suggestion "${s.cmd}" failed at step ${i}`);
    }
  });
});

describe('reset', () => {
  it('puts everything back', () => {
    const g = pushed(); g.reset();
    const s = g.snapshot();
    eq(s.init, false, 'init'); eq(s.commits, 0, 'commits');
    eq(s.hasRemote, false, 'hasRemote'); eq(s.exists, false, 'exists');
  });
});

/* ---------- report ---------- */
console.log('\n');
if (failures.length) {
  failures.forEach(f => console.log(`  FAIL  ${f.group} › ${f.name}\n        ${f.msg}\n`));
}
console.log(`${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
