import { useRef, useInsertionEffect, useCallback } from 'react';

/**
 * React 19.2+ useEffectEvent
 *
 * Senioriarkkitehdin opetus:
 * `useEffectEvent` erottaa tapahtumanomaisen logiikan (kuten ajastimen tikin tai
 * animaatioaskeleen suorituksen) reaktiivisesta efektistä (`useEffect`).
 *
 * Hyödyt:
 * 1. Efektin riippuvuuslistaan ei tarvitse laittaa usein muuttuvia tiloja tai funktioita.
 * 2. Estää turhat efektien uudelleenkäynnistykset (ei tear-down/re-subscribe -sykliä).
 * 3. Tapahtumafunktio näkee AINA tuoreimman tilan ja propit ilman "stale closure" -ongelmaa.
 *
 * @param fn Tapahtumanomainen funktio, jota kutsutaan efektin sisältä
 */
export function useEffectEvent<T extends (...args: any[]) => any>(fn: T): T {
  const handlerRef = useRef<T>(fn);

  useInsertionEffect(() => {
    handlerRef.current = fn;
  });

  return useCallback((...args: Parameters<T>): ReturnType<T> => {
    const fn = handlerRef.current;
    return fn(...args);
  }, []) as T;
}
