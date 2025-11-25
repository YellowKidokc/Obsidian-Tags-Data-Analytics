import { App, PluginSettingTab, Setting } from 'obsidian';
import ConceptDashboardPlugin from '../main';
import { globalViewRegistry } from './views';

export class ConceptDashboardSettingTab extends PluginSettingTab {
    plugin: ConceptDashboardPlugin;

    constructor(app: App, plugin: ConceptDashboardPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Concept Dashboard Settings' });

        // === Threshold Settings ===
        containerEl.createEl('h3', { text: 'Frequency Thresholds' });

        new Setting(containerEl)
            .setName('Use percentile-based thresholds')
            .setDesc('Instead of fixed numbers, use percentiles (e.g., top 10% get full dashboards)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.usePercentile)
                .onChange(async (value) => {
                    this.plugin.settings.usePercentile = value;
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to show/hide relevant settings
                })
            );

        if (this.plugin.settings.usePercentile) {
            new Setting(containerEl)
                .setName('Top percentile for full dashboards')
                .setDesc('Top X% of concepts get full dashboards')
                .addSlider(slider => slider
                    .setLimits(5, 30, 5)
                    .setValue(this.plugin.settings.topPercentForFull)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.topPercentForFull = value;
                        await this.plugin.saveSettings();
                    })
                );

            new Setting(containerEl)
                .setName('Middle percentile for moderate dashboards')
                .setDesc('Next X% of concepts get moderate dashboards')
                .addSlider(slider => slider
                    .setLimits(10, 50, 5)
                    .setValue(this.plugin.settings.middlePercentForModerate)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.middlePercentForModerate = value;
                        await this.plugin.saveSettings();
                    })
                );
        } else {
            new Setting(containerEl)
                .setName('High-frequency threshold')
                .setDesc('Minimum occurrences for full dashboard (default: 20)')
                .addText(text => text
                    .setPlaceholder('20')
                    .setValue(this.plugin.settings.highFrequencyThreshold.toString())
                    .onChange(async (value) => {
                        const num = parseInt(value);
                        if (!isNaN(num) && num > 0) {
                            this.plugin.settings.highFrequencyThreshold = num;
                            await this.plugin.saveSettings();
                        }
                    })
                );

            new Setting(containerEl)
                .setName('Medium-frequency threshold')
                .setDesc('Minimum occurrences for moderate dashboard (default: 5)')
                .addText(text => text
                    .setPlaceholder('5')
                    .setValue(this.plugin.settings.mediumFrequencyThreshold.toString())
                    .onChange(async (value) => {
                        const num = parseInt(value);
                        if (!isNaN(num) && num > 0) {
                            this.plugin.settings.mediumFrequencyThreshold = num;
                            await this.plugin.saveSettings();
                        }
                    })
                );
        }

        // === Dashboard Generation ===
        containerEl.createEl('h3', { text: 'Dashboard Generation' });

        new Setting(containerEl)
            .setName('Dashboard folder')
            .setDesc('Folder where dashboards will be created (relative to vault root)')
            .addText(text => text
                .setPlaceholder('_Dashboards')
                .setValue(this.plugin.settings.dashboardFolder)
                .onChange(async (value) => {
                    this.plugin.settings.dashboardFolder = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Auto-update dashboards')
            .setDesc('Automatically regenerate dashboards when vault changes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoUpdate)
                .onChange(async (value) => {
                    this.plugin.settings.autoUpdate = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Update on vault change')
            .setDesc('Update dashboards when files are modified (can be resource-intensive)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.updateOnVaultChange)
                .onChange(async (value) => {
                    this.plugin.settings.updateOnVaultChange = value;
                    await this.plugin.saveSettings();
                })
            );

        // === Analysis Settings ===
        containerEl.createEl('h3', { text: 'Analysis Settings' });

        new Setting(containerEl)
            .setName('Python path')
            .setDesc('Path to Python executable (e.g., python3, /usr/bin/python3)')
            .addText(text => text
                .setPlaceholder('python3')
                .setValue(this.plugin.settings.pythonPath)
                .onChange(async (value) => {
                    this.plugin.settings.pythonPath = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Context window size')
            .setDesc('Characters before/after tag to include as context (default: 200)')
            .addSlider(slider => slider
                .setLimits(100, 500, 50)
                .setValue(this.plugin.settings.contextWindowSize)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.contextWindowSize = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Minimum cluster size')
            .setDesc('Minimum occurrences to attempt semantic clustering (default: 3)')
            .addText(text => text
                .setPlaceholder('3')
                .setValue(this.plugin.settings.minClusterSize.toString())
                .onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.minClusterSize = num;
                        await this.plugin.saveSettings();
                    }
                })
            );

        new Setting(containerEl)
            .setName('Maximum clusters')
            .setDesc('Maximum number of semantic clusters per concept (default: 5)')
            .addText(text => text
                .setPlaceholder('5')
                .setValue(this.plugin.settings.maxClusters.toString())
                .onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.maxClusters = num;
                        await this.plugin.saveSettings();
                    }
                })
            );

        // === External Integrations ===
        containerEl.createEl('h3', { text: 'External Integrations' });

        new Setting(containerEl)
            .setName('Use Wikipedia for definitions')
            .setDesc('Fetch external definitions from Wikipedia')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useWikipedia)
                .onChange(async (value) => {
                    this.plugin.settings.useWikipedia = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Use Semantic Scholar')
            .setDesc('Find related academic papers')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useSemanticScholar)
                .onChange(async (value) => {
                    this.plugin.settings.useSemanticScholar = value;
                    await this.plugin.saveSettings();
                })
            );

        // === PostgreSQL Integration ===
        containerEl.createEl('h3', { text: 'PostgreSQL Integration' });

        new Setting(containerEl)
            .setName('Enable PostgreSQL')
            .setDesc('Sync tag data to PostgreSQL database for advanced analytics and labeling')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enablePostgres)
                .onChange(async (value) => {
                    this.plugin.settings.enablePostgres = value;
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to show/hide PostgreSQL settings
                })
            );

        if (this.plugin.settings.enablePostgres) {
            new Setting(containerEl)
                .setName('PostgreSQL Host')
                .setDesc('Database server hostname or IP')
                .addText(text => text
                    .setPlaceholder('localhost')
                    .setValue(this.plugin.settings.postgresHost)
                    .onChange(async (value) => {
                        this.plugin.settings.postgresHost = value;
                        await this.plugin.saveSettings();
                    })
                );

            new Setting(containerEl)
                .setName('PostgreSQL Port')
                .setDesc('Database server port (default: 5432)')
                .addText(text => text
                    .setPlaceholder('5432')
                    .setValue(this.plugin.settings.postgresPort.toString())
                    .onChange(async (value) => {
                        const num = parseInt(value);
                        if (!isNaN(num) && num > 0) {
                            this.plugin.settings.postgresPort = num;
                            await this.plugin.saveSettings();
                        }
                    })
                );

            new Setting(containerEl)
                .setName('Database Name')
                .setDesc('Name of the PostgreSQL database')
                .addText(text => text
                    .setPlaceholder('obsidian_tags')
                    .setValue(this.plugin.settings.postgresDatabase)
                    .onChange(async (value) => {
                        this.plugin.settings.postgresDatabase = value;
                        await this.plugin.saveSettings();
                    })
                );

            new Setting(containerEl)
                .setName('Database User')
                .setDesc('PostgreSQL username')
                .addText(text => text
                    .setPlaceholder('postgres')
                    .setValue(this.plugin.settings.postgresUser)
                    .onChange(async (value) => {
                        this.plugin.settings.postgresUser = value;
                        await this.plugin.saveSettings();
                    })
                );

            new Setting(containerEl)
                .setName('Database Password')
                .setDesc('PostgreSQL password')
                .addText(text => text
                    .setPlaceholder('password')
                    .setValue(this.plugin.settings.postgresPassword)
                    .onChange(async (value) => {
                        this.plugin.settings.postgresPassword = value;
                        await this.plugin.saveSettings();
                    })
                    .then(text => {
                        text.inputEl.type = 'password';
                    })
                );

            new Setting(containerEl)
                .setName('Auto-sync to PostgreSQL')
                .setDesc('Automatically sync data after dashboard generation')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.autoSyncToPostgres)
                    .onChange(async (value) => {
                        this.plugin.settings.autoSyncToPostgres = value;
                        await this.plugin.saveSettings();
                    })
                );

            const pgInfoDiv = containerEl.createDiv({ cls: 'concept-dashboard-pg-info' });
            pgInfoDiv.createEl('p', {
                text: '💡 PostgreSQL stores sanitized tag data with UUIDs for systematic labeling and classification.'
            });
            pgInfoDiv.createEl('p', {
                text: '📝 Run the schema.sql file to initialize your database: src/database/schema.sql'
            });
        }

        // === UI Preferences ===
        containerEl.createEl('h3', { text: 'UI Preferences' });

        new Setting(containerEl)
            .setName('Show progress notifications')
            .setDesc('Display notifications during analysis')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showProgressNotifications)
                .onChange(async (value) => {
                    this.plugin.settings.showProgressNotifications = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Default view')
            .setDesc('Default view when opening concept browser')
            .addDropdown(dropdown => dropdown
                .addOption('list', 'List view')
                .addOption('graph', 'Graph view')
                .addOption('timeline', 'Timeline view')
                .setValue(this.plugin.settings.defaultView)
                .onChange(async (value) => {
                    this.plugin.settings.defaultView = value as 'list' | 'graph' | 'timeline';
                    await this.plugin.saveSettings();
                })
            );

        // === Dashboard Views ===
        containerEl.createEl('h3', { text: 'Dashboard Views' });

        const viewsDesc = containerEl.createDiv({ cls: 'concept-dashboard-views-desc' });
        viewsDesc.createEl('p', {
            text: 'Configure which dashboard view types are enabled. The system automatically selects the best view based on concept frequency.'
        });

        const viewConfigs = globalViewRegistry.getViewConfigs();
        const stats = globalViewRegistry.getStats();

        if (viewConfigs.length > 0) {
            const statsDiv = containerEl.createDiv({ cls: 'concept-dashboard-stats' });
            statsDiv.createEl('p', {
                text: `📊 ${stats.total} views registered (${stats.enabled} enabled, ${stats.disabled} disabled)`
            });

            for (const config of viewConfigs) {
                new Setting(containerEl)
                    .setName(config.name)
                    .setDesc(`${config.description} • Priority: ${config.priority}`)
                    .addToggle(toggle => toggle
                        .setValue(config.enabled)
                        .onChange(async (value) => {
                            globalViewRegistry.updateViewConfig(config.id, { enabled: value });
                            await this.plugin.saveSettings();
                            this.display(); // Refresh to update stats
                        })
                    );
            }
        } else {
            containerEl.createEl('p', {
                text: 'No dashboard views registered. This should not happen.'
            });
        }

        // === Info Section ===
        containerEl.createEl('h3', { text: 'Python Setup' });
        const infoDiv = containerEl.createDiv({ cls: 'concept-dashboard-info' });
        infoDiv.createEl('p', {
            text: 'For advanced NLP features, install Python dependencies:'
        });
        infoDiv.createEl('code', {
            text: 'pip install -r python/requirements.txt'
        });
        infoDiv.createEl('p', {
            text: 'The plugin will work without Python, but clustering and definition extraction will be simpler.'
        });
    }
}
