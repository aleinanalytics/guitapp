-- Migration: add tarjeta_config (versión inicial con solo día del mes).
-- Si ya aplicaste esto, aplicá también migration_tarjeta_fechas_completas.sql para fecha_cierre / fecha_vencimiento.
-- Instalaciones nuevas: usá schema.sql actual (solo fechas completas).

create table tarjeta_config (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dia_cierre int not null check (dia_cierre >= 1 and dia_cierre <= 28),
  dia_vencimiento int not null check (dia_vencimiento >= 1 and dia_vencimiento <= 28),
  created_at timestamptz default now(),
  unique (user_id)
);

-- RLS
alter table tarjeta_config enable row level security;
create policy "Users can read own tarjeta_config"
  on tarjeta_config for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can insert own tarjeta_config"
  on tarjeta_config for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users can update own tarjeta_config"
  on tarjeta_config for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
