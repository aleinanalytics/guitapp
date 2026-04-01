-- Permite registrar ahorros en USD (compra de dólares para atesorar).
alter table bolsillo_movimientos
  add column if not exists moneda text not null default 'ARS'
  check (moneda in ('ARS', 'USD'));

comment on column bolsillo_movimientos.moneda is
  'Moneda del movimiento. Fondo de emergencia suele ser solo ARS; Ahorros puede usar USD.';
