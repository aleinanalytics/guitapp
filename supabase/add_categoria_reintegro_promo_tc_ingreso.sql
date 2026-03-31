-- Ingreso: reintegro o promo en tarjeta (idempotente; SQL Editor).
-- En la app: Carga → Ingreso → tildar "Reintegro o promo en tarjeta" (medio_pago = tarjeta).

insert into categorias (nombre, tipo, color)
select 'Reintegro / promo TC', 'ingreso', '#f472b6'
where not exists (
  select 1 from categorias where nombre = 'Reintegro / promo TC' and tipo = 'ingreso'
);
