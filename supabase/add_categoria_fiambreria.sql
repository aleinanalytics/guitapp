-- Gasto: Fiambrería (idempotente; SQL Editor).

insert into categorias (nombre, tipo, color)
select 'Fiambreria', 'gasto', '#db2777'
where not exists (select 1 from categorias where nombre = 'Fiambreria' and tipo = 'gasto');
