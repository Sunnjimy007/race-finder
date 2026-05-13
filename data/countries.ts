export interface Country {
  name: string
  region: 'Southeast Asia' | 'APAC'
}

export const COUNTRIES: Country[] = [
  // Singapore first
  { name: 'Singapore', region: 'Southeast Asia' },

  // Southeast Asia
  { name: 'Brunei', region: 'Southeast Asia' },
  { name: 'Cambodia', region: 'Southeast Asia' },
  { name: 'Indonesia', region: 'Southeast Asia' },
  { name: 'Laos', region: 'Southeast Asia' },
  { name: 'Malaysia', region: 'Southeast Asia' },
  { name: 'Myanmar', region: 'Southeast Asia' },
  { name: 'Philippines', region: 'Southeast Asia' },
  { name: 'Thailand', region: 'Southeast Asia' },
  { name: 'Timor-Leste', region: 'Southeast Asia' },
  { name: 'Vietnam', region: 'Southeast Asia' },

  // APAC
  { name: 'Australia', region: 'APAC' },
  { name: 'Bangladesh', region: 'APAC' },
  { name: 'China', region: 'APAC' },
  { name: 'Fiji', region: 'APAC' },
  { name: 'Hong Kong', region: 'APAC' },
  { name: 'India', region: 'APAC' },
  { name: 'Japan', region: 'APAC' },
  { name: 'Maldives', region: 'APAC' },
  { name: 'Nepal', region: 'APAC' },
  { name: 'New Zealand', region: 'APAC' },
  { name: 'Pakistan', region: 'APAC' },
  { name: 'Papua New Guinea', region: 'APAC' },
  { name: 'South Korea', region: 'APAC' },
  { name: 'Sri Lanka', region: 'APAC' },
  { name: 'Taiwan', region: 'APAC' },
]
