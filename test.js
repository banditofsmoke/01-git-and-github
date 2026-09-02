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
    includes(g.exec('git diff').lines, 'My notes, version');
  });
  it('git diff shows NOTHING after staging, and explains why', () => {
    const g = committed(); g.editFile(); g.exec('git add notes.txt');
    const r = g.exec('git diff');
    includes(r.lines, 'you already staged it');
    includes(r.lines, 'git diff --staged', 'points at the right command');
  });
  it('git diff --staged shows them instead', () => {
    const g = committed(); g.editFile(); g.exec('git add notes.txt');
    includes(g.exec('git diff --staged').lines, 'My notes, version');
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
  it('git pull makes a merge commit when both sides moved', () => {
    const g = pushed(); g.remoteCommit();
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "mine"');
    const r = g.exec('git pull');
    includes(r.lines, 'Merge made by');
    const s = g.snapshot();
    eq(s.remoteOnly, 0, 'caught up');
    ok(s.ahead > 0, 'merge leaves you ahead, so you still have to push');
  });
  it('after a divergent pull, origin still counts the commits it already had', () => {
    // Caught from the UI: box 4 read "nothing pushed" straight after a merge,
    // even though origin plainly still held commits.
    const g = pushed();          // origin has 1
    g.remoteCommit();            // origin has 2, we have 1
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "mine"');
    g.exec('git pull');
    const s = g.snapshot();
    eq(s.pushed, 2, 'origin still holds the 2 commits it had');
    eq(s.commits, 4, 'local: 2 originals + theirs + the merge commit');
    eq(s.ahead, 2, 'only our commit and the merge commit are unpushed');
  });

  it('push succeeds again after pulling', () => {
    const g = pushed(); g.remoteCommit();
    g.editFile(); g.exec('git add notes.txt'); g.exec('git commit -m "mine"');
    g.exec('git pull');
    ok(g.exec('git push').ok, 'push after pull');
    eq(g.snapshot().ahead, 0, 'ahead');
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
