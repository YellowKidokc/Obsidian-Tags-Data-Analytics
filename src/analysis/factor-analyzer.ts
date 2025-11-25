import {
    TagOccurrence,
    TagStatistics,
    SemanticCluster,
    ConceptRelation,
    CoherenceFactor,
    BreakthroughFactor
} from '../types';

/**
 * Analyzer for computing coherence and breakthrough factors
 */
export class FactorAnalyzer {
    /**
     * Calculate coherence factor for a concept
     * Measures how consistent and well-defined the concept is
     */
    calculateCoherenceFactor(
        tag: string,
        occurrences: TagOccurrence[],
        clusters: SemanticCluster[],
        statistics: TagStatistics
    ): CoherenceFactor {
        // 1. Consistency Score: How consistent is the usage across contexts
        const consistencyScore = this.calculateConsistencyScore(occurrences, clusters);

        // 2. Semantic Stability: How stable is the meaning over time
        const semanticStability = this.calculateSemanticStability(occurrences);

        // 3. Context Cohesion: How well do contexts cluster together
        const contextCohesion = this.calculateContextCohesion(clusters, occurrences.length);

        // 4. Definition Clarity: How clearly defined is the concept
        const definitionClarity = this.calculateDefinitionClarity(clusters);

        // Overall coherence score
        const score = (
            consistencyScore * 0.3 +
            semanticStability * 0.25 +
            contextCohesion * 0.25 +
            definitionClarity * 0.2
        );

        // Generate analysis text
        const analysis = this.generateCoherenceAnalysis(
            tag,
            score,
            consistencyScore,
            semanticStability,
            contextCohesion,
            definitionClarity
        );

        // Generate recommendations
        const recommendations = this.generateCoherenceRecommendations(
            score,
            consistencyScore,
            semanticStability,
            contextCohesion,
            definitionClarity
        );

        return {
            score: Math.round(score * 100) / 100,
            consistencyScore: Math.round(consistencyScore * 100) / 100,
            semanticStability: Math.round(semanticStability * 100) / 100,
            contextCohesion: Math.round(contextCohesion * 100) / 100,
            definitionClarity: Math.round(definitionClarity * 100) / 100,
            analysis,
            recommendations
        };
    }

    /**
     * Calculate breakthrough factor for a concept
     * Measures innovation potential and conceptual significance
     */
    calculateBreakthroughFactor(
        tag: string,
        occurrences: TagOccurrence[],
        relations: ConceptRelation[],
        statistics: TagStatistics,
        allTagsCount: number
    ): BreakthroughFactor {
        // 1. Novelty Score: How novel/unique is this concept
        const noveltyScore = this.calculateNoveltyScore(statistics, allTagsCount);

        // 2. Connection Density: How well connected to other concepts
        const connectionDensity = this.calculateConnectionDensity(relations, allTagsCount);

        // 3. Emergence Pattern: Pattern of emergence over time
        const emergencePattern = this.calculateEmergencePattern(occurrences);

        // 4. Conceptual Leap: Degree of conceptual innovation
        const conceptualLeap = this.calculateConceptualLeap(relations, statistics);

        // 5. Impact Potential: Potential for future impact
        const impactPotential = this.calculateImpactPotential(
            statistics,
            relations,
            occurrences
        );

        // Overall breakthrough score
        const score = (
            noveltyScore * 0.2 +
            connectionDensity * 0.2 +
            emergencePattern * 0.2 +
            conceptualLeap * 0.2 +
            impactPotential * 0.2
        );

        // Generate analysis
        const analysis = this.generateBreakthroughAnalysis(
            tag,
            score,
            noveltyScore,
            connectionDensity,
            emergencePattern,
            conceptualLeap,
            impactPotential
        );

        // Generate key insights
        const keyInsights = this.generateBreakthroughInsights(
            tag,
            score,
            noveltyScore,
            connectionDensity,
            emergencePattern,
            conceptualLeap,
            impactPotential
        );

        return {
            score: Math.round(score * 100) / 100,
            noveltyScore: Math.round(noveltyScore * 100) / 100,
            connectionDensity: Math.round(connectionDensity * 100) / 100,
            emergencePattern: Math.round(emergencePattern * 100) / 100,
            conceptualLeap: Math.round(conceptualLeap * 100) / 100,
            impactPotential: Math.round(impactPotential * 100) / 100,
            analysis,
            keyInsights
        };
    }

    // ==================== Coherence Factor Calculations ====================

    private calculateConsistencyScore(
        occurrences: TagOccurrence[],
        clusters: SemanticCluster[]
    ): number {
        if (clusters.length === 0) return 50;

        // If concept is used in very similar ways (few clusters), consistency is high
        // If concept has many different meanings (many clusters), consistency is low
        const clusterRatio = Math.min(clusters.length / Math.max(occurrences.length / 5, 1), 1);
        return 100 * (1 - clusterRatio * 0.7);
    }

    private calculateSemanticStability(occurrences: TagOccurrence[]): number {
        if (occurrences.length < 2) return 50;

        // Check if usage context is stable over time
        const sorted = [...occurrences].sort((a, b) =>
            (a.timestamp || 0) - (b.timestamp || 0)
        );

        // Compare early vs late contexts for similarity
        const earlyContexts = sorted.slice(0, Math.ceil(sorted.length / 3))
            .map(o => o.context.toLowerCase());
        const lateContexts = sorted.slice(-Math.ceil(sorted.length / 3))
            .map(o => o.context.toLowerCase());

        // Simple word overlap as a proxy for stability
        const earlyWords = new Set(earlyContexts.flatMap(c => c.split(/\s+/)));
        const lateWords = new Set(lateContexts.flatMap(c => c.split(/\s+/)));

        let overlap = 0;
        for (const word of earlyWords) {
            if (lateWords.has(word)) overlap++;
        }

        const stability = overlap / Math.max(earlyWords.size, lateWords.size, 1);
        return Math.min(stability * 120, 100);
    }

    private calculateContextCohesion(clusters: SemanticCluster[], totalOccurrences: number): number {
        if (clusters.length === 0) return 50;

        // Calculate how evenly distributed occurrences are across clusters
        const avgSize = totalOccurrences / clusters.length;
        let variance = 0;

        for (const cluster of clusters) {
            const diff = cluster.occurrences.length - avgSize;
            variance += diff * diff;
        }

        variance /= clusters.length;
        const stdDev = Math.sqrt(variance);

        // Lower variance = better cohesion
        const cohesion = Math.max(0, 100 - (stdDev / avgSize) * 30);
        return cohesion;
    }

    private calculateDefinitionClarity(clusters: SemanticCluster[]): number {
        if (clusters.length === 0) return 30;
        if (clusters.length === 1) return 90;

        // More clusters with good labels = clearer definition
        const labelsQuality = clusters.filter(c => c.label && c.label.length > 5).length;
        const summariesQuality = clusters.filter(c => c.summary && c.summary.length > 20).length;

        const clarity = (labelsQuality * 40 + summariesQuality * 60) / clusters.length;
        return Math.min(clarity, 100);
    }

    // ==================== Breakthrough Factor Calculations ====================

    private calculateNoveltyScore(statistics: TagStatistics, allTagsCount: number): number {
        // Newer concepts with focused usage are more novel
        const recencyBonus = statistics.lastAppearance.date ?
            Math.min((Date.now() - statistics.lastAppearance.date) / (1000 * 60 * 60 * 24 * 365), 1) : 0;

        // Low frequency but high document spread suggests novelty
        const spreadScore = statistics.documentCount / Math.max(statistics.totalOccurrences, 1);

        const novelty = (1 - recencyBonus) * 60 + spreadScore * 40;
        return Math.min(novelty, 100);
    }

    private calculateConnectionDensity(
        relations: ConceptRelation[],
        allTagsCount: number
    ): number {
        if (relations.length === 0) return 10;

        // High connection density = well integrated concept
        const connectionRatio = relations.length / Math.max(allTagsCount, 1);
        const avgStrength = relations.reduce((sum, r) => sum + r.strength, 0) / relations.length;

        const density = connectionRatio * 50 + avgStrength * 50;
        return Math.min(density * 100, 100);
    }

    private calculateEmergencePattern(occurrences: TagOccurrence[]): number {
        if (occurrences.length < 3) return 50;

        // Analyze growth pattern - accelerating emergence is higher scoring
        const sorted = [...occurrences].sort((a, b) =>
            (a.timestamp || 0) - (b.timestamp || 0)
        );

        const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2)).length;
        const secondHalf = sorted.slice(Math.floor(sorted.length / 2)).length;

        const growthRatio = secondHalf / Math.max(firstHalf, 1);
        return Math.min(growthRatio * 50, 100);
    }

    private calculateConceptualLeap(
        relations: ConceptRelation[],
        statistics: TagStatistics
    ): number {
        // Concepts that bridge disparate domains score higher
        if (relations.length < 2) return 30;

        // Diverse, strong connections suggest bridging concepts
        const strengthVariance = this.calculateVariance(relations.map(r => r.strength));
        const diversityScore = Math.min(strengthVariance * 100, 50);

        // Cross-domain usage (multiple docs) with good connections
        const integrationScore = Math.min(
            (statistics.documentCount / statistics.totalOccurrences) * 100,
            50
        );

        return diversityScore + integrationScore;
    }

    private calculateImpactPotential(
        statistics: TagStatistics,
        relations: ConceptRelation[],
        occurrences: TagOccurrence[]
    ): number {
        // Growing usage + strong connections = high impact potential
        const usageScore = Math.min((statistics.totalOccurrences / 50) * 40, 40);
        const connectionScore = Math.min((relations.length / 10) * 30, 30);
        const spreadScore = Math.min((statistics.documentCount / 20) * 30, 30);

        return usageScore + connectionScore + spreadScore;
    }

    // ==================== Helper Methods ====================

    private calculateVariance(values: number[]): number {
        if (values.length === 0) return 0;

        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

        return Math.sqrt(variance);
    }

    // ==================== Analysis Text Generation ====================

    private generateCoherenceAnalysis(
        tag: string,
        score: number,
        consistency: number,
        stability: number,
        cohesion: number,
        clarity: number
    ): string {
        let analysis = `The concept ${tag} has a coherence score of ${score.toFixed(1)}/100.\n\n`;

        if (score >= 70) {
            analysis += `This is a **well-defined and consistent concept** with stable usage patterns across your notes.\n\n`;
        } else if (score >= 40) {
            analysis += `This concept shows **moderate coherence** with some variations in usage and meaning.\n\n`;
        } else {
            analysis += `This concept has **low coherence**, suggesting multiple distinct meanings or inconsistent usage.\n\n`;
        }

        analysis += `**Breakdown:**\n`;
        analysis += `- Consistency: ${consistency.toFixed(1)}/100 - ${this.interpretConsistency(consistency)}\n`;
        analysis += `- Semantic Stability: ${stability.toFixed(1)}/100 - ${this.interpretStability(stability)}\n`;
        analysis += `- Context Cohesion: ${cohesion.toFixed(1)}/100 - ${this.interpretCohesion(cohesion)}\n`;
        analysis += `- Definition Clarity: ${clarity.toFixed(1)}/100 - ${this.interpretClarity(clarity)}\n`;

        return analysis;
    }

    private generateBreakthroughAnalysis(
        tag: string,
        score: number,
        novelty: number,
        connection: number,
        emergence: number,
        leap: number,
        impact: number
    ): string {
        let analysis = `The concept ${tag} has a breakthrough potential score of ${score.toFixed(1)}/100.\n\n`;

        if (score >= 70) {
            analysis += `This is a **highly innovative concept** with strong potential for breakthrough insights.\n\n`;
        } else if (score >= 40) {
            analysis += `This concept shows **moderate innovation potential** with some unique characteristics.\n\n`;
        } else {
            analysis += `This concept appears to be more **conventional or foundational** in your knowledge base.\n\n`;
        }

        analysis += `**Breakdown:**\n`;
        analysis += `- Novelty: ${novelty.toFixed(1)}/100 - ${this.interpretNovelty(novelty)}\n`;
        analysis += `- Connection Density: ${connection.toFixed(1)}/100 - ${this.interpretConnection(connection)}\n`;
        analysis += `- Emergence Pattern: ${emergence.toFixed(1)}/100 - ${this.interpretEmergence(emergence)}\n`;
        analysis += `- Conceptual Leap: ${leap.toFixed(1)}/100 - ${this.interpretLeap(leap)}\n`;
        analysis += `- Impact Potential: ${impact.toFixed(1)}/100 - ${this.interpretImpact(impact)}\n`;

        return analysis;
    }

    // ==================== Interpretation Methods ====================

    private interpretConsistency(score: number): string {
        if (score >= 70) return 'Highly consistent usage';
        if (score >= 40) return 'Moderately consistent';
        return 'Multiple distinct meanings';
    }

    private interpretStability(score: number): string {
        if (score >= 70) return 'Stable over time';
        if (score >= 40) return 'Some evolution in meaning';
        return 'Significant semantic drift';
    }

    private interpretCohesion(score: number): string {
        if (score >= 70) return 'Well-clustered contexts';
        if (score >= 40) return 'Moderate clustering';
        return 'Dispersed usage patterns';
    }

    private interpretClarity(score: number): string {
        if (score >= 70) return 'Clearly defined';
        if (score >= 40) return 'Somewhat ambiguous';
        return 'Needs clarification';
    }

    private interpretNovelty(score: number): string {
        if (score >= 70) return 'Highly novel concept';
        if (score >= 40) return 'Moderately unique';
        return 'Well-established concept';
    }

    private interpretConnection(score: number): string {
        if (score >= 70) return 'Highly connected';
        if (score >= 40) return 'Moderately integrated';
        return 'Isolated concept';
    }

    private interpretEmergence(score: number): string {
        if (score >= 70) return 'Rapid emergence';
        if (score >= 40) return 'Steady growth';
        return 'Stable usage';
    }

    private interpretLeap(score: number): string {
        if (score >= 70) return 'Major conceptual bridge';
        if (score >= 40) return 'Some cross-pollination';
        return 'Domain-specific';
    }

    private interpretImpact(score: number): string {
        if (score >= 70) return 'High future impact';
        if (score >= 40) return 'Moderate influence';
        return 'Limited reach';
    }

    private generateCoherenceRecommendations(
        score: number,
        consistency: number,
        stability: number,
        cohesion: number,
        clarity: number
    ): string[] {
        const recommendations: string[] = [];

        if (consistency < 50) {
            recommendations.push('Consider creating separate notes for distinct meanings of this concept');
        }

        if (stability < 50) {
            recommendations.push('Review how your understanding of this concept has evolved over time');
        }

        if (cohesion < 50) {
            recommendations.push('Look for patterns in how you use this concept across different contexts');
        }

        if (clarity < 50) {
            recommendations.push('Write a clear working definition to anchor your understanding');
        }

        if (score >= 70) {
            recommendations.push('This concept is well-defined - consider using it as a foundation for related ideas');
        }

        return recommendations;
    }

    private generateBreakthroughInsights(
        tag: string,
        score: number,
        novelty: number,
        connection: number,
        emergence: number,
        leap: number,
        impact: number
    ): string[] {
        const insights: string[] = [];

        if (novelty >= 70) {
            insights.push(`${tag} represents a novel idea in your knowledge base - explore it further`);
        }

        if (connection >= 70) {
            insights.push('This concept bridges multiple domains - potential for synthesis');
        }

        if (emergence >= 70) {
            insights.push('Rapidly emerging concept - track its development closely');
        }

        if (leap >= 70) {
            insights.push('This may represent a conceptual breakthrough - document key insights');
        }

        if (impact >= 70) {
            insights.push('High impact potential - consider building a research agenda around this');
        }

        if (score < 40) {
            insights.push('Foundational concept - provides stable ground for other ideas');
        }

        return insights;
    }
}
