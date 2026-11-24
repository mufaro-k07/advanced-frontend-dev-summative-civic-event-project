-- Service requests: residents report city issues, admins update the status
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS service_requests (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_type varchar(100) NOT NULL,
    title text NOT NULL,
    location text NOT NULL,
    description text,
    status varchar(20) NOT NULL DEFAULT 'submitted'
        CHECK (status IN ('submitted', 'in_progress', 'resolved')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
