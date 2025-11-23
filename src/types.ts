// Core data types for concept dashboard

export interface TagOccurrence {
    tag: string;
    file: string;
    lineNumber: number;
    context: string; // surrounding text
    sentence: string; // full sentence containing the tag
    timestamp?: number; // file modification time
}

export interface TagStatistics {
    tag: string;
    totalOccurrences: number;
    documentCount: number;
    firstAppearance: FileReference;
    lastAppearance: FileReference;
    frequencyTier: 'high' | 'medium' | 'low';
}

export interface FileReference {
    file: string;
    date?: number;
    lineNumber?: number;
}

export interface CoOccurrence {
    tag1: string;
    tag2: string;
    count: number;
    contexts: string[]; // sample contexts where they co-occur
}

export interface SemanticCluster {
    clusterId: number;
    label: string; // auto-generated or user-defined
    contextWords: string[]; // typical words in this cluster
    summary: string; // what this meaning represents
    occurrences: TagOccurrence[];
    representativeSnippets: Snippet[];
}

export interface Snippet {
    text: string;
    file: string;
    lineNumber: number;
    relevanceScore?: number;
}

export interface Definition {
    text: string;
    source: 'corpus' | 'external' | 'user';
    file?: string;
    author?: string;
    url?: string;
}

export interface ConceptRelation {
    relatedTag: string;
    relationshipType: 'co-occurrence' | 'semantic' | 'hierarchical';
    strength: number; // 0-1
    description: string;
    keyPassages: Snippet[];
}

export interface OpenQuestion {
    question: string;
    reason: string; // why this is a question
    relatedPassages?: Snippet[];
}

export interface ConceptDashboard {
    tag: string;
    statistics: TagStatistics;
    meanings: SemanticCluster[];
    definitions: {
        fromCorpus: Definition[];
        external: Definition[];
        working: Definition[];
    };
    relations: ConceptRelation[];
    keyPassages: Snippet[];
    openQuestions: OpenQuestion[];
    furtherReading: FurtherReading[];
    timeline?: TimelineData;
    lastUpdated: number;
}

export interface TimelineData {
    firstSeen: number;
    lastSeen: number;
    dataPoints: {
        date: number;
        count: number;
    }[];
}

export interface FurtherReading {
    title: string;
    url?: string;
    relevance: string;
    source: 'manual' | 'suggested';
}

export interface AnalysisResult {
    tagStatistics: Map<string, TagStatistics>;
    occurrences: Map<string, TagOccurrence[]>;
    coOccurrences: CoOccurrence[];
    clusters: Map<string, SemanticCluster[]>;
    definitions: Map<string, Definition[]>;
    relations: Map<string, ConceptRelation[]>;
}

export interface PluginSettings {
    // Thresholds
    highFrequencyThreshold: number;
    mediumFrequencyThreshold: number;

    // Percentile-based thresholds (alternative)
    usePercentile: boolean;
    topPercentForFull: number;
    middlePercentForModerate: number;

    // Dashboard generation
    dashboardFolder: string;
    autoUpdate: boolean;
    updateOnVaultChange: boolean;

    // Analysis settings
    pythonPath: string;
    contextWindowSize: number; // characters before/after tag
    minClusterSize: number;
    maxClusters: number;

    // External integrations
    useWikipedia: boolean;
    useSemanticScholar: boolean;
    openAIApiKey: string;

    // UI preferences
    showProgressNotifications: boolean;
    defaultView: 'list' | 'graph' | 'timeline';
}

export const DEFAULT_SETTINGS: PluginSettings = {
    highFrequencyThreshold: 20,
    mediumFrequencyThreshold: 5,
    usePercentile: false,
    topPercentForFull: 10,
    middlePercentForModerate: 30,
    dashboardFolder: '_Dashboards',
    autoUpdate: false,
    updateOnVaultChange: false,
    pythonPath: 'python3',
    contextWindowSize: 200,
    minClusterSize: 3,
    maxClusters: 5,
    useWikipedia: false,
    useSemanticScholar: false,
    openAIApiKey: '',
    showProgressNotifications: true,
    defaultView: 'list'
};
