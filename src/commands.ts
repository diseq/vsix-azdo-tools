import * as vscode from 'vscode';
import { AzureDevOpsAuthService } from './auth';
import { AzureDevOpsApiService } from './azureDevOpsApi';

/**
 * Check if readonly mode is enabled
 */
function isReadonlyMode(): boolean {
    const config = vscode.workspace.getConfiguration('azureDevOpsTools');
    return config.get<boolean>('readonly', false);
}

/**
 * Show readonly mode warning and return true if operation should be blocked
 */
function checkReadonlyAndWarn(operationName: string): boolean {
    if (isReadonlyMode()) {
        vscode.window.showWarningMessage(
            `Cannot ${operationName}: Readonly mode is enabled. Use "Azure DevOps: Toggle Readonly Mode" to disable it.`
        );
        return true;
    }
    return false;
}

export function registerAdoCommands(context: vscode.ExtensionContext) {
    // Command to set Azure DevOps organization
    const setOrganizationCommand = vscode.commands.registerCommand('azureDevOps.setOrganization', async () => {
        const input = await vscode.window.showInputBox({
            prompt: 'Enter your Azure DevOps organization URL',
            placeHolder: 'https://dev.azure.com/yourorganization or https://yourorganization.visualstudio.com',
            validateInput: (value) => {
                if (!value) {
                    return 'Organization URL is required';
                }
                if (!value.includes('dev.azure.com') && !value.includes('visualstudio.com')) {
                    return 'Please enter a valid Azure DevOps URL';
                }
                return null;
            }
        });

        if (input) {
            const apiService = AzureDevOpsApiService.getInstance(context);
            apiService.setOrganization(input);
            
            // Store the organization URL in settings for persistence
            await context.globalState.update('azureDevOpsOrganization', input);
            
            vscode.window.showInformationMessage(`Azure DevOps organization set to: ${input}`);
        }
    });

    // Command to sign in
    const signInCommand = vscode.commands.registerCommand('azureDevOps.signIn', async () => {
        try {
            const authService = AzureDevOpsAuthService.getInstance(context);
            await authService.getAccessToken();
            vscode.window.showInformationMessage('Successfully signed in to Azure DevOps!');
        } catch (error) {
            vscode.window.showErrorMessage(`Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    // Command to sign in with device code
    const signInDeviceCodeCommand = vscode.commands.registerCommand('azureDevOps.signInDeviceCode', async () => {
        try {
            const authService = AzureDevOpsAuthService.getInstance(context);
            await authService.getAccessTokenDeviceCode();
            vscode.window.showInformationMessage('Successfully signed in to Azure DevOps using device code!');
        } catch (error) {
            vscode.window.showErrorMessage(`Device code sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    // Command to sign in with VS Code authentication
    const signInVSCodeCommand = vscode.commands.registerCommand('azureDevOps.signInVSCode', async () => {
        try {
            const authService = AzureDevOpsAuthService.getInstance(context);
            await authService.getAccessTokenVSCodeAuth();
            vscode.window.showInformationMessage('Successfully signed in to Azure DevOps using VS Code authentication!');
        } catch (error) {
            vscode.window.showErrorMessage(`VS Code authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    // Command to sign out
    const signOutCommand = vscode.commands.registerCommand('azureDevOps.signOut', async () => {
        try {
            const authService = AzureDevOpsAuthService.getInstance(context);
            await authService.signOut();
        } catch (error) {
            vscode.window.showErrorMessage(`Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    // Command to test connection
    const testConnectionCommand = vscode.commands.registerCommand('azureDevOps.testConnection', async () => {
        try {
            const apiService = AzureDevOpsApiService.getInstance(context);
            
            if (!apiService.getOrganization()) {
                vscode.window.showWarningMessage('Please set your Azure DevOps organization first.');
                return;
            }

            const isConnected = await apiService.testConnection();
            if (isConnected) {
                vscode.window.showInformationMessage('Successfully connected to Azure DevOps!');
            } else {
                vscode.window.showErrorMessage('Failed to connect to Azure DevOps. Please check your authentication and organization settings.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    // Command to show authentication status
    const statusCommand = vscode.commands.registerCommand('azureDevOps.status', async () => {
        try {
            const authService = AzureDevOpsAuthService.getInstance(context);
            const apiService = AzureDevOpsApiService.getInstance(context);
            const isAuthenticated = await authService.isAuthenticated();
            const organization = apiService.getOrganization();
            const readonlyMode = isReadonlyMode();

            // Test connection if authenticated and organization is set
            let connectionStatus = 'Not tested';
            if (isAuthenticated && organization) {
                try {
                    const isConnected = await apiService.testConnection();
                    connectionStatus = isConnected ? 'Connected' : 'Connection failed';
                } catch (error) {
                    connectionStatus = 'Connection test failed';
                }
            }

            const panel = vscode.window.createWebviewPanel(
                'adoStatus',
                'Azure DevOps Status',
                vscode.ViewColumn.One,
                {}
            );

            panel.webview.html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Azure DevOps Status</title>
                    <style>
                        body { font-family: var(--vscode-font-family); padding: 20px; }
                        h1 { color: var(--vscode-foreground); }
                        .status-item { margin: 10px 0; }
                        .success { color: var(--vscode-terminal-ansiGreen); }
                        .error { color: var(--vscode-terminal-ansiRed); }
                        .warning { color: var(--vscode-terminal-ansiYellow); }
                        .debug { background: var(--vscode-editor-background); padding: 10px; margin: 10px 0; border-left: 3px solid var(--vscode-terminal-ansiBlue); }
                    </style>
                </head>
                <body>
                    <h1>Azure DevOps Extension Status</h1>
                    <div class="status-item">
                        <strong>Authentication:</strong> 
                        <span class="${isAuthenticated ? 'success' : 'error'}">
                            ${isAuthenticated ? '✅ Signed in' : '❌ Not signed in'}
                        </span>
                    </div>
                    <div class="status-item">
                        <strong>Organization:</strong> 
                        <span class="${organization ? 'success' : 'error'}">
                            ${organization || '❌ Not configured'}
                        </span>
                    </div>
                    ${isAuthenticated && organization ? `
                        <div class="status-item">
                            <strong>Connection:</strong> 
                            <span class="${connectionStatus === 'Connected' ? 'success' : 'error'}">
                                ${connectionStatus === 'Connected' ? '✅ Connected' : '❌ ' + connectionStatus}
                            </span>
                        </div>
                    ` : ''}
                    <div class="status-item">
                        <strong>Readonly Mode:</strong> 
                        <span class="${readonlyMode ? 'warning' : 'success'}">
                            ${readonlyMode ? '🔒 Enabled (write operations blocked)' : '🔓 Disabled (write operations allowed)'}
                        </span>
                    </div>
                    
                    <div class="debug">
                        <strong>Debug Information:</strong><br>
                        Base URL: ${organization || 'Not set'}<br>
                        Expected API URL: ${organization ? organization + '/projects?api-version=7.1' : 'Not available'}
                    </div>
                    
                    ${!isAuthenticated ? `
                        <div style="margin: 20px 0; padding: 15px; background: var(--vscode-editor-background); border-left: 3px solid var(--vscode-terminal-ansiBlue);">
                            <h3>Sign In Options</h3>
                            <p><strong>Azure DevOps: Sign In (Interactive Browser)</strong> - Uses a web browser for authentication with streamlined flow</p>
                            <p><strong>Azure DevOps: Sign In (Device Code)</strong> - Uses device code flow, ideal for headless or restricted environments</p>
                            <p><strong>Azure DevOps: Sign In</strong> - Default authentication method (device code flow)</p>
                        </div>
                    ` : ''}
                    ${!organization ? '<p><em>Run "Azure DevOps: Set Organization" to configure your organization</em></p>' : ''}
                    
                    <p><strong>Troubleshooting:</strong></p>
                    <ul>
                        <li>Check VS Code Developer Console (Help → Toggle Developer Tools) for detailed error logs</li>
                        <li>Ensure your organization URL is correct: https://dev.azure.com/yourorg</li>
                        <li>Verify you have access to the Azure DevOps organization</li>
                    </ul>
                </body>
                </html>
            `;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    // Command to toggle readonly mode
    const toggleReadonlyCommand = vscode.commands.registerCommand('azureDevOps.toggleReadonly', async () => {
        const config = vscode.workspace.getConfiguration('azureDevOpsTools');
        const currentValue = config.get<boolean>('readonly', false);
        const newValue = !currentValue;
        
        await config.update('readonly', newValue, vscode.ConfigurationTarget.Global);
        
        const status = newValue ? 'enabled' : 'disabled';
        const icon = newValue ? '🔒' : '🔓';
        const message = `${icon} Readonly mode ${status}. ${newValue ? 'Write operations are now blocked.' : 'Write operations are now allowed.'}`;
        
        vscode.window.showInformationMessage(message);
    });

    context.subscriptions.push(
        setOrganizationCommand,
        signInCommand,
        signInDeviceCodeCommand,
        signInVSCodeCommand,
        signOutCommand,
        testConnectionCommand,
        statusCommand,
        toggleReadonlyCommand
    );

    // Initialize organization from stored settings
    const storedOrganization = context.globalState.get<string>('azureDevOpsOrganization');
    if (storedOrganization) {
        const apiService = AzureDevOpsApiService.getInstance(context);
        apiService.setOrganization(storedOrganization);
    }
}
