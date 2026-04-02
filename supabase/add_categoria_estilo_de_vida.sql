-- Gasto: Estilo de vida → Peluquería, Estética (idempotente; SQL Editor).

insert into categorias (nombre, tipo, color, parent_id)
select 'Estilo de vida', 'gasto', '#db2777', null
where not exists (
  select 1 from categorias c
  where c.tipo = 'gasto' and c.parent_id is null and c.nombre = 'Estilo de vida'
);

insert into categorias (nombre, tipo, color, parent_id)
select 'Peluquería', 'gasto', '#f472b6', p.id
from categorias p
where p.tipo = 'gasto' and p.parent_id is null and p.nombre = 'Estilo de vida'
  and not exists (
    select 1 from categorias c
    where c.parent_id = p.id and c.nombre = 'Peluquería' and c.tipo = 'gasto'
  );

insert into categorias (nombre, tipo, color, parent_id)
select 'Estética', 'gasto', '#e879f9', p.id
from categorias p
where p.tipo = 'gasto' and p.parent_id is null and p.nombre = 'Estilo de vida'
  and not exists (
    select 1 from categorias c
    where c.parent_id = p.id and c.nombre = 'Estética' and c.tipo = 'gasto'
  );
