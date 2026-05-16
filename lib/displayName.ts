export interface Profile {
  first_name: string
  last_name: string
}

export function formatDisplayName(profile: Profile | null, emailFallback?: string): string {
  if (profile?.first_name) {
    const lastInitial = profile.last_name?.[0]?.toUpperCase()
    return lastInitial ? `${profile.first_name} ${lastInitial}.` : profile.first_name
  }
  return emailFallback?.split('@')[0] ?? 'Runner'
}
