-- Initial seed data
INSERT INTO users (email, name, hashed_password, role) VALUES
('admin@example.com', 'Admin User', '$2b$12$placeholder_bcrypt_hash', 'admin');
