-- Permite medio_pago = transferencia en transacciones (bases ya creadas).
-- Quita cualquier CHECK cuya definición mencione medio_pago (p. ej. solo
-- efectivo+tarjeta de migration_tarjeta_cuotas.sql); el nombre del constraint
-- no siempre es transacciones_medio_pago_check.

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.transacciones'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%medio_pago%'
  loop
    execute format('alter table public.transacciones drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.transacciones drop constraint if exists transacciones_medio_pago_check;

alter table public.transacciones add constraint transacciones_medio_pago_check
  check (medio_pago in ('efectivo', 'tarjeta', 'transferencia'));
