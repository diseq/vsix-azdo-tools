import * as vscode from 'vscode';
import { registerChatTools } from './tools';
import { registerAdoCommands } from './commands';

export function activate(context: vscode.ExtensionContext) {
	registerChatTools(context);
	registerAdoCommands(context);
}

export function deactivate() { }