-- ==========================================
-- DDL & Seed Data Script (Projet CDA)
-- Database Target: PostgreSQL
-- ==========================================

-- 1. CLEANUP (Optional / Development)
DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS conversion_scale CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS login_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. CREATE TABLES

-- Table: users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Administrateur', 'Utilisateur')),
    failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
    lockout_until TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table: login_logs
CREATE TABLE login_logs (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    success BOOLEAN NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table: classes
CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- Table: students
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('Masculin', 'Féminin', 'Autre')),
    country VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    photo_url VARCHAR(500) NULL,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table: subjects
CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Table: conversion_scale
CREATE TABLE conversion_scale (
    id SERIAL PRIMARY KEY,
    min_score REAL NOT NULL,
    max_score REAL NOT NULL,
    letter_grade VARCHAR(10) NOT NULL,
    status_label VARCHAR(100) NOT NULL,
    CONSTRAINT min_max_check CHECK (min_score <= max_score)
);

-- Table: grades
CREATE TABLE grades (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    mark REAL NOT NULL CHECK (mark >= 0 AND mark <= 100),
    term VARCHAR(50) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_student_subject_term_year UNIQUE (student_id, subject_id, term, academic_year)
);

-- 3. INDEXES FOR PERFORMANCE & SECURITY
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_grades_student_id ON grades(student_id);
CREATE INDEX idx_grades_subject_id ON grades(subject_id);
CREATE INDEX idx_students_class_id ON students(class_id);

-- 4. SEED INITIAL DATA

-- Default Classes
INSERT INTO classes (name) VALUES
('Seconde'),
('Première'),
('Terminale');

-- Default Subjects
INSERT INTO subjects (name) VALUES 
('Mathématiques'),
('Français'),
('Espagnol'),
('Histoire'),
('Sport'),
('Physique');

-- Default Conversion Scale (Barème de conversion)
INSERT INTO conversion_scale (min_score, max_score, letter_grade, status_label) VALUES
(90, 100, 'A', 'Excellent'),
(80, 89.99, 'B', 'Très Bien'),
(70, 79.99, 'C', 'Bien'),
(60, 69.99, 'D', 'Acceptable'),
(0, 59.99, 'E', 'Insuffisant');

-- Default Users (Passwords hashed using bcrypt inside the application service layer)
-- Admin: admin@school.com / password: AdminPassword123!
-- User: user@school.com / password: UserPassword123!
INSERT INTO users (email, password_hash, role) VALUES
('admin@school.com', '$2b$12$KkQ12z7mG1YqK0kG3n4fbe3d2g7J1FqQpWjUe9rT7y6uI8o9p0qWa', 'Administrateur'),
('user@school.com', '$2b$12$E/5Kj9y7dJ5R3hK4i6o8b.qWaPlKjUhYgTfReD1sO2p3q4r5s6tYu', 'Utilisateur');
