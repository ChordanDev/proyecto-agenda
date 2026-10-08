import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { toLocalDate } from '../dominio/localDate';

/** The date of the phone, as the local `YYYY-MM-DD` the rules of the calendar work with. */
function getToday(): string {
  const now = new Date();

  return toLocalDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * Today, by the clock of the phone. This is the only place of the calendar that
 * reads it: the rules receive the date. It is read again each time the app
 * comes back to the front, so a calendar left open overnight does not keep
 * yesterday as today.
 */
export function useToday(): string {
  const [today, setToday] = useState(getToday);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setToday(getToday());
      }
    });

    return () => subscription.remove();
  }, []);

  return today;
}
