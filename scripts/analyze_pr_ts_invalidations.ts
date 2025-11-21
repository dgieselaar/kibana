/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/* eslint-disable no-console */

import Path from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from '@octokit/rest';
import execa from 'execa';
import pMap from 'p-map';
import * as ts from 'typescript';

import { REPO_ROOT } from '@kbn/repo-info';
import { TS_PROJECTS, type TsProject } from '@kbn/ts-projects';

interface PullRequestInfo {
  number: number;
  title: string;
  branch: string;
  baseBranch: string;
  headSha: string;
  baseSha: string;
  url: string;
}

interface ProjectFileMapEntry {
  project: TsProject;
  files: Set<string>;
}

interface InvalidationResult {
  pullRequest: PullRequestInfo;
  invalidatedProjects: number;
}

const DEFAULT_OWNER = process.env.GITHUB_OWNER ?? 'elastic';
const DEFAULT_REPO = process.env.GITHUB_REPO ?? 'kibana';
const DEFAULT_LIMIT = Number(process.env.PR_LIMIT ?? 25);
const DEFAULT_REMOTE = process.env.GIT_REMOTE ?? 'origin';
const PROJECT_CONCURRENCY = Math.max(1, Number(process.env.PROJECT_CONCURRENCY ?? 12));
const GLOBAL_INVALIDATION_PATHS = ['yarn.lock'];

const githubToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;

if (!githubToken) {
  throw new Error(
    'Missing GitHub token. Set GITHUB_TOKEN or GH_TOKEN in your environment before running this script.'
  );
}

const octokit = new Octokit({ auth: githubToken });

const repoRoot = REPO_ROOT ?? Path.resolve(Path.dirname(fileURLToPath(import.meta.url)), '..');

function normalizeRepoRelativePath(relativePath: string): string {
  return relativePath.split(Path.sep).join('/');
}

function transformProjectFilePath(relativePath: string): string {
  const withoutTargetTypes = relativePath.replace(/target\/types\//g, '');
  const next = withoutTargetTypes.replace(/\.d\./g, '.');
  console.log(relativePath, '=>', next);
  return next;
}

function addProjectFile(files: Set<string>, rawRelativePath: string) {
  const normalized = normalizeRepoRelativePath(rawRelativePath);
  if (
    normalized.length === 0 ||
    normalized.startsWith('..') ||
    normalized.includes('node_modules/')
  ) {
    return;
  }

  const transformed = transformProjectFilePath(normalized);
  if (transformed.length === 0) {
    return;
  }

  files.add(transformed);
}

async function listGitTrackedFiles(directory: string): Promise<string[]> {
  const relativeDir = normalizeRepoRelativePath(Path.relative(repoRoot, directory));
  const gitArgs = ['ls-files', '--full-name'];

  if (relativeDir && relativeDir !== '.') {
    gitArgs.push(relativeDir);
  }

  const { stdout } = await execa('git', gitArgs, { cwd: repoRoot });

  if (stdout.trim().length === 0) {
    return [];
  }

  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

async function fetchRecentPullRequests(): Promise<PullRequestInfo[]> {
  console.log(
    `Fetching the most recent ${DEFAULT_LIMIT} pull requests from ${DEFAULT_OWNER}/${DEFAULT_REPO}...`
  );

  const { data } = await octokit.pulls.list({
    owner: DEFAULT_OWNER,
    repo: DEFAULT_REPO,
    state: 'all',
    sort: 'created',
    direction: 'desc',
    per_page: DEFAULT_LIMIT,
  });

  return data
    .filter((pull) => pull.head?.ref && pull.head.sha && pull.base?.sha)
    .filter(
      (pull) => !pull.head.ref.startsWith('backport/') && !pull.head.ref.startsWith('renovate/')
    )
    .map((pull) => ({
      number: pull.number,
      title: pull.title ?? '(no title)',
      branch: pull.head.ref,
      baseBranch: pull.base.ref,
      headSha: pull.head.sha,
      baseSha: pull.base.sha,
      url: pull.html_url,
    }));
}

async function ensureCommitAvailable(commitSha: string, fetchRef: string, description: string) {
  try {
    await execa('git', ['cat-file', '-e', `${commitSha}^{commit}`], { cwd: repoRoot });
  } catch (error) {
    console.log(`Fetching ${description} (${fetchRef}) from ${DEFAULT_REMOTE}...`);
    await execa('git', ['fetch', '--no-tags', DEFAULT_REMOTE, fetchRef], {
      cwd: repoRoot,
      stdio: 'inherit',
    });
  }
}

async function loadProjectFiles(): Promise<ProjectFileMapEntry[]> {
  console.log(`Enumerating TypeScript files for ${TS_PROJECTS.length} projects...`);

  const projectFileEntries = await pMap(
    TS_PROJECTS,
    async (project) => {
      const files = new Set<string>();

      if (!project.isTypeCheckDisabled()) {
        const configFile = ts.readConfigFile(project.path, ts.sys.readFile);
        if (configFile.error) {
          const message = ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n');
          throw new Error(`Failed to read tsconfig at ${project.path}: ${message}`);
        }

        const parsedConfig = ts.parseJsonConfigFileContent(
          configFile.config,
          ts.sys,
          project.directory,
          undefined,
          project.path
        );

        if (parsedConfig.errors.length > 0) {
          const messages = parsedConfig.errors
            .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
            .join('\n');
          throw new Error(`Failed to parse tsconfig at ${project.path}:\n${messages}`);
        }

        for (const absPath of parsedConfig.fileNames) {
          const repoRelative = Path.relative(repoRoot, absPath);
          if (repoRelative.startsWith('..')) {
            continue;
          }

          addProjectFile(files, repoRelative);
        }
      }

      const gitTrackedFiles = await listGitTrackedFiles(project.directory);
      for (const repoRelative of gitTrackedFiles) {
        addProjectFile(files, repoRelative);
      }

      return {
        project,
        files,
      } satisfies ProjectFileMapEntry;
    },
    { concurrency: PROJECT_CONCURRENCY }
  );

  return projectFileEntries;
}

async function fetchChangedFiles(baseSha: string, headSha: string): Promise<Set<string>> {
  const { stdout } = await execa('git', ['diff', '--name-only', `${baseSha}..${headSha}`], {
    cwd: repoRoot,
  });

  return new Set(
    stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.split(Path.sep).join('/'))
  );
}

function countInvalidatedProjects(
  projectEntries: ProjectFileMapEntry[],
  changedFiles: Set<string>
): number {
  if (GLOBAL_INVALIDATION_PATHS.some((path) => changedFiles.has(path))) {
    return projectEntries.length;
  }

  let invalidated = 0;

  for (const entry of projectEntries) {
    if (entry.files.size === 0) {
      continue;
    }

    let hasChangedFile = false;
    entry.files.forEach((filePath) => {
      if (hasChangedFile) {
        return;
      }

      if (changedFiles.has(filePath)) {
        hasChangedFile = true;
      }
    });

    if (hasChangedFile) {
      invalidated += 1;
    }
  }

  return invalidated;
}

async function analyzePullRequests(): Promise<InvalidationResult[]> {
  const pullRequests = await fetchRecentPullRequests();
  if (pullRequests.length === 0) {
    console.log('No pull requests found.');
    return [];
  }

  const projectEntries = await loadProjectFiles();
  const results: InvalidationResult[] = [];

  for (const pullRequest of pullRequests) {
    console.log(
      `\nAnalyzing PR #${pullRequest.number} (${pullRequest.branch}) – ${pullRequest.url}`
    );

    const baseFetchRef = pullRequest.baseBranch.startsWith('refs/')
      ? pullRequest.baseBranch
      : `refs/heads/${pullRequest.baseBranch}`;

    await ensureCommitAvailable(
      pullRequest.baseSha,
      baseFetchRef,
      `base commit ${pullRequest.baseSha}`
    );

    await ensureCommitAvailable(
      pullRequest.headSha,
      `refs/pull/${pullRequest.number}/head`,
      `head commit ${pullRequest.headSha}`
    );

    const changedFiles = await fetchChangedFiles(pullRequest.baseSha, pullRequest.headSha);
    console.log(`  Found ${changedFiles.size} changed files between base and head.`);

    const invalidatedProjects = countInvalidatedProjects(projectEntries, changedFiles);

    console.log(`  Invalidated ${invalidatedProjects} TypeScript projects.`);

    results.push({ pullRequest, invalidatedProjects });
  }

  return results;
}

function printSummary(results: InvalidationResult[]) {
  console.log('\nSummary');
  console.log('=======');

  results.forEach((result) => {
    const { pullRequest, invalidatedProjects } = result;
    const baseShortSha = pullRequest.baseSha.slice(0, 7);
    const headShortSha = pullRequest.headSha.slice(0, 7);
    console.log(
      `#${pullRequest.number} ${pullRequest.branch} (base ${pullRequest.baseBranch}) – invalidated projects: ${invalidatedProjects} (base ${baseShortSha} → head ${headShortSha})`
    );
  });

  const totalInvalidations = results.reduce((sum, result) => sum + result.invalidatedProjects, 0);
  console.log(`
Total invalidated projects across analyzed PRs: ${totalInvalidations}`);

  if (results.length > 0) {
    const invalidationCounts = results.map((result) => result.invalidatedProjects);
    const averageInvalidations = totalInvalidations / results.length;
    const p50Invalidations = computePercentile(invalidationCounts, 0.5);
    const p90Invalidations = computePercentile(invalidationCounts, 0.9);

    console.log(`Average invalidated projects: ${averageInvalidations.toFixed(2)}`);
    console.log(`p50 invalidated projects: ${p50Invalidations.toFixed(2)}`);
    console.log(`p90 invalidated projects: ${p90Invalidations.toFixed(2)}`);
  }
}

function computePercentile(values: number[], percentile: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * percentile;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  const weight = index - lowerIndex;
  return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
}

void analyzePullRequests()
  .then(printSummary)
  .catch((error) => {
    console.error('Script failed.');
    console.error(error);
    process.exitCode = 1;
  });
