-- Gasto: Servicios → Gas (idempotente; SQL Editor).

insert into categorias (nombre, tipo, color, parent_id)
select 'Gas', 'gasto', '#fb7c00', p.id
from categorias p
where p.tipo = 'gasto' and p.parent_id is null and p.nombre = 'Servicios'
  and not exists (
    select 1 from categorias c
    where c.parent_id = p.id and c.nombre = 'Gas' and c.tipo = 'gasto'
  );
