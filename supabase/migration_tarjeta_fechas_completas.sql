-- Pasar de dia_cierre / dia_vencimiento a fecha_cierre / fecha_vencimiento (date completos).
-- Ejecutar una vez en Supabase SQL Editor. Si tu tabla ya solo tiene fecha_*, este script no rompe nada.

alter table tarjeta_config
  add column if not exists fecha_cierre date,
  add column if not exists fecha_vencimiento date;

do $m$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tarjeta_config' and column_name = 'dia_cierre'
  ) then
    update tarjeta_config set fecha_cierre = (
      case
        when current_date <= (date_trunc('month', current_date)::date + (least(dia_cierre, 28) - 1))
        then date_trunc('month', current_date)::date + (least(dia_cierre, 28) - 1)
        else (date_trunc('month', current_date) + interval '1 month')::date + (least(dia_cierre, 28) - 1)
      end
    )::date where fecha_cierre is null;

    update tarjeta_config set fecha_vencimiento = (
      case
        when current_date <= (date_trunc('month', current_date)::date + (least(dia_vencimiento, 28) - 1))
        then date_trunc('month', current_date)::date + (least(dia_vencimiento, 28) - 1)
        else (date_trunc('month', current_date) + interval '1 month')::date + (least(dia_vencimiento, 28) - 1)
      end
    )::date where fecha_vencimiento is null;

    alter table tarjeta_config drop column dia_cierre;
    alter table tarjeta_config drop column dia_vencimiento;
  end if;
end $m$;

alter table tarjeta_config alter column fecha_cierre set not null;
alter table tarjeta_config alter column fecha_vencimiento set not null;
