-- Se ejecuta solo la primera vez que se crea el volumen de Postgres.
-- Base separada para los tests de integración (se vacía en cada corrida).
CREATE DATABASE pedidos_test OWNER pedidos;
