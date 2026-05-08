-- ============================================================
-- schema.sql — Esquema completo de GuitaApp
-- Ejecutar en una base vacía (p. ej. nuevo proyecto Supabase).
-- Incluye tablas, constraints, índices, RLS, seeds y triggers.
-- ============================================================

-- ─── Categorías ──────────────────────────────────────────────
create table categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('ingreso','gasto','suscripcion')),
  color text not null,
  parent_id uuid references categorias(id) on delete set null,
  created_at timestamptz default now()
);

-- ─── Transacciones ───────────────────────────────────────────
create table transacciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  descripcion text not null,
  monto numeric(12,2) not null,
  moneda text not null check (moneda in ('ARS','USD')),
  tipo text not null check (tipo in ('ingreso','gasto','suscripcion')),
  medio_pago text not null default 'efectivo' check (medio_pago in ('efectivo','tarjeta','transferencia')),
  categoria_id uuid references categorias(id) on delete set null,
  es_gasto_fijo boolean not null default false,
  excluye_saldo boolean not null default false,
  created_at timestamptz default now()
);

create index idx_transacciones_user_fecha on transacciones (user_id, fecha);

-- ─── Tipo de Cambio ──────────────────────────────────────────
create table tipo_cambio (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  usd_ars numeric(10,2) not null,
  created_at timestamptz default now(),
  unique (user_id, fecha)
);

-- ─── Compras en Cuotas ───────────────────────────────────────
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

-- ─── Tarjeta Config ──────────────────────────────────────────
create table tarjeta_config (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha_cierre date not null,
  fecha_vencimiento date not null,
  modo_credito boolean not null default false,
  created_at timestamptz default now(),
  unique (user_id)
);

-- ─── Bolsillos ───────────────────────────────────────────────
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
  moneda text not null default 'ARS' check (moneda in ('ARS','USD')),
  created_at timestamptz default now()
);

create index bolsillo_movimientos_user_tipo_idx on bolsillo_movimientos (user_id, tipo);
create index bolsillo_movimientos_user_created_idx on bolsillo_movimientos (user_id, created_at desc);

-- ─── Deudas ──────────────────────────────────────────────────
create table deudas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  descripcion text not null,
  tipo_deuda text not null check (tipo_deuda in ('prestamo_personal','prestamo_prendario','refinanciacion_bancaria','arreglo_estudio','otro')),
  monto_total numeric(12,2) not null,
  cuotas_total int not null check (cuotas_total >= 1),
  monto_cuota numeric(12,2) not null,
  fecha_primera_cuota date not null,
  moneda text not null check (moneda in ('ARS','USD')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_deudas_user_id on deudas(user_id);
create index idx_deudas_created_at on deudas(created_at desc);

-- Trigger updated_at
create or replace function update_deudas_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger trigger_deudas_updated_at
  before update on deudas
  for each row
  execute function update_deudas_updated_at();

-- ─── Feedback ────────────────────────────────────────────────
create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  tipo text not null check (tipo in ('fallo', 'funcion', 'categoria', 'otro')),
  mensaje text not null,
  email text,
  created_at timestamptz default now()
);

-- ============================================================
-- RLS Policies
-- ============================================================

-- categorias
alter table categorias enable row level security;
create policy "Authenticated users can read categorias"
  on categorias for select to authenticated using (true);

-- transacciones
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

-- tipo_cambio
alter table tipo_cambio enable row level security;
create policy "Users can read own tipo_cambio"
  on tipo_cambio for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own tipo_cambio"
  on tipo_cambio for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own tipo_cambio"
  on tipo_cambio for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- compras_cuotas
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

-- tarjeta_config
alter table tarjeta_config enable row level security;
create policy "Users can read own tarjeta_config"
  on tarjeta_config for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own tarjeta_config"
  on tarjeta_config for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own tarjeta_config"
  on tarjeta_config for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- bolsillos_config
alter table bolsillos_config enable row level security;
create policy "Users read own bolsillos_config"
  on bolsillos_config for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own bolsillos_config"
  on bolsillos_config for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own bolsillos_config"
  on bolsillos_config for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- bolsillo_movimientos
alter table bolsillo_movimientos enable row level security;
create policy "Users read own bolsillo_movimientos"
  on bolsillo_movimientos for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own bolsillo_movimientos"
  on bolsillo_movimientos for insert to authenticated with check (auth.uid() = user_id);
create policy "Users delete own bolsillo_movimientos"
  on bolsillo_movimientos for delete to authenticated using (auth.uid() = user_id);

-- deudas
alter table deudas enable row level security;
create policy "deudas_select_own" on deudas for select using (auth.uid() = user_id);
create policy "deudas_insert_own" on deudas for insert with check (auth.uid() = user_id);
create policy "deudas_update_own" on deudas for update using (auth.uid() = user_id);
create policy "deudas_delete_own" on deudas for delete using (auth.uid() = user_id);

-- feedback
alter table feedback enable row level security;
create policy "Authenticated users can insert feedback"
  on feedback for insert to authenticated with check (true);
create policy "Users can read own feedback"
  on feedback for select to authenticated using (auth.uid() = user_id);

-- ============================================================
-- Seed: categorías
-- ============================================================
insert into categorias (nombre, tipo, color) values
  ('Sueldo','ingreso','#22c55e'),
  ('Freelance','ingreso','#16a34a'),
  ('Reingreso','ingreso','#14b8a6'),
  ('Varios','ingreso','#059669'),
  ('Reintegro / promo TC','ingreso','#f472b6'),
  ('Streaming','suscripcion','#dc2626'),
  ('Música','suscripcion','#16a34a'),
  ('IA','suscripcion','#0ea5e9'),
  ('Otras','suscripcion','#a855f7');

insert into categorias (nombre, tipo, color) values
  ('Hogar','gasto','#7c3aed'),
  ('Servicios','gasto','#6366f1'),
  ('Supermercado','gasto','#ef4444'),
  ('Alimentos','gasto','#16a34a'),
  ('Regalos','gasto','#ec4899'),
  ('Auto','gasto','#57534e'),
  ('Transporte','gasto','#f97316'),
  ('Salud','gasto','#0d9488'),
  ('Entretenimiento','gasto','#a855f7'),
  ('Estilo de vida','gasto','#db2777'),
  ('Compras online','gasto','#fbbf24');

insert into categorias (nombre, tipo, color, parent_id)
select s.nombre, 'gasto', s.color, p.id
from categorias p
cross join (values
  ('Hogar', 'Expensas', '#a78bfa'),
  ('Hogar', 'Alquiler', '#92400e'),
  ('Hogar', 'Otros Gastos', '#94a3b8'),
  ('Servicios', 'Agua', '#38bdf8'),
  ('Servicios', 'Luz', '#fbbf24'),
  ('Servicios', 'Internet', '#818cf8'),
  ('Servicios', 'TV', '#c084fc'),
  ('Servicios', 'Celular', '#34d399'),
  ('Servicios', 'Gas', '#fb7c00'),
  ('Servicios', 'Otros', '#64748b'),
  ('Supermercado', 'Compra Mensual', '#f87171'),
  ('Supermercado', 'Compra Semanal', '#fb923c'),
  ('Supermercado', 'Compra Diaria', '#fcd34d'),
  ('Alimentos', 'Panadería', '#ca8a04'),
  ('Alimentos', 'Fiambreria', '#db2777'),
  ('Alimentos', 'Carniceria', '#be123c'),
  ('Alimentos', 'Heladería', '#7dd3fc'),
  ('Alimentos', 'Verdulería', '#65a30d'),
  ('Alimentos', 'Restaurante', '#f59e0b'),
  ('Alimentos', 'Delivery', '#fb923c'),
  ('Alimentos', 'General', '#15803d'),
  ('Regalos', 'General', '#f472b6'),
  ('Auto', 'Garage', '#78716c'),
  ('Auto', 'Patente', '#44403c'),
  ('Auto', 'Seguro', '#57534e'),
  ('Auto', 'Modificaciones', '#a8a29e'),
  ('Auto', 'Reparación', '#d6d3d1'),
  ('Auto', 'Service', '#292524'),
  ('Auto', 'Combustible', '#ea580c'),
  ('Auto', 'Otros', '#57534e'),
  ('Transporte', 'Colectivo', '#ea580c'),
  ('Transporte', 'Subte', '#7c3aed'),
  ('Transporte', 'Uber', '#18181b'),
  ('Transporte', 'Otros', '#0891b2'),
  ('Salud', 'Medicamentos', '#f472b6'),
  ('Salud', 'Gastos Médicos', '#ec4899'),
  ('Salud', 'Otros', '#0f7669'),
  ('Entretenimiento', 'Otros', '#8b5cf6'),
  ('Estilo de vida', 'Peluquería', '#f472b6'),
  ('Estilo de vida', 'Estética', '#e879f9'),
  ('Compras online', 'MercadoLibre', '#3483fa')
) as s(principal, nombre, color)
where p.tipo = 'gasto' and p.parent_id is null and p.nombre = s.principal;
