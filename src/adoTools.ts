import * as vscode from 'vscode';
import { AzureDevOpsAuthService } from './auth';
import { AzureDevOpsApiService } from './azureDevOpsApi';
import { Project, WorkItem, WorkItemTreeNode, WorkItemComment, WorkItemHistory } from './models';

interface IAdoLoginParameters {
    // No parameters needed for login
}

interface IAdoProjectsParameters {
    // No parameters needed to list projects
}

interface IAdoWiqlWorkItemsParameters {
    wiqlQuery: string;
    scope: 'organization' | 'project' | 'team';
    projectName?: string;
    teamName?: string;
    top?: number;
}

interface IAdoWiqlWorkItemLinksParameters {
    wiqlQuery: string;
    scope: 'organization' | 'project' | 'team';
    projectName?: string;
    teamName?: string;
    top?: number;
}

interface IAdoCreateWorkItemParameters {
    projectName: string;
    workItemType: string;
    fields: { [key: string]: any };
}

interface IAdoUpdateWorkItemParameters {
    workItemId: number;
    fields: { [key: string]: any };
}

interface IAdoDeleteWorkItemParameters {
    workItemId: number;
}

interface IAdoGetWorkItemHistoryParameters {
    workItemId: number;
}

interface IAdoGetWorkItemCommentsParameters {
    workItemId: number;
}

interface IAdoAddWorkItemCommentParameters {
    workItemId: number;
    commentText: string;
}

export class AdoLoginTool implements vscode.LanguageModelTool<IAdoLoginParameters> {
    constructor(private context: vscode.ExtensionContext) {}

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IAdoLoginParameters>,
        _token: vscode.CancellationToken
    ) {
        try {
            const authService = AzureDevOpsAuthService.getInstance(this.context);
            
            // Check if already authenticated
            const currentToken = await authService.getAccessToken();
            if (currentToken) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Already authenticated with Azure DevOps.')
                ]);
            }

            // Attempt authentication using device code flow
            await authService.getAccessTokenDeviceCode();
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart('Successfully authenticated with Azure DevOps.')
            ]);
        } catch (error) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Failed to authenticate with Azure DevOps: ${error instanceof Error ? error.message : 'Unknown error'}`)
            ]);
        }
    }

    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IAdoLoginParameters>,
        _token: vscode.CancellationToken
    ) {
        return {
            invocationMessage: 'Authenticating with Azure DevOps...',
        };
    }
}

export class AdoProjectsTool implements vscode.LanguageModelTool<IAdoProjectsParameters> {
    constructor(private context: vscode.ExtensionContext) {}

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IAdoProjectsParameters>,
        _token: vscode.CancellationToken
    ) {
        try {
            const apiService = AzureDevOpsApiService.getInstance(this.context);

            const projects = await apiService.getProjects();

            if (projects.length === 0) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('No projects found in your Azure DevOps organization.')
                ]);
            }

            const projectList = projects.map((project: Project) => 
                `• **${project.name}** (${project.state})\n  ${project.description || 'No description'}`
            ).join('\n\n');

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Found ${projects.length} projects:\n\n${projectList}`)
            ]);
        } catch (error) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Failed to fetch projects: ${error instanceof Error ? error.message : 'Unknown error'}`)
            ]);
        }
    }

    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IAdoProjectsParameters>,
        _token: vscode.CancellationToken
    ) {
        return {
            invocationMessage: 'Fetching Azure DevOps projects...',
        };
    }
}

export class AdoWiqlWorkItemsTool implements vscode.LanguageModelTool<IAdoWiqlWorkItemsParameters> {
    constructor(private context: vscode.ExtensionContext) {}

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IAdoWiqlWorkItemsParameters>,
        _token: vscode.CancellationToken
    ) {
        try {
            const { wiqlQuery, scope, projectName, teamName, top = 50 } = options.input;
            
            if (!wiqlQuery) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: WIQL query is required.')
                ]);
            }

            const apiService = AzureDevOpsApiService.getInstance(this.context);
            const workItems = await apiService.executeWiqlWorkItems(
                wiqlQuery,
                scope,
                projectName,
                teamName,
                top
            );

            if (workItems.length === 0) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('No work items found matching the query.')
                ]);
            }

            // Return raw serialized work items data
            const serializedWorkItems = JSON.stringify(workItems, null, 2);

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Found ${workItems.length} work items:\n\n\`\`\`json\n${serializedWorkItems}\n\`\`\``)
            ]);
        } catch (error) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Failed to execute WIQL query: ${error instanceof Error ? error.message : 'Unknown error'}`)
            ]);
        }
    }

    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IAdoWiqlWorkItemsParameters>,
        _token: vscode.CancellationToken
    ) {
        return {
            invocationMessage: 'Executing WIQL query for work items...',
        };
    }
}

export class AdoWiqlWorkItemLinksTool implements vscode.LanguageModelTool<IAdoWiqlWorkItemLinksParameters> {
    constructor(private context: vscode.ExtensionContext) {}

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IAdoWiqlWorkItemLinksParameters>,
        _token: vscode.CancellationToken
    ) {
        try {
            const { wiqlQuery, scope, projectName, teamName, top = 50 } = options.input;
            
            if (!wiqlQuery) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: WIQL query is required.')
                ]);
            }

            const apiService = AzureDevOpsApiService.getInstance(this.context);
            const workItemTree = await apiService.executeWiqlWorkItemLinks(
                wiqlQuery,
                scope,
                projectName,
                teamName,
                top
            );

            if (workItemTree.length === 0) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('No work item links found matching the query.')
                ]);
            }

            // Return raw serialized work item tree data
            const serializedWorkItemTree = JSON.stringify(workItemTree, null, 2);
            const totalItems = this.countWorkItems(workItemTree);

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Found ${totalItems} work items in hierarchical structure:\n\n\`\`\`json\n${serializedWorkItemTree}\n\`\`\``)
            ]);
        } catch (error) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Failed to execute WIQL work item links query: ${error instanceof Error ? error.message : 'Unknown error'}`)
            ]);
        }
    }

    private countWorkItems(nodes: WorkItemTreeNode[]): number {
        let count = 0;
        for (const node of nodes) {
            count += 1 + this.countWorkItems(node.children);
        }
        return count;
    }

    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IAdoWiqlWorkItemLinksParameters>,
        _token: vscode.CancellationToken
    ) {
        return {
            invocationMessage: 'Executing WIQL query for work item links...',
        };
    }
}

export class AdoCreateWorkItemTool implements vscode.LanguageModelTool<IAdoCreateWorkItemParameters> {
    constructor(private context: vscode.ExtensionContext) {}

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IAdoCreateWorkItemParameters>,
        _token: vscode.CancellationToken
    ) {
        try {
            const { projectName, workItemType, fields } = options.input;
            
            if (!projectName || !workItemType || !fields) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: Project name, work item type, and fields are required.')
                ]);
            }

            const apiService = AzureDevOpsApiService.getInstance(this.context);
            const workItem = await apiService.createWorkItem(projectName, workItemType, fields);

            const serializedWorkItem = JSON.stringify(workItem, null, 2);

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Work item created successfully:\n\n\`\`\`json\n${serializedWorkItem}\n\`\`\``)
            ]);
        } catch (error) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Failed to create work item: ${error instanceof Error ? error.message : 'Unknown error'}`)
            ]);
        }
    }

    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IAdoCreateWorkItemParameters>,
        _token: vscode.CancellationToken
    ) {
        return {
            invocationMessage: 'Creating work item...',
        };
    }
}

export class AdoUpdateWorkItemTool implements vscode.LanguageModelTool<IAdoUpdateWorkItemParameters> {
    constructor(private context: vscode.ExtensionContext) {}

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IAdoUpdateWorkItemParameters>,
        _token: vscode.CancellationToken
    ) {
        try {
            const { workItemId, fields } = options.input;
            
            if (!workItemId || !fields) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: Work item ID and fields are required.')
                ]);
            }

            const apiService = AzureDevOpsApiService.getInstance(this.context);
            const workItem = await apiService.updateWorkItem(workItemId, fields);

            const serializedWorkItem = JSON.stringify(workItem, null, 2);

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Work item updated successfully:\n\n\`\`\`json\n${serializedWorkItem}\n\`\`\``)
            ]);
        } catch (error) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Failed to update work item: ${error instanceof Error ? error.message : 'Unknown error'}`)
            ]);
        }
    }

    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IAdoUpdateWorkItemParameters>,
        _token: vscode.CancellationToken
    ) {
        return {
            invocationMessage: 'Updating work item...',
        };
    }
}

export class AdoDeleteWorkItemTool implements vscode.LanguageModelTool<IAdoDeleteWorkItemParameters> {
    constructor(private context: vscode.ExtensionContext) {}

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IAdoDeleteWorkItemParameters>,
        _token: vscode.CancellationToken
    ) {
        try {
            const { workItemId } = options.input;
            
            if (!workItemId) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: Work item ID is required.')
                ]);
            }

            const apiService = AzureDevOpsApiService.getInstance(this.context);
            await apiService.deleteWorkItem(workItemId);

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Work item ${workItemId} deleted successfully.`)
            ]);
        } catch (error) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Failed to delete work item: ${error instanceof Error ? error.message : 'Unknown error'}`)
            ]);
        }
    }

    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IAdoDeleteWorkItemParameters>,
        _token: vscode.CancellationToken
    ) {
        return {
            invocationMessage: 'Deleting work item...',
        };
    }
}

export class AdoGetWorkItemHistoryTool implements vscode.LanguageModelTool<IAdoGetWorkItemHistoryParameters> {
    constructor(private context: vscode.ExtensionContext) {}

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IAdoGetWorkItemHistoryParameters>,
        _token: vscode.CancellationToken
    ) {
        try {
            const { workItemId } = options.input;
            
            if (!workItemId) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: Work item ID is required.')
                ]);
            }

            const apiService = AzureDevOpsApiService.getInstance(this.context);
            const history = await apiService.getWorkItemHistory(workItemId);

            const serializedHistory = JSON.stringify(history, null, 2);

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Work item history retrieved:\n\n\`\`\`json\n${serializedHistory}\n\`\`\``)
            ]);
        } catch (error) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Failed to get work item history: ${error instanceof Error ? error.message : 'Unknown error'}`)
            ]);
        }
    }

    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IAdoGetWorkItemHistoryParameters>,
        _token: vscode.CancellationToken
    ) {
        return {
            invocationMessage: 'Fetching work item history...',
        };
    }
}

export class AdoGetWorkItemCommentsTool implements vscode.LanguageModelTool<IAdoGetWorkItemCommentsParameters> {
    constructor(private context: vscode.ExtensionContext) {}

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IAdoGetWorkItemCommentsParameters>,
        _token: vscode.CancellationToken
    ) {
        try {
            const { workItemId } = options.input;
            
            if (!workItemId) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: Work item ID is required.')
                ]);
            }

            const apiService = AzureDevOpsApiService.getInstance(this.context);
            const comments = await apiService.getWorkItemComments(workItemId);

            const serializedComments = JSON.stringify(comments, null, 2);

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Work item comments retrieved (${comments.length} comments):\n\n\`\`\`json\n${serializedComments}\n\`\`\``)
            ]);
        } catch (error) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Failed to get work item comments: ${error instanceof Error ? error.message : 'Unknown error'}`)
            ]);
        }
    }

    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IAdoGetWorkItemCommentsParameters>,
        _token: vscode.CancellationToken
    ) {
        return {
            invocationMessage: 'Fetching work item comments...',
        };
    }
}

export class AdoAddWorkItemCommentTool implements vscode.LanguageModelTool<IAdoAddWorkItemCommentParameters> {
    constructor(private context: vscode.ExtensionContext) {}

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IAdoAddWorkItemCommentParameters>,
        _token: vscode.CancellationToken
    ) {
        try {
            const { workItemId, commentText } = options.input;
            
            if (!workItemId || !commentText) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Error: Work item ID and comment text are required.')
                ]);
            }

            const apiService = AzureDevOpsApiService.getInstance(this.context);
            const comment = await apiService.addWorkItemComment(workItemId, commentText);

            const serializedComment = JSON.stringify(comment, null, 2);

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Comment added successfully:\n\n\`\`\`json\n${serializedComment}\n\`\`\``)
            ]);
        } catch (error) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Failed to add work item comment: ${error instanceof Error ? error.message : 'Unknown error'}`)
            ]);
        }
    }

    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IAdoAddWorkItemCommentParameters>,
        _token: vscode.CancellationToken
    ) {
        return {
            invocationMessage: 'Adding work item comment...',
        };
    }
}
