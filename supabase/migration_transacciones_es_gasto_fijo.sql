-- Marcar gastos como "fijos" para el cálculo del fondo de emergencia (×3 / ×6)

alter table transacciones
  add column if not exists es_gasto_fijo boolean not null default false;

comment on column transacciones.es_gasto_fijo is 'Solo tipo gasto: si es true, cuenta en el promedio de gastos fijos para sugerir fondo de emergencia.';
