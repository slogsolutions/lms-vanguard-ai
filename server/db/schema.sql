-- Database Schema for LMS Offline

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'soldier'))
);

-- Content table
CREATE TABLE IF NOT EXISTS content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Content
-- Create dummy admin and soldier
INSERT INTO users (id, name, role) VALUES 
('00000000-0000-0000-0000-000000000001', 'Admin Instructor', 'admin'),
('00000000-0000-0000-0000-000000000002', 'Soldier User', 'soldier')
ON CONFLICT (id) DO NOTHING;

-- Initial LLM Learning Content
INSERT INTO content (title, body, created_by) VALUES 
('Introduction to LLMs', 'Large Language Models (LLMs) are AI systems trained on vast amounts of text data to understand and generate human-like language. They use a neural network architecture called the Transformer.', '00000000-0000-0000-0000-000000000001'),
('What is Tokenization?', 'Tokenization is the process of breaking down text into smaller units called tokens (words, subwords, or characters) that the AI can process. LLMs usually work with subword tokens.', '00000000-0000-0000-0000-000000000001'),
('Prompt Engineering Basics', 'Prompt engineering is the art of crafting effective inputs (prompts) to get the best responses from an AI. Techniques include few-shot prompting, chain-of-thought, and specifying personas.', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
