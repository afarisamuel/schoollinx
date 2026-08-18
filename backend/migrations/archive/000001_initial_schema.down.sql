-- 000001_initial_schema.down.sql
-- Rollback initial schema

DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS campuses;

DROP EXTENSION IF EXISTS "uuid-ossp";
