// Shared by server and client code. Mirrors the Responsibility enum in schema.prisma.
// Diakona/Birao open their forum topics, and only Birao may be Admin or Treasurer.

import type { MemberType } from '@/lib/member-types';

export const RESPONSIBILITIES = ['BIRAO', 'DIAKONA', 'MPIARA_MIVAVAKA'] as const;
export type Responsibility = (typeof RESPONSIBILITIES)[number];

/** Every member holds this one; it can't be removed. */
export const ALWAYS_RESPONSIBILITY: Responsibility = 'MPIARA_MIVAVAKA';

/** The responsibilities people can actually choose (everything but the automatic one). */
export const OPTIONAL_RESPONSIBILITIES: readonly Responsibility[] = RESPONSIBILITIES.filter(
  (r) => r !== ALWAYS_RESPONSIBILITY,
);

/** Shown in Malagasy whatever the interface language. */
export const RESPONSIBILITY_LABELS: Record<Responsibility, string> = {
  BIRAO: 'Birao',
  DIAKONA: 'Diakona',
  MPIARA_MIVAVAKA: 'Mpiara-mivavaka',
};

/**
 * De-duplicated, in canonical order, and always including Mpiara-mivavaka.
 * Used when saving and when reading, so older rows display consistently too.
 */
export function normalizeResponsibilities(values: readonly Responsibility[]): Responsibility[] {
  return RESPONSIBILITIES.filter((r) => r === ALWAYS_RESPONSIBILITY || values.includes(r));
}

/**
 * The ladder Mpandray → Diakona → Birao: Diakona must be Mpandray, and Birao
 * must also be Diakona. Returns the broken rule (a validation key), or null.
 */
export function responsibilityProblem(
  memberType: MemberType,
  values: readonly Responsibility[],
): 'diakonaNeedsMpandray' | 'biraoNeedsDiakona' | null {
  if (values.includes('DIAKONA') && memberType !== 'MPANDRAY') return 'diakonaNeedsMpandray';
  if (values.includes('BIRAO') && !values.includes('DIAKONA')) return 'biraoNeedsDiakona';
  return null;
}
