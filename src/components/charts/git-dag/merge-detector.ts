export interface MergeInfo {
  mergedBranchName: string;
  prNumber?: string;
}

export function cleanBranchName(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.replace(/^['"]|['"]$/g, '').trim();
  cleaned = cleaned.replace(/^(?:origin|upstream)\//i, '');
  if (
    cleaned.includes('/') &&
    !/^(?:feature|feat|fix|bug|chore|refactor|docs|release|hotfix)\//i.test(cleaned)
  ) {
    const parts = cleaned.split('/');
    if (parts.length > 2 || /^[A-Za-z0-9_-]+$/i.test(parts[0])) {
      cleaned = parts.slice(1).join('/');
    }
  }
  return cleaned.trim();
}

export function extractMergeInfo(msg: string): MergeInfo | null {
  if (!msg) return null;
  const firstLine = msg.split('\n')[0].trim();

  // Pattern 1: Merge pull request #123 from org/branch
  const prMatch = firstLine.match(/Merge pull request #(\d+)(?:\s+from\s+(\S+))?/i);
  if (prMatch) {
    return {
      mergedBranchName: cleanBranchName(prMatch[2] || ''),
      prNumber: `#${prMatch[1]}`,
    };
  }

  // Pattern 2: Merge branch 'feat/xyz'
  const branchQuoteMatch = firstLine.match(/Merge branch ['"]([^'"]+)['"]/i);
  if (branchQuoteMatch) {
    return { mergedBranchName: cleanBranchName(branchQuoteMatch[1]) };
  }

  // Pattern 3: Merge remote-tracking branch 'origin/feat/xyz'
  const remoteMatch = firstLine.match(/Merge remote-tracking branch ['"]([^'"]+)['"]/i);
  if (remoteMatch) {
    return { mergedBranchName: cleanBranchName(remoteMatch[1]) };
  }

  // Pattern 4: Merge feat/xyz into main
  const intoMatch = firstLine.match(/Merge\s+(\S+)\s+into\s+(\S+)/i);
  if (intoMatch) {
    return { mergedBranchName: cleanBranchName(intoMatch[1]) };
  }

  // Pattern 5: Generic commit starting with "Merge "
  if (/^Merge\s+/i.test(firstLine)) {
    const prInline = firstLine.match(/#(\d+)/);
    const words = firstLine.replace(/^Merge\s+/i, '').split(/\s+/);
    return {
      mergedBranchName: words[0] ? cleanBranchName(words[0]) : '',
      prNumber: prInline ? `#${prInline[1]}` : undefined,
    };
  }

  return null;
}

export function normalizeBranch(name: string): string {
  return name.toLowerCase().replace(/^(?:origin|upstream|[a-z0-9_-]+)\//i, '').trim();
}

export function isBranchMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const normA = normalizeBranch(a);
  const normB = normalizeBranch(b);
  if (normA === normB) return true;
  if (normA && normB && (normA.endsWith(normB) || normB.endsWith(normA))) return true;
  return false;
}
