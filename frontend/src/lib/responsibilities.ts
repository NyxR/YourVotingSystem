// Shared by server and client code. Mirrors the Responsibility enum in schema.prisma.
// Informational flags only: they never affect what a user can do in the app.

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
