-- Categorías de gasto jerárquicas (principal → sub) + migración desde planas.
-- Idempotente parcial: si ya hay parent_id y subs, el paso 1 no renombra de nuevo.

alter table categorias add column if not exists parent_id uuid references categorias(id) on delete set null;

-- 1) Renombrar solo categorías gasto planas que aún no son legacy
update categorias
set nombre = '__legacy__' || replace(nombre, ' ', '_')
where tipo = 'gasto'
  and parent_id is null
  and nombre not like '__legacy__%';

-- 2) Principales
insert into categorias (nombre, tipo, color, parent_id)
select v.nombre, 'gasto', v.color, null
from (values
  ('Hogar', '#7c3aed'),
  ('Servicios', '#6366f1'),
  ('Supermercado', '#ef4444'),
  ('Alimentos', '#16a34a'),
  ('Regalos', '#ec4899'),
  ('Auto', '#57534e'),
  ('Transporte', '#f97316'),
  ('Salud', '#0d9488'),
  ('Entretenimiento', '#a855f7'),
  ('Compras online', '#fbbf24')
) as v(nombre, color)
where not exists (
  select 1 from categorias c
  where c.tipo = 'gasto' and c.parent_id is null and c.nombre = v.nombre
);

-- 3) Subcategorías
insert into categorias (nombre, tipo, color, parent_id)
select s.nombre, 'gasto', s.color, p.id
from categorias p
cross join (values
  ('Hogar', 'Expensas', '#a78bfa'),
  ('Hogar', 'Alquiler', '#92400e'),
  ('Hogar', 'Otros Gastos', '#94a3b8'),
  ('Servicios', 'Agua', '#38bdf8'),
  ('Servicios', 'Luz', '#fbbf24'),
  ('Servicios', 'Internet', '#818cf8'),
  ('Servicios', 'TV', '#c084fc'),
  ('Servicios', 'Celular', '#34d399'),
  ('Servicios', 'Otros', '#64748b'),
  ('Supermercado', 'Compra Mensual', '#f87171'),
  ('Supermercado', 'Compra Semanal', '#fb923c'),
  ('Supermercado', 'Compra Diaria', '#fcd34d'),
  ('Alimentos', 'Panadería', '#ca8a04'),
  ('Alimentos', 'Fiambreria', '#db2777'),
  ('Alimentos', 'Carniceria', '#be123c'),
  ('Alimentos', 'Heladería', '#7dd3fc'),
  ('Alimentos', 'Verdulería', '#65a30d'),
  ('Alimentos', 'Restaurante', '#f59e0b'),
  ('Alimentos', 'General', '#15803d'),
  ('Regalos', 'General', '#f472b6'),
  ('Auto', 'Garage', '#78716c'),
  ('Auto', 'Patente', '#44403c'),
  ('Auto', 'Seguro', '#57534e'),
  ('Auto', 'Modificaciones', '#a8a29e'),
  ('Auto', 'Reparación', '#d6d3d1'),
  ('Auto', 'Service', '#292524'),
  ('Auto', 'Combustible', '#ea580c'),
  ('Auto', 'Otros', '#57534e'),
  ('Transporte', 'Colectivo', '#ea580c'),
  ('Transporte', 'Subte', '#7c3aed'),
  ('Transporte', 'Uber', '#18181b'),
  ('Transporte', 'Otros', '#0891b2'),
  ('Salud', 'Medicamentos', '#f472b6'),
  ('Salud', 'Gastos Médicos', '#ec4899'),
  ('Salud', 'Otros', '#0f7669'),
  ('Entretenimiento', 'Otros', '#8b5cf6'),
  ('Compras online', 'MercadoLibre', '#3483fa')
) as s(principal, nombre, color)
where p.tipo = 'gasto' and p.parent_id is null and p.nombre = s.principal
  and not exists (
    select 1 from categorias c
    where c.parent_id = p.id and c.nombre = s.nombre and c.tipo = 'gasto'
  );

-- 4) Mapeo legacy_nombre → (principal, sub)
create temporary table _jer_map (legacy text primary key, principal text not null, sub text not null);
insert into _jer_map values
  ('__legacy__Alquiler', 'Hogar', 'Alquiler'),
  ('__legacy__Otros_gastos', 'Hogar', 'Otros Gastos'),
  ('__legacy__Vivienda', 'Hogar', 'Expensas'),
  ('__legacy__Servicios', 'Servicios', 'Otros'),
  ('__legacy__Supermercado', 'Supermercado', 'Compra Mensual'),
  ('__legacy__Verduleria', 'Supermercado', 'Compra Semanal'),
  ('__legacy__Carniceria', 'Alimentos', 'Carniceria'),
  ('__legacy__Fiambreria', 'Alimentos', 'Fiambreria'),
  ('__legacy__Alimentos', 'Alimentos', 'General'),
  ('__legacy__Helado', 'Alimentos', 'Heladería'),
  ('__legacy__Panadería', 'Alimentos', 'Panadería'),
  ('__legacy__Restaurante', 'Alimentos', 'Restaurante'),
  ('__legacy__Transporte', 'Transporte', 'Colectivo'),
  ('__legacy__Auto', 'Auto', 'Garage'),
  ('__legacy__Combustible', 'Auto', 'Combustible'),
  ('__legacy__Estacionamiento', 'Transporte', 'Otros'),
  ('__legacy__Salud', 'Salud', 'Medicamentos'),
  ('__legacy__Entretenimiento', 'Entretenimiento', 'Otros');

update transacciones t set categoria_id = s.id
from _jer_map m
join categorias o on o.nombre = m.legacy
join categorias p on p.nombre = m.principal and p.tipo = 'gasto' and p.parent_id is null
join categorias s on s.parent_id = p.id and s.nombre = m.sub and s.tipo = 'gasto'
where t.tipo = 'gasto' and t.categoria_id = o.id;

update compras_cuotas q set categoria_id = s.id
from _jer_map m
join categorias o on o.nombre = m.legacy
join categorias p on p.nombre = m.principal and p.tipo = 'gasto' and p.parent_id is null
join categorias s on s.parent_id = p.id and s.nombre = m.sub and s.tipo = 'gasto'
where q.categoria_id = o.id;

-- 5) Borrar legacy sin uso
delete from categorias c
where c.nombre like '__legacy__%'
  and not exists (select 1 from transacciones t where t.categoria_id = c.id)
  and not exists (select 1 from compras_cuotas q where q.categoria_id = c.id);
