// Shared by server and client code, so it must not import anything server-only.
// Display names live in the i18n messages (t.roles / t.roleDescriptions).

export const ROLES = ['admin', 'treasurer', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

/** Unknown/legacy role values (e.g. the old "agent") get the least privilege. */
export function normalizeRole(role: string): Role {
  return (ROLES as readonly string[]).includes(role) ? (role as Role) : 'viewer';
}
