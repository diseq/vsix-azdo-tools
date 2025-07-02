import * as vscode from 'vscode';
import { AzureDevOpsAuthService } from './auth';
import { Project, WorkItem, WorkItemLink, WiqlResult, WorkItemTreeNode, WorkItemComment, WorkItemHistory, WorkItemUpdate } from './models';

/**
 * Check if readonly mode is enabled
 */
function isReadonlyMode(): boolean {
    const config = vscode.workspace.getConfiguration('azureDevOpsTools');
    return config.get<boolean>('readonly', false);
}

/**
 * Throw error if readonly mode is enabled
 */
function checkReadonlyMode(operationName: string): void {
    if (isReadonlyMode()) {
        throw new Error(`Cannot ${operationName}: Readonly mode is enabled. Use "Azure DevOps: Toggle Readonly Mode" to disable it.`);
    }
}

export class AzureDevOpsApiService {
    private static instance: AzureDevOpsApiService;
    private authService: AzureDevOpsAuthService;
    private baseUrl: string = '';
    private outputChannel: vscode.OutputChannel;

    constructor(private context: vscode.ExtensionContext) {
        this.authService = AzureDevOpsAuthService.getInstance(context);
        this.outputChannel = vscode.window.createOutputChannel('Azure DevOps API');
    }

    public static getInstance(context: vscode.ExtensionContext): AzureDevOpsApiService {
        if (!AzureDevOpsApiService.instance) {
            AzureDevOpsApiService.instance = new AzureDevOpsApiService(context);
        }
        return AzureDevOpsApiService.instance;
    }

    /**
     * Set the Azure DevOps organization URL
     */
    public setOrganization(organizationUrl: string): void {
        // Clean up the URL and ensure it's properly formatted
        let cleanUrl = organizationUrl.trim();
        
        // Remove trailing slash if present
        if (cleanUrl.endsWith('/')) {
            cleanUrl = cleanUrl.slice(0, -1);
        }
        
        // Remove _apis if already present
        if (cleanUrl.endsWith('/_apis')) {
            cleanUrl = cleanUrl.slice(0, -6);
        }
        
        // Set the base URL without _apis (will be added to individual calls)
        this.baseUrl = cleanUrl;
    }

    /**
     * Get the current organization URL
     */
    public getOrganization(): string {
        return this.baseUrl;
    }

    /**
     * Test the connection to Azure DevOps
     */
    public async testConnection(): Promise<boolean> {
        try {
            if (!this.baseUrl) {
                throw new Error('Organization URL not set. Please configure your Azure DevOps organization first.');
            }

            const headers = await this.authService.getAuthHeaders();
            const url = `${this.baseUrl}/_apis/projects?api-version=7.1`;
            
            this.log(`Testing connection to: ${url}`);

            const response = await fetch(url, {
                headers
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logError('Connection test failed:', response.status, response.statusText, errorText.substring(0, 200));
            }

            return response.ok;
        } catch (error) {
            this.logError('Connection test failed:', error);
            return false;
        }
    }

    /**
     * Get all projects in the organization
     */
    public async getProjects(): Promise<Project[]> {
        try {
            if (!this.baseUrl) {
                throw new Error('Organization URL not set. Please configure your Azure DevOps organization first.');
            }

            const headers = await this.authService.getAuthHeaders();
            const url = `${this.baseUrl}/_apis/projects?api-version=7.1`;
            
            this.log(`Fetching projects from: ${url}`);
            this.log('Headers:', JSON.stringify(headers, null, 2));

            const response = await fetch(url, {
                headers
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logError('Projects fetch failed:', errorText);
                throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}. Response: ${errorText.substring(0, 200)}...`);
            }

            const data = await response.json();
            
            if (!data.value) {
                this.logError('Unexpected response format:', data);
                throw new Error('Unexpected response format from Azure DevOps API');
            }

            return data.value.map((project: any) => ({
                id: project.id,
                name: project.name,
                description: project.description,
                url: project.url,
                state: project.state
            }));
        } catch (error) {
            this.logError('Error fetching projects:', error);
            throw error;
        }
    }

    /**
     * Execute WIQL query for work items (flat results)
     * Use this for queries like: SELECT [System.Id], [System.Title] FROM WorkItems WHERE...
     */
    public async executeWiqlWorkItems(
        wiqlQuery: string,
        scope: 'organization' | 'project' | 'team',
        projectName?: string,
        teamName?: string,
        top: number = 50
    ): Promise<WorkItem[]> {
        try {
            if (!this.baseUrl) {
                throw new Error('Organization URL not set. Please configure your Azure DevOps organization first.');
            }

            const headers = await this.authService.getAuthHeaders();
            
            // Build the appropriate URL based on scope
            let wiqlUrl: string;
            switch (scope) {
                case 'organization':
                    wiqlUrl = `${this.baseUrl}/_apis/wit/wiql?api-version=7.1`;
                    break;
                case 'project':
                    if (!projectName) {
                        throw new Error('Project name is required for project-level queries');
                    }
                    wiqlUrl = `${this.baseUrl}/${encodeURIComponent(projectName)}/_apis/wit/wiql?api-version=7.1`;
                    break;
                case 'team':
                    if (!projectName || !teamName) {
                        throw new Error('Project name and team name are required for team-level queries');
                    }
                    wiqlUrl = `${this.baseUrl}/${encodeURIComponent(projectName)}/${encodeURIComponent(teamName)}/_apis/wit/wiql?api-version=7.1`;
                    break;
                default:
                    throw new Error(`Unsupported scope: ${scope}`);
            }

            const queryPayload = { query: wiqlQuery };

            this.log(`Executing WIQL work items query at ${scope} level:`, wiqlUrl);
            this.log('Query:', wiqlQuery);

            const wiqlResponse = await fetch(wiqlUrl, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(queryPayload)
            });

            if (!wiqlResponse.ok) {
                const errorText = await wiqlResponse.text();
                this.logError('WIQL work items query failed:', errorText);
                throw new Error(`Failed to execute WIQL work items query: ${wiqlResponse.status} ${wiqlResponse.statusText}`);
            }

            const wiqlData: WiqlResult = await wiqlResponse.json();
            this.log('WIQL Work Items Response:', JSON.stringify(wiqlData, null, 2));
            
            if (!wiqlData.workItems || wiqlData.workItems.length === 0) {
                return [];
            }

            const workItemIds = wiqlData.workItems.slice(0, top).map((wi: { id: number; url: string }) => wi.id);
            
            // Get work items by IDs with full details
            return await this.getWorkItemsByIds(workItemIds);
        } catch (error) {
            this.logError('Error executing WIQL work items query:', error);
            throw error;
        }
    }

    /**
     * Execute WIQL query for work item links (tree/hierarchical results)
     * Use this for queries like: SELECT [System.Id], [System.Links.LinkType], [System.TeamProject] FROM WorkItemLinks WHERE...
     */
    public async executeWiqlWorkItemLinks(
        wiqlQuery: string,
        scope: 'organization' | 'project' | 'team',
        projectName?: string,
        teamName?: string,
        top: number = 50
    ): Promise<WorkItemTreeNode[]> {
        try {
            if (!this.baseUrl) {
                throw new Error('Organization URL not set. Please configure your Azure DevOps organization first.');
            }

            const headers = await this.authService.getAuthHeaders();
            
            // Build the appropriate URL based on scope
            let wiqlUrl: string;
            switch (scope) {
                case 'organization':
                    wiqlUrl = `${this.baseUrl}/_apis/wit/wiql?api-version=7.1`;
                    break;
                case 'project':
                    if (!projectName) {
                        throw new Error('Project name is required for project-level queries');
                    }
                    wiqlUrl = `${this.baseUrl}/${encodeURIComponent(projectName)}/_apis/wit/wiql?api-version=7.1`;
                    break;
                case 'team':
                    if (!projectName || !teamName) {
                        throw new Error('Project name and team name are required for team-level queries');
                    }
                    wiqlUrl = `${this.baseUrl}/${encodeURIComponent(projectName)}/${encodeURIComponent(teamName)}/_apis/wit/wiql?api-version=7.1`;
                    break;
                default:
                    throw new Error(`Unsupported scope: ${scope}`);
            }

            const queryPayload = { query: wiqlQuery };

            this.log(`Executing WIQL work item links query at ${scope} level:`, wiqlUrl);
            this.log('Query:', wiqlQuery);

            const wiqlResponse = await fetch(wiqlUrl, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(queryPayload)
            });

            if (!wiqlResponse.ok) {
                const errorText = await wiqlResponse.text();
                this.logError('WIQL work item links query failed:', errorText);
                throw new Error(`Failed to execute WIQL work item links query: ${wiqlResponse.status} ${wiqlResponse.statusText}`);
            }

            const wiqlData: WiqlResult = await wiqlResponse.json();
            this.log('WIQL Work Item Links Response:', JSON.stringify(wiqlData, null, 2));
            
            if (!wiqlData.workItemRelations || wiqlData.workItemRelations.length === 0) {
                return [];
            }

            // Get all unique work item IDs from the relations
            const allWorkItemIds = new Set<number>();
            wiqlData.workItemRelations.slice(0, top).forEach((relation: any) => {
                if (relation.source?.id) {
                    allWorkItemIds.add(relation.source.id);
                }
                if (relation.target?.id) {
                    allWorkItemIds.add(relation.target.id);
                }
            });

            // Fetch all work items
            const workItems = await this.getWorkItemsByIds(Array.from(allWorkItemIds));
            const workItemMap = new Map<number, WorkItem>();
            workItems.forEach(wi => workItemMap.set(wi.id, wi));

            // Build tree structure from relations
            return this.buildWorkItemTree(wiqlData.workItemRelations, workItemMap);
        } catch (error) {
            this.logError('Error executing WIQL work item links query:', error);
            throw error;
        }
    }

    /**
     * Create a new work item
     */
    public async createWorkItem(
        projectName: string,
        workItemType: string,
        fields: { [key: string]: any }
    ): Promise<WorkItem> {
        checkReadonlyMode('create work item');
        
        try {
            if (!this.baseUrl) {
                throw new Error('Organization URL not set. Please configure your Azure DevOps organization first.');
            }

            const headers = await this.authService.getAuthHeaders();
            const url = `${this.baseUrl}/${encodeURIComponent(projectName)}/_apis/wit/workitems/$${encodeURIComponent(workItemType)}?api-version=7.1`;
            
            // Build the JSON Patch document for creation
            const patchDocument = Object.entries(fields).map(([fieldName, value]) => ({
                op: 'add',
                path: `/fields/${fieldName}`,
                value: value
            }));

            this.log(`Creating work item in project ${projectName} of type ${workItemType}:`, url);
            this.log('Fields:', JSON.stringify(fields, null, 2));

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json-patch+json'
                },
                body: JSON.stringify(patchDocument)
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logError('Work item creation failed:', errorText);
                throw new Error(`Failed to create work item: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            this.log('Work item created successfully:', JSON.stringify(data, null, 2));
            
            return this.mapWorkItemFromApi(data);
        } catch (error) {
            this.logError('Error creating work item:', error);
            throw error;
        }
    }

    /**
     * Update an existing work item
     */
    public async updateWorkItem(
        workItemId: number,
        fields: { [key: string]: any }
    ): Promise<WorkItem> {
        checkReadonlyMode('update work item');
        
        try {
            if (!this.baseUrl) {
                throw new Error('Organization URL not set. Please configure your Azure DevOps organization first.');
            }

            const headers = await this.authService.getAuthHeaders();
            const url = `${this.baseUrl}/_apis/wit/workitems/${workItemId}?api-version=7.1`;
            
            // Build the JSON Patch document for update
            const patchDocument = Object.entries(fields).map(([fieldName, value]) => ({
                op: 'replace',
                path: `/fields/${fieldName}`,
                value: value
            }));

            this.log(`Updating work item ${workItemId}:`, url);
            this.log('Fields:', JSON.stringify(fields, null, 2));

            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json-patch+json'
                },
                body: JSON.stringify(patchDocument)
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logError('Work item update failed:', errorText);
                throw new Error(`Failed to update work item: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            this.log('Work item updated successfully:', JSON.stringify(data, null, 2));
            
            return this.mapWorkItemFromApi(data);
        } catch (error) {
            this.logError('Error updating work item:', error);
            throw error;
        }
    }

    /**
     * Delete a work item
     */
    public async deleteWorkItem(workItemId: number): Promise<void> {
        checkReadonlyMode('delete work item');
        
        try {
            if (!this.baseUrl) {
                throw new Error('Organization URL not set. Please configure your Azure DevOps organization first.');
            }

            const headers = await this.authService.getAuthHeaders();
            const url = `${this.baseUrl}/_apis/wit/workitems/${workItemId}?api-version=7.1`;
            
            this.log(`Deleting work item ${workItemId}:`, url);

            const response = await fetch(url, {
                method: 'DELETE',
                headers
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logError('Work item deletion failed:', errorText);
                throw new Error(`Failed to delete work item: ${response.status} ${response.statusText}`);
            }

            this.log('Work item deleted successfully');
        } catch (error) {
            this.logError('Error deleting work item:', error);
            throw error;
        }
    }

    /**
     * Get work item history/updates
     */
    public async getWorkItemHistory(workItemId: number): Promise<WorkItemHistory> {
        try {
            if (!this.baseUrl) {
                throw new Error('Organization URL not set. Please configure your Azure DevOps organization first.');
            }

            const headers = await this.authService.getAuthHeaders();
            const url = `${this.baseUrl}/_apis/wit/workitems/${workItemId}/updates?api-version=7.1`;
            
            this.log(`Fetching work item history for ${workItemId}:`, url);

            const response = await fetch(url, { headers });

            if (!response.ok) {
                const errorText = await response.text();
                this.logError('Work item history fetch failed:', errorText);
                throw new Error(`Failed to fetch work item history: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            this.log('Work item history fetched:', JSON.stringify(data, null, 2));
            
            if (!data.value) {
                return { workItemId, updates: [] };
            }

            const updates: WorkItemUpdate[] = data.value.map((update: any) => ({
                id: update.id,
                rev: update.rev,
                revisedBy: {
                    displayName: update.revisedBy?.displayName || '',
                    uniqueName: update.revisedBy?.uniqueName || '',
                    id: update.revisedBy?.id || ''
                },
                revisedDate: update.revisedDate,
                fields: update.fields,
                relations: update.relations,
                url: update.url
            }));

            return { workItemId, updates };
        } catch (error) {
            this.logError('Error fetching work item history:', error);
            throw error;
        }
    }

    /**
     * Get work item comments
     */
    public async getWorkItemComments(workItemId: number): Promise<WorkItemComment[]> {
        try {
            if (!this.baseUrl) {
                throw new Error('Organization URL not set. Please configure your Azure DevOps organization first.');
            }

            const headers = await this.authService.getAuthHeaders();
            const url = `${this.baseUrl}/_apis/wit/workitems/${workItemId}/comments?api-version=7.1-preview.3`;
            
            this.log(`Fetching work item comments for ${workItemId}:`, url);

            const response = await fetch(url, { headers });

            if (!response.ok) {
                const errorText = await response.text();
                this.logError('Work item comments fetch failed:', errorText);
                throw new Error(`Failed to fetch work item comments: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            this.log('Work item comments fetched:', JSON.stringify(data, null, 2));
            
            if (!data.comments) {
                return [];
            }

            return data.comments.map((comment: any) => ({
                id: comment.id,
                text: comment.text,
                createdBy: {
                    displayName: comment.createdBy?.displayName || '',
                    uniqueName: comment.createdBy?.uniqueName || '',
                    id: comment.createdBy?.id || ''
                },
                createdDate: comment.createdDate,
                modifiedBy: comment.modifiedBy ? {
                    displayName: comment.modifiedBy.displayName || '',
                    uniqueName: comment.modifiedBy.uniqueName || '',
                    id: comment.modifiedBy.id || ''
                } : undefined,
                modifiedDate: comment.modifiedDate,
                url: comment.url
            }));
        } catch (error) {
            this.logError('Error fetching work item comments:', error);
            throw error;
        }
    }

    /**
     * Add a comment to a work item
     */
    public async addWorkItemComment(workItemId: number, commentText: string): Promise<WorkItemComment> {
        checkReadonlyMode('add work item comment');
        
        try {
            if (!this.baseUrl) {
                throw new Error('Organization URL not set. Please configure your Azure DevOps organization first.');
            }

            const headers = await this.authService.getAuthHeaders();
            const url = `${this.baseUrl}/_apis/wit/workitems/${workItemId}/comments?api-version=7.1-preview.3`;
            
            const requestBody = { text: commentText };

            this.log(`Adding comment to work item ${workItemId}:`, url);
            this.log('Comment text:', commentText);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logError('Work item comment addition failed:', errorText);
                throw new Error(`Failed to add work item comment: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            this.log('Work item comment added successfully:', JSON.stringify(data, null, 2));
            
            return {
                id: data.id,
                text: data.text,
                createdBy: {
                    displayName: data.createdBy?.displayName || '',
                    uniqueName: data.createdBy?.uniqueName || '',
                    id: data.createdBy?.id || ''
                },
                createdDate: data.createdDate,
                modifiedBy: data.modifiedBy ? {
                    displayName: data.modifiedBy.displayName || '',
                    uniqueName: data.modifiedBy.uniqueName || '',
                    id: data.modifiedBy.id || ''
                } : undefined,
                modifiedDate: data.modifiedDate,
                url: data.url
            };
        } catch (error) {
            this.logError('Error adding work item comment:', error);
            throw error;
        }
    }

    /**
     * Get work items by their IDs
     */
    private async getWorkItemsByIds(workItemIds: number[]): Promise<WorkItem[]> {
        if (workItemIds.length === 0) {
            return [];
        }

        try {
            const headers = await this.authService.getAuthHeaders();
            const idsParam = workItemIds.join(',');
            const url = `${this.baseUrl}/_apis/wit/workitems?ids=${idsParam}&$expand=all&api-version=7.1`;
            
            this.log(`Fetching work items by IDs: ${url}`);

            const response = await fetch(url, { headers });

            if (!response.ok) {
                const errorText = await response.text();
                this.logError('Failed to fetch work items by IDs:', errorText);
                throw new Error(`Failed to fetch work items: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.value) {
                return [];
            }

            return data.value.map((item: any) => this.mapWorkItemFromApi(item));
        } catch (error) {
            this.logError('Error fetching work items by IDs:', error);
            throw error;
        }
    }

    /**
     * Map API work item response to WorkItem model
     */
    private mapWorkItemFromApi(item: any): WorkItem {
        const fields = item.fields || {};
        
        return {
            // Basic work item properties
            id: item.id,
            title: fields['System.Title'] || '',
            workItemType: fields['System.WorkItemType'] || '',
            state: fields['System.State'] || '',
            url: item._links?.html?.href || '',
            
            // Common system fields
            assignedTo: fields['System.AssignedTo']?.displayName || fields['System.AssignedTo'],
            createdBy: fields['System.CreatedBy']?.displayName || fields['System.CreatedBy'],
            changedBy: fields['System.ChangedBy']?.displayName || fields['System.ChangedBy'],
            createdDate: fields['System.CreatedDate'],
            changedDate: fields['System.ChangedDate'],
            activatedDate: fields['Microsoft.VSTS.Common.ActivatedDate'],
            resolvedDate: fields['Microsoft.VSTS.Common.ResolvedDate'],
            closedDate: fields['Microsoft.VSTS.Common.ClosedDate'],
            
            // Core fields
            areaPath: fields['System.AreaPath'],
            iterationPath: fields['System.IterationPath'],
            teamProject: fields['System.TeamProject'],
            description: fields['System.Description'],
            acceptanceCriteria: fields['Microsoft.VSTS.Common.AcceptanceCriteria'],
            reproductionSteps: fields['Microsoft.VSTS.TCM.ReproSteps'],
            systemInfo: fields['Microsoft.VSTS.TCM.SystemInfo'],
            tags: fields['System.Tags'],
            
            // Planning and estimation fields
            storyPoints: fields['Microsoft.VSTS.Scheduling.StoryPoints'],
            effort: fields['Microsoft.VSTS.Scheduling.Effort'],
            originalEstimate: fields['Microsoft.VSTS.Scheduling.OriginalEstimate'],
            remainingWork: fields['Microsoft.VSTS.Scheduling.RemainingWork'],
            completedWork: fields['Microsoft.VSTS.Scheduling.CompletedWork'],
            activity: fields['Microsoft.VSTS.Common.Activity'],
            
            // Priority and severity
            priority: fields['Microsoft.VSTS.Common.Priority'],
            severity: fields['Microsoft.VSTS.Common.Severity'],
            risk: fields['Microsoft.VSTS.Common.Risk'],
            
            // Business value and ranking
            businessValue: fields['Microsoft.VSTS.Common.BusinessValue'],
            timeCriticality: fields['Microsoft.VSTS.Common.TimeCriticality'],
            
            // Version and release fields
            foundIn: fields['Microsoft.VSTS.Build.FoundIn'],
            integratedIn: fields['Microsoft.VSTS.Build.IntegrationBuild'],
            
            // Relations and hierarchy
            parent: fields['System.Parent'],
            
            // Links
            links: item.relations?.map((rel: any) => ({
                rel: rel.rel,
                url: rel.url,
                attributes: rel.attributes
            })),
            
            // All raw fields for custom/additional access
            fields: fields,
            
            // Internal API fields
            rev: item.rev,
            _links: item._links
        };
    }

    /**
     * Build tree structure from work item relations
     */
    private buildWorkItemTree(
        relations: WiqlResult['workItemRelations'], 
        workItemMap: Map<number, WorkItem>
    ): WorkItemTreeNode[] {
        const nodeMap = new Map<number, WorkItemTreeNode>();
        const rootNodes: WorkItemTreeNode[] = [];
        const parentChildMap = new Map<number, number[]>(); // parentId -> childIds
        const childParentMap = new Map<number, number>(); // childId -> parentId

        // Create nodes for all work items (without parent/child references)
        workItemMap.forEach((workItem, id) => {
            nodeMap.set(id, {
                workItem,
                children: []
                // Note: No parent property to avoid circular references
            });
        });

        // Build parent-child mapping
        relations?.forEach((relation: any) => {
            if (relation.source?.id && relation.target?.id) {
                const parentId = relation.source.id;
                const childId = relation.target.id;
                
                // Track parent-child relationships
                if (!parentChildMap.has(parentId)) {
                    parentChildMap.set(parentId, []);
                }
                parentChildMap.get(parentId)!.push(childId);
                childParentMap.set(childId, parentId);
            }
        });

        // Build the tree structure without circular references
        nodeMap.forEach((node, nodeId) => {
            const childIds = parentChildMap.get(nodeId) || [];
            node.children = childIds
                .map(childId => nodeMap.get(childId))
                .filter((child): child is WorkItemTreeNode => child !== undefined);
        });

        // Find root nodes (nodes that are not children of any other node)
        nodeMap.forEach((node, nodeId) => {
            if (!childParentMap.has(nodeId)) {
                rootNodes.push(node);
            }
        });

        return rootNodes;
    }



    /**
     * Log a message to the output channel
     */
    private log(message: string, ...args: any[]): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        if (args.length > 0) {
            this.outputChannel.appendLine(`${logMessage} ${args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ')}`);
        } else {
            this.outputChannel.appendLine(logMessage);
        }
    }

    /**
     * Log an error message to the output channel
     */
    private logError(message: string, ...args: any[]): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ERROR: ${message}`;
        if (args.length > 0) {
            this.outputChannel.appendLine(`${logMessage} ${args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ')}`);
        } else {
            this.outputChannel.appendLine(logMessage);
        }
        this.outputChannel.show(true);
    }

}
