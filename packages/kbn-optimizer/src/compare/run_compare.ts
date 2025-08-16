/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/**
 * Compare bundle size metrics between the current workspace state and a target git ref.
 */

import Fs from 'fs';
import Path from 'path';
import Os from 'os';
import Crypto from 'crypto';
import { spawnSync } from 'child_process';
import type { ToolingLog } from '@kbn/tooling-log';
import chalk from 'chalk';
import { table, type TableUserConfig } from 'table';

interface BuildResultSummary {
  ref: string;
  metrics: Record<string, number>; // metric.id -> value (bytes)
}

interface RunCompareOptions {
  log: ToolingLog;
  repoRoot: string;
  compareRef: string; // branch, tag or commit sha
  dataDir?: string; // relative or absolute path for cached results (defaults to <repoRoot>/data/bundle_size_compare)
}

const METRIC_GROUP = 'page load bundle size';

function ensureDir(p: string) {
  Fs.mkdirSync(p, { recursive: true });
}

function sh(log: ToolingLog, cwd: string, cmd: string, env: Record<string, string> = {}) {
  log.debug(`$ (cwd: ${cwd}) ${cmd}`);
  const result = spawnSync(cmd, {
    cwd,
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, ...env, UNSAFE_DISABLE_NODE_VERSION_VALIDATION: '1' },
  });
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${cmd}`);
  }
}

function capture(cmd: string, cwd: string): string {
  const res = spawnSync(cmd, { cwd, shell: true, encoding: 'utf8', env: process.env });
  if (res.status !== 0) {
    throw new Error(`Command failed (${res.status}): ${cmd}\n${res.stderr}`);
  }
  return res.stdout.trim();
}

function hashUncommitted(repoRoot: string): string | undefined {
  // For large diffs capturing the entire patch text is expensive and can exceed default buffers.
  // Instead, hash the list of changed paths plus their blob object ids which is stable for content.
  // We consider both staged and unstaged changes relative to HEAD.
  const nameStatus = capture('git diff --name-only HEAD', repoRoot);
  const nameStatusCached = capture('git diff --name-only --cached', repoRoot);
  const files = Array.from(
    new Set(
      [...nameStatus.split('\n'), ...nameStatusCached.split('\n')]
        .map((f) => f.trim())
        .filter(Boolean)
    )
  );
  if (!files.length) return undefined;
  const hash = Crypto.createHash('sha256');
  for (const f of files.sort()) {
    // Use blob hash for file content if it exists in the index or working tree.
    // Try index first, then working tree.
    let blobId: string | undefined;
    try {
      blobId = capture(`git ls-files -s -- "${f}" | awk '{print $2}'`, repoRoot);
    } catch {
      // ignore
    }
    if (!blobId) {
      try {
        blobId = capture(`git hash-object "${f}"`, repoRoot);
      } catch {
        // file might be deleted, include marker
        blobId = 'deleted';
      }
    }
    hash.update(f + ':' + blobId + '\n');
  }
  return hash.digest('hex').slice(0, 8);
}

function discoverMetricsFiles(root: string): string[] {
  const results: string[] = [];
  const visit = (dir: string) => {
    const entries = Fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = Path.join(dir, e.name);
      if (e.isDirectory()) {
        if (full.includes('node_modules')) continue;
        if (full.split(Path.sep).length - root.split(Path.sep).length > 12) continue;
        visit(full);
      } else if (e.isFile() && e.name === 'metrics.json' && /target\/(public|node)\//.test(full)) {
        results.push(full);
      }
    }
  };
  visit(root);
  return results;
}

function aggregateMetrics(filePaths: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const fp of filePaths) {
    try {
      const json = JSON.parse(Fs.readFileSync(fp, 'utf8')) as Array<{
        id: string;
        group: string;
        value: number;
      }>;
      for (const m of json) {
        if (m.group === METRIC_GROUP) {
          map[m.id] = m.value;
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return map;
}

function readCachedSummary(cachePath: string): BuildResultSummary | undefined {
  try {
    return JSON.parse(Fs.readFileSync(cachePath, 'utf8')) as BuildResultSummary;
  } catch {
    return undefined;
  }
}

function writeSummary(cachePath: string, summary: BuildResultSummary) {
  ensureDir(Path.dirname(cachePath));
  Fs.writeFileSync(cachePath, JSON.stringify(summary, null, 2));
}

function buildCurrentWorkspace(log: ToolingLog, repoRoot: string): BuildResultSummary {
  const head = capture('git rev-parse HEAD', repoRoot);
  const dirtyHash = hashUncommitted(repoRoot);
  const refLabel = dirtyHash ? `${head}+${dirtyHash}` : head;

  log.info(`Building current workspace (no cache) at ${refLabel}`);
  sh(log, repoRoot, 'node scripts/build_kibana_platform_plugins --dist --no-cache --no-examples');

  const metricsFiles = discoverMetricsFiles(repoRoot);
  const metrics = aggregateMetrics(metricsFiles);
  return { ref: refLabel, metrics };
}

function prepareTempRepo(log: ToolingLog, sourceRepo: string): string {
  const tmpRoot = Path.join(Os.tmpdir(), 'kibana-bundle-compare');
  const repoPath = Path.join(tmpRoot, 'repo');
  ensureDir(tmpRoot);
  if (!Fs.existsSync(repoPath)) {
    log.info(`Cloning repo into ${repoPath}`);
    sh(log, tmpRoot, `git clone ${sourceRepo} repo`);
  } else {
    if (!Fs.existsSync(Path.join(repoPath, '.git'))) {
      throw new Error(`${repoPath} exists but is not a git repository`);
    }
    try {
      sh(log, repoPath, 'git fetch --all --prune');
    } catch (e) {
      log.info(`Fetch failed in temp repo: ${(e as Error).message}`);
    }
  }
  return repoPath;
}

function buildTargetRef(
  log: ToolingLog,
  sourceRepo: string,
  compareRef: string,
  outDir: string
): BuildResultSummary {
  const tempRepo = prepareTempRepo(log, sourceRepo);
  const commitSha = capture(`git rev-parse ${compareRef}`, tempRepo);
  const cacheFile = Path.join(outDir, `${commitSha}.json`);
  const cached = readCachedSummary(cacheFile);
  if (cached) {
    log.info(`Using cached metrics for target ref ${commitSha}`);
    return cached;
  }

  sh(log, tempRepo, `git checkout --force ${commitSha}`);
  if (!Fs.existsSync(Path.join(tempRepo, 'node_modules'))) {
    sh(log, tempRepo, 'yarn kbn bootstrap');
  }
  sh(log, tempRepo, 'yarn kbn bootstrap');
  sh(log, tempRepo, 'node scripts/build_kibana_platform_plugins --dist --no-cache --no-examples');

  const metricsFiles = discoverMetricsFiles(tempRepo);
  const metrics = aggregateMetrics(metricsFiles);
  const summary: BuildResultSummary = { ref: commitSha, metrics };
  writeSummary(cacheFile, summary);
  return summary;
}

function formatKb(v?: number) {
  if (v == null) return '-';
  return (v / 1024).toFixed(2) + ' kB';
}

function colorDelta(delta: number | undefined) {
  if (delta == null || !isFinite(delta) || delta === 0) return '-';
  if (delta > 0) return chalk.red(`+${(delta / 1024).toFixed(2)} kB`);
  return chalk.green(`${(delta / 1024).toFixed(2)} kB`);
}

function colorPct(pct: number | undefined) {
  if (pct == null || !isFinite(pct) || pct === 0) return '-';
  const text = (pct > 0 ? '+' : '') + pct.toFixed(2) + '%';
  return pct > 0 ? chalk.red(text) : chalk.green(text);
}

function renderDiff(log: ToolingLog, a: BuildResultSummary, b: BuildResultSummary) {
  const allIds = Array.from(new Set([...Object.keys(a.metrics), ...Object.keys(b.metrics)])).sort();
  const header = [
    chalk.bold('Bundle'),
    chalk.bold(`Baseline(${a.ref.slice(0, 12)})`),
    chalk.bold(`Current(${b.ref.slice(0, 12)})`),
    chalk.bold('Δ'),
    chalk.bold('Δ %'),
  ];
  const rows: string[][] = [header];

  let widestId = 'Bundle'.length;
  for (const id of allIds) widestId = Math.max(widestId, id.length);

  interface RowInfo {
    id: string;
    av?: number;
    bv?: number;
    delta?: number; // bv - av when both exist
    pct?: number; // percent change when both exist
    category: number; // for ordering
    sortWeight: number; // magnitude for changed categories
    changeLabel?: string; // NEW or REMOVED
  }

  const rowInfos: RowInfo[] = [];
  for (const id of allIds) {
    const av = a.metrics[id];
    const bv = b.metrics[id];
    let delta: number | undefined;
    let pct: number | undefined;
    let category: number; // 0=decrease/remove,1=increase/add,2=unchanged
    if (av != null && bv != null) {
      delta = bv - av;
      pct = av ? (delta / av) * 100 : undefined;
      if (delta < 0) category = 0;
      else if (delta > 0) category = 1;
      else category = 2;
    } else if (av == null && bv != null) {
      // added bundle
      category = 1;
      delta = bv; // growth from 0
      pct = undefined;
      // label will be applied
    } else if (av != null && bv == null) {
      // removed bundle
      category = 0;
      delta = -av; // reduction to 0
      pct = undefined;
    } else {
      category = 2;
    }
    rowInfos.push({
      id,
      av,
      bv,
      delta,
      pct,
      category,
      sortWeight: delta != null ? Math.abs(delta) : 0,
      changeLabel:
        av == null && bv != null ? 'NEW' : av != null && bv == null ? 'REMOVED' : undefined,
    });
  }

  rowInfos.sort((r1, r2) => {
    if (r1.category !== r2.category) return r1.category - r2.category;
    // within category 0/1 sort by largest absolute delta first
    if (r1.category !== 2) {
      if (r2.sortWeight !== r1.sortWeight) return r2.sortWeight - r1.sortWeight;
    }
    return r1.id.localeCompare(r2.id);
  });

  for (const r of rowInfos) {
    let pctCol: string;
    if (r.pct != null) {
      pctCol = colorPct(r.pct) as string;
    } else if (r.changeLabel) {
      pctCol = r.changeLabel === 'NEW' ? chalk.red(r.changeLabel) : chalk.green(r.changeLabel);
    } else {
      pctCol = '-';
    }
    let rowCells = [r.id, formatKb(r.av), formatKb(r.bv), colorDelta(r.delta), pctCol];
    if (r.changeLabel === 'NEW') {
      rowCells = rowCells.map((c) => chalk.yellow(c));
    } else if (r.changeLabel === 'REMOVED') {
      rowCells = rowCells.map((c) => chalk.cyan(c));
    }
    rows.push(rowCells);
  }

  const config: TableUserConfig = {
    singleLine: true,
    columns: [
      { alignment: 'left', width: widestId },
      { alignment: 'right' },
      { alignment: 'right' },
      { alignment: 'right' },
      { alignment: 'right' },
    ],
    border: {
      topBody: '',
      topJoin: '',
      topLeft: '',
      topRight: '',
      bottomBody: '',
      bottomJoin: '',
      bottomLeft: '',
      bottomRight: '',
      bodyLeft: '',
      bodyRight: '',
      bodyJoin: ' ',
      joinBody: '',
      joinLeft: '',
      joinRight: '',
      joinJoin: '',
    },
    drawHorizontalLine: () => false,
  };

  log.info('');
  log.info('Bundle Size Comparison (page load bundle size)');
  const output = table(rows, config);
  output.split('\n').forEach((l) => log.info(l));
  log.info('');
}

export async function runCompare(options: RunCompareOptions) {
  const { log, repoRoot, compareRef } = options;
  const dataDir = options.dataDir
    ? Path.isAbsolute(options.dataDir)
      ? options.dataDir
      : Path.resolve(repoRoot, options.dataDir)
    : Path.resolve(repoRoot, 'data', 'bundle_size_compare');

  ensureDir(dataDir);

  log.info(`Comparing current workspace to ${compareRef}`);

  const current = buildCurrentWorkspace(log, repoRoot);
  const target = buildTargetRef(log, repoRoot, compareRef, dataDir);
  // Determine commit relationship and orientation
  const currentHead = capture('git rev-parse HEAD', repoRoot); // clean sha
  const targetHead = target.ref; // commit sha of compare ref
  let ahead = 0;
  let behind = 0;
  try {
    const aheadBehind = capture(
      `git rev-list --left-right --count ${currentHead}...${targetHead}`,
      repoRoot
    );
    const parts = aheadBehind.split(/\s+/);
    if (parts.length >= 2) {
      ahead = parseInt(parts[0], 10) || 0; // unique to current
      behind = parseInt(parts[1], 10) || 0; // unique to target
    }
  } catch {
    // ignore
  }

  const getCommitMessage = (sha: string) => {
    try {
      return capture(`git log -1 --pretty=%s ${sha}`, repoRoot);
    } catch {
      return '(unknown message)';
    }
  };

  const currentMsg = getCommitMessage(currentHead);
  const targetMsg = getCommitMessage(targetHead);

  let baselineSummary: BuildResultSummary = target; // default baseline = compare ref
  let currentSummary: BuildResultSummary = current;
  let baselineSha = targetHead;
  let currentSha = currentHead;
  let baselineMsg = targetMsg;
  let currentMsgFinal = currentMsg;
  let flipped = false;
  const diverged = ahead > 0 && behind > 0;

  if (!diverged && behind > 0 && ahead === 0) {
    // current workspace is strictly behind compare ref, flip baseline to current workspace
    flipped = true;
    baselineSummary = current;
    currentSummary = target;
    baselineSha = currentHead;
    currentSha = targetHead;
    baselineMsg = currentMsg;
    currentMsgFinal = targetMsg;
  }

  log.info('');
  if (diverged) {
    log.info(chalk.yellow('Branches have diverged:'));
    log.info(`  Workspace is ahead by ${ahead} commit(s) and behind by ${behind} commit(s).`);
  } else if (flipped) {
    log.info(chalk.yellow('Workspace is behind compare ref; flipping baseline orientation.'));
  }

  log.info('Latest commits:');
  log.info(`  Baseline ${baselineSha.slice(0, 12)}: ${baselineMsg}`);
  log.info(`  Current  ${currentSha.slice(0, 12)}: ${currentMsgFinal}`);

  if (!diverged) {
    const rangeOld = baselineSha;
    const rangeNew = currentSha;
    if (rangeOld !== rangeNew) {
      try {
        const totalBetweenStr = capture(`git rev-list --count ${rangeOld}..${rangeNew}`, repoRoot);
        const totalBetween = parseInt(totalBetweenStr, 10) || 0;
        if (totalBetween > 0) {
          const raw = capture(`git log --pretty=%H::%s ${rangeOld}..${rangeNew}`, repoRoot);
          const lines = raw ? raw.split('\n').filter(Boolean) : [];
          const commits = lines.slice(0, 5).map((l) => {
            const [sha, msg] = l.split('::');
            return { sha, msg };
          });
          log.info('Commits between (newest first):');
          for (const c of commits) {
            log.info(`  ${c.sha.slice(0, 12)}: ${c.msg}`);
          }
          if (totalBetween > commits.length) {
            log.info(`  ... and ${totalBetween - commits.length} more commit(s) not in baseline.`);
          }
        } else {
          log.info('No commits between baseline and current.');
        }
      } catch {
        // ignore
      }
    } else {
      log.info('Baseline and current are the same commit.');
    }
  }

  // Render diff with chosen orientation
  renderDiff(log, baselineSummary, currentSummary);
}
