-- MySQL Database Setup for Inspection System
-- Run this file with: sudo mysql < setup_database.sql

-- Create database
CREATE DATABASE IF NOT EXISTS inspection_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER IF NOT EXISTS 'inspection_user'@'localhost' IDENTIFIED BY 'inspection_pass_2026';
CREATE USER IF NOT EXISTS 'inspection_user'@'127.0.0.1' IDENTIFIED BY 'inspection_pass_2026';

-- Grant privileges
GRANT ALL PRIVILEGES ON inspection_system.* TO 'inspection_user'@'localhost';
GRANT ALL PRIVILEGES ON inspection_system.* TO 'inspection_user'@'127.0.0.1';

-- Flush privileges
FLUSH PRIVILEGES;

-- Verify database creation
SHOW DATABASES LIKE 'inspection_system';

-- Show user privileges
SHOW GRANTS FOR 'inspection_user'@'localhost';
