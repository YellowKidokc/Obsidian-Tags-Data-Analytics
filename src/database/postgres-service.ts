import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
    TagOccurrence,
    TagStatistics,
    ConceptDashboard,
    PostgresNode,
    CoOccurrence
} from '../types';
import { sanitizeText } from '../utils/sanitizer';
import { Notice } from 'obsidian';

export class PostgresService {
    private pool: Pool | null = null;
    private isConnected = false;

    constructor(
        private host: string,
        private port: number,
        private database: string,
        private user: string,
        private password: string
    ) {}

    /**
     * Initialize connection pool
     */
    async connect(): Promise<boolean> {
        try {
            this.pool = new Pool({
                host: this.host,
                port: this.port,
                database: this.database,
                user: this.user,
                password: this.password,
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });

            // Test connection
            const client = await this.pool.connect();
            client.release();

            this.isConnected = true;
            console.log('PostgreSQL connected successfully');
            return true;
        } catch (error) {
            console.error('Failed to connect to PostgreSQL:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Disconnect from database
     */
    async disconnect(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.isConnected = false;
            console.log('PostgreSQL disconnected');
        }
    }

    /**
     * Check if connected
     */
    isReady(): boolean {
        return this.isConnected && this.pool !== null;
    }

    /**
     * Initialize database schema
     */
    async initializeSchema(): Promise<boolean> {
        if (!this.isReady()) {
            console.error('PostgreSQL not connected');
            return false;
        }

        try {
            const fs = require('fs');
            const path = require('path');
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');

            await this.pool!.query(schema);
            console.log('Database schema initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize schema:', error);
            return false;
        }
    }

    /**
     * Sync a tag occurrence to the database
     */
    async syncTagOccurrence(occurrence: TagOccurrence): Promise<string | null> {
        if (!this.isReady()) return null;

        try {
            const id = uuidv4();
            const sanitizedContent = sanitizeText(occurrence.sentence);
            const sanitizedContext = sanitizeText(occurrence.context);

            const query = `
                INSERT INTO tag_nodes (
                    id, tag, content, context, file, line_number,
                    timestamp, created_at, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET
                    content = EXCLUDED.content,
                    context = EXCLUDED.context,
                    updated_at = NOW()
                RETURNING id
            `;

            const values = [
                id,
                occurrence.tag,
                sanitizedContent,
                sanitizedContext,
                occurrence.file,
                occurrence.lineNumber,
                occurrence.timestamp || Date.now()
            ];

            const result = await this.pool!.query(query, values);
            return result.rows[0]?.id || id;
        } catch (error) {
            console.error('Failed to sync tag occurrence:', error);
            return null;
        }
    }

    /**
     * Sync tag statistics
     */
    async syncTagStatistics(stats: TagStatistics): Promise<boolean> {
        if (!this.isReady()) return false;

        try {
            const query = `
                INSERT INTO tag_statistics (
                    tag, total_occurrences, document_count,
                    first_appearance_file, first_appearance_date,
                    last_appearance_file, last_appearance_date,
                    frequency_tier, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (tag) DO UPDATE SET
                    total_occurrences = EXCLUDED.total_occurrences,
                    document_count = EXCLUDED.document_count,
                    first_appearance_file = EXCLUDED.first_appearance_file,
                    first_appearance_date = EXCLUDED.first_appearance_date,
                    last_appearance_file = EXCLUDED.last_appearance_file,
                    last_appearance_date = EXCLUDED.last_appearance_date,
                    frequency_tier = EXCLUDED.frequency_tier,
                    updated_at = NOW()
            `;

            const values = [
                stats.tag,
                stats.totalOccurrences,
                stats.documentCount,
                stats.firstAppearance.file,
                stats.firstAppearance.date,
                stats.lastAppearance.file,
                stats.lastAppearance.date,
                stats.frequencyTier
            ];

            await this.pool!.query(query, values);
            return true;
        } catch (error) {
            console.error('Failed to sync tag statistics:', error);
            return false;
        }
    }

    /**
     * Sync co-occurrences
     */
    async syncCoOccurrences(coOccurrences: CoOccurrence[]): Promise<boolean> {
        if (!this.isReady()) return false;

        const client = await this.pool!.connect();
        try {
            await client.query('BEGIN');

            for (const co of coOccurrences) {
                const query = `
                    INSERT INTO tag_cooccurrences (tag1, tag2, count, contexts, updated_at)
                    VALUES ($1, $2, $3, $4, NOW())
                    ON CONFLICT (tag1, tag2) DO UPDATE SET
                        count = EXCLUDED.count,
                        contexts = EXCLUDED.contexts,
                        updated_at = NOW()
                `;

                const sanitizedContexts = co.contexts.map(c => sanitizeText(c));
                await client.query(query, [co.tag1, co.tag2, co.count, sanitizedContexts]);
            }

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Failed to sync co-occurrences:', error);
            return false;
        } finally {
            client.release();
        }
    }

    /**
     * Sync complete dashboard data
     */
    async syncDashboard(dashboard: ConceptDashboard): Promise<boolean> {
        if (!this.isReady()) return false;

        try {
            // Sync statistics
            await this.syncTagStatistics(dashboard.statistics);

            // Sync coherence and breakthrough scores
            if (dashboard.coherenceFactor || dashboard.breakthroughFactor) {
                await this.updateScores(
                    dashboard.tag,
                    dashboard.coherenceFactor?.score,
                    dashboard.breakthroughFactor?.score
                );
            }

            // Sync definitions
            for (const def of dashboard.definitions.fromCorpus) {
                await this.syncDefinition(dashboard.tag, def.text, 'corpus', def.file, def.author);
            }

            for (const def of dashboard.definitions.external) {
                await this.syncDefinition(dashboard.tag, def.text, 'external', undefined, def.author, def.url);
            }

            for (const def of dashboard.definitions.working) {
                await this.syncDefinition(dashboard.tag, def.text, 'user');
            }

            // Sync clusters
            for (const cluster of dashboard.meanings) {
                await this.syncCluster(dashboard.tag, cluster);
            }

            return true;
        } catch (error) {
            console.error('Failed to sync dashboard:', error);
            return false;
        }
    }

    /**
     * Update coherence and breakthrough scores for a tag
     */
    private async updateScores(
        tag: string,
        coherenceScore?: number,
        breakthroughScore?: number
    ): Promise<boolean> {
        if (!this.isReady()) return false;

        try {
            const query = `
                UPDATE tag_statistics
                SET avg_coherence_score = $2,
                    avg_breakthrough_score = $3,
                    updated_at = NOW()
                WHERE tag = $1
            `;

            await this.pool!.query(query, [tag, coherenceScore, breakthroughScore]);
            return true;
        } catch (error) {
            console.error('Failed to update scores:', error);
            return false;
        }
    }

    /**
     * Sync a definition
     */
    private async syncDefinition(
        tag: string,
        text: string,
        source: 'corpus' | 'external' | 'user',
        file?: string,
        author?: string,
        url?: string
    ): Promise<boolean> {
        if (!this.isReady()) return false;

        try {
            const query = `
                INSERT INTO tag_definitions (tag, definition_text, source, file, author, url)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT DO NOTHING
            `;

            const sanitizedText = sanitizeText(text);
            await this.pool!.query(query, [tag, sanitizedText, source, file, author, url]);
            return true;
        } catch (error) {
            console.error('Failed to sync definition:', error);
            return false;
        }
    }

    /**
     * Sync a semantic cluster
     */
    private async syncCluster(tag: string, cluster: any): Promise<boolean> {
        if (!this.isReady()) return false;

        try {
            const query = `
                INSERT INTO semantic_clusters (
                    tag, cluster_id, label, summary, context_words
                )
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT DO NOTHING
            `;

            const sanitizedSummary = sanitizeText(cluster.summary);
            await this.pool!.query(query, [
                tag,
                cluster.clusterId,
                cluster.label,
                sanitizedSummary,
                cluster.contextWords
            ]);
            return true;
        } catch (error) {
            console.error('Failed to sync cluster:', error);
            return false;
        }
    }

    /**
     * Add label to a node
     */
    async addLabel(nodeId: string, label: string, createdBy?: string): Promise<boolean> {
        if (!this.isReady()) return false;

        try {
            const query = `
                INSERT INTO user_labels (node_id, label, created_by)
                VALUES ($1, $2, $3)
            `;

            await this.pool!.query(query, [nodeId, label, createdBy]);

            // Also update the labels array in tag_nodes
            const updateQuery = `
                UPDATE tag_nodes
                SET labels = array_append(labels, $2),
                    updated_at = NOW()
                WHERE id = $1 AND NOT ($2 = ANY(labels))
            `;

            await this.pool!.query(updateQuery, [nodeId, label]);
            return true;
        } catch (error) {
            console.error('Failed to add label:', error);
            return false;
        }
    }

    /**
     * Add classification to a node
     */
    async addClassification(
        nodeId: string,
        classification: string,
        confidence?: number,
        createdBy?: string
    ): Promise<boolean> {
        if (!this.isReady()) return false;

        try {
            const query = `
                INSERT INTO user_classifications (node_id, classification, confidence, created_by)
                VALUES ($1, $2, $3, $4)
            `;

            await this.pool!.query(query, [nodeId, classification, confidence, createdBy]);

            // Also update the classifications array in tag_nodes
            const updateQuery = `
                UPDATE tag_nodes
                SET classifications = array_append(classifications, $2),
                    updated_at = NOW()
                WHERE id = $1 AND NOT ($2 = ANY(classifications))
            `;

            await this.pool!.query(updateQuery, [nodeId, classification]);
            return true;
        } catch (error) {
            console.error('Failed to add classification:', error);
            return false;
        }
    }

    /**
     * Get all nodes for a specific tag
     */
    async getNodesByTag(tag: string): Promise<PostgresNode[]> {
        if (!this.isReady()) return [];

        try {
            const query = `
                SELECT * FROM tag_nodes
                WHERE tag = $1
                ORDER BY timestamp DESC
            `;

            const result = await this.pool!.query(query, [tag]);
            return result.rows.map(row => this.rowToPostgresNode(row));
        } catch (error) {
            console.error('Failed to get nodes by tag:', error);
            return [];
        }
    }

    /**
     * Convert database row to PostgresNode
     */
    private rowToPostgresNode(row: Record<string, any>): PostgresNode {
        return {
            id: row.id,
            tag: row.tag,
            content: row.content,
            context: row.context,
            file: row.file,
            lineNumber: row.line_number,
            timestamp: row.timestamp,
            occurrenceCount: row.occurrence_count,
            documentCount: row.document_count,
            coherenceScore: row.coherence_score,
            breakthroughScore: row.breakthrough_score,
            metadata: row.metadata,
            labels: row.labels,
            classifications: row.classifications,
            createdAt: new Date(row.created_at).getTime(),
            updatedAt: new Date(row.updated_at).getTime()
        };
    }
}
