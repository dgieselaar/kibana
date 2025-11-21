/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Flags } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { Octokit } from '@octokit/rest';
import { execFile } from 'child_process';
import { promisify } from 'util';
import Path from 'path';
import { writeFile } from 'fs/promises';

const execFileAsync = promisify(execFile);

const FOLDER_GROUPS = ['Security', 'Observability', 'Search', 'Platform'] as const;
type FolderGroup = (typeof FOLDER_GROUPS)[number];

const TEAM_GROUPS = ['security-solution', 'observability', 'enterprise-search', 'other'] as const;
type TeamGroup = (typeof TEAM_GROUPS)[number];

type TeamSlug = Exclude<TeamGroup, 'other'>;

interface GroupStats {
  authors: Set<string>;
  loc: number;
  commits: number;
}

type StatsMatrix = Record<TeamGroup, Record<FolderGroup, GroupStats>>;

interface CommitFileSummary {
  locByGroup: Map<FolderGroup, number>;
}

interface CommitAuthorInfo {
  identifier: string;
  email?: string;
  login?: string;
}

interface ContributorAggregation {
  identifier: string;
  email?: string;
  login?: string;
  locByGroup: Map<FolderGroup, number>;
  commitsByGroup: Map<FolderGroup, number>;
}

type ContributorMap = Map<string, ContributorAggregation>;

type EmailLookupCandidates = Map<string, string>;

interface CommitProcessingContext {
  repoPath: string;
  octokit: Octokit;
  owner: string;
  repo: string;
}
const GITHUB_TEAM_ORDER: TeamSlug[] = ['security-solution', 'observability', 'enterprise-search'];

const FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.cjs']);

const ORGANIZATION_LOGIN = 'elastic';
const MAX_LOGINS_PER_QUERY = 20;

function createEmptyGroupStats(): GroupStats {
  return { loc: 0, authors: new Set<string>(), commits: 0 };
}

function createTeamStats(): Record<FolderGroup, GroupStats> {
  return {
    Security: createEmptyGroupStats(),
    Observability: createEmptyGroupStats(),
    Search: createEmptyGroupStats(),
    Platform: createEmptyGroupStats(),
  };
}

function createStatsMatrix(): StatsMatrix {
  return {
    'security-solution': createTeamStats(),
    observability: createTeamStats(),
    'enterprise-search': createTeamStats(),
    other: createTeamStats(),
  };
}

function subtractMonthsFromNow(months: number): string {
  const now = new Date();
  const since = new Date(now);
  since.setUTCMonth(since.getUTCMonth() - months);
  since.setUTCHours(0, 0, 0, 0);
  return since.toISOString();
}

function subtractWeeksFromNow(weeks: number): string {
  const now = new Date();
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - weeks * 7);
  since.setUTCHours(0, 0, 0, 0);
  return since.toISOString();
}

function subtractDaysFromNow(days: number): string {
  const now = new Date();
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - days);
  since.setUTCHours(0, 0, 0, 0);
  return since.toISOString();
}

function hasSupportedExtension(filePath: string): boolean {
  const extension = Path.posix.extname(filePath).toLowerCase();
  return FILE_EXTENSIONS.has(extension);
}

function classifyFolderGroup(filePath: string): FolderGroup {
  const normalizedPath = filePath.replace(/\\/g, '/');

  if (normalizedPath.startsWith('x-pack/solutions/security/')) {
    return 'Security';
  }

  if (normalizedPath.startsWith('x-pack/solutions/observability/')) {
    return 'Observability';
  }

  if (
    normalizedPath.startsWith('x-pack/solutions/search/') ||
    normalizedPath.startsWith('x-pack/solutions/chat/') ||
    normalizedPath.startsWith('x-pack/solutions/workplace_ai/') ||
    normalizedPath.startsWith('x-pack/solutions/workplaceai/') ||
    normalizedPath.startsWith('x-pack/solutions/workplace-ai/')
  ) {
    return 'Search';
  }

  return 'Platform';
}

async function fetchRemoteBranch(repoPath: string, remoteName: string, branchName: string) {
  await execFileAsync('git', ['fetch', '--quiet', remoteName, branchName], { cwd: repoPath });
}

async function listCommitShas(
  repoPath: string,
  remoteName: string,
  branchName: string,
  sinceIso: string
): Promise<string[]> {
  const { stdout } = await execFileAsync(
    'git',
    ['log', '--no-merges', `${remoteName}/${branchName}`, '--since', sinceIso, '--format=%H'],
    { cwd: repoPath }
  );

  return stdout
    .split('\n')
    .map((sha) => sha.trim())
    .filter((sha) => sha.length > 0);
}

async function getCommitFileSummary(repoPath: string, sha: string): Promise<CommitFileSummary> {
  const { stdout } = await execFileAsync('git', ['show', '--numstat', '--format=', sha], {
    cwd: repoPath,
    maxBuffer: 50 * 1024 * 1024,
  });

  const locByGroup = new Map<FolderGroup, number>();

  for (const line of stdout.split('\n')) {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) {
      continue;
    }

    const parts = trimmedLine.split('\t');
    if (parts.length < 3) {
      continue;
    }

    const additions = Number.parseInt(parts[0], 10);
    const deletions = Number.parseInt(parts[1], 10);

    if (Number.isNaN(additions) || Number.isNaN(deletions)) {
      continue;
    }

    const filePath = parts[2];
    if (!hasSupportedExtension(filePath)) {
      continue;
    }

    const group = classifyFolderGroup(filePath);
    const changedLoc = additions + deletions;

    if (changedLoc === 0) {
      continue;
    }

    locByGroup.set(group, (locByGroup.get(group) ?? 0) + changedLoc);
  }

  return { locByGroup };
}

async function getCommitAuthorInfoLocal(repoPath: string, sha: string): Promise<CommitAuthorInfo> {
  // Use local git to extract author name and email to avoid API calls for every commit
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['show', '--no-patch', '--format=%an%n%ae', sha],
      {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024,
      }
    );

    const [nameLine, emailLine] = stdout.split('\n').map((s) => s.trim());
    const name = nameLine || undefined;
    const email = emailLine || undefined;

    const identifier = email ?? `${(name ?? 'unknown').replace(/\s+/g, '-')}-${sha}`;

    return { identifier, email };
  } catch (error) {
    const fallbackIdentifier = `unknown-${sha}`;
    return { login: undefined, identifier: fallbackIdentifier };
  }
}

function createTeamsQueryChunk(logins: string[]): {
  query: string;
  variables: Record<string, string>;
  aliases: string[];
} {
  const aliases: string[] = [];
  const variableDefinitions: string[] = [];
  const fields: string[] = [];
  const variables: Record<string, string> = {};

  logins.forEach((login, index) => {
    const variableName = `loginVar${index}`;
    const alias = `login_${index}`;
    aliases.push(alias);
    variableDefinitions.push(`$${variableName}: String!`);
    fields.push(`
      ${alias}: organization(login: "${ORGANIZATION_LOGIN}") {
        teams(first: 100, userLogins: [$${variableName}]) {
          nodes {
            slug
            parentTeam {
              slug
              parentTeam {
                slug
                parentTeam {
                  slug
                }
              }
            }
          }
        }
      }
    `);
    variables[variableName] = login;
  });

  const query = `query(${variableDefinitions.join(', ')}) {\n${fields.join('\n')}\n}`;

  return { query, variables, aliases };
}

interface TeamNode {
  slug?: string | null;
  parentTeam?: TeamNode | null;
}

function collectTeamSlugs(node: TeamNode | null | undefined, slugs: Set<string>): void {
  if (!node) {
    return;
  }

  if (node.slug) {
    slugs.add(node.slug);
  }

  if (node.parentTeam) {
    collectTeamSlugs(node.parentTeam, slugs);
  }
}

async function resolveTeamGroupsForLogins(
  octokit: Octokit,
  log: { debug: (message: string) => void },
  logins: string[]
): Promise<Map<string, TeamGroup>> {
  const assignments = new Map<string, TeamGroup>();

  for (let index = 0; index < logins.length; index += MAX_LOGINS_PER_QUERY) {
    const chunk = logins.slice(index, index + MAX_LOGINS_PER_QUERY);
    const { query, variables, aliases } = createTeamsQueryChunk(chunk);

    log.debug(
      `Resolving team memberships for contributors ${index + 1} to ${index + chunk.length}.`
    );

    try {
      const response = (await octokit.graphql(query, variables)) as Record<
        string,
        {
          teams?: {
            nodes?: Array<TeamNode | null>;
          } | null;
        } | null
      >;

      chunk.forEach((login, chunkIndex) => {
        const alias = aliases[chunkIndex];
        const nodes = response[alias]?.teams?.nodes ?? [];
        const slugs = new Set<string>();

        for (const node of nodes) {
          collectTeamSlugs(node ?? undefined, slugs);
        }

        let teamGroup: TeamGroup = 'other';
        for (const teamSlug of GITHUB_TEAM_ORDER) {
          if (slugs.has(teamSlug)) {
            teamGroup = teamSlug;
            break;
          }
        }

        assignments.set(login, teamGroup);
      });
    } catch (error) {
      log.debug(
        `Failed to fetch team memberships for contributors ${index + 1} to ${
          index + chunk.length
        }: ${(error as Error).message}`
      );

      for (const login of chunk) {
        if (!assignments.has(login)) {
          assignments.set(login, 'other');
        }
      }
    }
  }

  return assignments;
}

async function processCommit(
  context: CommitProcessingContext,
  sha: string,
  contributors: ContributorMap,
  emailLookupCandidates: EmailLookupCandidates
): Promise<boolean> {
  const { repoPath } = context;

  const { locByGroup } = await getCommitFileSummary(repoPath, sha);
  if (locByGroup.size === 0) {
    return false;
  }

  // Use local git to determine the commit author info (name/email) instead of calling GitHub API
  const authorInfo = await getCommitAuthorInfoLocal(repoPath, sha);

  const contributorId = authorInfo.identifier;
  let contributorRecord = contributors.get(contributorId);

  if (!contributorRecord) {
    contributorRecord = {
      identifier: contributorId,
      email: authorInfo.email,
      login: authorInfo.login,
      locByGroup: new Map<FolderGroup, number>(),
      commitsByGroup: new Map<FolderGroup, number>(),
    };
    contributors.set(contributorId, contributorRecord);
  } else if (!contributorRecord.login && authorInfo.login) {
    contributorRecord.login = authorInfo.login;
  }

  if (authorInfo.email) {
    contributorRecord.email = authorInfo.email;
    if (!emailLookupCandidates.has(authorInfo.email)) {
      emailLookupCandidates.set(authorInfo.email, sha);
    }
  }

  for (const [group, loc] of locByGroup.entries()) {
    contributorRecord.locByGroup.set(group, (contributorRecord.locByGroup.get(group) ?? 0) + loc);
    contributorRecord.commitsByGroup.set(
      group,
      (contributorRecord.commitsByGroup.get(group) ?? 0) + 1
    );
  }

  return true;
}

async function resolveContributorLoginsFromEmails(
  context: CommitProcessingContext,
  log: { debug: (message: string) => void; warning: (message: string) => void },
  contributors: ContributorMap,
  emailLookupCandidates: EmailLookupCandidates
): Promise<void> {
  if (emailLookupCandidates.size === 0) {
    return;
  }

  log.debug(
    `Resolving GitHub logins for ${emailLookupCandidates.size} unique email addresses using commit lookups.`
  );

  const emailToLogin = new Map<string, string>();

  let processed = 0;
  for (const [email, sha] of emailLookupCandidates.entries()) {
    processed += 1;
    if (processed % 20 === 0) {
      log.debug(`Processed ${processed} of ${emailLookupCandidates.size} email lookups.`);
    }

    try {
      const response = await context.octokit.repos.getCommit({
        owner: context.owner,
        repo: context.repo,
        ref: sha,
      });

      const login = response.data.author?.login ?? undefined;
      if (login) {
        emailToLogin.set(email, login);
      }
    } catch (error) {
      log.debug(
        `Failed to resolve GitHub login for ${email} via commit ${sha}: ${(error as Error).message}`
      );
    }
  }

  for (const [email, login] of emailToLogin.entries()) {
    const contributor = contributors.get(email);
    if (contributor && !contributor.login) {
      contributor.login = login;
    }
  }
}

type TimeWindowUnit = 'months' | 'weeks' | 'days';

interface TimeWindow {
  unit: TimeWindowUnit;
  value: number;
  sinceIso: string;
}

function parsePositiveIntegerFlag(flags: Flags, flagName: TimeWindowUnit): number | undefined {
  const rawValue = flags[flagName];

  if (rawValue === undefined || rawValue === '') {
    return undefined;
  }

  if (Array.isArray(rawValue)) {
    throw createFlagError(`please provide a single --${flagName} flag`);
  }

  if (typeof rawValue === 'boolean') {
    throw createFlagError(`--${flagName} must be a positive integer or 0`);
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createFlagError(`--${flagName} must be a positive integer or 0`);
  }

  return parsed;
}

function parseTimeWindow(flags: Flags): TimeWindow {
  const months = parsePositiveIntegerFlag(flags, 'months');
  const weeks = parsePositiveIntegerFlag(flags, 'weeks');
  const days = parsePositiveIntegerFlag(flags, 'days');

  const provided = [
    months !== undefined ? { unit: 'months' as const, value: months } : undefined,
    weeks !== undefined ? { unit: 'weeks' as const, value: weeks } : undefined,
    days !== undefined ? { unit: 'days' as const, value: days } : undefined,
  ].filter(Boolean) as Array<{ unit: TimeWindowUnit; value: number }>;

  if (provided.length > 1) {
    throw createFlagError('please provide only one of --months, --weeks, or --days');
  }

  const selection = provided[0] ?? { unit: 'months' as const, value: 1 };

  if (selection.unit === 'months') {
    return {
      unit: 'months',
      value: selection.value,
      sinceIso: subtractMonthsFromNow(selection.value),
    };
  }

  if (selection.unit === 'weeks') {
    return {
      unit: 'weeks',
      value: selection.value,
      sinceIso: subtractWeeksFromNow(selection.value),
    };
  }

  return {
    unit: 'days',
    value: selection.value,
    sinceIso: subtractDaysFromNow(selection.value),
  };
}

function getRepoPath(flags: Flags): string {
  if (flags.repo !== undefined && Array.isArray(flags.repo)) {
    throw createFlagError('please provide a single --repo flag');
  }

  const providedPath = typeof flags.repo === 'string' ? flags.repo : process.cwd();
  return Path.resolve(providedPath);
}

function getRemoteName(flags: Flags): string {
  if (flags.remote !== undefined && Array.isArray(flags.remote)) {
    throw createFlagError('please provide a single --remote flag');
  }

  return typeof flags.remote === 'string' ? flags.remote : 'upstream';
}

function getBranchName(flags: Flags): string {
  if (flags.branch !== undefined && Array.isArray(flags.branch)) {
    throw createFlagError('please provide a single --branch flag');
  }

  return typeof flags.branch === 'string' ? flags.branch : 'main';
}

run(
  async ({ log, flags }) => {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error('GITHUB_TOKEN must be set to query the GitHub API');
    }

    const timeWindow = parseTimeWindow(flags);
    const sinceIso = timeWindow.sinceIso;
    const repoPath = getRepoPath(flags);
    const remoteName = getRemoteName(flags);
    const branchName = getBranchName(flags);

    const unitLabel = timeWindow.value === 1 ? timeWindow.unit : `${timeWindow.unit}s`;

    log.info(
      `Fetching commits from ${remoteName}/${branchName} since ${sinceIso} (last ${timeWindow.value} ${unitLabel}).`
    );

    await fetchRemoteBranch(repoPath, remoteName, branchName);

    const commitShas = await listCommitShas(repoPath, remoteName, branchName, sinceIso);

    if (commitShas.length === 0) {
      log.info('No commits found for the requested window.');
      return;
    }

    log.info(`Inspecting ${commitShas.length} commits.`);

    const octokit = new Octokit({ auth: githubToken });
    const context: CommitProcessingContext = {
      repoPath,
      octokit,
      owner: 'elastic',
      repo: 'kibana',
    };

    const contributors: ContributorMap = new Map();
    const emailLookupCandidates: EmailLookupCandidates = new Map();

    let commitsWithRelevantChanges = 0;

    for (const [index, sha] of commitShas.entries()) {
      if (index % 50 === 0) {
        log.debug(`Processing commit ${index + 1} of ${commitShas.length} (${sha}).`);
      }

      try {
        const hasRelevantChanges = await processCommit(
          context,
          sha,
          contributors,
          emailLookupCandidates
        );
        if (hasRelevantChanges) {
          commitsWithRelevantChanges += 1;
        }
      } catch (error) {
        log.warning(`Failed to process commit ${sha}: ${(error as Error).message}`);
      }
    }

    log.debug(`Aggregated LOC for ${contributors.size} unique commit authors.`);

    await resolveContributorLoginsFromEmails(context, log, contributors, emailLookupCandidates);

    const contributorList = Array.from(contributors.values());
    const uniqueLogins = Array.from(
      new Set(contributorList.map((contributor) => contributor.login).filter(Boolean))
    ) as string[];

    let teamAssignments = new Map<string, TeamGroup>();
    if (uniqueLogins.length > 0) {
      log.debug(`Resolving team memberships for ${uniqueLogins.length} contributors.`);
      teamAssignments = await resolveTeamGroupsForLogins(octokit, log, uniqueLogins);
    } else {
      log.debug('No GitHub logins discovered; defaulting team assignments to other.');
    }

    const stats = createStatsMatrix();
    const aggregateAllStats: Record<FolderGroup, GroupStats> = createTeamStats();

    for (const contributor of contributorList) {
      const teamGroup = contributor.login
        ? teamAssignments.get(contributor.login) ?? 'other'
        : 'other';

      for (const [group, loc] of contributor.locByGroup.entries()) {
        const commits = contributor.commitsByGroup.get(group) ?? 0;
        const teamGroupStats = stats[teamGroup][group];
        teamGroupStats.loc += loc;
        teamGroupStats.authors.add(contributor.identifier);
        teamGroupStats.commits += commits;

        const overallGroupStats = aggregateAllStats[group];
        overallGroupStats.loc += loc;
        overallGroupStats.authors.add(contributor.identifier);
        overallGroupStats.commits += commits;
      }
    }

    const formatPercent = (value: number, total: number): number => {
      if (total === 0) {
        return 0;
      }
      return Number.parseFloat(((value / total) * 100).toFixed(2));
    };

    interface OutputMetrics {
      authors: number;
      authorsPercent: number;
      loc: number;
      locPercent: number;
      commits: number;
      commitsPercent: number;
    }

    const output: Record<string, Record<FolderGroup, OutputMetrics>> = {};

    for (const team of TEAM_GROUPS) {
      const teamStats = stats[team];
      const totalAuthorsSet = new Set<string>();
      let totalLoc = 0;
      let totalCommits = 0;

      for (const group of FOLDER_GROUPS) {
        const groupStats = teamStats[group];
        totalLoc += groupStats.loc;
        totalCommits += groupStats.commits;
        for (const author of groupStats.authors) {
          totalAuthorsSet.add(author);
        }
      }

      const totalAuthors = totalAuthorsSet.size;
      const teamOutput: Partial<Record<FolderGroup, OutputMetrics>> = {};

      for (const group of FOLDER_GROUPS) {
        const groupStats = teamStats[group];
        const authorsCount = groupStats.authors.size;
        teamOutput[group] = {
          authors: authorsCount,
          authorsPercent: formatPercent(authorsCount, totalAuthors),
          loc: groupStats.loc,
          locPercent: formatPercent(groupStats.loc, totalLoc),
          commits: groupStats.commits,
          commitsPercent: formatPercent(groupStats.commits, totalCommits),
        };
      }

      output[team] = teamOutput as Record<FolderGroup, OutputMetrics>;
    }

    // Aggregate "all" statistics across teams
    const allTotalsAuthorsSet = new Set<string>();
    let allTotalLoc = 0;
    let allTotalCommits = 0;

    for (const group of FOLDER_GROUPS) {
      const groupStats = aggregateAllStats[group];
      allTotalLoc += groupStats.loc;
      allTotalCommits += groupStats.commits;
      for (const author of groupStats.authors) {
        allTotalsAuthorsSet.add(author);
      }
    }

    const allTotalAuthors = allTotalsAuthorsSet.size;
    const allOutput: Partial<Record<FolderGroup, OutputMetrics>> = {};

    for (const group of FOLDER_GROUPS) {
      const groupStats = aggregateAllStats[group];
      const authorsCount = groupStats.authors.size;
      allOutput[group] = {
        authors: authorsCount,
        authorsPercent: formatPercent(authorsCount, allTotalAuthors),
        loc: groupStats.loc,
        locPercent: formatPercent(groupStats.loc, allTotalLoc),
        commits: groupStats.commits,
        commitsPercent: formatPercent(groupStats.commits, allTotalCommits),
      };
    }

    output.all = allOutput as Record<FolderGroup, OutputMetrics>;

    const result = {
      metadata: {
        generatedAt: new Date().toISOString(),
        remote: remoteName,
        branch: branchName,
        ...(timeWindow.unit === 'months' ? { months: timeWindow.value } : {}),
        window: {
          unit: timeWindow.unit,
          value: timeWindow.value,
        },
        since: sinceIso,
        commitsConsidered: commitShas.length,
        commitsWithRelevantChanges,
        uniqueGitHubUsersQueried: uniqueLogins.length,
      },
      stats: output,
    };

    // Include the list of commit authors and their resolved team group
    const authors = contributorList.map((contributor) => {
      const teamGroup = contributor.login
        ? teamAssignments.get(contributor.login) ?? 'other'
        : 'other';
      return {
        identifier: contributor.identifier,
        login: contributor.login ?? null,
        group: teamGroup,
      };
    });

    (result as any).authors = authors;

    // Determine output file path (allow override via --output)
    const outputPath =
      typeof flags.output === 'string' && flags.output.length > 0
        ? Path.resolve(flags.output)
        : Path.join(repoPath, 'commit_team_stats.json');

    await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    log.info(`Wrote commit/team stats to ${outputPath}`);
  },
  {
    description: `
      Calculate author counts and LOC by solutions folder group for commits in upstream/main.
      Requires a valid GitHub personal access token in GITHUB_TOKEN with read:org scope.
    `,
    flags: {
      string: ['months', 'weeks', 'days', 'remote', 'branch', 'repo', 'output'],
      help: `
        --months <n>     Number of months to look back (default: 1)
        --weeks <n>      Number of weeks to look back
        --days <n>       Number of days to look back
        --output <path>  Path to write the JSON output (default: <repo>/commit_team_stats.json)
        --remote <r>     Remote name to fetch from (default: upstream)
        --branch <b>     Branch name to inspect (default: main)
        --repo <path>    Path to the Kibana repository (default: current working directory)
      `,
    },
  }
);
