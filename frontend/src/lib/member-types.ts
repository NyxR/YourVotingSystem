// Shared by server and client code. Mirrors the MemberType enum in schema.prisma.

export const MEMBER_TYPES = ['MPANDRAY', 'TSY_MPANDRAY'] as const;
export type MemberType = (typeof MEMBER_TYPES)[number];

/** Shown in Malagasy whatever the interface language. */
export const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  MPANDRAY: 'Mpandray',
  TSY_MPANDRAY: 'Tsy Mpandray',
};
