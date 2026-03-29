-- Categorías de gasto: Alimentos, Helado (Supabase SQL Editor; idempotente).

insert into categorias (nombre, tipo, color)
select 'Alimentos', 'gasto', '#15803d'
where not exists (select 1 from categorias where nombre = 'Alimentos' and tipo = 'gasto');

insert into categorias (nombre, tipo, color)
select 'Helado', 'gasto', '#7dd3fc'
where not exists (select 1 from categorias where nombre = 'Helado' and tipo = 'gasto');
