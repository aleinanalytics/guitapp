-- Ejecutar en Supabase SQL Editor si la base ya existía (no ejecutes schema.sql entero).
insert into categorias (nombre, tipo, color)
select 'Varios', 'ingreso', '#059669'
where not exists (select 1 from categorias where nombre = 'Varios' and tipo = 'ingreso');
