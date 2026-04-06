-- Migration: add medio_pago to transacciones + new compras_cuotas table
-- Idempotente: se puede re-ejecutar sin error si ya aplicaste partes antes.
-- Bases nuevas: preferí schema.sql si partís de cero.

-- 1. Add medio_pago column to transacciones
alter table transacciones
  add column if not exists medio_pago text not null default 'efectivo'
  check (medio_pago in ('efectivo','tarjeta','transferencia'));

-- 2. Update policy for transacciones (edición en la app)
drop policy if exists "Users can update own transacciones" on transacciones;
create policy "Users can update own transacciones"
  on transacciones for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Tabla compras_cuotas (cuotas tarjeta)
create table if not exists compras_cuotas (
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

-- 4. RLS compras_cuotas
alter table compras_cuotas enable row level security;

drop policy if exists "Users can read own compras_cuotas" on compras_cuotas;
create policy "Users can read own compras_cuotas"
  on compras_cuotas for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own compras_cuotas" on compras_cuotas;
create policy "Users can insert own compras_cuotas"
  on compras_cuotas for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own compras_cuotas" on compras_cuotas;
create policy "Users can update own compras_cuotas"
  on compras_cuotas for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own compras_cuotas" on compras_cuotas;
create policy "Users can delete own compras_cuotas"
  on compras_cuotas for delete to authenticated
  using (auth.uid() = user_id);
