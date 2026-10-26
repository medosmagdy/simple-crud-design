-- Run as an administrator on route_store. Replace the password before execution.
CREATE USER 'store_manager'@'localhost' IDENTIFIED BY 'REPLACE_WITH_A_STRONG_PASSWORD';
GRANT SELECT, INSERT, UPDATE ON route_store.* TO 'store_manager'@'localhost';
REVOKE UPDATE ON route_store.* FROM 'store_manager'@'localhost';
GRANT DELETE ON route_store.Sales TO 'store_manager'@'localhost';
SHOW GRANTS FOR 'store_manager'@'localhost';
