import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { TagOccurrence, SemanticCluster, Definition, Snippet } from '../types';

const execPromise = promisify(exec);

export class ContextAnalyzer {
    constructor(
        private pythonPath: string,
        private pluginDir: string
    ) {}

    /**
     * Cluster contexts into semantic groups using Python NLP
     */
    async clusterContexts(
        tag: string,
        occurrences: TagOccurrence[],
        maxClusters: number = 5,
        minClusterSize: number = 3
    ): Promise<SemanticCluster[]> {
        if (occurrences.length < minClusterSize) {
            // Too few occurrences to cluster meaningfully
            return [{
                clusterId: 0,
                label: 'General usage',
                contextWords: this.extractCommonWords(occurrences),
                summary: `General usage of ${tag}`,
                occurrences: occurrences,
                representativeSnippets: this.selectRepresentativeSnippets(occurrences, 3)
            }];
        }

        try {
            // Prepare data for Python
            const inputData = {
                tag: tag,
                contexts: occurrences.map(o => ({
                    text: o.context,
                    sentence: o.sentence,
                    file: o.file,
                    line: o.lineNumber
                })),
                maxClusters: maxClusters,
                minClusterSize: minClusterSize
            };

            const tempInput = join(this.pluginDir, 'temp_input.json');
            const tempOutput = join(this.pluginDir, 'temp_output.json');

            await writeFile(tempInput, JSON.stringify(inputData, null, 2));

            // Run Python clustering script
            const scriptPath = join(this.pluginDir, 'python', 'cluster_contexts.py');
            const command = `${this.pythonPath} "${scriptPath}" "${tempInput}" "${tempOutput}"`;

            await execPromise(command);

            // Read results
            const resultData = await readFile(tempOutput, 'utf-8');
            const clusters = JSON.parse(resultData);

            // Clean up temp files
            await unlink(tempInput);
            await unlink(tempOutput);

            // Convert to SemanticCluster format
            return clusters.map((cluster: any, index: number) => ({
                clusterId: index,
                label: cluster.label,
                contextWords: cluster.keywords,
                summary: cluster.summary,
                occurrences: cluster.indices.map((i: number) => occurrences[i]),
                representativeSnippets: cluster.representative_snippets.map((s: any) => ({
                    text: s.text,
                    file: s.file,
                    lineNumber: s.line,
                    relevanceScore: s.score
                }))
            }));

        } catch (error) {
            console.error('Error clustering contexts:', error);
            // Fallback to simple grouping
            return this.fallbackClustering(tag, occurrences);
        }
    }

    /**
     * Extract definitions from occurrences using Python NLP
     */
    async extractDefinitions(
        tag: string,
        occurrences: TagOccurrence[]
    ): Promise<Definition[]> {
        try {
            const inputData = {
                tag: tag,
                sentences: occurrences.map(o => ({
                    text: o.sentence,
                    file: o.file,
                    line: o.lineNumber
                }))
            };

            const tempInput = join(this.pluginDir, 'temp_def_input.json');
            const tempOutput = join(this.pluginDir, 'temp_def_output.json');

            await writeFile(tempInput, JSON.stringify(inputData, null, 2));

            const scriptPath = join(this.pluginDir, 'python', 'extract_definitions.py');
            const command = `${this.pythonPath} "${scriptPath}" "${tempInput}" "${tempOutput}"`;

            await execPromise(command);

            const resultData = await readFile(tempOutput, 'utf-8');
            const definitions = JSON.parse(resultData);

            await unlink(tempInput);
            await unlink(tempOutput);

            return definitions.map((def: any) => ({
                text: def.text,
                source: 'corpus' as const,
                file: def.file,
                author: def.author
            }));

        } catch (error) {
            console.error('Error extracting definitions:', error);
            return this.fallbackDefinitionExtraction(tag, occurrences);
        }
    }

    /**
     * Fallback clustering when Python is unavailable
     */
    private fallbackClustering(tag: string, occurrences: TagOccurrence[]): SemanticCluster[] {
        // Simple keyword-based grouping
        const words = this.extractCommonWords(occurrences);

        return [{
            clusterId: 0,
            label: 'All contexts',
            contextWords: words,
            summary: `Various uses of ${tag} across ${occurrences.length} occurrences`,
            occurrences: occurrences,
            representativeSnippets: this.selectRepresentativeSnippets(occurrences, 5)
        }];
    }

    /**
     * Fallback definition extraction using pattern matching
     */
    private fallbackDefinitionExtraction(tag: string, occurrences: TagOccurrence[]): Definition[] {
        const definitions: Definition[] = [];
        const definitionPatterns = [
            /is defined as/i,
            /refers to/i,
            /means/i,
            /is the/i,
            /can be understood as/i,
            /is a\s+\w+\s+that/i
        ];

        const cleanTag = tag.replace('#', '');

        for (const occurrence of occurrences) {
            const sentence = occurrence.sentence.toLowerCase();

            if (definitionPatterns.some(pattern => pattern.test(sentence))) {
                definitions.push({
                    text: occurrence.sentence,
                    source: 'corpus',
                    file: occurrence.file
                });
            }
        }

        return definitions.slice(0, 5); // Return top 5
    }

    /**
     * Extract common words from contexts
     */
    private extractCommonWords(occurrences: TagOccurrence[]): string[] {
        const wordCounts = new Map<string, number>();
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
            'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these',
            'those', 'it', 'its', 'as'
        ]);

        for (const occurrence of occurrences) {
            const words = occurrence.context
                .toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length > 3 && !stopWords.has(w));

            for (const word of words) {
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            }
        }

        return Array.from(wordCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word);
    }

    /**
     * Select representative snippets from occurrences
     */
    private selectRepresentativeSnippets(
        occurrences: TagOccurrence[],
        count: number
    ): Snippet[] {
        // Sort by sentence length (longer sentences often more informative)
        const sorted = [...occurrences].sort(
            (a, b) => b.sentence.length - a.sentence.length
        );

        return sorted.slice(0, count).map(o => ({
            text: o.sentence,
            file: o.file,
            lineNumber: o.lineNumber
        }));
    }

    /**
     * Generate open questions based on context analysis
     */
    generateOpenQuestions(
        tag: string,
        clusters: SemanticCluster[],
        definitions: Definition[]
    ): string[] {
        const questions: string[] = [];

        // If multiple clusters, question about different meanings
        if (clusters.length > 1) {
            questions.push(
                `How do the different uses of ${tag} relate to each other?`
            );
            questions.push(
                `Is ${tag} a unified concept, or are these separate ideas using the same term?`
            );
        }

        // If few or no definitions
        if (definitions.length === 0) {
            questions.push(
                `What is a precise definition of ${tag} in my work?`
            );
        } else if (definitions.length > 1) {
            questions.push(
                `Are these definitions of ${tag} compatible or contradictory?`
            );
        }

        // Always include these
        questions.push(
            `What are the implications of ${tag} for my overall argument?`
        );
        questions.push(
            `Are there gaps in my understanding of ${tag}?`
        );

        return questions;
    }
}
