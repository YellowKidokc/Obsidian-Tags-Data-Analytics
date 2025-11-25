import { App, Plugin, Notice, TFolder, normalizePath } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS, ConceptDashboard, ConceptRelation } from './src/types';
import { ConceptDashboardSettingTab } from './src/settings';
import { TagExtractor } from './src/analysis/tag-extractor';
import { ContextAnalyzer } from './src/analysis/context-analyzer';
import { FactorAnalyzer } from './src/analysis/factor-analyzer';
import { DashboardGenerator } from './src/generators/dashboard-generator';
import { PostgresService } from './src/database/postgres-service';

export default class ConceptDashboardPlugin extends Plugin {
    settings: PluginSettings;
    private tagExtractor: TagExtractor;
    private contextAnalyzer: ContextAnalyzer;
    private factorAnalyzer: FactorAnalyzer;
    private dashboardGenerator: DashboardGenerator;
    private postgresService: PostgresService | null = null;

    async onload() {
        await this.loadSettings();

        // Initialize components
        this.tagExtractor = new TagExtractor(this.app);
        this.contextAnalyzer = new ContextAnalyzer(
            this.settings.pythonPath,
            this.manifest.dir || ''
        );
        this.factorAnalyzer = new FactorAnalyzer();
        this.dashboardGenerator = new DashboardGenerator();

        // Initialize PostgreSQL if enabled
        if (this.settings.enablePostgres) {
            await this.initializePostgres();
        }

        // Add settings tab
        this.addSettingTab(new ConceptDashboardSettingTab(this.app, this));

        // Register commands
        this.registerCommands();

        console.log('Concept Dashboard plugin loaded');
    }

    async onunload() {
        // Disconnect from PostgreSQL
        if (this.postgresService) {
            await this.postgresService.disconnect();
        }
        console.log('Concept Dashboard plugin unloaded');
    }

    /**
     * Initialize PostgreSQL connection
     */
    private async initializePostgres() {
        try {
            this.postgresService = new PostgresService(
                this.settings.postgresHost,
                this.settings.postgresPort,
                this.settings.postgresDatabase,
                this.settings.postgresUser,
                this.settings.postgresPassword
            );

            const connected = await this.postgresService.connect();
            if (connected) {
                new Notice('PostgreSQL connected successfully');
                // Optionally initialize schema
                // await this.postgresService.initializeSchema();
            } else {
                new Notice('Failed to connect to PostgreSQL. Check settings.');
                this.postgresService = null;
            }
        } catch (error) {
            console.error('Error initializing PostgreSQL:', error);
            new Notice(`PostgreSQL error: ${error.message}`);
            this.postgresService = null;
        }
    }

    private registerCommands() {
        // Generate dashboard for specific tag
        this.addCommand({
            id: 'generate-dashboard-for-tag',
            name: 'Generate dashboard for tag',
            callback: async () => {
                const tag = await this.promptForTag();
                if (tag) {
                    await this.generateDashboardForTag(tag);
                }
            }
        });

        // Generate all dashboards
        this.addCommand({
            id: 'generate-all-dashboards',
            name: 'Generate all dashboards',
            callback: async () => {
                await this.generateAllDashboards();
            }
        });

        // Show tag statistics
        this.addCommand({
            id: 'show-tag-statistics',
            name: 'Show tag statistics',
            callback: async () => {
                await this.showTagStatistics();
            }
        });

        // Refresh dashboards
        this.addCommand({
            id: 'refresh-dashboards',
            name: 'Refresh existing dashboards',
            callback: async () => {
                await this.refreshExistingDashboards();
            }
        });
    }

    /**
     * Generate dashboard for a specific tag
     */
    async generateDashboardForTag(tag: string) {
        const notice = this.settings.showProgressNotifications
            ? new Notice(`Analyzing ${tag}...`, 0)
            : null;

        try {
            // Extract all tags first
            const allOccurrences = await this.tagExtractor.extractAllTags();
            const occurrences = allOccurrences.get(tag);

            if (!occurrences || occurrences.length === 0) {
                new Notice(`No occurrences found for tag: ${tag}`);
                notice?.hide();
                return;
            }

            // Calculate statistics
            const allStats = this.tagExtractor.calculateStatistics(
                allOccurrences,
                this.settings.highFrequencyThreshold,
                this.settings.mediumFrequencyThreshold
            );
            const stats = allStats.get(tag);

            if (!stats) {
                new Notice(`Could not calculate statistics for: ${tag}`);
                notice?.hide();
                return;
            }

            // Analyze contexts
            notice?.setMessage(`Clustering contexts for ${tag}...`);
            const clusters = await this.contextAnalyzer.clusterContexts(
                tag,
                occurrences,
                this.settings.maxClusters,
                this.settings.minClusterSize
            );

            // Extract definitions
            notice?.setMessage(`Extracting definitions for ${tag}...`);
            const definitions = await this.contextAnalyzer.extractDefinitions(
                tag,
                occurrences
            );

            // Calculate co-occurrences
            const coOccurrences = this.tagExtractor.calculateCoOccurrences(allOccurrences);
            const topCoOccurring = this.tagExtractor.getTopCoOccurring(tag, coOccurrences, 6);

            // Build relations
            const relations: ConceptRelation[] = topCoOccurring.map(co => ({
                relatedTag: co.tag,
                relationshipType: 'co-occurrence',
                strength: co.count,
                description: `Co-occurs ${co.count} times`,
                keyPassages: []
            }));

            // Generate open questions
            const openQuestions = this.contextAnalyzer.generateOpenQuestions(
                tag,
                clusters,
                definitions
            ).map(q => ({ question: q, reason: '' }));

            // Select key passages
            const keyPassages = occurrences
                .sort((a, b) => b.sentence.length - a.sentence.length)
                .slice(0, 5)
                .map(o => ({
                    text: o.sentence,
                    file: o.file,
                    lineNumber: o.lineNumber
                }));

            // Calculate coherence factor
            notice?.setMessage(`Calculating coherence factor for ${tag}...`);
            const coherenceFactor = this.factorAnalyzer.calculateCoherenceFactor(
                tag,
                occurrences,
                clusters,
                stats
            );

            // Calculate breakthrough factor
            notice?.setMessage(`Calculating breakthrough factor for ${tag}...`);
            const breakthroughFactor = this.factorAnalyzer.calculateBreakthroughFactor(
                tag,
                occurrences,
                relations,
                stats,
                allOccurrences.size
            );

            // Build dashboard
            const dashboard: ConceptDashboard = {
                tag: tag,
                statistics: stats,
                meanings: clusters,
                definitions: {
                    fromCorpus: definitions,
                    external: [],
                    working: []
                },
                relations: relations,
                keyPassages: keyPassages,
                openQuestions: openQuestions,
                furtherReading: [],
                coherenceFactor: coherenceFactor,
                breakthroughFactor: breakthroughFactor,
                lastUpdated: Date.now()
            };

            // Generate markdown
            notice?.setMessage(`Writing dashboard for ${tag}...`);
            const markdown = this.dashboardGenerator.generateDashboard(dashboard);

            // Save to file
            await this.ensureFolderExists(this.settings.dashboardFolder);
            const filename = this.dashboardGenerator.getDashboardFilename(
                tag,
                this.settings.dashboardFolder
            );
            const normalizedPath = normalizePath(filename);

            await this.app.vault.adapter.write(normalizedPath, markdown);

            // Sync to PostgreSQL if enabled
            if (this.settings.enablePostgres && this.settings.autoSyncToPostgres && this.postgresService) {
                notice?.setMessage(`Syncing ${tag} to PostgreSQL...`);

                // Sync occurrences
                for (const occurrence of occurrences) {
                    await this.postgresService.syncTagOccurrence(occurrence);
                }

                // Sync dashboard data
                await this.postgresService.syncDashboard(dashboard);

                // Sync co-occurrences
                const allCoOccurrences = Array.from(coOccurrences.entries())
                    .flatMap(([tag1, map]) =>
                        Array.from(map.entries()).map(([tag2, count]) => ({
                            tag1,
                            tag2,
                            count: count,
                            contexts: [] // TODO: Extract actual contexts from occurrences
                        }))
                    );
                await this.postgresService.syncCoOccurrences(allCoOccurrences);
            }

            notice?.hide();
            new Notice(`Dashboard created: ${normalizedPath}`);

            // Open the dashboard
            const file = this.app.vault.getAbstractFileByPath(normalizedPath);
            if (file) {
                await this.app.workspace.getLeaf().openFile(file as any);
            }

        } catch (error) {
            notice?.hide();
            console.error('Error generating dashboard:', error);
            new Notice(`Error generating dashboard: ${error.message}`);
        }
    }

    /**
     * Generate dashboards for all tags
     */
    async generateAllDashboards() {
        const notice = new Notice('Analyzing all tags...', 0);

        try {
            // Extract all tags
            const allOccurrences = await this.tagExtractor.extractAllTags();
            const tagCount = allOccurrences.size;

            if (tagCount === 0) {
                new Notice('No tags found in vault');
                notice.hide();
                return;
            }

            notice.setMessage(`Found ${tagCount} tags. Generating dashboards...`);

            // Calculate statistics for all tags
            const allStats = this.tagExtractor.calculateStatistics(
                allOccurrences,
                this.settings.highFrequencyThreshold,
                this.settings.mediumFrequencyThreshold
            );

            let count = 0;
            for (const tag of allOccurrences.keys()) {
                count++;
                notice.setMessage(`Generating dashboard ${count}/${tagCount}: ${tag}`);
                await this.generateDashboardForTag(tag);
            }

            notice.hide();
            new Notice(`Generated ${count} dashboards in ${this.settings.dashboardFolder}`);

        } catch (error) {
            notice.hide();
            console.error('Error generating dashboards:', error);
            new Notice(`Error: ${error.message}`);
        }
    }

    /**
     * Show statistics for all tags
     */
    async showTagStatistics() {
        const notice = new Notice('Analyzing tags...', 0);

        try {
            const allOccurrences = await this.tagExtractor.extractAllTags();
            const allStats = this.tagExtractor.calculateStatistics(
                allOccurrences,
                this.settings.highFrequencyThreshold,
                this.settings.mediumFrequencyThreshold
            );

            // Count by tier
            let high = 0, medium = 0, low = 0;
            for (const stats of allStats.values()) {
                if (stats.frequencyTier === 'high') high++;
                else if (stats.frequencyTier === 'medium') medium++;
                else low++;
            }

            // Create report
            let report = `# Tag Statistics\n\n`;
            report += `**Total unique tags:** ${allStats.size}\n\n`;
            report += `**By frequency tier:**\n`;
            report += `- High (≥${this.settings.highFrequencyThreshold}): ${high} tags\n`;
            report += `- Medium (${this.settings.mediumFrequencyThreshold}-${this.settings.highFrequencyThreshold - 1}): ${medium} tags\n`;
            report += `- Low (<${this.settings.mediumFrequencyThreshold}): ${low} tags\n\n`;

            report += `## Top 20 Tags\n\n`;
            report += `| Rank | Tag | Occurrences | Documents | Tier |\n`;
            report += `|------|-----|-------------|-----------|------|\n`;

            const sorted = Array.from(allStats.values())
                .sort((a, b) => b.totalOccurrences - a.totalOccurrences)
                .slice(0, 20);

            sorted.forEach((stats, i) => {
                report += `| ${i + 1} | ${stats.tag} | ${stats.totalOccurrences} | ${stats.documentCount} | ${stats.frequencyTier} |\n`;
            });

            // Create temporary note
            const tempPath = normalizePath('Tag Statistics.md');
            await this.app.vault.adapter.write(tempPath, report);

            notice.hide();
            new Notice('Tag statistics generated');

            // Open it
            const file = this.app.vault.getAbstractFileByPath(tempPath);
            if (file) {
                await this.app.workspace.getLeaf().openFile(file as any);
            }

        } catch (error) {
            notice.hide();
            console.error('Error showing statistics:', error);
            new Notice(`Error: ${error.message}`);
        }
    }

    /**
     * Refresh existing dashboards
     */
    async refreshExistingDashboards() {
        const folder = this.app.vault.getAbstractFileByPath(
            normalizePath(this.settings.dashboardFolder)
        );

        if (!folder || !(folder instanceof TFolder)) {
            new Notice(`Dashboard folder not found: ${this.settings.dashboardFolder}`);
            return;
        }

        const files = folder.children.filter(f => f.name.endsWith('.md'));
        const notice = new Notice(`Refreshing ${files.length} dashboards...`, 0);

        let count = 0;
        for (const file of files) {
            const tag = '#' + file.name.replace('.md', '');
            notice.setMessage(`Refreshing ${++count}/${files.length}: ${tag}`);
            await this.generateDashboardForTag(tag);
        }

        notice.hide();
        new Notice(`Refreshed ${count} dashboards`);
    }

    /**
     * Prompt user to select a tag
     */
    private async promptForTag(): Promise<string | null> {
        // Simple prompt - could be enhanced with a modal
        const allOccurrences = await this.tagExtractor.extractAllTags();
        const tags = Array.from(allOccurrences.keys());

        if (tags.length === 0) {
            new Notice('No tags found in vault');
            return null;
        }

        // For now, just use a simple prompt
        // TODO: Replace with a proper modal/suggester
        const tag = tags[0]; // Placeholder - should show list to user
        return tag;
    }

    /**
     * Ensure folder exists, create if not
     */
    private async ensureFolderExists(folderPath: string) {
        const normalizedPath = normalizePath(folderPath);
        const folder = this.app.vault.getAbstractFileByPath(normalizedPath);

        if (!folder) {
            await this.app.vault.createFolder(normalizedPath);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
