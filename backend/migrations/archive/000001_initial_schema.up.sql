-- 000001_initial_schema.up.sql
-- Baseline schema for High School Management System

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Campuses (Multi-tenancy root)
CREATE TABLE IF NOT EXISTS campuses (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    contact_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users (Authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    phone_number TEXT UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Students
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY,
    campus_id UUID NOT NULL REFERENCES campuses(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    other_name TEXT,
    enrollment_num TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    dob TEXT,
    address TEXT,
    status TEXT DEFAULT 'ACTIVE',
    graduation_date TIMESTAMP WITH TIME ZONE,
    user_id UUID UNIQUE REFERENCES users(id),
    program_id UUID,
    class_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Teachers
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES users(id),
    employee_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    department_id UUID,
    hire_date DATE,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
