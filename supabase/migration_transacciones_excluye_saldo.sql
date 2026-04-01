-- Gasto anotado solo para seguimiento (ej. lo pagó otra persona): no resta del saldo acumulado ni del disponible.
alter table transacciones
  add column if not exists excluye_saldo boolean not null default false;

comment on column transacciones.excluye_saldo is
  'Si es true (solo gasto/suscripción con salida de caja): no cuenta en saldo acumulado ni disponible; sigue apareciendo en listados y totales de gastos.';
