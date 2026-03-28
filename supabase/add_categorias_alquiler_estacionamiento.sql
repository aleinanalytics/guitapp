-- SOLO este archivo en proyectos que YA tienen las tablas (no ejecutes schema.sql entero).
-- Si ves "relation categorias already exists", estabas corriendo el CREATE TABLE del schema.
insert into categorias (nombre, tipo, color)
select 'Alquiler', 'gasto', '#92400e'
where not exists (select 1 from categorias where nombre = 'Alquiler');

insert into categorias (nombre, tipo, color)
select 'Estacionamiento', 'gasto', '#0891b2'
where not exists (select 1 from categorias where nombre = 'Estacionamiento');
