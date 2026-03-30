-- Gastos: Verdulería, Auto, Combustible, Carnicería, Vivienda (idempotente; SQL Editor).

insert into categorias (nombre, tipo, color)
select 'Verduleria', 'gasto', '#65a30d'
where not exists (select 1 from categorias where nombre = 'Verduleria' and tipo = 'gasto');

insert into categorias (nombre, tipo, color)
select 'Auto', 'gasto', '#57534e'
where not exists (select 1 from categorias where nombre = 'Auto' and tipo = 'gasto');

insert into categorias (nombre, tipo, color)
select 'Combustible', 'gasto', '#ea580c'
where not exists (select 1 from categorias where nombre = 'Combustible' and tipo = 'gasto');

insert into categorias (nombre, tipo, color)
select 'Carniceria', 'gasto', '#be123c'
where not exists (select 1 from categorias where nombre = 'Carniceria' and tipo = 'gasto');

insert into categorias (nombre, tipo, color)
select 'Vivienda', 'gasto', '#1e40af'
where not exists (select 1 from categorias where nombre = 'Vivienda' and tipo = 'gasto');
