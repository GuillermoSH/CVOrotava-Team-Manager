export function isEligibleForVideoNotify(
  profile: { gender: string | null; is_active: boolean | null },
  gender: "male" | "female"
) {
  if (profile.is_active === false) return false;
  return profile.gender === gender;
}
