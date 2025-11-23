import {
    DashboardViewRegistry,
    ViewSelectionOptions,
    ViewSelectionResult
} from './DashboardViewRegistry';
import { DashboardViewContext, IDashboardView } from './IDashboardView';
import { ConceptDashboard } from '../types';

/**
 * Options for dashboard generation
 */
export interface DashboardGenerationOptions {
    /** Force use of a specific view */
    viewId?: string;

    /** Custom global settings to pass to views */
    globalSettings?: Record<string, any>;

    /** Additional metadata */
    metadata?: {
        vaultSize?: number;
        totalTags?: number;
    };

    /** Selection options for automatic view selection */
    selectionOptions?: ViewSelectionOptions;
}

/**
 * Result of dashboard generation
 */
export interface DashboardGenerationResult {
    /** The generated markdown content */
    markdown: string;

    /** The view that was used */
    view: IDashboardView;

    /** The selection result (for debugging) */
    selection: ViewSelectionResult;

    /** Validation result */
    validation: {
        valid: boolean;
        message?: string;
    };

    /** Generation timestamp */
    timestamp: number;
}

/**
 * Factory for generating dashboards using the view system
 *
 * Provides a clean API for dashboard generation with automatic view selection,
 * validation, and error handling.
 */
export class ViewFactory {
    private registry: DashboardViewRegistry;

    constructor(registry: DashboardViewRegistry) {
        this.registry = registry;
    }

    /**
     * Generate a dashboard using the appropriate view
     *
     * @param dashboard - The dashboard data to render
     * @param options - Generation options
     * @returns Generation result with markdown and metadata
     * @throws Error if no applicable view found or generation fails
     */
    generate(
        dashboard: ConceptDashboard,
        options: DashboardGenerationOptions = {}
    ): DashboardGenerationResult {
        const startTime = Date.now();

        // Build context
        const context: DashboardViewContext = {
            dashboard,
            globalSettings: options.globalSettings,
            metadata: {
                ...options.metadata,
                generationTime: startTime
            }
        };

        // Select view
        const selection = this.registry.selectView(context, {
            forceViewId: options.viewId,
            ...options.selectionOptions
        });

        if (!selection.view) {
            const reason = this.getNoViewReason(selection);
            throw new Error(`No applicable view found for dashboard. ${reason}`);
        }

        // Generate markdown
        let markdown: string;
        try {
            markdown = selection.view.render(context);
        } catch (error) {
            throw new Error(
                `View ${selection.view.getConfig().id} failed to render: ${error.message}`
            );
        }

        // Validate
        const validation = this.validateMarkdown(selection.view, markdown);

        // Build result
        return {
            markdown,
            view: selection.view,
            selection,
            validation,
            timestamp: Date.now()
        };
    }

    /**
     * Generate with automatic fallback on error
     *
     * If the selected view fails, tries other applicable views
     */
    generateWithFallback(
        dashboard: ConceptDashboard,
        options: DashboardGenerationOptions = {}
    ): DashboardGenerationResult | null {
        // Try primary generation
        try {
            return this.generate(dashboard, options);
        } catch (error) {
            console.warn('Primary view generation failed:', error);
        }

        // Try fallback views
        const context: DashboardViewContext = {
            dashboard,
            globalSettings: options.globalSettings,
            metadata: options.metadata
        };

        const selection = this.registry.selectView(context, {
            ...options.selectionOptions
        });

        // Try each applicable view
        for (const considered of selection.considered) {
            if (!considered.result.applicable) continue;

            try {
                const markdown = considered.view.render(context);
                const validation = this.validateMarkdown(considered.view, markdown);

                if (validation.valid) {
                    return {
                        markdown,
                        view: considered.view,
                        selection: {
                            view: considered.view,
                            applicability: considered.result,
                            considered: selection.considered
                        },
                        validation,
                        timestamp: Date.now()
                    };
                }
            } catch (error) {
                console.warn(
                    `Fallback view ${considered.view.getConfig().id} failed:`,
                    error
                );
            }
        }

        return null;
    }

    /**
     * Get the filename for a dashboard
     *
     * Uses the view's custom filename logic if available
     */
    getFilename(
        tag: string,
        folder: string,
        dashboard?: ConceptDashboard,
        viewId?: string
    ): string {
        // If specific view requested, use it
        if (viewId) {
            const view = this.registry.getView(viewId);
            if (view && view.getFilename) {
                return view.getFilename(tag, folder);
            }
        }

        // If dashboard provided, select appropriate view
        if (dashboard) {
            const context: DashboardViewContext = { dashboard };
            const selection = this.registry.selectView(context);

            if (selection.view && selection.view.getFilename) {
                return selection.view.getFilename(tag, folder);
            }
        }

        // Default implementation
        const cleanTag = tag.replace('#', '').replace(/\//g, '-');
        return `${folder}/${cleanTag}.md`;
    }

    /**
     * Preview which view would be selected for a dashboard
     */
    previewSelection(
        dashboard: ConceptDashboard,
        options: DashboardGenerationOptions = {}
    ): ViewSelectionResult {
        const context: DashboardViewContext = {
            dashboard,
            globalSettings: options.globalSettings,
            metadata: options.metadata
        };

        return this.registry.selectView(context, {
            forceViewId: options.viewId,
            ...options.selectionOptions
        });
    }

    /**
     * Validate generated markdown
     */
    private validateMarkdown(
        view: IDashboardView,
        markdown: string
    ): { valid: boolean; message?: string } {
        // Use view's validation if available
        if (view.validate) {
            const result = view.validate(markdown);

            if (typeof result === 'boolean') {
                return { valid: result };
            } else {
                return { valid: false, message: result };
            }
        }

        // Basic validation
        if (!markdown || markdown.trim().length === 0) {
            return { valid: false, message: 'Empty markdown' };
        }

        return { valid: true };
    }

    /**
     * Get human-readable reason for no view selection
     */
    private getNoViewReason(selection: ViewSelectionResult): string {
        if (selection.considered.length === 0) {
            return 'No views registered.';
        }

        const reasons = selection.considered
            .map(c => `${c.view.getConfig().name}: ${c.result.reason || 'Not applicable'}`)
            .join('; ');

        return `Considered views: ${reasons}`;
    }

    /**
     * Get the registry (for advanced use)
     */
    getRegistry(): DashboardViewRegistry {
        return this.registry;
    }
}
