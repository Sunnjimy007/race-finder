// Shared between client (RaceCard) and server (race page, sitemap)
export function toSlug(name: string, date: string): string {
  const nameSlug = name
    .normalize('NFD')                   // decompose accents
    .replace(/[̀-ͯ]/g, '')    // strip accent marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')        // non-alphanumeric → dash
    .replace(/^-+|-+$/g, '')            // trim leading/trailing dashes
  return `${nameSlug}-${date}`
}
