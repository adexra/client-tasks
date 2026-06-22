-- Migration 007 — Add business_name to clients
-- Separates the contact/person name from the business/company name

ALTER TABLE clients ADD COLUMN IF NOT EXISTS business_name TEXT;
