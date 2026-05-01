-- Migration: Tabla deudas para préstamos personales, prendarios, refinanciaciones y arreglos
-- Fecha: 2026-04-11

-- Crear tabla deudas
create table if not exists deudas (
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

-- Comentarios para documentación
comment on table deudas is 'Préstamos y deudas financieras externas (personales, prendarios, bancarios, estudios)';
comment on column deudas.tipo_deuda is 'Tipo: prestamo_personal, prestamo_prendario, refinanciacion_bancaria, arreglo_estudio, otro';
comment on column deudas.monto_total is 'Monto total del préstamo/deuda otorgado';
comment on column deudas.cuotas_total is 'Cantidad total de cuotas a pagar';
comment on column deudas.monto_cuota is 'Monto de cada cuota (calculado automáticamente)';
comment on column deudas.fecha_primera_cuota is 'Fecha de la primera cuota (mes en que arranca)';

-- Índices para performance
create index if not exists idx_deudas_user_id on deudas(user_id);
create index if not exists idx_deudas_created_at on deudas(created_at desc);

-- RLS Policies
alter table deudas enable row level security;

-- SELECT: usuarios solo ven sus propias deudas
create policy "deudas_select_own" on deudas
  for select using (auth.uid() = user_id);

-- INSERT: usuarios solo insertan sus propias deudas
create policy "deudas_insert_own" on deudas
  for insert with check (auth.uid() = user_id);

-- UPDATE: usuarios solo actualizan sus propias deudas
create policy "deudas_update_own" on deudas
  for update using (auth.uid() = user_id);

-- DELETE: usuarios solo eliminan sus propias deudas
create policy "deudas_delete_own" on deudas
  for delete using (auth.uid() = user_id);

-- Trigger para updated_at
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
