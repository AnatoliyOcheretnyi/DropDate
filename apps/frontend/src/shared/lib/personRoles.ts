/**
 * What a person does, in words: «Актор», «Режисер», «Актор / Режисер».
 *
 * Roles come from the person's credits when the backend could fetch them, so
 * someone who both acts and directs reads as both; otherwise the single
 * known-for department stands in. TMDB's `gender` gives the right form of the
 * noun — 1 is female, 2 is male, 0 and 3 are unknown and take the default.
 */

type RoleKey = "actor" | "director" | "writer";

const ROLE_NOUNS: Record<RoleKey, { male: string; female: string }> = {
  actor: { male: "Актор", female: "Акторка" },
  director: { male: "Режисер", female: "Режисерка" },
  writer: { male: "Сценарист", female: "Сценаристка" },
};

const DEPARTMENT_ROLES: Record<string, RoleKey> = {
  Acting: "actor",
  Directing: "director",
  Writing: "writer",
};

/** Departments that are not one of the three roles keep a descriptive label. */
const DEPARTMENT_LABELS: Record<string, string> = {
  Production: "Продюсування",
  Camera: "Операторська робота",
  Sound: "Музика і звук",
  Editing: "Монтаж",
  Art: "Художня робота",
  "Costume & Make-Up": "Костюми і грим",
  "Visual Effects": "Візуальні ефекти",
  Crew: "Знімальна група",
};

const isRoleKey = (value: string): value is RoleKey => value in ROLE_NOUNS;

const noun = (role: RoleKey, gender?: number) =>
  gender === 1 ? ROLE_NOUNS[role].female : ROLE_NOUNS[role].male;

export function personRoleLabel(person: {
  roles?: string[];
  department?: string;
  gender?: number;
}): string {
  const roles = (person.roles ?? []).filter(isRoleKey);
  if (roles.length > 0) {
    return roles.map((role) => noun(role, person.gender)).join(" / ");
  }

  const department = person.department ?? "";
  const role = DEPARTMENT_ROLES[department];
  if (role) {
    return noun(role, person.gender);
  }
  return DEPARTMENT_LABELS[department] ?? department;
}
