import { ConceptDashboard } from '../types';

/**
 * Configuration for a dashboard view
 */
export interface DashboardViewConfig {
    /** Unique identifier for this view type */
    id: string;

    /** Display name for UI */
    name: string;

    /** Description of what this view provides */
    description: string;

    /** Whether this view is enabled */
    enabled: boolean;

    /** Priority for automatic selection (higher = preferred) */
    priority: number;

    /** Custom settings specific to this view */
    settings?: Record<string, any>;
}

/**
 * Context passed to views for rendering decisions
 */
export interface DashboardViewContext {
    /** The dashboard data to render */
    dashboard: ConceptDashboard;

    /** Plugin-wide settings that views might need */
    globalSettings?: Record<string, any>;

    /** Additional metadata */
    metadata?: {
        vaultSize?: number;
        totalTags?: number;
        generationTime?: number;
    };
}

/**
 * Result of view applicability check
 */
export interface ViewApplicabilityResult {
    /** Whether this view can handle the dashboard */
    applicable: boolean;

    /** Score indicating how well suited (0-100, higher is better) */
    score: number;

    /** Reason for the score (for debugging/logging) */
    reason?: string;
}

/**
 * Interface that all dashboard views must implement
 *
 * A dashboard view is responsible for:
 * 1. Determining if it can render a given dashboard
 * 2. Generating markdown content for the dashboard
 * 3. Providing metadata about itself
 */
export interface IDashboardView {
    /**
     * Get the configuration for this view
     */
    getConfig(): DashboardViewConfig;

    /**
     * Check if this view is applicable for the given dashboard
     *
     * @param context - The dashboard and metadata
     * @returns Applicability result with score
     */
    isApplicable(context: DashboardViewContext): ViewApplicabilityResult;

    /**
     * Generate markdown content for the dashboard
     *
     * @param context - The dashboard and metadata
     * @returns Formatted markdown string
     */
    render(context: DashboardViewContext): string;

    /**
     * Optional: Validate the generated markdown
     * Useful for ensuring quality in production
     *
     * @param markdown - The generated markdown
     * @returns True if valid, or error message
     */
    validate?(markdown: string): boolean | string;

    /**
     * Optional: Get filename for this dashboard
     * Override if view needs custom naming
     *
     * @param tag - The tag being rendered
     * @param folder - The dashboard folder
     * @returns Full path for the dashboard file
     */
    getFilename?(tag: string, folder: string): string;
}

/**
 * Abstract base class providing common functionality for dashboard views
 */
export abstract class BaseDashboardView implements IDashboardView {
    protected config: DashboardViewConfig;

    constructor(config: DashboardViewConfig) {
        this.config = config;
    }

    getConfig(): DashboardViewConfig {
        return { ...this.config };
    }

    abstract isApplicable(context: DashboardViewContext): ViewApplicabilityResult;
    abstract render(context: DashboardViewContext): string;

    /**
     * Default filename implementation
     */
    getFilename(tag: string, folder: string): string {
        const cleanTag = tag.replace('#', '').replace(/\//g, '-');
        return `${folder}/${cleanTag}.md`;
    }

    /**
     * Basic markdown validation
     */
    validate(markdown: string): boolean | string {
        if (!markdown || markdown.trim().length === 0) {
            return 'Generated markdown is empty';
        }

        // Check for basic structure
        if (!markdown.includes('#')) {
            return 'Markdown missing headers';
        }

        return true;
    }

    /**
     * Helper: Generate file reference with optional line number
     */
    protected formatFileRef(file: string, lineNumber?: number): string {
        let ref = `[[${file}`;
        if (lineNumber) {
            ref += `#L${lineNumber}`;
        }
        ref += ']]';
        return ref;
    }

    /**
     * Helper: Format date safely
     */
    protected formatDate(timestamp?: number): string {
        if (!timestamp) return 'Unknown';
        return new Date(timestamp).toLocaleDateString();
    }

    /**
     * Helper: Clean tag for display
     */
    protected cleanTag(tag: string): string {
        return tag.replace('#', '');
    }

    /**
     * Helper: Generate header with metadata
     */
    protected generateHeader(tag: string, lastUpdated: number, subtitle?: string): string {
        let md = `# ${this.cleanTag(tag)}\n\n`;

        if (subtitle) {
            md += `> ${subtitle}\n`;
        }

        md += `> Last updated: ${this.formatDate(lastUpdated)}\n\n`;
        md += `---\n\n`;

        return md;
    }
}
