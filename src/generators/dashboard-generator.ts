import { ConceptDashboard } from '../types';
import {
    ViewFactory,
    globalViewRegistry,
    registerBuiltInViews,
    DashboardGenerationOptions,
    DashboardGenerationResult
} from '../views';

/**
 * Dashboard Generator (Refactored)
 *
 * This class now uses the pluggable view system under the hood.
 * It maintains backward compatibility while providing access to
 * the new extensible architecture.
 *
 * For new code, consider using ViewFactory directly for more control.
 */
export class DashboardGenerator {
    private viewFactory: ViewFactory;
    private initialized: boolean = false;

    constructor() {
        // Initialize the view system
        this.initializeViews();
        this.viewFactory = new ViewFactory(globalViewRegistry);
    }

    /**
     * Initialize views (registers built-in views once)
     */
    private initializeViews(): void {
        if (this.initialized) return;

        try {
            registerBuiltInViews(globalViewRegistry);
            this.initialized = true;
            console.log('Dashboard view system initialized');
        } catch (error) {
            console.error('Failed to initialize views:', error);
            // Views might already be registered, continue
            this.initialized = true;
        }
    }

    /**
     * Generate markdown content for a concept dashboard
     *
     * Uses the pluggable view system to automatically select
     * the appropriate view based on the dashboard's frequency tier.
     *
     * @param dashboard - The dashboard data to render
     * @param options - Optional generation options
     * @returns Markdown content
     */
    generateDashboard(
        dashboard: ConceptDashboard,
        options?: DashboardGenerationOptions
    ): string {
        try {
            const result = this.viewFactory.generate(dashboard, options);

            // Log validation warnings
            if (!result.validation.valid) {
                console.warn(
                    `Dashboard validation warning: ${result.validation.message}`
                );
            }

            return result.markdown;
        } catch (error) {
            console.error('Dashboard generation failed:', error);

            // Attempt fallback generation
            const fallback = this.viewFactory.generateWithFallback(dashboard, options);

            if (fallback) {
                console.warn(
                    `Using fallback view: ${fallback.view.getConfig().id}`
                );
                return fallback.markdown;
            }

            // Last resort: minimal dashboard
            return this.generateMinimalDashboard(dashboard);
        }
    }

    /**
     * Generate with detailed result
     *
     * Returns full generation result including metadata
     */
    generateWithResult(
        dashboard: ConceptDashboard,
        options?: DashboardGenerationOptions
    ): DashboardGenerationResult {
        return this.viewFactory.generate(dashboard, options);
    }

    /**
     * Generate minimal fallback dashboard
     *
     * Used as last resort when all views fail
     */
    private generateMinimalDashboard(dashboard: ConceptDashboard): string {
        const cleanTag = dashboard.tag.replace('#', '');
        const stats = dashboard.statistics;

        let md = `# ${cleanTag}\n\n`;
        md += `> Emergency fallback dashboard • Last updated: ${new Date(dashboard.lastUpdated).toLocaleDateString()}\n\n`;
        md += `**WARNING:** Normal dashboard generation failed. This is a minimal fallback.\n\n`;
        md += `---\n\n`;

        md += `## Basic Information\n\n`;
        md += `- **Occurrences:** ${stats.totalOccurrences}\n`;
        md += `- **Documents:** ${stats.documentCount}\n`;
        md += `- **Tier:** ${stats.frequencyTier}\n\n`;

        if (dashboard.keyPassages && dashboard.keyPassages.length > 0) {
            md += `## Key Passages\n\n`;
            for (const passage of dashboard.keyPassages.slice(0, 3)) {
                md += `> ${passage.text}\n\n`;
            }
        }

        md += `---\n\n`;
        md += `*This dashboard was generated in fallback mode. Please check the console for errors.*\n`;

        return md;
    }

    /**
     * Access the underlying view factory
     *
     * Useful for advanced use cases that need direct access to the view system
     */
    getViewFactory(): ViewFactory {
        return this.viewFactory;
    }

    /**
     * Get filename for dashboard
     *
     * Delegates to the view system for consistent naming
     */
    getDashboardFilename(tag: string, folder: string, dashboard?: ConceptDashboard): string {
        return this.viewFactory.getFilename(tag, folder, dashboard);
    }
}
