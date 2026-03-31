-- Gasto: Compras online → MercadoLibre (idempotente; SQL Editor).

insert into categorias (nombre, tipo, color, parent_id)
select 'Compras online', 'gasto', '#fbbf24', null
where not exists (
  select 1 from categorias c
  where c.tipo = 'gasto' and c.parent_id is null and c.nombre = 'Compras online'
);

insert into categorias (nombre, tipo, color, parent_id)
select 'MercadoLibre', 'gasto', '#3483fa', p.id
from categorias p
where p.tipo = 'gasto' and p.parent_id is null and p.nombre = 'Compras online'
  and not exists (
    select 1 from categorias c
    where c.parent_id = p.id and c.nombre = 'MercadoLibre' and c.tipo = 'gasto'
  );
