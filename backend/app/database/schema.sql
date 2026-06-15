-- ====================================================================
-- VigilAI PostgreSQL Database Schema (DDL)
-- AI-Based Real-Time Intelligent Surveillance System for Behavioral Anomaly Detection
-- Suitable for production deployment and final-year project presentation.
-- ====================================================================

-- Enable UUID extension if needed (optional)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean up existing tables (Optional, in correct dependency order)
-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- DROP TABLE IF EXISTS privacy_settings CASCADE;
-- DROP TABLE IF EXISTS snapshots CASCADE;
-- DROP TABLE IF EXISTS recordings CASCADE;
-- DROP TABLE IF EXISTS alerts CASCADE;
-- DROP TABLE IF EXISTS detections CASCADE;
-- DROP TABLE IF EXISTS live_streams CASCADE;
-- DROP TABLE IF EXISTS cameras CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS analytics CASCADE;
-- DROP TABLE IF EXISTS devices CASCADE;
-- DROP TABLE IF EXISTS privacy_zones CASCADE;
-- DROP TABLE IF EXISTS trusted_persons CASCADE;
-- DROP TABLE IF EXISTS detection_events CASCADE;

-- 1. USERS TABLE (User Authentication & Management)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'operator' NOT NULL, -- e.g., admin, operator, user
    phone_number VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index for authentication search
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);


-- 2. CAMERAS TABLE (Surveillance Configurations)
CREATE TABLE IF NOT EXISTS cameras (
    id SERIAL PRIMARY KEY,
    camera_name VARCHAR(100) NOT NULL,
    camera_type VARCHAR(50) DEFAULT 'IP' NOT NULL, -- RTSP, USB, IP
    stream_url VARCHAR(255) NOT NULL,
    location VARCHAR(150),
    status VARCHAR(30) DEFAULT 'offline' NOT NULL, -- online, offline, error
    resolution VARCHAR(30) DEFAULT '1920x1080' NOT NULL,
    fps INTEGER DEFAULT 30 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);


-- 3. LIVE STREAMS TABLE (Active Stream Sessions)
CREATE TABLE IF NOT EXISTS live_streams (
    id SERIAL PRIMARY KEY,
    camera_id INTEGER NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    stream_status VARCHAR(30) DEFAULT 'inactive' NOT NULL, -- active, inactive, buffering
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    bitrate INTEGER -- in kbps
);

-- Index for searching active streams
CREATE INDEX IF NOT EXISTS idx_live_streams_camera_id ON live_streams(camera_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams(stream_status);


-- 4. DETECTIONS TABLE (AI Threat & Event Logs)
CREATE TABLE IF NOT EXISTS detections (
    id SERIAL PRIMARY KEY,
    camera_id INTEGER NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    detection_type VARCHAR(50) NOT NULL, -- Fall, Fight, Weapon, Loitering, Intrusion
    confidence_score DOUBLE PRECISION NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    bounding_box JSONB, -- Coordinates of target box
    pose_data JSONB, -- MediaPipe Pose coordinates
    snapshot_url VARCHAR(255),
    video_clip_url VARCHAR(255)
);

-- Key Indexes for Analytics & Query Performance Optimization
CREATE INDEX IF NOT EXISTS idx_detections_camera_id ON detections(camera_id);
CREATE INDEX IF NOT EXISTS idx_detections_type ON detections(detection_type);
CREATE INDEX IF NOT EXISTS idx_detections_timestamp ON detections(detected_at);


-- 5. ALERTS TABLE (Triggered Notification Alerts)
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    detection_id INTEGER NOT NULL REFERENCES detections(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- Fall, Fight, Weapon, etc.
    alert_message TEXT NOT NULL,
    delivery_method VARCHAR(50) NOT NULL, -- SMS, Email, Push Notification
    delivery_status VARCHAR(30) DEFAULT 'pending' NOT NULL, -- sent, failed, pending
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for Alert delivery audits
CREATE INDEX IF NOT EXISTS idx_alerts_detection_id ON alerts(detection_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_sent_at ON alerts(sent_at);


-- 6. RECORDINGS TABLE (MP4 Historical Video Clips)
CREATE TABLE IF NOT EXISTS recordings (
    id SERIAL PRIMARY KEY,
    camera_id INTEGER NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    file_path VARCHAR(255) NOT NULL,
    duration DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    recording_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    storage_type VARCHAR(50) DEFAULT 'local' NOT NULL -- local, S3, cloud
);

-- Index for recording search
CREATE INDEX IF NOT EXISTS idx_recordings_camera_id ON recordings(camera_id);


-- 7. SNAPSHOTS TABLE (Detection Snapshot Storage)
CREATE TABLE IF NOT EXISTS snapshots (
    id SERIAL PRIMARY KEY,
    detection_id INTEGER NOT NULL REFERENCES detections(id) ON DELETE CASCADE,
    image_path VARCHAR(255) NOT NULL,
    face_blurred BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index for snapshot mapping
CREATE INDEX IF NOT EXISTS idx_snapshots_detection_id ON snapshots(detection_id);


-- 8. ANALYTICS TABLE (Aggregated Dashboard Metrics)
CREATE TABLE IF NOT EXISTS analytics (
    id SERIAL PRIMARY KEY,
    total_alerts INTEGER DEFAULT 0 NOT NULL,
    total_detections INTEGER DEFAULT 0 NOT NULL,
    fall_count INTEGER DEFAULT 0 NOT NULL,
    fight_count INTEGER DEFAULT 0 NOT NULL,
    weapon_count INTEGER DEFAULT 0 NOT NULL,
    loitering_count INTEGER DEFAULT 0 NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);


-- 9. DEVICES TABLE (Surveillance Hardware Equipment)
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    device_name VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) DEFAULT 'edge_node' NOT NULL, -- camera, edge_node, server
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    status VARCHAR(30) DEFAULT 'offline' NOT NULL, -- online, offline, maintenance
    last_connected TIMESTAMP WITH TIME ZONE
);


-- 10. PRIVACY SETTINGS TABLE (User Preferences)
CREATE TABLE IF NOT EXISTS privacy_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    face_blur_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    local_storage_only BOOLEAN DEFAULT FALSE NOT NULL,
    cloud_backup_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    data_retention_days INTEGER DEFAULT 30 NOT NULL
);

-- Index for looking up settings per user
CREATE INDEX IF NOT EXISTS idx_privacy_settings_user ON privacy_settings(user_id);


-- 11. AUDIT LOGS TABLE (System Audits & Operations)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- login, create_user, update_camera, delete_camera, etc.
    description TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index for looking up audit trail per user
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);


-- ====================================================================
-- BACKWARD COMPATIBILITY TABLES (Optional, for existing features)
-- ====================================================================

CREATE TABLE IF NOT EXISTS privacy_zones (
    id SERIAL PRIMARY KEY,
    camera_id VARCHAR(100) NOT NULL,
    name VARCHAR(100),
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trusted_persons (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    facial_embedding BYTEA NOT NULL,
    embedding_model VARCHAR(50) DEFAULT 'FaceNet',
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS detection_events (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    description TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confidence DOUBLE PRECISION DEFAULT 0.0
);
