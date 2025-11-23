import {
    IDashboardView,
    DashboardViewContext,
    ViewApplicabilityResult,
    DashboardViewConfig
} from './IDashboardView';

/**
 * Options for selecting a view from the registry
 */
export interface ViewSelectionOptions {
    /** Force a specific view by ID (bypasses applicability check) */
    forceViewId?: string;

    /** Minimum score required for automatic selection */
    minScore?: number;

    /** Whether to fall back to first applicable view if no high-score match */
    allowFallback?: boolean;

    /** Custom filter function for views */
    filter?: (view: IDashboardView) => boolean;
}

/**
 * Result of view selection
 */
export interface ViewSelectionResult {
    /** The selected view, or null if none applicable */
    view: IDashboardView | null;

    /** The applicability result */
    applicability: ViewApplicabilityResult | null;

    /** All views that were considered */
    considered: {
        view: IDashboardView;
        result: ViewApplicabilityResult;
    }[];
}

/**
 * Central registry for all dashboard view types
 *
 * Responsibilities:
 * - Register and manage view implementations
 * - Select the best view for a given dashboard
 * - Provide view metadata and configuration
 * - Validate view implementations
 */
export class DashboardViewRegistry {
    private views: Map<string, IDashboardView> = new Map();
    private viewOrder: string[] = []; // Maintains registration order

    /**
     * Register a new dashboard view
     *
     * @param view - The view implementation to register
     * @throws Error if view with same ID already registered
     */
    register(view: IDashboardView): void {
        const config = view.getConfig();

        if (this.views.has(config.id)) {
            throw new Error(
                `Dashboard view with ID '${config.id}' is already registered`
            );
        }

        // Validate view implementation
        this.validateView(view);

        this.views.set(config.id, view);
        this.viewOrder.push(config.id);

        console.log(`Registered dashboard view: ${config.id} (${config.name})`);
    }

    /**
     * Unregister a view by ID
     */
    unregister(viewId: string): boolean {
        const removed = this.views.delete(viewId);
        if (removed) {
            this.viewOrder = this.viewOrder.filter(id => id !== viewId);
            console.log(`Unregistered dashboard view: ${viewId}`);
        }
        return removed;
    }

    /**
     * Get a view by ID
     */
    getView(viewId: string): IDashboardView | null {
        return this.views.get(viewId) || null;
    }

    /**
     * Get all registered views
     */
    getAllViews(): IDashboardView[] {
        return this.viewOrder.map(id => this.views.get(id)!);
    }

    /**
     * Get all enabled views
     */
    getEnabledViews(): IDashboardView[] {
        return this.getAllViews().filter(view => view.getConfig().enabled);
    }

    /**
     * Get view configurations
     */
    getViewConfigs(): DashboardViewConfig[] {
        return this.getAllViews().map(view => view.getConfig());
    }

    /**
     * Update configuration for a specific view
     */
    updateViewConfig(
        viewId: string,
        updates: Partial<DashboardViewConfig>
    ): boolean {
        const view = this.views.get(viewId);
        if (!view) return false;

        const config = view.getConfig();
        Object.assign(config, updates);

        return true;
    }

    /**
     * Select the best view for a given dashboard
     *
     * Selection algorithm:
     * 1. If forceViewId specified, use that view
     * 2. Check all enabled views for applicability
     * 3. Sort by score (descending) and priority (descending)
     * 4. Return highest scoring applicable view
     *
     * @param context - The dashboard context
     * @param options - Selection options
     * @returns Selection result with chosen view
     */
    selectView(
        context: DashboardViewContext,
        options: ViewSelectionOptions = {}
    ): ViewSelectionResult {
        const {
            forceViewId,
            minScore = 0,
            allowFallback = true,
            filter
        } = options;

        // If specific view requested, use it (if it exists and is enabled)
        if (forceViewId) {
            const view = this.views.get(forceViewId);
            if (view && view.getConfig().enabled) {
                const applicability = view.isApplicable(context);
                return {
                    view,
                    applicability,
                    considered: [{ view, result: applicability }]
                };
            }
        }

        // Get enabled views
        let candidates = this.getEnabledViews();

        // Apply custom filter if provided
        if (filter) {
            candidates = candidates.filter(filter);
        }

        // Evaluate all candidates
        const evaluated = candidates.map(view => ({
            view,
            result: view.isApplicable(context),
            config: view.getConfig()
        }));

        // Filter to applicable views
        const applicable = evaluated.filter(
            e => e.result.applicable && e.result.score >= minScore
        );

        // Sort by score (desc), then priority (desc)
        applicable.sort((a, b) => {
            if (b.result.score !== a.result.score) {
                return b.result.score - a.result.score;
            }
            return b.config.priority - a.config.priority;
        });

        // Select best match
        let selected: typeof applicable[0] | undefined = applicable[0];

        // Fallback to first applicable if no high-score match
        if (!selected && allowFallback && evaluated.length > 0) {
            selected = evaluated.find(e => e.result.applicable);
        }

        return {
            view: selected?.view || null,
            applicability: selected?.result || null,
            considered: evaluated.map(e => ({
                view: e.view,
                result: e.result
            }))
        };
    }

    /**
     * Check if any view can handle the given context
     */
    hasApplicableView(context: DashboardViewContext): boolean {
        const result = this.selectView(context);
        return result.view !== null;
    }

    /**
     * Clear all registered views
     */
    clear(): void {
        this.views.clear();
        this.viewOrder = [];
        console.log('Cleared all dashboard views');
    }

    /**
     * Get registry statistics
     */
    getStats() {
        const all = this.getAllViews();
        const enabled = this.getEnabledViews();

        return {
            total: all.length,
            enabled: enabled.length,
            disabled: all.length - enabled.length,
            byPriority: all
                .map(v => ({
                    id: v.getConfig().id,
                    priority: v.getConfig().priority
                }))
                .sort((a, b) => b.priority - a.priority)
        };
    }

    /**
     * Validate that a view implements the interface correctly
     */
    private validateView(view: IDashboardView): void {
        // Check required methods exist
        if (typeof view.getConfig !== 'function') {
            throw new Error('View must implement getConfig()');
        }

        if (typeof view.isApplicable !== 'function') {
            throw new Error('View must implement isApplicable()');
        }

        if (typeof view.render !== 'function') {
            throw new Error('View must implement render()');
        }

        // Validate config
        const config = view.getConfig();
        if (!config.id || typeof config.id !== 'string') {
            throw new Error('View config must have a valid string ID');
        }

        if (!config.name || typeof config.name !== 'string') {
            throw new Error('View config must have a valid string name');
        }

        if (typeof config.enabled !== 'boolean') {
            throw new Error('View config must have a boolean enabled property');
        }

        if (typeof config.priority !== 'number') {
            throw new Error('View config must have a numeric priority');
        }

        // Test that the view can execute basic operations
        try {
            const testContext: DashboardViewContext = {
                dashboard: null as any // Will cause error if view doesn't handle gracefully
            };

            // This should not throw, even with invalid context
            // Views should validate their inputs
            const result = view.isApplicable(testContext);

            if (typeof result !== 'object' || result === null) {
                throw new Error('isApplicable must return an object');
            }

            if (typeof result.applicable !== 'boolean') {
                throw new Error('isApplicable result must have boolean applicable');
            }

            if (typeof result.score !== 'number') {
                throw new Error('isApplicable result must have numeric score');
            }
        } catch (error) {
            console.warn(
                `View ${config.id} failed validation test:`,
                error
            );
            // Don't throw - allow registration but log warning
        }
    }

    /**
     * Export registry state for persistence
     */
    exportState() {
        return {
            configs: this.getViewConfigs(),
            order: [...this.viewOrder]
        };
    }
}

/**
 * Singleton instance of the registry
 * Use this for global view management
 */
export const globalViewRegistry = new DashboardViewRegistry();
