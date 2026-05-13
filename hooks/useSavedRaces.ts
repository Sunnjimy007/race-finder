'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Race } from '@/types/race'
import type { User } from '@supabase/supabase-js'

function raceKey(race: Race) {
  return `${race.name}__${race.date}`
}

export function useSavedRaces(user: User | null) {
  const [saved, setSaved] = useState<Race[]>([])
  const [loadingSaved, setLoadingSaved] = useState(false)

  useEffect(() => {
    if (!user) {
      setSaved([])
      return
    }

    setLoadingSaved(true)
    supabase
      .from('saved_races')
      .select('race_data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setSaved(data.map(r => r.race_data as Race))
        setLoadingSaved(false)
      })
  }, [user])

  const toggleSave = useCallback(async (race: Race) => {
    if (!user) return

    const key = raceKey(race)
    const exists = saved.some(r => raceKey(r) === key)

    if (exists) {
      const { error } = await supabase
        .from('saved_races')
        .delete()
        .eq('user_id', user.id)
        .eq('race_name', race.name)
        .eq('race_date', race.date)

      if (!error) setSaved(prev => prev.filter(r => raceKey(r) !== key))
    } else {
      const { error } = await supabase
        .from('saved_races')
        .insert({
          user_id: user.id,
          race_name: race.name,
          race_date: race.date,
          race_location: race.location,
          race_distance: race.distance,
          race_data: race,
        })

      if (!error) setSaved(prev => [race, ...prev])
    }
  }, [user, saved])

  const isSaved = useCallback((race: Race) => {
    return saved.some(r => raceKey(r) === raceKey(race))
  }, [saved])

  return { saved, loadingSaved, toggleSave, isSaved }
}
