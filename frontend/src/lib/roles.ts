// Shared by server and client code, so it must not import anything server-only.

export const ROLES = ['admin', 'treasurer', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  treasurer: 'Treasurer',
  viewer: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: 'Full access, including user management',
  treasurer: 'Can record and edit transactions and categories',
  viewer: 'Read-only access to the finance pages',
};

/** Unknown/legacy role values (e.g. the old "agent") get the least privilege. */
export function normalizeRole(role: string): Role {
  return (ROLES as readonly string[]).includes(role) ? (role as Role) : 'viewer';
}
