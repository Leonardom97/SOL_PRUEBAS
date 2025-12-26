-- Security Enhancements Migration
-- This file contains database schema changes for improved security

-- 1. Create table for rate limiting (brute force protection)
CREATE TABLE IF NOT EXISTS adm_rate_limits (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    action VARCHAR(50) NOT NULL DEFAULT 'login',
    blocked_until TIMESTAMP NULL,
    attempt_count INTEGER DEFAULT 0,
    last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_ip_action UNIQUE(ip_address, action)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_action ON adm_rate_limits(ip_address, action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked ON adm_rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;

-- 2. Add indexes to adm_intentos_login for better performance on rate limiting queries
CREATE INDEX IF NOT EXISTS idx_intentos_login_ip ON adm_intentos_login(ip_address, exitoso, fecha_intento);

-- 3. Add password_updated_at column to track password changes (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='adm_colaboradores' AND column_name='password_updated_at') THEN
        ALTER TABLE adm_colaboradores ADD COLUMN password_updated_at TIMESTAMP NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='adm_usuarios' AND column_name='password_updated_at') THEN
        ALTER TABLE adm_usuarios ADD COLUMN password_updated_at TIMESTAMP NULL;
    END IF;
END $$;

-- 4. Add failed login attempt counter to user tables for account lockout
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='adm_colaboradores' AND column_name='failed_login_attempts') THEN
        ALTER TABLE adm_colaboradores ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='adm_usuarios' AND column_name='failed_login_attempts') THEN
        ALTER TABLE adm_usuarios ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='adm_colaboradores' AND column_name='account_locked_until') THEN
        ALTER TABLE adm_colaboradores ADD COLUMN account_locked_until TIMESTAMP NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='adm_usuarios' AND column_name='account_locked_until') THEN
        ALTER TABLE adm_usuarios ADD COLUMN account_locked_until TIMESTAMP NULL;
    END IF;
END $$;

-- 5. Create table for CSRF tokens management (optional - currently using sessions)
-- This can be used for distributed systems or API token management
CREATE TABLE IF NOT EXISTS adm_csrf_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    usuario_id INTEGER,
    tipo_usuario VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_csrf_tokens_lookup ON adm_csrf_tokens(token, used, expires_at);

-- Cleanup function for expired CSRF tokens
CREATE OR REPLACE FUNCTION cleanup_expired_csrf_tokens() RETURNS void AS $$
BEGIN
    DELETE FROM adm_csrf_tokens WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Cleanup function for expired rate limits
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits() RETURNS void AS $$
BEGIN
    DELETE FROM adm_rate_limits WHERE blocked_until < CURRENT_TIMESTAMP AND blocked_until IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE adm_rate_limits IS 'Rate limiting table to prevent brute force attacks';
COMMENT ON TABLE adm_csrf_tokens IS 'CSRF token management for API security';
