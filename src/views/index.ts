/**
 * Pluggable Dashboard View System
 *
 * This module provides a flexible, extensible system for generating dashboard views.
 *
 * ## Core Concepts
 *
 * - **IDashboardView**: Interface that all views must implement
 * - **DashboardViewRegistry**: Central registry for managing views
 * - **ViewFactory**: High-level API for generating dashboards
 * - **Built-in Views**: Default implementations (high/medium/low frequency)
 *
 * ## Usage
 *
 * ```typescript
 * import { globalViewRegistry, registerBuiltInViews, ViewFactory } from './views';
 *
 * // Register built-in views
 * registerBuiltInViews(globalViewRegistry);
 *
 * // Create factory
 * const factory = new ViewFactory(globalViewRegistry);
 *
 * // Generate dashboard
 * const result = factory.generate(dashboard);
 * console.log(result.markdown);
 * ```
 *
 * ## Creating Custom Views
 *
 * ```typescript
 * import { BaseDashboardView, DashboardViewContext } from './views';
 *
 * class MyCustomView extends BaseDashboardView {
 *   constructor() {
 *     super({
 *       id: 'my-custom-view',
 *       name: 'My Custom View',
 *       description: 'A custom dashboard layout',
 *       enabled: true,
 *       priority: 90
 *     });
 *   }
 *
 *   isApplicable(context: DashboardViewContext) {
 *     // Your logic here
 *     return { applicable: true, score: 90 };
 *   }
 *
 *   render(context: DashboardViewContext): string {
 *     // Your rendering logic here
 *     return '# My Dashboard\n\n...';
 *   }
 * }
 *
 * // Register your view
 * globalViewRegistry.register(new MyCustomView());
 * ```
 */

export type {
    // Core interfaces and types
    IDashboardView,
    DashboardViewConfig,
    DashboardViewContext,
    ViewApplicabilityResult
} from './IDashboardView';

export {
    BaseDashboardView
} from './IDashboardView';

export type {
    // Registry types
    ViewSelectionOptions,
    ViewSelectionResult
} from './DashboardViewRegistry';

export {
    // Registry
    DashboardViewRegistry,
    globalViewRegistry
} from './DashboardViewRegistry';

export type {
    // Factory types
    DashboardGenerationOptions,
    DashboardGenerationResult
} from './ViewFactory';

export {
    // Factory
    ViewFactory
} from './ViewFactory';

export {
    // Built-in views
    HighFrequencyView,
    MediumFrequencyView,
    LowFrequencyView,
    registerBuiltInViews
} from './BuiltInViews';
