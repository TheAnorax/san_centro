-- migracion_id_usuario_libero.sql
-- Corre esto UNA VEZ contra la base `san_centro` (por ejemplo desde tu
-- cliente de MySQL: HeidiSQL, phpMyAdmin, Adminer, etc.)
--
-- Agrega la columna donde se guarda el ID del supervisor (rol_id 13) que
-- autorizó/liberó un "Negar Producto", y la lleva también a las tablas a
-- donde se mueve el pedido después (embarques y finalizado), para no
-- perder ese dato en el camino — igual que unido/fusion/ordenes_unidas.

ALTER TABLE `pedidos_surtiendo`
  ADD COLUMN `id_usuario_libero` VARCHAR(11) DEFAULT NULL AFTER `motivo`;

ALTER TABLE `pedidos_embarques`
  ADD COLUMN `id_usuario_libero` VARCHAR(11) DEFAULT NULL AFTER `motivo`;

ALTER TABLE `pedido_finalizado`
  ADD COLUMN `id_usuario_libero` VARCHAR(11) DEFAULT NULL AFTER `motivo`;
