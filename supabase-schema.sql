-- ==========================================
-- 1. CREACIÓN DE ENUMS
-- ==========================================
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COMPANY_ADMIN', 'EVALUATOR');
CREATE TYPE "SurveyStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DRAFT');
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED');
CREATE TYPE "QuestionType" AS ENUM ('LIKERT', 'MULTIPLE_CHOICE', 'YES_NO', 'OPEN_TEXT', 'NUMERIC');
CREATE TYPE "MaturityLevel" AS ENUM ('CRITICAL', 'LOW', 'MEDIUM', 'HIGH', 'EXCELLENT');

-- Habilitar extensión para generar UUIDs v4
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. TABLAS BASE
-- ==========================================

-- Tabla Company
CREATE TABLE "Company" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_empresa VARCHAR(255) NOT NULL,
    nit VARCHAR(50) UNIQUE NOT NULL,
    sector VARCHAR(100) NOT NULL,
    direccion VARCHAR(255),
    telefono VARCHAR(50),
    correo VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_company_nit ON "Company"(nit);

-- Tabla User
CREATE TABLE "User" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol "UserRole" DEFAULT 'EVALUATOR'::"UserRole" NOT NULL,
    empresa_id UUID REFERENCES "Company"(id) ON DELETE CASCADE,
    estado VARCHAR(50) DEFAULT 'ACTIVO' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_user_email ON "User"(email);

-- Tabla RefreshToken
CREATE TABLE "RefreshToken" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES "User"(id) ON DELETE CASCADE NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla Category
CREATE TABLE "Category" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla Survey
CREATE TABLE "Survey" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    version INT DEFAULT 1 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    status "SurveyStatus" DEFAULT 'DRAFT'::"SurveyStatus" NOT NULL,
    created_by UUID REFERENCES "User"(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla Question
CREATE TABLE "Question" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES "Survey"(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES "Category"(id) NOT NULL,
    pregunta TEXT NOT NULL,
    tipo "QuestionType" DEFAULT 'LIKERT'::"QuestionType" NOT NULL,
    orden INT NOT NULL,
    obligatorio BOOLEAN DEFAULT true NOT NULL,
    categoria_indicador VARCHAR(100)
);
CREATE INDEX idx_question_survey ON "Question"(survey_id);

-- Tabla QuestionOption
CREATE TABLE "QuestionOption" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES "Question"(id) ON DELETE CASCADE NOT NULL,
    texto TEXT NOT NULL,
    valor NUMERIC NOT NULL
);

-- Tabla SurveyAttempt
CREATE TABLE "SurveyAttempt" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES "Survey"(id) ON DELETE RESTRICT NOT NULL,
    company_id UUID REFERENCES "Company"(id) ON DELETE CASCADE NOT NULL,
    evaluator_id UUID REFERENCES "User"(id) ON DELETE RESTRICT NOT NULL,
    status "AttemptStatus" DEFAULT 'IN_PROGRESS'::"AttemptStatus" NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_score NUMERIC,
    percentage NUMERIC,
    maturity_level "MaturityLevel",
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_attempt_company ON "SurveyAttempt"(company_id);
CREATE INDEX idx_attempt_survey ON "SurveyAttempt"(survey_id);

-- Tabla SurveyAnswer
CREATE TABLE "SurveyAnswer" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID REFERENCES "SurveyAttempt"(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES "Question"(id) ON DELETE RESTRICT NOT NULL,
    selected_option_id UUID REFERENCES "QuestionOption"(id) ON DELETE RESTRICT,
    answer_text TEXT,
    numeric_value NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uniq_attempt_question UNIQUE (attempt_id, question_id)
);
CREATE INDEX idx_answer_attempt ON "SurveyAnswer"(attempt_id);

-- Tabla SurveyAssignment
CREATE TABLE "SurveyAssignment" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES "Survey"(id) ON DELETE CASCADE NOT NULL,
    evaluator_id UUID REFERENCES "User"(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES "User"(id) ON DELETE CASCADE NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    status "AssignmentStatus" DEFAULT 'PENDING'::"AssignmentStatus" NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla AuditLog
CREATE TABLE "AuditLog" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES "User"(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity VARCHAR(255) NOT NULL,
    entity_id VARCHAR(255),
    previous_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. DATOS DE SEMILLA (SEED)
-- ==========================================

-- Insertar empresas de prueba
INSERT INTO "Company" (id, nombre_empresa, nit, sector, correo) VALUES
('c1111111-1111-1111-1111-111111111111', 'TechCorp Solutions', '800.123.456-1', 'TI & Desarrollo', 'contact@techcorp.com'),
('c2222222-2222-2222-2222-222222222222', 'InnovaSoft', '900.222.111-2', 'Software', 'info@innovasoft.com'),
('c3333333-3333-3333-3333-333333333333', 'Fintech Hub', '901.333.444-5', 'Finanzas', 'admin@fintechhub.com'),
('c4444444-4444-4444-4444-444444444444', 'Retail Systems', '805.999.000-8', 'Comercio', 'contact@retailsystems.com');

-- Insertar usuarios de prueba (Nota: En producción, contraseñas deben estar encriptadas)
INSERT INTO "User" (id, nombre, apellido, email, password, rol, empresa_id) VALUES
('11111111-1111-1111-1111-111111111111', 'Admin', 'Global', 'admin@test.com', 'password123', 'ADMIN', NULL),
('22222222-2222-2222-2222-222222222222', 'Admin', 'Empresa', 'companyadmin@test.com', 'password123', 'COMPANY_ADMIN', 'c1111111-1111-1111-1111-111111111111'),
('33333333-3333-3333-3333-333333333333', 'Evaluador', 'Externo', 'evaluator@test.com', 'password123', 'EVALUATOR', NULL);

-- Insertar Categorías de Preguntas
INSERT INTO "Category" (id, name, description) VALUES
('ca111111-1111-1111-1111-111111111111', 'Planificación', 'Preguntas asociadas a metodologías y planificación ágil'),
('ca222222-2222-2222-2222-222222222222', 'Mejora Continua', 'Procesos de retroalimentación e iteración rápida'),
('ca333333-3333-3333-3333-333333333333', 'Roles', 'Claridad y presencia de figuras del equipo en el día a día'),
('ca444444-4444-4444-4444-444444444444', 'Métricas', 'Uso de data e indicadores clave en el equipo'),
('ca555555-5555-5555-5555-555555555555', 'Ingeniería', 'Prácticas modernas de desarrollo, testing y CI/CD');

-- Insertar Encuesta de prueba
INSERT INTO "Survey" (id, titulo, descripcion, version, is_active, status, created_by) VALUES
('51111111-1111-1111-1111-111111111111', 'Evaluación de Madurez Ágil', 'Mide la madurez y adopción de prácticas ágiles en tus equipos.', 1, true, 'ACTIVE', '11111111-1111-1111-1111-111111111111');

-- Insertar Preguntas para la encuesta de prueba
INSERT INTO "Question" (id, survey_id, category_id, pregunta, tipo, orden, obligatorio) VALUES
('e1111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', 'ca111111-1111-1111-1111-111111111111', '¿Los equipos planifican sus iteraciones de forma colaborativa?', 'LIKERT', 1, true),
('e2222222-2222-2222-2222-222222222222', '51111111-1111-1111-1111-111111111111', 'ca222222-2222-2222-2222-222222222222', '¿Se realizan retrospectivas al final de cada iteración?', 'LIKERT', 2, true),
('e3333333-3333-3333-3333-333333333333', '51111111-1111-1111-1111-111111111111', 'ca333333-3333-3333-3333-333333333333', '¿El Product Owner está disponible para resolver dudas diariamente?', 'LIKERT', 3, true),
('e4444444-4444-4444-4444-444444444444', '51111111-1111-1111-1111-111111111111', 'ca444444-4444-4444-4444-444444444444', '¿Se utilizan métricas de velocidad o rendimiento para estimar?', 'LIKERT', 4, true),
('e5555555-5555-5555-5555-555555555555', '51111111-1111-1111-1111-111111111111', 'ca555555-5555-5555-5555-555555555555', '¿Hay un proceso automatizado para el despliegue a producción?', 'LIKERT', 5, true);

-- Insertar opciones genéricas Likert (1 a 5)
INSERT INTO "QuestionOption" (id, question_id, texto, valor) VALUES
('b1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'Nunca se hace', 1),
('b2222222-2222-2222-2222-222222222222', 'e1111111-1111-1111-1111-111111111111', 'Raras veces se hace', 2),
('b3333333-3333-3333-3333-333333333333', 'e1111111-1111-1111-1111-111111111111', 'A veces se hace', 3),
('b4444444-4444-4444-4444-444444444444', 'e1111111-1111-1111-1111-111111111111', 'Frecuentemente se hace', 4),
('b5555555-5555-5555-5555-555555555555', 'e1111111-1111-1111-1111-111111111111', 'Siempre se hace sin falta', 5);
