-- PostgreSQL schema for Obsidian Tags Data Analytics

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main nodes table for tag occurrences
CREATE TABLE IF NOT EXISTS tag_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    context TEXT,
    file VARCHAR(512) NOT NULL,
    line_number INTEGER,
    timestamp BIGINT,
    occurrence_count INTEGER DEFAULT 1,
    document_count INTEGER DEFAULT 1,
    coherence_score DECIMAL(5,2),
    breakthrough_score DECIMAL(5,2),
    metadata JSONB DEFAULT '{}',
    labels TEXT[] DEFAULT '{}',
    classifications TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes for performance
    CONSTRAINT chk_coherence_score CHECK (coherence_score >= 0 AND coherence_score <= 100),
    CONSTRAINT chk_breakthrough_score CHECK (breakthrough_score >= 0 AND breakthrough_score <= 100)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tag_nodes_tag ON tag_nodes(tag);
CREATE INDEX IF NOT EXISTS idx_tag_nodes_file ON tag_nodes(file);
CREATE INDEX IF NOT EXISTS idx_tag_nodes_timestamp ON tag_nodes(timestamp);
CREATE INDEX IF NOT EXISTS idx_tag_nodes_labels ON tag_nodes USING GIN(labels);
CREATE INDEX IF NOT EXISTS idx_tag_nodes_classifications ON tag_nodes USING GIN(classifications);
CREATE INDEX IF NOT EXISTS idx_tag_nodes_metadata ON tag_nodes USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_tag_nodes_coherence ON tag_nodes(coherence_score);
CREATE INDEX IF NOT EXISTS idx_tag_nodes_breakthrough ON tag_nodes(breakthrough_score);

-- Tag statistics table
CREATE TABLE IF NOT EXISTS tag_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag VARCHAR(255) UNIQUE NOT NULL,
    total_occurrences INTEGER DEFAULT 0,
    document_count INTEGER DEFAULT 0,
    first_appearance_file VARCHAR(512),
    first_appearance_date BIGINT,
    last_appearance_file VARCHAR(512),
    last_appearance_date BIGINT,
    frequency_tier VARCHAR(20) CHECK (frequency_tier IN ('high', 'medium', 'low')),
    avg_coherence_score DECIMAL(5,2),
    avg_breakthrough_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tag_statistics_tag ON tag_statistics(tag);
CREATE INDEX IF NOT EXISTS idx_tag_statistics_tier ON tag_statistics(frequency_tier);

-- Co-occurrence relationships
CREATE TABLE IF NOT EXISTS tag_cooccurrences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag1 VARCHAR(255) NOT NULL,
    tag2 VARCHAR(255) NOT NULL,
    count INTEGER DEFAULT 1,
    strength DECIMAL(5,4),
    contexts TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_tag_pair UNIQUE(tag1, tag2)
);

CREATE INDEX IF NOT EXISTS idx_cooccurrences_tag1 ON tag_cooccurrences(tag1);
CREATE INDEX IF NOT EXISTS idx_cooccurrences_tag2 ON tag_cooccurrences(tag2);

-- Semantic clusters
CREATE TABLE IF NOT EXISTS semantic_clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag VARCHAR(255) NOT NULL,
    cluster_id INTEGER NOT NULL,
    label VARCHAR(255),
    summary TEXT,
    context_words TEXT[] DEFAULT '{}',
    occurrence_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clusters_tag ON semantic_clusters(tag);
CREATE INDEX IF NOT EXISTS idx_clusters_cluster_id ON semantic_clusters(cluster_id);

-- Definitions
CREATE TABLE IF NOT EXISTS tag_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag VARCHAR(255) NOT NULL,
    definition_text TEXT NOT NULL,
    source VARCHAR(50) CHECK (source IN ('corpus', 'external', 'user')),
    file VARCHAR(512),
    author VARCHAR(255),
    url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_definitions_tag ON tag_definitions(tag);
CREATE INDEX IF NOT EXISTS idx_definitions_source ON tag_definitions(source);

-- User labels and classifications
CREATE TABLE IF NOT EXISTS user_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID REFERENCES tag_nodes(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_labels_node_id ON user_labels(node_id);
CREATE INDEX IF NOT EXISTS idx_user_labels_label ON user_labels(label);

CREATE TABLE IF NOT EXISTS user_classifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID REFERENCES tag_nodes(id) ON DELETE CASCADE,
    classification VARCHAR(255) NOT NULL,
    confidence DECIMAL(5,4),
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_classifications_node_id ON user_classifications(node_id);
CREATE INDEX IF NOT EXISTS idx_user_classifications_classification ON user_classifications(classification);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tag_nodes_updated_at BEFORE UPDATE ON tag_nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tag_statistics_updated_at BEFORE UPDATE ON tag_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cooccurrences_updated_at BEFORE UPDATE ON tag_cooccurrences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clusters_updated_at BEFORE UPDATE ON semantic_clusters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_definitions_updated_at BEFORE UPDATE ON tag_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
