-- Permite medio_pago = transferencia en transacciones (bases ya creadas).

alter table transacciones drop constraint if exists transacciones_medio_pago_check;

alter table transacciones add constraint transacciones_medio_pago_check
  check (medio_pago in ('efectivo', 'tarjeta', 'transferencia'));
