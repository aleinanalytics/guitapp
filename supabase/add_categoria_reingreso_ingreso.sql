-- Ingreso: Reingreso (devoluciones, reembolsos, etc.). Idempotente; SQL Editor.

insert into categorias (nombre, tipo, color)
select 'Reingreso', 'ingreso', '#14b8a6'
where not exists (select 1 from categorias where nombre = 'Reingreso' and tipo = 'ingreso');
