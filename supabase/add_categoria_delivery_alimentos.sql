-- Gasto: Alimentos → Delivery (idempotente; SQL Editor).

insert into categorias (nombre, tipo, color, parent_id)
select 'Delivery', 'gasto', '#fb923c', p.id
from categorias p
where p.tipo = 'gasto' and p.parent_id is null and p.nombre = 'Alimentos'
  and not exists (
    select 1 from categorias c
    where c.parent_id = p.id and c.nombre = 'Delivery' and c.tipo = 'gasto'
  );
