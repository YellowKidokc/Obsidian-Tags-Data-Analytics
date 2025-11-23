# Pluggable Dashboard Views System

## Overview

The Concept Dashboard plugin now features a **production-grade pluggable view system** that allows you to:

- ✅ **Customize** how dashboards are rendered
- ✅ **Extend** the plugin with custom view types
- ✅ **Configure** which views are enabled/disabled
- ✅ **Control** view selection and priorities
- ✅ **Maintain** full backward compatibility

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                   DashboardGenerator                     │
│              (Backward Compatible API)                   │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    ViewFactory                           │
│         (High-level generation API)                      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              DashboardViewRegistry                       │
│         (Manages all registered views)                   │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  IDashboardView                          │
│              (View Implementation)                       │
│                                                          │
│  • HighFrequencyView  (≥20 occurrences)                 │
│  • MediumFrequencyView (5-19 occurrences)               │
│  • LowFrequencyView   (1-4 occurrences)                 │
│  • YourCustomView     (your implementation)             │
└─────────────────────────────────────────────────────────┘
```

### Key Concepts

1. **IDashboardView**: Interface that all views must implement
2. **DashboardViewRegistry**: Central registry managing all views
3. **ViewFactory**: Intelligent view selection and generation
4. **BaseDashboardView**: Abstract base class with helpers

## Using the System

### Basic Usage (No Changes Required)

The system is **100% backward compatible**. Your existing code continues to work:

```typescript
const generator = new DashboardGenerator();
const markdown = generator.generateDashboard(dashboard);
```

### Advanced Usage

#### 1. Force a Specific View

```typescript
const generator = new DashboardGenerator();
const markdown = generator.generateDashboard(dashboard, {
    viewId: 'medium-frequency'  // Force medium view
});
```

#### 2. Get Generation Metadata

```typescript
const result = generator.generateWithResult(dashboard);

console.log(`Used view: ${result.view.getConfig().name}`);
console.log(`Score: ${result.selection.applicability.score}`);
console.log(`Valid: ${result.validation.valid}`);
console.log(result.markdown);
```

#### 3. Direct ViewFactory Access

```typescript
import { ViewFactory, globalViewRegistry } from './src/views';

const factory = new ViewFactory(globalViewRegistry);
const result = factory.generate(dashboard);
```

## Creating Custom Views

### Step 1: Implement IDashboardView

```typescript
import { BaseDashboardView, DashboardViewContext, ViewApplicabilityResult } from './src/views';

class MyCustomView extends BaseDashboardView {
    constructor() {
        super({
            id: 'my-custom-view',
            name: 'My Custom View',
            description: 'A custom dashboard layout for special cases',
            enabled: true,
            priority: 85,  // Between medium (75) and high (100)
            settings: {
                // Your custom settings
                customOption: true
            }
        });
    }

    /**
     * Determine if this view should be used
     */
    isApplicable(context: DashboardViewContext): ViewApplicabilityResult {
        const stats = context.dashboard.statistics;

        // Example: Use for concepts with exactly 10 occurrences
        if (stats.totalOccurrences === 10) {
            return {
                applicable: true,
                score: 85,
                reason: 'Concept has exactly 10 occurrences'
            };
        }

        return {
            applicable: false,
            score: 0,
            reason: 'Not exactly 10 occurrences'
        };
    }

    /**
     * Generate the markdown
     */
    render(context: DashboardViewContext): string {
        const { dashboard } = context;
        const tag = this.cleanTag(dashboard.tag);

        // Use helper methods from BaseDashboardView
        let md = this.generateHeader(tag, dashboard.lastUpdated, 'Custom Layout');

        // Your custom sections
        md += `## My Custom Section\n\n`;
        md += `This is a special dashboard for ${tag}!\n\n`;

        // Add stats
        md += `**Occurrences:** ${dashboard.statistics.totalOccurrences}\n`;

        return md;
    }

    /**
     * Optional: Custom filename logic
     */
    getFilename(tag: string, folder: string): string {
        const cleanTag = this.cleanTag(tag);
        return `${folder}/custom-${cleanTag}.md`;
    }

    /**
     * Optional: Custom validation
     */
    validate(markdown: string): boolean | string {
        if (!markdown.includes('My Custom Section')) {
            return 'Missing required custom section';
        }
        return true;
    }
}
```

### Step 2: Register Your View

```typescript
import { globalViewRegistry } from './src/views';

// Register once during plugin initialization
globalViewRegistry.register(new MyCustomView());
```

### Step 3: Use It

The view is now automatically considered for all dashboard generation:

```typescript
const generator = new DashboardGenerator();
const markdown = generator.generateDashboard(dashboard);
// Automatically uses MyCustomView if score is highest
```

Or force it:

```typescript
const markdown = generator.generateDashboard(dashboard, {
    viewId: 'my-custom-view'
});
```

## View Selection Algorithm

When generating a dashboard, the system:

1. **Filters** to enabled views
2. **Evaluates** each view's `isApplicable()` method
3. **Scores** each applicable view (0-100)
4. **Sorts** by score (descending), then priority (descending)
5. **Selects** the highest scoring view

### Example Scenario

```
Dashboard: tag with 15 occurrences

View Evaluation:
- HighFrequencyView:   applicable=false, score=0   (needs ≥20)
- MediumFrequencyView: applicable=true,  score=75  (matches 5-19)
- LowFrequencyView:    applicable=false, score=0   (needs ≤4)
- MyCustomView:        applicable=false, score=0   (needs exactly 10)

Selected: MediumFrequencyView (only applicable, score=75)
```

## Configuration

### In Settings UI

Navigate to Settings → Concept Dashboard → Dashboard Views:

- **Enable/Disable** views with toggles
- **View Statistics** showing total/enabled/disabled count
- **Priority Information** for each view

### Programmatically

```typescript
import { globalViewRegistry } from './src/views';

// Disable a view
globalViewRegistry.updateViewConfig('low-frequency', {
    enabled: false
});

// Change priority
globalViewRegistry.updateViewConfig('my-custom-view', {
    priority: 90
});

// Get all views
const views = globalViewRegistry.getAllViews();
console.log(`Total views: ${views.length}`);

// Get stats
const stats = globalViewRegistry.getStats();
console.log(`${stats.enabled} enabled, ${stats.disabled} disabled`);
```

## Advanced Features

### Fallback Generation

If view generation fails, the system automatically tries other views:

```typescript
const result = generator.generateWithResult(dashboard);
// Tries selected view, falls back to others if it fails
```

### Context Metadata

Pass additional metadata to views:

```typescript
const result = generator.generateDashboard(dashboard, {
    globalSettings: {
        theme: 'dark',
        compact: true
    },
    metadata: {
        vaultSize: 1000,
        totalTags: 250
    }
});
```

Views can access this in their `render()` method:

```typescript
render(context: DashboardViewContext): string {
    const theme = context.globalSettings?.theme || 'light';
    const vaultSize = context.metadata?.vaultSize || 0;

    // Use in rendering...
}
```

### Custom Validation

Implement validation in your views:

```typescript
validate(markdown: string): boolean | string {
    // Check for required sections
    if (!markdown.includes('# ')) {
        return 'Missing main header';
    }

    // Check length
    if (markdown.length < 100) {
        return 'Dashboard too short';
    }

    return true;  // Valid
}
```

The system logs validation warnings automatically.

## Helper Methods (BaseDashboardView)

When extending `BaseDashboardView`, you get these helpers:

### Formatting

```typescript
// Clean tag: removes # prefix
this.cleanTag('#mytag')  // → 'mytag'

// Format file reference with optional line number
this.formatFileRef('myfile.md', 42)  // → '[[myfile.md#L42]]'

// Format date safely
this.formatDate(timestamp)  // → 'Nov 23, 2025'
```

### Header Generation

```typescript
// Generate consistent header
this.generateHeader(
    '#mytag',
    Date.now(),
    'Optional subtitle'
)
// → # mytag
// → > Optional subtitle
// → > Last updated: Nov 23, 2025
// →
// → ---
```

### Default Implementations

```typescript
// Default filename (can be overridden)
getFilename(tag: string, folder: string): string

// Default validation (can be overridden)
validate(markdown: string): boolean | string
```

## Best Practices

### 1. Clear Applicability Logic

Make your `isApplicable()` method's logic obvious:

```typescript
isApplicable(context: DashboardViewContext): ViewApplicabilityResult {
    const stats = context.dashboard.statistics;

    // Clear, documented logic
    if (stats.totalOccurrences >= 100) {
        return {
            applicable: true,
            score: 95,
            reason: `Very high frequency: ${stats.totalOccurrences} occurrences`
        };
    }

    return {
        applicable: false,
        score: 0,
        reason: `Too few occurrences: ${stats.totalOccurrences} < 100`
    };
}
```

### 2. Appropriate Scores

Use the 0-100 score range meaningfully:

- **90-100**: Perfect match, high confidence
- **70-89**: Good match
- **50-69**: Acceptable match
- **0-49**: Poor match (consider not applicable)

### 3. Defensive Rendering

Handle missing data gracefully:

```typescript
render(context: DashboardViewContext): string {
    const { dashboard } = context;

    // Check for required data
    if (!dashboard?.statistics) {
        return '# Error\n\nMissing statistics';
    }

    // Safe access with optional chaining
    const passages = dashboard.keyPassages || [];
    const relations = dashboard.relations || [];

    // ...
}
```

### 4. Consistent Formatting

Use existing helper methods for consistency:

```typescript
// Good ✓
md += `— ${this.formatFileRef(file, line)}\n`;

// Avoid ✗
md += `— [[${file}#L${line}]]\n`;  // Doesn't handle missing data
```

### 5. Validation

Implement validation to catch rendering issues:

```typescript
validate(markdown: string): boolean | string {
    // Check structure
    if (!markdown.includes('# ')) {
        return 'Missing main header';
    }

    // Check for your custom sections
    if (!markdown.includes('## My Section')) {
        return 'Missing required section';
    }

    return true;
}
```

## Migration from Old System

### Before (Hardcoded)

```typescript
// Old: Tightly coupled in DashboardGenerator
private generateHighFrequencyDashboard(dashboard: ConceptDashboard): string {
    // 300 lines of markdown generation
}
```

### After (Pluggable)

```typescript
// New: Clean, modular view class
class HighFrequencyView extends BaseDashboardView {
    render(context: DashboardViewContext): string {
        // Same logic, but now:
        // - Independently testable
        // - Easy to modify
        // - Can be disabled
        // - Can be replaced
    }
}
```

## Testing

### Unit Testing Views

```typescript
import { HighFrequencyView } from './src/views';

describe('HighFrequencyView', () => {
    const view = new HighFrequencyView();

    it('should be applicable for high frequency', () => {
        const context = {
            dashboard: {
                statistics: { totalOccurrences: 50, frequencyTier: 'high' }
            }
        };

        const result = view.isApplicable(context);

        expect(result.applicable).toBe(true);
        expect(result.score).toBe(100);
    });

    it('should generate valid markdown', () => {
        const context = {
            dashboard: mockHighFrequencyDashboard
        };

        const markdown = view.render(context);

        expect(markdown).toContain('# ');
        expect(markdown).toContain('## 1. Snapshot');
        expect(view.validate(markdown)).toBe(true);
    });
});
```

### Integration Testing

```typescript
import { DashboardGenerator } from './src/generators/dashboard-generator';

it('should select correct view', () => {
    const generator = new DashboardGenerator();
    const result = generator.generateWithResult(mediumFrequencyDashboard);

    expect(result.view.getConfig().id).toBe('medium-frequency');
    expect(result.validation.valid).toBe(true);
});
```

## Troubleshooting

### View Not Selected

**Problem**: Your custom view isn't being used

**Solutions**:
1. Check it's registered: `globalViewRegistry.getAllViews()`
2. Check it's enabled: `view.getConfig().enabled`
3. Check applicability: Call `isApplicable()` manually
4. Check score: Ensure score is high enough
5. Check priority: Higher priority wins on same score

### Validation Failures

**Problem**: Validation warnings in console

**Solutions**:
1. Implement `validate()` method
2. Check for null/undefined data
3. Use helpers from `BaseDashboardView`
4. Test with various dashboard types

### Build Errors

**Problem**: TypeScript errors on build

**Solutions**:
1. Use `export type` for type exports with `isolatedModules`
2. Avoid null assignments, use `undefined` or `?`
3. Properly type all method parameters

## Example: Multi-Language Support

Here's a complete example of a view that supports multiple languages:

```typescript
import { BaseDashboardView, DashboardViewContext, ViewApplicabilityResult } from './src/views';

class MultiLingualView extends BaseDashboardView {
    private translations = {
        en: {
            snapshot: 'Snapshot',
            occurrences: 'Occurrences',
            documents: 'Documents'
        },
        es: {
            snapshot: 'Resumen',
            occurrences: 'Ocurrencias',
            documents: 'Documentos'
        }
    };

    constructor(language: 'en' | 'es' = 'en') {
        super({
            id: `multilingual-${language}`,
            name: `Multi-Lingual View (${language.toUpperCase()})`,
            description: `Dashboard in ${language}`,
            enabled: true,
            priority: 80,
            settings: { language }
        });
    }

    isApplicable(context: DashboardViewContext): ViewApplicabilityResult {
        // Apply to all frequency tiers
        return {
            applicable: true,
            score: 80,
            reason: 'Multi-lingual support available'
        };
    }

    render(context: DashboardViewContext): string {
        const { dashboard } = context;
        const lang = this.config.settings.language;
        const t = this.translations[lang];

        let md = this.generateHeader(dashboard.tag, dashboard.lastUpdated);

        md += `## ${t.snapshot}\n\n`;
        md += `- **${t.occurrences}:** ${dashboard.statistics.totalOccurrences}\n`;
        md += `- **${t.documents}:** ${dashboard.statistics.documentCount}\n\n`;

        return md;
    }
}

// Register English and Spanish variants
globalViewRegistry.register(new MultiLingualView('en'));
globalViewRegistry.register(new MultiLingualView('es'));
```

## Performance Considerations

- **View Selection**: O(n) where n = number of registered views (typically < 10)
- **Caching**: Views are registered once at plugin load
- **Validation**: Optional, skipped in production if not needed
- **Fallbacks**: Only triggered on errors, not normal operation

## Future Enhancements

Potential additions to the system:

- [ ] View templates (JSON/YAML configuration)
- [ ] Dynamic view loading from vault
- [ ] View marketplace/sharing
- [ ] Visual view editor
- [ ] A/B testing between views
- [ ] Performance monitoring per view

## Summary

The pluggable view system provides:

✅ **Production-Ready**: Fully tested, robust error handling
✅ **Extensible**: Easy to add custom views
✅ **Maintainable**: Clean separation of concerns
✅ **Backward Compatible**: Existing code works unchanged
✅ **Configurable**: Enable/disable views, adjust priorities
✅ **Type-Safe**: Full TypeScript support
✅ **Documented**: Comprehensive guides and examples

**You now have a world-class dashboard rendering system that can grow with your needs.**
