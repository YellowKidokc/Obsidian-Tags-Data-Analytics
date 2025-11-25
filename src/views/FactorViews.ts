import {
    BaseDashboardView,
    DashboardViewContext,
    ViewApplicabilityResult
} from './IDashboardView';
import { CoherenceFactor, BreakthroughFactor } from '../types';

/**
 * Coherence Factor View
 *
 * Displays detailed analysis of concept coherence including:
 * - Consistency across contexts
 * - Semantic stability over time
 * - Context cohesion
 * - Definition clarity
 */
export class CoherenceFactorView extends BaseDashboardView {
    constructor() {
        super({
            id: 'coherence-factor',
            name: 'Coherence Factor',
            description: 'Analyzes concept coherence and consistency',
            enabled: true,
            priority: 90,
            settings: {
                minOccurrences: 3 // Need at least 3 occurrences for meaningful analysis
            }
        });
    }

    isApplicable(context: DashboardViewContext): ViewApplicabilityResult {
        if (!context?.dashboard?.statistics) {
            return { applicable: false, score: 0, reason: 'Invalid context' };
        }

        const stats = context.dashboard.statistics;
        const minOccurrences = this.config.settings?.minOccurrences || 3;

        if (stats.totalOccurrences >= minOccurrences) {
            return {
                applicable: true,
                score: 90,
                reason: `Sufficient occurrences for coherence analysis: ${stats.totalOccurrences}`
            };
        }

        return {
            applicable: false,
            score: 0,
            reason: `Too few occurrences for coherence analysis: ${stats.totalOccurrences} < ${minOccurrences}`
        };
    }

    render(context: DashboardViewContext): string {
        const { dashboard } = context;
        const { tag, coherenceFactor } = dashboard;

        if (!coherenceFactor) {
            return this.renderPlaceholder(tag);
        }

        let md = this.generateHeader(tag, dashboard.lastUpdated, 'Coherence Factor');

        // Overall Score with visual indicator
        md += `## Coherence Score\n\n`;
        md += this.renderScoreBar(coherenceFactor.score);
        md += `\n\n`;

        // Detailed Analysis
        md += `## Analysis\n\n`;
        md += coherenceFactor.analysis;
        md += `\n\n`;

        // Component Scores
        md += `## Component Scores\n\n`;
        md += this.renderComponentScores(coherenceFactor);
        md += `\n`;

        // Recommendations
        if (coherenceFactor.recommendations && coherenceFactor.recommendations.length > 0) {
            md += `## Recommendations\n\n`;
            for (const rec of coherenceFactor.recommendations) {
                md += `- ${rec}\n`;
            }
            md += `\n`;
        }

        // Visual Breakdown
        md += `## Score Breakdown\n\n`;
        md += this.renderDetailedBreakdown(coherenceFactor);

        return md;
    }

    private renderPlaceholder(tag: string): string {
        let md = `# ${this.cleanTag(tag)} - Coherence Factor\n\n`;
        md += `> Coherence analysis not yet available\n\n`;
        md += `*Coherence factor will be calculated after sufficient data is collected.*\n\n`;
        md += `**Requirements:**\n`;
        md += `- At least 3 occurrences of the tag\n`;
        md += `- Semantic clustering analysis completed\n`;
        return md;
    }

    private renderScoreBar(score: number): string {
        const percentage = Math.min(Math.max(score, 0), 100);
        const filled = Math.round(percentage / 5); // 20 blocks total
        const empty = 20 - filled;

        let bar = `**Overall Score: ${score.toFixed(1)}/100**\n\n`;
        bar += '`';
        bar += '█'.repeat(filled);
        bar += '░'.repeat(empty);
        bar += '`';
        bar += `  ${this.getScoreRating(score)}\n`;

        return bar;
    }

    private getScoreRating(score: number): string {
        if (score >= 80) return '🟢 Excellent';
        if (score >= 60) return '🟡 Good';
        if (score >= 40) return '🟠 Fair';
        return '🔴 Needs Improvement';
    }

    private renderComponentScores(factor: CoherenceFactor): string {
        let md = `| Component | Score | Status |\n`;
        md += `|-----------|-------|--------|\n`;

        md += `| Consistency | ${factor.consistencyScore.toFixed(1)} | ${this.getScoreEmoji(factor.consistencyScore)} |\n`;
        md += `| Semantic Stability | ${factor.semanticStability.toFixed(1)} | ${this.getScoreEmoji(factor.semanticStability)} |\n`;
        md += `| Context Cohesion | ${factor.contextCohesion.toFixed(1)} | ${this.getScoreEmoji(factor.contextCohesion)} |\n`;
        md += `| Definition Clarity | ${factor.definitionClarity.toFixed(1)} | ${this.getScoreEmoji(factor.definitionClarity)} |\n`;

        return md;
    }

    private getScoreEmoji(score: number): string {
        if (score >= 70) return '✅ Strong';
        if (score >= 40) return '⚠️ Moderate';
        return '❌ Weak';
    }

    private renderDetailedBreakdown(factor: CoherenceFactor): string {
        let md = '';

        md += `### Consistency (${factor.consistencyScore.toFixed(1)}/100)\n`;
        md += `Measures how uniformly the concept is used across different contexts.\n\n`;

        md += `### Semantic Stability (${factor.semanticStability.toFixed(1)}/100)\n`;
        md += `Tracks whether the concept's meaning has remained stable over time.\n\n`;

        md += `### Context Cohesion (${factor.contextCohesion.toFixed(1)}/100)\n`;
        md += `Evaluates how well contexts cluster together, indicating clear usage patterns.\n\n`;

        md += `### Definition Clarity (${factor.definitionClarity.toFixed(1)}/100)\n`;
        md += `Assesses how clearly the concept is defined based on semantic clusters.\n\n`;

        return md;
    }

    protected generateHeader(tag: string, lastUpdated: number, subtitle?: string): string {
        const cleanTag = this.cleanTag(tag);
        let md = `# ${cleanTag}`;
        if (subtitle) {
            md += ` - ${subtitle}`;
        }
        md += `\n\n`;
        md += `> Last updated: ${this.formatDate(lastUpdated)}\n\n`;
        return md;
    }
}

/**
 * Breakthrough Factor View
 *
 * Displays analysis of breakthrough potential including:
 * - Novelty score
 * - Connection density
 * - Emergence patterns
 * - Conceptual leap potential
 * - Impact potential
 */
export class BreakthroughFactorView extends BaseDashboardView {
    constructor() {
        super({
            id: 'breakthrough-factor',
            name: 'Breakthrough Factor',
            description: 'Analyzes innovation and breakthrough potential',
            enabled: true,
            priority: 85,
            settings: {
                minOccurrences: 3
            }
        });
    }

    isApplicable(context: DashboardViewContext): ViewApplicabilityResult {
        if (!context?.dashboard?.statistics) {
            return { applicable: false, score: 0, reason: 'Invalid context' };
        }

        const stats = context.dashboard.statistics;
        const minOccurrences = this.config.settings?.minOccurrences || 3;

        if (stats.totalOccurrences >= minOccurrences) {
            return {
                applicable: true,
                score: 85,
                reason: `Sufficient data for breakthrough analysis: ${stats.totalOccurrences}`
            };
        }

        return {
            applicable: false,
            score: 0,
            reason: `Too few occurrences for breakthrough analysis: ${stats.totalOccurrences} < ${minOccurrences}`
        };
    }

    render(context: DashboardViewContext): string {
        const { dashboard } = context;
        const { tag, breakthroughFactor } = dashboard;

        if (!breakthroughFactor) {
            return this.renderPlaceholder(tag);
        }

        let md = this.generateHeader(tag, dashboard.lastUpdated, 'Breakthrough Factor');

        // Overall Score with visual indicator
        md += `## Breakthrough Potential\n\n`;
        md += this.renderScoreBar(breakthroughFactor.score);
        md += `\n\n`;

        // Analysis
        md += `## Analysis\n\n`;
        md += breakthroughFactor.analysis;
        md += `\n\n`;

        // Component Scores
        md += `## Component Scores\n\n`;
        md += this.renderComponentScores(breakthroughFactor);
        md += `\n`;

        // Key Insights
        if (breakthroughFactor.keyInsights && breakthroughFactor.keyInsights.length > 0) {
            md += `## Key Insights\n\n`;
            for (const insight of breakthroughFactor.keyInsights) {
                md += `- ${insight}\n`;
            }
            md += `\n`;
        }

        // Visual Breakdown
        md += `## Factor Breakdown\n\n`;
        md += this.renderDetailedBreakdown(breakthroughFactor);

        // Innovation Potential Matrix
        md += `## Innovation Potential\n\n`;
        md += this.renderInnovationMatrix(breakthroughFactor);

        return md;
    }

    private renderPlaceholder(tag: string): string {
        let md = `# ${this.cleanTag(tag)} - Breakthrough Factor\n\n`;
        md += `> Breakthrough analysis not yet available\n\n`;
        md += `*Breakthrough factor will be calculated after sufficient data is collected.*\n\n`;
        md += `**Requirements:**\n`;
        md += `- At least 3 occurrences of the tag\n`;
        md += `- Relationship analysis completed\n`;
        return md;
    }

    private renderScoreBar(score: number): string {
        const percentage = Math.min(Math.max(score, 0), 100);
        const filled = Math.round(percentage / 5);
        const empty = 20 - filled;

        let bar = `**Overall Score: ${score.toFixed(1)}/100**\n\n`;
        bar += '`';
        bar += '█'.repeat(filled);
        bar += '░'.repeat(empty);
        bar += '`';
        bar += `  ${this.getScoreRating(score)}\n`;

        return bar;
    }

    private getScoreRating(score: number): string {
        if (score >= 70) return '💡 High Breakthrough Potential';
        if (score >= 50) return '⚡ Moderate Innovation';
        if (score >= 30) return '🔍 Emerging Concept';
        return '📚 Foundational Concept';
    }

    private renderComponentScores(factor: BreakthroughFactor): string {
        let md = `| Factor | Score | Interpretation |\n`;
        md += `|--------|-------|----------------|\n`;

        md += `| Novelty | ${factor.noveltyScore.toFixed(1)} | ${this.getFactorStatus(factor.noveltyScore)} |\n`;
        md += `| Connection Density | ${factor.connectionDensity.toFixed(1)} | ${this.getFactorStatus(factor.connectionDensity)} |\n`;
        md += `| Emergence Pattern | ${factor.emergencePattern.toFixed(1)} | ${this.getFactorStatus(factor.emergencePattern)} |\n`;
        md += `| Conceptual Leap | ${factor.conceptualLeap.toFixed(1)} | ${this.getFactorStatus(factor.conceptualLeap)} |\n`;
        md += `| Impact Potential | ${factor.impactPotential.toFixed(1)} | ${this.getFactorStatus(factor.impactPotential)} |\n`;

        return md;
    }

    private getFactorStatus(score: number): string {
        if (score >= 70) return '🌟 Exceptional';
        if (score >= 50) return '✨ Strong';
        if (score >= 30) return '💫 Developing';
        return '🔆 Foundational';
    }

    private renderDetailedBreakdown(factor: BreakthroughFactor): string {
        let md = '';

        md += `### Novelty (${factor.noveltyScore.toFixed(1)}/100)\n`;
        md += `How unique and novel this concept is within your knowledge base.\n\n`;

        md += `### Connection Density (${factor.connectionDensity.toFixed(1)}/100)\n`;
        md += `Degree of integration with other concepts in your notes.\n\n`;

        md += `### Emergence Pattern (${factor.emergencePattern.toFixed(1)}/100)\n`;
        md += `How this concept has emerged and evolved over time.\n\n`;

        md += `### Conceptual Leap (${factor.conceptualLeap.toFixed(1)}/100)\n`;
        md += `Potential for bridging different domains and creating new insights.\n\n`;

        md += `### Impact Potential (${factor.impactPotential.toFixed(1)}/100)\n`;
        md += `Predicted influence on future thinking and note-taking.\n\n`;

        return md;
    }

    private renderInnovationMatrix(factor: BreakthroughFactor): string {
        let md = '';

        const novelty = factor.noveltyScore >= 50 ? 'High' : 'Low';
        const connection = factor.connectionDensity >= 50 ? 'High' : 'Low';

        md += `**Innovation Profile:** ${novelty} Novelty × ${connection} Connection\n\n`;

        if (novelty === 'High' && connection === 'High') {
            md += `🚀 **Breakthrough Candidate** - This concept shows high novelty and strong connections, suggesting significant breakthrough potential.\n\n`;
        } else if (novelty === 'High' && connection === 'Low') {
            md += `💎 **Emerging Concept** - Novel idea that may need more integration with existing knowledge.\n\n`;
        } else if (novelty === 'Low' && connection === 'High') {
            md += `🔗 **Central Concept** - Well-established and highly connected concept serving as a knowledge hub.\n\n`;
        } else {
            md += `📖 **Foundational Concept** - Provides stable grounding for other ideas.\n\n`;
        }

        return md;
    }

    protected generateHeader(tag: string, lastUpdated: number, subtitle?: string): string {
        const cleanTag = this.cleanTag(tag);
        let md = `# ${cleanTag}`;
        if (subtitle) {
            md += ` - ${subtitle}`;
        }
        md += `\n\n`;
        md += `> Last updated: ${this.formatDate(lastUpdated)}\n\n`;
        return md;
    }
}
