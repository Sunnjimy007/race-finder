export interface RaceSource {
  url: string
  name: string
  covers: string[]  // locations this source is relevant for
}

// Trusted race calendar sources — Claude will search these first.
// Add new sources here as you find them.
export const RACE_SOURCES: RaceSource[] = [
  {
    url: 'https://www.rdrc.sg/blogs/race-calendar',
    name: 'RDRC Race Calendar',
    covers: ['Singapore'],
  },
  {
    url: 'https://www.jomrun.com/events',
    name: 'JomRun',
    covers: ['Singapore', 'Malaysia'],
  },
]

// Returns the source URLs relevant for a given location
export function getSourcesForLocation(location: string): RaceSource[] {
  return RACE_SOURCES.filter(s =>
    s.covers.some(c => c.toLowerCase() === location.toLowerCase())
  )
}
