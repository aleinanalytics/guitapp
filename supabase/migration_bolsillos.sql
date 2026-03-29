-- Bolsillos: Ahorros y Fondo de emergencia (transferencias desde "disponible", sin transacciones de gasto)

create table bolsillos_config (
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('ahorro','emergencia')),
  objetivo_monto numeric(12,2),
  meses_sugerencia int not null default 3 check (meses_sugerencia > 0 and meses_sugerencia <= 36),
  updated_at timestamptz default now(),
  primary key (user_id, tipo)
);

create table bolsillo_movimientos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('ahorro','emergencia')),
  monto numeric(12,2) not null,
  created_at timestamptz default now()
);

create index bolsillo_movimientos_user_tipo_idx on bolsillo_movimientos (user_id, tipo);
create index bolsillo_movimientos_user_created_idx on bolsillo_movimientos (user_id, created_at desc);

alter table bolsillos_config enable row level security;
alter table bolsillo_movimientos enable row level security;

create policy "Users read own bolsillos_config"
  on bolsillos_config for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own bolsillos_config"
  on bolsillos_config for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own bolsillos_config"
  on bolsillos_config for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read own bolsillo_movimientos"
  on bolsillo_movimientos for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own bolsillo_movimientos"
  on bolsillo_movimientos for insert to authenticated with check (auth.uid() = user_id);
create policy "Users delete own bolsillo_movimientos"
  on bolsillo_movimientos for delete to authenticated using (auth.uid() = user_id);
