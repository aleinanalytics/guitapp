-- Renombrar categorías de suscripción (ejecutar en Supabase SQL Editor si ya tenés Netflix/Spotify/Software/Otras suscripciones).
-- Las transacciones siguen apuntando al mismo id de categoría.

update categorias set nombre = 'Streaming', color = '#dc2626'
  where tipo = 'suscripcion' and nombre = 'Netflix';

update categorias set nombre = 'Música', color = '#16a34a'
  where tipo = 'suscripcion' and nombre in ('Spotify', 'Musica');

update categorias set nombre = 'IA', color = '#0ea5e9'
  where tipo = 'suscripcion' and nombre = 'Software';

update categorias set nombre = 'Otras', color = '#a855f7'
  where tipo = 'suscripcion' and nombre = 'Otras suscripciones';
