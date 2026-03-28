-- Ejecutar en Supabase SQL Editor si la base ya existía (no ejecutes schema.sql entero).
insert into categorias (nombre, tipo, color)
select 'Panadería', 'gasto', '#ca8a04'
where not exists (select 1 from categorias where nombre = 'Panadería');
