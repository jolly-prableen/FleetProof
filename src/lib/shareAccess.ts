export function isShareActive(shareToken: string | null, expectedToken: string, expiresAt: Date | null, revokedAt: Date | null, now = new Date()): boolean {
  return shareToken === expectedToken && revokedAt === null && expiresAt !== null && expiresAt > now;
}
