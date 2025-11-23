import {
    ConceptDashboard,
    TagStatistics,
    SemanticCluster,
    Definition,
    ConceptRelation,
    Snippet
} from '../types';

export class DashboardGenerator {
    /**
     * Generate markdown content for a concept dashboard
     */
    generateDashboard(dashboard: ConceptDashboard): string {
        const tier = dashboard.statistics.frequencyTier;

        switch (tier) {
            case 'high':
                return this.generateHighFrequencyDashboard(dashboard);
            case 'medium':
                return this.generateMediumFrequencyDashboard(dashboard);
            case 'low':
                return this.generateLowFrequencyDashboard(dashboard);
            default:
                return this.generateHighFrequencyDashboard(dashboard);
        }
    }

    /**
     * Full dashboard for high-frequency concepts (≥20 mentions)
     */
    private generateHighFrequencyDashboard(dashboard: ConceptDashboard): string {
        const { tag, statistics, meanings, definitions, relations, keyPassages, openQuestions, furtherReading, timeline } = dashboard;
        const cleanTag = tag.replace('#', '');

        let md = `# ${cleanTag}\n\n`;
        md += `> Last updated: ${new Date(dashboard.lastUpdated).toLocaleDateString()}\n\n`;
        md += `---\n\n`;

        // 1. Snapshot
        md += `## 1. Snapshot\n\n`;
        md += this.generateSnapshot(statistics, relations);

        // 2. Meanings in corpus
        if (meanings.length > 0) {
            md += `\n---\n\n`;
            md += `## 2. Meanings in my corpus\n\n`;
            md += this.generateMeanings(meanings);
        }

        // 3. Definitions
        md += `\n---\n\n`;
        md += `## 3. Definitions\n\n`;
        md += this.generateDefinitions(definitions, cleanTag);

        // 4. Relations to other concepts
        if (relations.length > 0) {
            md += `\n---\n\n`;
            md += `## 4. Relations to other concepts\n\n`;
            md += this.generateRelations(relations);
        }

        // 5. Key passages
        if (keyPassages.length > 0) {
            md += `\n---\n\n`;
            md += `## 5. Key passages ("greatest hits")\n\n`;
            md += this.generateKeyPassages(keyPassages);
        }

        // 6. Open questions
        if (openQuestions.length > 0) {
            md += `\n---\n\n`;
            md += `## 6. Open questions / tensions\n\n`;
            md += this.generateOpenQuestions(openQuestions);
        }

        // 7. Further reading
        md += `\n---\n\n`;
        md += `## 7. Further reading / external anchors\n\n`;
        md += this.generateFurtherReading(furtherReading);

        // 8. Timeline (bonus for high frequency)
        if (timeline) {
            md += `\n---\n\n`;
            md += `## 8. Timeline\n\n`;
            md += this.generateTimeline(timeline);
        }

        return md;
    }

    /**
     * Moderate dashboard for medium-frequency concepts (5-19 mentions)
     */
    private generateMediumFrequencyDashboard(dashboard: ConceptDashboard): string {
        const { tag, statistics, meanings, definitions, relations, keyPassages, openQuestions } = dashboard;
        const cleanTag = tag.replace('#', '');

        let md = `# ${cleanTag}\n\n`;
        md += `> Last updated: ${new Date(dashboard.lastUpdated).toLocaleDateString()}\n\n`;
        md += `---\n\n`;

        // Snapshot
        md += `## Snapshot\n\n`;
        md += this.generateSnapshot(statistics, relations);

        // Meanings
        if (meanings.length > 0) {
            md += `\n---\n\n`;
            md += `## Meanings and contexts\n\n`;
            md += this.generateMeanings(meanings);
        }

        // Key passages
        if (keyPassages.length > 0) {
            md += `\n---\n\n`;
            md += `## Key passages\n\n`;
            md += this.generateKeyPassages(keyPassages);
        }

        // Relations
        if (relations.length > 0) {
            md += `\n---\n\n`;
            md += `## Related concepts\n\n`;
            md += this.generateRelations(relations);
        }

        // Questions
        if (openQuestions.length > 0) {
            md += `\n---\n\n`;
            md += `## Open questions\n\n`;
            md += this.generateOpenQuestions(openQuestions);
        }

        // Working definition
        if (definitions.working.length > 0) {
            md += `\n---\n\n`;
            md += `## Working definition\n\n`;
            md += this.generateWorkingDefinitions(definitions.working);
        }

        return md;
    }

    /**
     * Skeleton dashboard for low-frequency concepts (1-4 mentions)
     */
    private generateLowFrequencyDashboard(dashboard: ConceptDashboard): string {
        const { tag, statistics, keyPassages, relations } = dashboard;
        const cleanTag = tag.replace('#', '');

        let md = `# ${cleanTag}\n\n`;
        md += `> Low-frequency concept • ${statistics.totalOccurrences} occurrence(s) • Last updated: ${new Date(dashboard.lastUpdated).toLocaleDateString()}\n\n`;

        // Basic stats
        md += `**Occurrences:** ${statistics.totalOccurrences}  \n`;
        md += `**Documents:** ${statistics.documentCount}  \n`;
        md += `**First seen:** [[${statistics.firstAppearance.file}]]  \n`;
        md += `**Last seen:** [[${statistics.lastAppearance.file}]]  \n\n`;

        // Quote(s)
        if (keyPassages.length > 0) {
            md += `## Key quote(s)\n\n`;
            for (const passage of keyPassages) {
                md += `> ${passage.text}\n\n`;
                md += `— [[${passage.file}#L${passage.lineNumber}]]\n\n`;
            }
        }

        // Related concepts
        if (relations.length > 0) {
            md += `## Related concepts\n\n`;
            for (const rel of relations.slice(0, 5)) {
                md += `- [[${rel.relatedTag.replace('#', '')}]] (${rel.relationshipType})\n`;
            }
            md += `\n`;
        }

        // Placeholder for working definition
        md += `## Working definition\n\n`;
        md += `*To be developed as more instances are found*\n\n`;

        return md;
    }

    // ===== Helper methods for generating sections =====

    private generateSnapshot(stats: TagStatistics, relations: ConceptRelation[]): string {
        let md = `- **Total occurrences in corpus:** ${stats.totalOccurrences}\n`;
        md += `- **Documents using it:** ${stats.documentCount}\n`;
        md += `- **First appearance:** [[${stats.firstAppearance.file}]]`;
        if (stats.firstAppearance.date) {
            md += ` (${new Date(stats.firstAppearance.date).toLocaleDateString()})`;
        }
        md += `\n`;
        md += `- **Last appearance:** [[${stats.lastAppearance.file}]]`;
        if (stats.lastAppearance.date) {
            md += ` (${new Date(stats.lastAppearance.date).toLocaleDateString()})`;
        }
        md += `\n`;

        // Top co-occurring concepts
        if (relations.length > 0) {
            const coOccurring = relations
                .filter(r => r.relationshipType === 'co-occurrence')
                .slice(0, 6);

            if (coOccurring.length > 0) {
                md += `- **Top co-occurring concepts:**\n`;
                const conceptList = coOccurring
                    .map(r => `${r.relatedTag.replace('#', '')} (${Math.round(r.strength)})`)
                    .join(', ');
                md += `  - ${conceptList}\n`;
            }
        }

        return md;
    }

    private generateMeanings(clusters: SemanticCluster[]): string {
        let md = '';

        for (let i = 0; i < clusters.length; i++) {
            const cluster = clusters[i];
            md += `### ${i + 1}. ${cluster.label}\n\n`;

            if (cluster.contextWords.length > 0) {
                md += `**Typical context words:** ${cluster.contextWords.join(', ')}\n\n`;
            }

            md += `**Summary:** ${cluster.summary}\n\n`;

            if (cluster.representativeSnippets.length > 0) {
                md += `**Representative snippets:**\n\n`;
                for (const snippet of cluster.representativeSnippets.slice(0, 3)) {
                    md += `- "${snippet.text}" — [[${snippet.file}`;
                    if (snippet.lineNumber) {
                        md += `#L${snippet.lineNumber}`;
                    }
                    md += `]]\n`;
                }
                md += `\n`;
            }
        }

        return md;
    }

    private generateDefinitions(definitions: ConceptDashboard['definitions'], tag: string): string {
        let md = '';

        // From corpus
        if (definitions.fromCorpus.length > 0) {
            md += `### 3.1 Definitions from my sources\n\n`;
            for (const def of definitions.fromCorpus) {
                md += `- "${def.text}"`;
                if (def.file) {
                    md += ` — [[${def.file}]]`;
                }
                if (def.author) {
                    md += ` (${def.author})`;
                }
                md += `\n`;
            }
            md += `\n`;
        }

        // External
        if (definitions.external.length > 0) {
            md += `### 3.2 External definitions\n\n`;
            for (const def of definitions.external) {
                md += `- **${def.source}:** ${def.text}\n`;
                if (def.url) {
                    md += `  - [Source](${def.url})\n`;
                }
            }
            md += `\n`;
        }

        // Working definitions
        if (definitions.working.length > 0) {
            md += `### 3.3 My working definitions\n\n`;
            md += this.generateWorkingDefinitions(definitions.working);
        } else {
            md += `### 3.3 My working definitions\n\n`;
            md += `*Define ${tag} in your own words here*\n\n`;
        }

        return md;
    }

    private generateWorkingDefinitions(definitions: Definition[]): string {
        let md = '';
        for (const def of definitions) {
            md += `- **${def.text}**\n`;
        }
        return md + '\n';
    }

    private generateRelations(relations: ConceptRelation[]): string {
        let md = '';

        for (const rel of relations) {
            md += `### ${rel.relatedTag.replace('#', '')}\n\n`;
            md += `- **Relationship:** ${rel.description}\n`;
            md += `- **Strength:** ${Math.round(rel.strength * 100)}%\n`;
            md += `- **Type:** ${rel.relationshipType}\n`;

            if (rel.keyPassages.length > 0) {
                md += `- **Key passages:**\n`;
                for (const passage of rel.keyPassages.slice(0, 2)) {
                    md += `  - [[${passage.file}`;
                    if (passage.lineNumber) {
                        md += `#L${passage.lineNumber}`;
                    }
                    md += `]]\n`;
                }
            }

            md += `\n`;
        }

        return md;
    }

    private generateKeyPassages(passages: Snippet[]): string {
        let md = '';

        for (const passage of passages) {
            md += `> ${passage.text}\n\n`;
            md += `— [[${passage.file}`;
            if (passage.lineNumber) {
                md += `#L${passage.lineNumber}`;
            }
            md += `]]\n\n`;
        }

        return md;
    }

    private generateOpenQuestions(questions: OpenQuestion[]): string {
        let md = '';

        for (const q of questions) {
            md += `- ${q.question}\n`;
            if (q.reason) {
                md += `  - *${q.reason}*\n`;
            }
        }

        return md + '\n';
    }

    private generateFurtherReading(reading: FurtherReading[]): string {
        if (reading.length === 0) {
            return `*Add external resources here as you discover them*\n`;
        }

        let md = '';
        for (const item of reading) {
            md += `- `;
            if (item.url) {
                md += `[${item.title}](${item.url})`;
            } else {
                md += item.title;
            }
            md += ` — ${item.relevance}\n`;
        }

        return md + '\n';
    }

    private generateTimeline(timeline: TimelineData): string {
        let md = `First seen: ${new Date(timeline.firstSeen).toLocaleDateString()}  \n`;
        md += `Last seen: ${new Date(timeline.lastSeen).toLocaleDateString()}  \n\n`;

        if (timeline.dataPoints.length > 0) {
            md += `### Usage over time\n\n`;
            md += `| Date | Occurrences |\n`;
            md += `|------|-------------|\n`;

            for (const point of timeline.dataPoints) {
                md += `| ${new Date(point.date).toLocaleDateString()} | ${point.count} |\n`;
            }
            md += `\n`;
        }

        return md;
    }

    /**
     * Get filename for dashboard
     */
    getDashboardFilename(tag: string, folder: string): string {
        const cleanTag = tag.replace('#', '').replace(/\//g, '-');
        return `${folder}/${cleanTag}.md`;
    }
}
