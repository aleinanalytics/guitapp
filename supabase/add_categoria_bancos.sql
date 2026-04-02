-- Gasto: BANCOS + subcategorías (idempotente; SQL Editor).

insert into categorias (nombre, tipo, color, parent_id)
select 'BANCOS', 'gasto', '#0e7490', null
where not exists (
  select 1 from categorias c
  where c.tipo = 'gasto' and c.parent_id is null and c.nombre = 'BANCOS'
);

insert into categorias (nombre, tipo, color, parent_id)
select 'Gastos Bancarios', 'gasto', '#64748b', p.id
from categorias p
where p.tipo = 'gasto' and p.parent_id is null and p.nombre = 'BANCOS'
  and not exists (
    select 1 from categorias c
    where c.parent_id = p.id and c.nombre = 'Gastos Bancarios' and c.tipo = 'gasto'
  );

insert into categorias (nombre, tipo, color, parent_id)
select 'Impuestos', 'gasto', '#dc2626', p.id
from categorias p
where p.tipo = 'gasto' and p.parent_id is null and p.nombre = 'BANCOS'
  and not exists (
    select 1 from categorias c
    where c.parent_id = p.id and c.nombre = 'Impuestos' and c.tipo = 'gasto'
  );

insert into categorias (nombre, tipo, color, parent_id)
select 'Prestamos', 'gasto', '#7c3aed', p.id
from categorias p
where p.tipo = 'gasto' and p.parent_id is null and p.nombre = 'BANCOS'
  and not exists (
    select 1 from categorias c
    where c.parent_id = p.id and c.nombre = 'Prestamos' and c.tipo = 'gasto'
  );

insert into categorias (nombre, tipo, color, parent_id)
select 'Pago de TC', 'gasto', '#2563eb', p.id
from categorias p
where p.tipo = 'gasto' and p.parent_id is null and p.nombre = 'BANCOS'
  and not exists (
    select 1 from categorias c
    where c.parent_id = p.id and c.nombre = 'Pago de TC' and c.tipo = 'gasto'
  );

insert into categorias (nombre, tipo, color, parent_id)
select 'Descubierto', 'gasto', '#ea580c', p.id
from categorias p
where p.tipo = 'gasto' and p.parent_id is null and p.nombre = 'BANCOS'
  and not exists (
    select 1 from categorias c
    where c.parent_id = p.id and c.nombre = 'Descubierto' and c.tipo = 'gasto'
  );
