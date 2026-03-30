-- Esquema inicial: solo en base vacía / primer setup. Si las tablas ya existen, usa migraciones puntuales.

create table categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('ingreso','gasto','suscripcion')),
  color text not null,
  created_at timestamptz default now()
);

create table transacciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  descripcion text not null,
  monto numeric(12,2) not null,
  moneda text not null check (moneda in ('ARS','USD')),
  tipo text not null check (tipo in ('ingreso','gasto','suscripcion')),
  medio_pago text not null default 'efectivo' check (medio_pago in ('efectivo','tarjeta')),
  categoria_id uuid references categorias(id) on delete set null,
  es_gasto_fijo boolean not null default false,
  created_at timestamptz default now()
);

create table tipo_cambio (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  usd_ars numeric(10,2) not null,
  created_at timestamptz default now(),
  unique (user_id, fecha)
);

create table compras_cuotas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  descripcion text not null,
  monto_total numeric(12,2) not null,
  cuotas_total int not null check (cuotas_total >= 2),
  monto_cuota numeric(12,2) not null,
  fecha_primera_cuota date not null,
  moneda text not null check (moneda in ('ARS','USD')),
  categoria_id uuid references categorias(id) on delete set null,
  created_at timestamptz default now()
);

-- RLS: categorias
alter table categorias enable row level security;
create policy "Authenticated users can read categorias"
  on categorias for select to authenticated using (true);

-- RLS: transacciones
alter table transacciones enable row level security;
create policy "Users can read own transacciones"
  on transacciones for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own transacciones"
  on transacciones for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own transacciones"
  on transacciones for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own transacciones"
  on transacciones for delete to authenticated using (auth.uid() = user_id);

-- RLS: tipo_cambio
alter table tipo_cambio enable row level security;
create policy "Users can read own tipo_cambio"
  on tipo_cambio for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own tipo_cambio"
  on tipo_cambio for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own tipo_cambio"
  on tipo_cambio for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- RLS: compras_cuotas
alter table compras_cuotas enable row level security;
create policy "Users can read own compras_cuotas"
  on compras_cuotas for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own compras_cuotas"
  on compras_cuotas for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own compras_cuotas"
  on compras_cuotas for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own compras_cuotas"
  on compras_cuotas for delete to authenticated using (auth.uid() = user_id);

-- tarjeta_config: próximo cierre y vencimiento (fechas completas; el usuario las renueva cuando pasa el ciclo)
create table tarjeta_config (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha_cierre date not null,
  fecha_vencimiento date not null,
  created_at timestamptz default now(),
  unique (user_id)
);

alter table tarjeta_config enable row level security;
create policy "Users can read own tarjeta_config"
  on tarjeta_config for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own tarjeta_config"
  on tarjeta_config for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own tarjeta_config"
  on tarjeta_config for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed categorias
insert into categorias (nombre, tipo, color) values
  ('Sueldo','ingreso','#22c55e'),
  ('Freelance','ingreso','#16a34a'),
  ('Varios','ingreso','#059669'),
  ('Supermercado','gasto','#ef4444'),
  ('Verduleria','gasto','#65a30d'),
  ('Carniceria','gasto','#be123c'),
  ('Alimentos','gasto','#15803d'),
  ('Helado','gasto','#7dd3fc'),
  ('Panadería','gasto','#ca8a04'),
  ('Restaurante','gasto','#f59e0b'),
  ('Transporte','gasto','#f97316'),
  ('Auto','gasto','#57534e'),
  ('Combustible','gasto','#ea580c'),
  ('Estacionamiento','gasto','#0891b2'),
  ('Vivienda','gasto','#1e40af'),
  ('Alquiler','gasto','#92400e'),
  ('Servicios','gasto','#6366f1'),
  ('Salud','gasto','#ec4899'),
  ('Entretenimiento','gasto','#8b5cf6'),
  ('Otros gastos','gasto','#94a3b8'),
  ('Streaming','suscripcion','#dc2626'),
  ('Música','suscripcion','#16a34a'),
  ('IA','suscripcion','#0ea5e9'),
  ('Otras','suscripcion','#a855f7');

-- Bolsillos (ejecutar también migration_bolsillos.sql en proyectos existentes)
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
