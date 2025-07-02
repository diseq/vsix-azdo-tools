export interface Project {
    id: string;
    name: string;
    description?: string;
    url: string;
    state: string;
}

export interface WorkItem {
    // Basic work item properties
    id: number;
    title: string;
    workItemType: string;
    state: string;
    url: string;
    
    // Common system fields
    assignedTo?: string;
    createdBy?: string;
    changedBy?: string;
    createdDate?: string;
    changedDate?: string;
    activatedDate?: string;
    resolvedDate?: string;
    closedDate?: string;
    
    // Core fields
    areaPath?: string;
    iterationPath?: string;
    teamProject?: string;
    description?: string;
    acceptanceCriteria?: string;
    reproductionSteps?: string;
    systemInfo?: string;
    tags?: string;
    
    // Planning and estimation fields
    storyPoints?: number;
    effort?: number;
    originalEstimate?: number;
    remainingWork?: number;
    completedWork?: number;
    activity?: string;
    
    // Priority and severity
    priority?: number;
    severity?: string;
    risk?: string;
    
    // Business value and ranking
    businessValue?: number;
    timeCriticality?: number;
    
    // Version and release fields
    foundIn?: string;
    integratedIn?: string;
    
    // Relations and hierarchy
    parent?: number;
    
    // Links (for references to other items)
    links?: {
        rel: string;
        url: string;
        attributes?: { [key: string]: any };
    }[];
    
    // Custom and additional fields - this contains ALL fields from Azure DevOps API
    // Including any custom fields that might be defined in the organization
    fields?: { [key: string]: any };
    
    // Internal API fields
    rev?: number;
    _links?: {
        self?: { href: string };
        workItemUpdates?: { href: string };
        workItemRevisions?: { href: string };
        workItemComments?: { href: string };
        html?: { href: string };
        workItemType?: { href: string };
        fields?: { href: string };
    };
}

export interface WorkItemLink {
    rel?: string;
    source?: WorkItem;
    target?: WorkItem;
}

export interface WiqlResult {
    workItems?: { id: number; url: string }[];
    workItemRelations?: {
        rel?: string;
        source?: { id: number; url: string };
        target?: { id: number; url: string };
    }[];
    asOf?: string;
    columns?: { referenceName: string; name: string; url: string }[];
}

export interface WorkItemTreeNode {
    workItem: WorkItem;
    children: WorkItemTreeNode[];
}

// Work item creation/update request
export interface WorkItemRequest {
    workItemType?: string; // Required for creation, optional for updates
    fields: { [key: string]: any };
}

// Work item comment
export interface WorkItemComment {
    id: number;
    text: string;
    createdBy: {
        displayName: string;
        uniqueName: string;
        id: string;
    };
    createdDate: string;
    modifiedBy?: {
        displayName: string;
        uniqueName: string;
        id: string;
    };
    modifiedDate?: string;
    url: string;
}

// Work item update/revision
export interface WorkItemUpdate {
    id: number;
    rev: number;
    revisedBy: {
        displayName: string;
        uniqueName: string;
        id: string;
    };
    revisedDate: string;
    fields?: {
        [fieldName: string]: {
            oldValue?: any;
            newValue?: any;
        };
    };
    relations?: {
        added?: any[];
        removed?: any[];
        updated?: any[];
    };
    url: string;
}

// Work item history response
export interface WorkItemHistory {
    workItemId: number;
    updates: WorkItemUpdate[];
}
