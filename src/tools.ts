import * as vscode from 'vscode';
import { 
    AdoLoginTool, 
    AdoProjectsTool,
    AdoWiqlWorkItemsTool,
    AdoWiqlWorkItemLinksTool,
    AdoCreateWorkItemTool,
    AdoUpdateWorkItemTool,
    AdoDeleteWorkItemTool,
    AdoGetWorkItemHistoryTool,
    AdoGetWorkItemCommentsTool,
    AdoAddWorkItemCommentTool
} from './adoTools';

export function registerChatTools(context: vscode.ExtensionContext) {
	// Azure DevOps tools
	context.subscriptions.push(vscode.lm.registerTool('azure-devops_login', new AdoLoginTool(context)));
	context.subscriptions.push(vscode.lm.registerTool('azure-devops_projects', new AdoProjectsTool(context)));
	context.subscriptions.push(vscode.lm.registerTool('azure-devops_wiql-workitems', new AdoWiqlWorkItemsTool(context)));
	context.subscriptions.push(vscode.lm.registerTool('azure-devops_wiql-workitemlinks', new AdoWiqlWorkItemLinksTool(context)));
	context.subscriptions.push(vscode.lm.registerTool('azure-devops_create-workitem', new AdoCreateWorkItemTool(context)));
	context.subscriptions.push(vscode.lm.registerTool('azure-devops_update-workitem', new AdoUpdateWorkItemTool(context)));
	context.subscriptions.push(vscode.lm.registerTool('azure-devops_delete-workitem', new AdoDeleteWorkItemTool(context)));
	context.subscriptions.push(vscode.lm.registerTool('azure-devops_get-workitem-history', new AdoGetWorkItemHistoryTool(context)));
	context.subscriptions.push(vscode.lm.registerTool('azure-devops_get-workitem-comments', new AdoGetWorkItemCommentsTool(context)));
	context.subscriptions.push(vscode.lm.registerTool('azure-devops_add-workitem-comment', new AdoAddWorkItemCommentTool(context)));
}