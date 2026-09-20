import { TelemetrySummaryDTO } from '@/lib/types/telemetry';

/**
 * Simple seeded random number generator for deterministic mock data
 */
function createSeededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  let state = h;
  return function() {
    state = Math.imul(1597334677, state) + 3812015801 | 0;
    const t = state * 2.3283064365386963e-10;
    return t - Math.floor(t);
  };
}

export function generateMockTelemetry(projectId: string): TelemetrySummaryDTO {
  const random = createSeededRandom(projectId + '_telemetry');
  
  // Random range helpers
  const randomInt = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;
  const randomChoice = <T>(arr: T[]): T => arr[Math.floor(random() * arr.length)];
  
  const now = new Date();
  const getIsoDate = (hoursAgo: number) => {
    const d = new Date(now.getTime() - hoursAgo * 3600000);
    return d.toISOString();
  };

  // Sparkline data (24 hours), peaks during work hours (roughly hours 9 to 18)
  const commitSparkline = Array.from({ length: 24 }, (_, i) => {
    const hour = 23 - i; // 0 is now, 23 is 23 hours ago
    const isWorkHour = hour >= 9 && hour <= 18;
    return isWorkHour ? randomInt(2, 12) : randomInt(0, 3);
  });

  const baseAdditions = randomInt(5000, 15000);
  const baseDeletions = randomInt(2000, 8000);

  const shas = [
    'a1b2c3d', 'b2c3d4e', 'c3d4e5f', 'd4e5f6g',
    'e5f6g7h', 'f6g7h8i', '0a1b2c3', '1b2c3d4',
    '2c3d4e5', '3d4e5f6', '4e5f6g7'
  ];

  const branches = [
    { name: 'main', isMain: true, status: 'SYNCED' as const, latestSha: shas[0] },
    { name: 'feature/dark-mode', isMain: false, status: 'SYNCED' as const, latestSha: shas[5] },
    { name: 'fix/auth-token', isMain: false, status: 'BEHIND' as const, latestSha: shas[7] },
    { name: 'feature/new-dashboard', isMain: false, status: 'AHEAD' as const, latestSha: shas[10] },
  ];
  const authors = ['alex.dev', 'sarah.engineer', 'bot-autofix', 'chris.codes'];

  const coverageHistory = Array.from({ length: 7 }, (_, i) => ({
    commitSha: shas[i % shas.length],
    date: getIsoDate(i * 24), // one per day
    coverage: 80 + (random() * 10), // 80 - 90
  })).reverse();

  const bundleHistory = Array.from({ length: 7 }, (_, i) => ({
    commitSha: shas[i % shas.length],
    date: getIsoDate(i * 24),
    bundleKb: 150 + (random() * 100), // 150 - 250
  })).reverse();

  return {
    meta: {
      projectId,
      projectName: `Project ${projectId.substring(0, 4)}`,
      repoFullName: `organization/project-${projectId.substring(0, 4)}`,
      defaultBranch: 'main',
      lastSyncedAt: getIsoDate(0.1), // 6 minutes ago
      stars: randomInt(10, 500),
      forks: randomInt(2, 50),
    },
    vitalPulse: {
      latestWorkflow: {
        id: randomInt(1000, 9999),
        name: 'CI Pipeline',
        status: randomChoice(['RUNNING', 'PASSED', 'PASSED', 'PASSED', 'FAILED']), // Bias towards passed
        durationSeconds: randomInt(45, 300),
        commitSha: shas[0],
        commitMessage: 'fix(ui): resolve overflow in navigation component',
        author: randomChoice(authors),
      },
      activeMilestone: {
        title: 'v2.0 Beta Release',
        dueOn: new Date(now.getTime() + 7 * 24 * 3600000).toISOString(), // 7 days from now
        openIssues: randomInt(5, 15),
        closedIssues: randomInt(20, 40),
        progressPct: randomInt(60, 90),
      },
      commitSparkline,
    },
    velocity: {
      netLoc: {
        additions: baseAdditions,
        deletions: baseDeletions,
        net: baseAdditions - baseDeletions,
      },
      pullRequests: {
        open: randomInt(3, 8),
        merged: randomInt(15, 30),
        closed: randomInt(2, 5),
      },
      timeToShip: {
        avgHours: randomInt(12, 48),
        p95Hours: randomInt(48, 120),
      },
    },
    gitBranchGraph: {
      nodes: [
        {
          sha: shas[1],
          branch: 'main',
          parents: [],
          message: 'init: baseline project setup',
          author: authors[0],
          timestamp: getIsoDate(20),
          ciStatus: 'PASSED',
        },
        {
          sha: shas[2],
          branch: 'main',
          parents: [shas[1]],
          message: 'chore(deps): bump dependencies',
          author: authors[2],
          timestamp: getIsoDate(16),
          ciStatus: 'PASSED',
        },
        {
          sha: shas[3],
          branch: 'main',
          parents: [shas[2]],
          message: 'feat(core): telemetry aggregator pipeline',
          author: authors[1],
          timestamp: getIsoDate(10),
          ciStatus: 'PASSED',
        },
        {
          sha: shas[4],
          branch: 'feature/dark-mode',
          parents: [shas[3]],
          message: 'feat(theme): dark mode color definitions',
          author: authors[0],
          timestamp: getIsoDate(8),
          ciStatus: 'PASSED',
        },
        {
          sha: shas[6],
          branch: 'fix/auth-token',
          parents: [shas[3]],
          message: 'refactor(auth): token expiration logic',
          author: authors[3],
          timestamp: getIsoDate(6),
          ciStatus: 'PASSED',
        },
        {
          sha: shas[5],
          branch: 'feature/dark-mode',
          parents: [shas[4]],
          message: 'fix(tokens): contrast adjustments in dark theme',
          author: authors[0],
          timestamp: getIsoDate(4.5),
          ciStatus: 'PASSED',
        },
        {
          sha: shas[7],
          branch: 'fix/auth-token',
          parents: [shas[6]],
          message: 'fix(auth): prevent race condition on refresh',
          author: authors[3],
          timestamp: getIsoDate(3.5),
          ciStatus: 'FAILED',
        },
        {
          sha: shas[8],
          branch: 'main',
          parents: [shas[3], shas[5]],
          message: 'Merge pull request #42 from feature/dark-mode',
          author: authors[1],
          timestamp: getIsoDate(3),
          ciStatus: 'PASSED',
        },
        {
          sha: shas[9],
          branch: 'feature/new-dashboard',
          parents: [shas[8]],
          message: 'feat(ui): dynamic grid widget framework',
          author: authors[1],
          timestamp: getIsoDate(2),
          ciStatus: 'PASSED',
        },
        {
          sha: shas[0],
          branch: 'main',
          parents: [shas[8]],
          message: 'release: v2.1.0-alpha candidate',
          author: authors[0],
          timestamp: getIsoDate(1),
          ciStatus: 'PASSED',
        },
        {
          sha: shas[10],
          branch: 'feature/new-dashboard',
          parents: [shas[9]],
          message: 'wip(kpi): add sparkline live feeds',
          author: authors[1],
          timestamp: getIsoDate(0.5),
          ciStatus: 'RUNNING',
        },
      ],
      branches,
    },
    qualityBenchmarks: {
      currentCoveragePct: coverageHistory[coverageHistory.length - 1].coverage,
      coverageHistory,
      currentBundleKb: bundleHistory[bundleHistory.length - 1].bundleKb,
      bundleHistory,
    },
    recentEvents: [
      {
        id: `evt-${randomInt(1000, 9999)}`,
        type: 'PR_MERGED',
        title: 'PR #42: Feature/dark mode merged into main',
        actor: authors[1],
        url: 'https://github.com/org/repo/pull/42',
        timestamp: getIsoDate(1),
      },
      {
        id: `evt-${randomInt(1000, 9999)}`,
        type: 'CI_PASSED',
        title: 'CI Pipeline passed for main',
        actor: 'github-actions',
        url: 'https://github.com/org/repo/actions/runs/1234',
        timestamp: getIsoDate(1.2),
      },
      {
        id: `evt-${randomInt(1000, 9999)}`,
        type: 'ISSUE_CLOSED',
        title: 'Issue #38: Missing padding on mobile',
        actor: authors[0],
        url: 'https://github.com/org/repo/issues/38',
        timestamp: getIsoDate(4),
      },
      {
        id: `evt-${randomInt(1000, 9999)}`,
        type: 'CI_FAILED',
        title: 'Build failed on fix/auth-token',
        actor: authors[3],
        url: 'https://github.com/org/repo/actions/runs/1233',
        timestamp: getIsoDate(5.1),
      },
      {
        id: `evt-${randomInt(1000, 9999)}`,
        type: 'RELEASE_PUBLISHED',
        title: 'v1.9.0 released',
        actor: authors[1],
        url: 'https://github.com/org/repo/releases/tag/v1.9.0',
        timestamp: getIsoDate(22),
      },
    ],
  };
}
