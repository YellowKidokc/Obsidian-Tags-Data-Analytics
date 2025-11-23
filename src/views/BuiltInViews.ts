import {
    BaseDashboardView,
    DashboardViewContext,
    ViewApplicabilityResult,
    DashboardViewConfig
} from './IDashboardView';
import {
    ConceptDashboard,
    SemanticCluster,
    Definition,
    ConceptRelation,
    Snippet,
    OpenQuestion,
    FurtherReading,
    TimelineData,
    TagStatistics
} from '../types';

/**
 * High-Frequency Dashboard View
 *
 * Full 8-section dashboard for concepts with ≥20 mentions
 * Includes all features: clustering, definitions, relations, timeline
 */
export class HighFrequencyView extends BaseDashboardView {
    constructor() {
        super({
            id: 'high-frequency',
            name: 'High-Frequency Dashboard',
            description: 'Full 8-section dashboard for frequently used concepts (≥20 occurrences)',
            enabled: true,
            priority: 100,
            settings: {
                minOccurrences: 20,
                includeSections: [
                    'snapshot',
                    'meanings',
                    'definitions',
                    'relations',
                    'keyPassages',
                    'openQuestions',
                    'furtherReading',
                    'timeline'
                ]
            }
        });
    }

    isApplicable(context: DashboardViewContext): ViewApplicabilityResult {
        if (!context?.dashboard?.statistics) {
            return { applicable: false, score: 0, reason: 'Invalid context' };
        }

        const stats = context.dashboard.statistics;
        const minOccurrences = this.config.settings?.minOccurrences || 20;

        if (stats.frequencyTier === 'high' || stats.totalOccurrences >= minOccurrences) {
            return {
                applicable: true,
                score: 100,
                reason: `High frequency: ${stats.totalOccurrences} occurrences`
            };
        }

        return {
            applicable: false,
            score: 0,
            reason: `Too few occurrences: ${stats.totalOccurrences} < ${minOccurrences}`
        };
    }

    render(context: DashboardViewContext): string {
        const { dashboard } = context;
        const { tag, statistics, meanings, definitions, relations, keyPassages, openQuestions, furtherReading, timeline } = dashboard;

        let md = this.generateHeader(tag, dashboard.lastUpdated);

        // 1. Snapshot
        md += `## 1. Snapshot\n\n`;
        md += this.generateSnapshot(statistics, relations);

        // 2. Meanings in corpus
        if (meanings && meanings.length > 0) {
            md += `\n---\n\n`;
            md += `## 2. Meanings in my corpus\n\n`;
            md += this.generateMeanings(meanings);
        }

        // 3. Definitions
        md += `\n---\n\n`;
        md += `## 3. Definitions\n\n`;
        md += this.generateDefinitions(definitions, this.cleanTag(tag));

        // 4. Relations to other concepts
        if (relations && relations.length > 0) {
            md += `\n---\n\n`;
            md += `## 4. Relations to other concepts\n\n`;
            md += this.generateRelations(relations);
        }

        // 5. Key passages
        if (keyPassages && keyPassages.length > 0) {
            md += `\n---\n\n`;
            md += `## 5. Key passages ("greatest hits")\n\n`;
            md += this.generateKeyPassages(keyPassages);
        }

        // 6. Open questions
        if (openQuestions && openQuestions.length > 0) {
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

    // Section generators
    private generateSnapshot(stats: TagStatistics, relations: ConceptRelation[]): string {
        let md = `- **Total occurrences in corpus:** ${stats.totalOccurrences}\n`;
        md += `- **Documents using it:** ${stats.documentCount}\n`;
        md += `- **First appearance:** ${this.formatFileRef(stats.firstAppearance.file)}`;
        if (stats.firstAppearance.date) {
            md += ` (${this.formatDate(stats.firstAppearance.date)})`;
        }
        md += `\n`;
        md += `- **Last appearance:** ${this.formatFileRef(stats.lastAppearance.file)}`;
        if (stats.lastAppearance.date) {
            md += ` (${this.formatDate(stats.lastAppearance.date)})`;
        }
        md += `\n`;

        if (relations && relations.length > 0) {
            const coOccurring = relations
                .filter(r => r.relationshipType === 'co-occurrence')
                .slice(0, 6);

            if (coOccurring.length > 0) {
                md += `- **Top co-occurring concepts:**\n`;
                const conceptList = coOccurring
                    .map(r => `${this.cleanTag(r.relatedTag)} (${Math.round(r.strength)})`)
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

            if (cluster.contextWords && cluster.contextWords.length > 0) {
                md += `**Typical context words:** ${cluster.contextWords.join(', ')}\n\n`;
            }

            md += `**Summary:** ${cluster.summary}\n\n`;

            if (cluster.representativeSnippets && cluster.representativeSnippets.length > 0) {
                md += `**Representative snippets:**\n\n`;
                for (const snippet of cluster.representativeSnippets.slice(0, 3)) {
                    md += `- "${snippet.text}" — ${this.formatFileRef(snippet.file, snippet.lineNumber)}\n`;
                }
                md += `\n`;
            }
        }

        return md;
    }

    private generateDefinitions(definitions: ConceptDashboard['definitions'], tag: string): string {
        let md = '';

        // From corpus
        if (definitions.fromCorpus && definitions.fromCorpus.length > 0) {
            md += `### 3.1 Definitions from my sources\n\n`;
            for (const def of definitions.fromCorpus) {
                md += `- "${def.text}"`;
                if (def.file) {
                    md += ` — ${this.formatFileRef(def.file)}`;
                }
                if (def.author) {
                    md += ` (${def.author})`;
                }
                md += `\n`;
            }
            md += `\n`;
        }

        // External
        if (definitions.external && definitions.external.length > 0) {
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
        if (definitions.working && definitions.working.length > 0) {
            md += `### 3.3 My working definitions\n\n`;
            for (const def of definitions.working) {
                md += `- **${def.text}**\n`;
            }
            md += `\n`;
        } else {
            md += `### 3.3 My working definitions\n\n`;
            md += `*Define ${tag} in your own words here*\n\n`;
        }

        return md;
    }

    private generateRelations(relations: ConceptRelation[]): string {
        let md = '';

        for (const rel of relations) {
            md += `### ${this.cleanTag(rel.relatedTag)}\n\n`;
            md += `- **Relationship:** ${rel.description}\n`;
            md += `- **Strength:** ${Math.round(rel.strength * 100)}%\n`;
            md += `- **Type:** ${rel.relationshipType}\n`;

            if (rel.keyPassages && rel.keyPassages.length > 0) {
                md += `- **Key passages:**\n`;
                for (const passage of rel.keyPassages.slice(0, 2)) {
                    md += `  - ${this.formatFileRef(passage.file, passage.lineNumber)}\n`;
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
            md += `— ${this.formatFileRef(passage.file, passage.lineNumber)}\n\n`;
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
        if (!reading || reading.length === 0) {
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
        let md = `First seen: ${this.formatDate(timeline.firstSeen)}  \n`;
        md += `Last seen: ${this.formatDate(timeline.lastSeen)}  \n\n`;

        if (timeline.dataPoints && timeline.dataPoints.length > 0) {
            md += `### Usage over time\n\n`;
            md += `| Date | Occurrences |\n`;
            md += `|------|-------------|\n`;

            for (const point of timeline.dataPoints) {
                md += `| ${this.formatDate(point.date)} | ${point.count} |\n`;
            }
            md += `\n`;
        }

        return md;
    }
}

/**
 * Medium-Frequency Dashboard View
 *
 * Moderate 5-section dashboard for concepts with 5-19 mentions
 */
export class MediumFrequencyView extends BaseDashboardView {
    constructor() {
        super({
            id: 'medium-frequency',
            name: 'Medium-Frequency Dashboard',
            description: 'Moderate dashboard for medium-use concepts (5-19 occurrences)',
            enabled: true,
            priority: 75,
            settings: {
                minOccurrences: 5,
                maxOccurrences: 19
            }
        });
    }

    isApplicable(context: DashboardViewContext): ViewApplicabilityResult {
        if (!context?.dashboard?.statistics) {
            return { applicable: false, score: 0, reason: 'Invalid context' };
        }

        const stats = context.dashboard.statistics;
        const min = this.config.settings?.minOccurrences || 5;
        const max = this.config.settings?.maxOccurrences || 19;

        if (stats.frequencyTier === 'medium' ||
            (stats.totalOccurrences >= min && stats.totalOccurrences <= max)) {
            return {
                applicable: true,
                score: 75,
                reason: `Medium frequency: ${stats.totalOccurrences} occurrences`
            };
        }

        return {
            applicable: false,
            score: 0,
            reason: `Occurrences ${stats.totalOccurrences} outside range ${min}-${max}`
        };
    }

    render(context: DashboardViewContext): string {
        const { dashboard } = context;
        const { tag, statistics, meanings, definitions, relations, keyPassages, openQuestions } = dashboard;

        let md = this.generateHeader(tag, dashboard.lastUpdated);

        // Snapshot
        md += `## Snapshot\n\n`;
        md += this.generateSnapshot(statistics, relations);

        // Meanings
        if (meanings && meanings.length > 0) {
            md += `\n---\n\n`;
            md += `## Meanings and contexts\n\n`;
            md += this.generateMeanings(meanings);
        }

        // Key passages
        if (keyPassages && keyPassages.length > 0) {
            md += `\n---\n\n`;
            md += `## Key passages\n\n`;
            md += this.generateKeyPassages(keyPassages);
        }

        // Relations
        if (relations && relations.length > 0) {
            md += `\n---\n\n`;
            md += `## Related concepts\n\n`;
            md += this.generateRelations(relations);
        }

        // Questions
        if (openQuestions && openQuestions.length > 0) {
            md += `\n---\n\n`;
            md += `## Open questions\n\n`;
            md += this.generateOpenQuestions(openQuestions);
        }

        // Working definition
        if (definitions.working && definitions.working.length > 0) {
            md += `\n---\n\n`;
            md += `## Working definition\n\n`;
            for (const def of definitions.working) {
                md += `- **${def.text}**\n`;
            }
            md += `\n`;
        }

        return md;
    }

    private generateSnapshot(stats: TagStatistics, relations: ConceptRelation[]): string {
        let md = `- **Total occurrences:** ${stats.totalOccurrences}\n`;
        md += `- **Documents:** ${stats.documentCount}\n`;
        md += `- **First:** ${this.formatFileRef(stats.firstAppearance.file)}\n`;
        md += `- **Last:** ${this.formatFileRef(stats.lastAppearance.file)}\n`;

        if (relations && relations.length > 0) {
            const top = relations.slice(0, 5);
            md += `- **Related:** ${top.map(r => this.cleanTag(r.relatedTag)).join(', ')}\n`;
        }

        return md;
    }

    private generateMeanings(clusters: SemanticCluster[]): string {
        let md = '';
        for (const cluster of clusters) {
            md += `### ${cluster.label}\n\n`;
            md += `${cluster.summary}\n\n`;
            if (cluster.representativeSnippets && cluster.representativeSnippets.length > 0) {
                for (const snippet of cluster.representativeSnippets.slice(0, 2)) {
                    md += `- "${snippet.text}"\n`;
                }
                md += `\n`;
            }
        }
        return md;
    }

    private generateKeyPassages(passages: Snippet[]): string {
        let md = '';
        for (const passage of passages) {
            md += `> ${passage.text}\n\n`;
            md += `— ${this.formatFileRef(passage.file, passage.lineNumber)}\n\n`;
        }
        return md;
    }

    private generateRelations(relations: ConceptRelation[]): string {
        let md = '';
        for (const rel of relations.slice(0, 5)) {
            md += `- **${this.cleanTag(rel.relatedTag)}** — ${rel.description}\n`;
        }
        return md + '\n';
    }

    private generateOpenQuestions(questions: OpenQuestion[]): string {
        let md = '';
        for (const q of questions) {
            md += `- ${q.question}\n`;
        }
        return md + '\n';
    }
}

/**
 * Low-Frequency Dashboard View
 *
 * Skeleton dashboard for concepts with 1-4 mentions
 */
export class LowFrequencyView extends BaseDashboardView {
    constructor() {
        super({
            id: 'low-frequency',
            name: 'Low-Frequency Dashboard',
            description: 'Skeleton note for rarely used concepts (1-4 occurrences)',
            enabled: true,
            priority: 50,
            settings: {
                maxOccurrences: 4
            }
        });
    }

    isApplicable(context: DashboardViewContext): ViewApplicabilityResult {
        if (!context?.dashboard?.statistics) {
            return { applicable: false, score: 0, reason: 'Invalid context' };
        }

        const stats = context.dashboard.statistics;
        const max = this.config.settings?.maxOccurrences || 4;

        if (stats.frequencyTier === 'low' || stats.totalOccurrences <= max) {
            return {
                applicable: true,
                score: 50,
                reason: `Low frequency: ${stats.totalOccurrences} occurrences`
            };
        }

        return {
            applicable: false,
            score: 0,
            reason: `Too many occurrences: ${stats.totalOccurrences} > ${max}`
        };
    }

    render(context: DashboardViewContext): string {
        const { dashboard } = context;
        const { tag, statistics, keyPassages, relations } = dashboard;
        const cleanTag = this.cleanTag(tag);

        let md = `# ${cleanTag}\n\n`;
        md += `> Low-frequency concept • ${statistics.totalOccurrences} occurrence(s) • Last updated: ${this.formatDate(dashboard.lastUpdated)}\n\n`;

        // Basic stats
        md += `**Occurrences:** ${statistics.totalOccurrences}  \n`;
        md += `**Documents:** ${statistics.documentCount}  \n`;
        md += `**First seen:** ${this.formatFileRef(statistics.firstAppearance.file)}  \n`;
        md += `**Last seen:** ${this.formatFileRef(statistics.lastAppearance.file)}  \n\n`;

        // Quote(s)
        if (keyPassages && keyPassages.length > 0) {
            md += `## Key quote(s)\n\n`;
            for (const passage of keyPassages) {
                md += `> ${passage.text}\n\n`;
                md += `— ${this.formatFileRef(passage.file, passage.lineNumber)}\n\n`;
            }
        }

        // Related concepts
        if (relations && relations.length > 0) {
            md += `## Related concepts\n\n`;
            for (const rel of relations.slice(0, 5)) {
                md += `- [[${this.cleanTag(rel.relatedTag)}]] (${rel.relationshipType})\n`;
            }
            md += `\n`;
        }

        // Placeholder for working definition
        md += `## Working definition\n\n`;
        md += `*To be developed as more instances are found*\n\n`;

        return md;
    }
}

/**
 * Register all built-in views
 */
export function registerBuiltInViews(registry: any): void {
    registry.register(new HighFrequencyView());
    registry.register(new MediumFrequencyView());
    registry.register(new LowFrequencyView());
}
