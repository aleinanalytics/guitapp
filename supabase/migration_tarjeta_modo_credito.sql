-- Migración: agregar modo_credito a tarjeta_config
-- Permite que los usuarios que viven a crédito vean los consumos TC descontados del disponible y balance.

alter table tarjeta_config
  add column if not exists modo_credito boolean not null default false;
