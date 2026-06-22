-- ============================================================
-- Migration 001 — Initial Schema
-- Tables: clients, client_phases, phase_fields
-- NOTE: includes a trigger that was later dropped in migration 004
-- ============================================================

-- Disable RLS (single user tool)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    company TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    phase_name TEXT NOT NULL CHECK (phase_name IN ('onboarding', 'delivery', 'qa', 'update')),
    completed BOOLEAN DEFAULT false,
    order_index INT NOT NULL
);

CREATE TABLE IF NOT EXISTS phase_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID REFERENCES client_phases(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL,
    field_value TEXT,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'checkbox', 'date', 'number'))
);

-- NOTE: This trigger is dropped in migration 004.
-- JS code in AddClientModal.jsx is the authoritative source for phase creation.
CREATE OR REPLACE FUNCTION initialize_client_phases()
RETURNS TRIGGER AS $$
DECLARE
    v_onboarding_id UUID;
    v_delivery_id UUID;
    v_qa_id UUID;
    v_update_id UUID;
BEGIN
    INSERT INTO client_phases (client_id, phase_name, order_index) VALUES (NEW.id, 'onboarding', 1) RETURNING id INTO v_onboarding_id;
    INSERT INTO phase_fields (phase_id, field_key, field_type, field_value) VALUES
        (v_onboarding_id, 'Scope', 'text', ''),
        (v_onboarding_id, 'Deliverables', 'text', ''),
        (v_onboarding_id, 'Timeline', 'date', ''),
        (v_onboarding_id, 'Dependencies', 'text', '');

    INSERT INTO client_phases (client_id, phase_name, order_index) VALUES (NEW.id, 'delivery', 2) RETURNING id INTO v_delivery_id;
    INSERT INTO phase_fields (phase_id, field_key, field_type, field_value) VALUES
        (v_delivery_id, 'Execution Roadmap', 'text', '[]'),
        (v_delivery_id, 'Scope of Work', 'text', ''),
        (v_delivery_id, 'Key Deliverables', 'text', ''),
        (v_delivery_id, 'Technical Stack', 'text', '');

    INSERT INTO client_phases (client_id, phase_name, order_index) VALUES (NEW.id, 'qa', 3) RETURNING id INTO v_qa_id;
    INSERT INTO phase_fields (phase_id, field_key, field_type, field_value) VALUES
        (v_qa_id, 'Matches client request', 'checkbox', 'false'),
        (v_qa_id, 'Mobile responsive', 'checkbox', 'false'),
        (v_qa_id, 'No bugs', 'checkbox', 'false'),
        (v_qa_id, 'Typography consistent', 'checkbox', 'false'),
        (v_qa_id, 'Colors correct', 'checkbox', 'false');

    INSERT INTO client_phases (client_id, phase_name, order_index) VALUES (NEW.id, 'update', 4) RETURNING id INTO v_update_id;
    INSERT INTO phase_fields (phase_id, field_key, field_type, field_value) VALUES
        (v_update_id, 'Client Requests', 'text', ''),
        (v_update_id, 'Action Items', 'text', '[]'),
        (v_update_id, 'Status Update', 'text', '');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_client_insert
AFTER INSERT ON clients
FOR EACH ROW
EXECUTE FUNCTION initialize_client_phases();
