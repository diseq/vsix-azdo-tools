import * as vscode from 'vscode';
import { PublicClientApplication, AuthenticationResult, Configuration } from '@azure/msal-node';

interface AzureDevOpsToken {
    accessToken: string;
    expiresOn: Date;
}

export class AzureDevOpsAuthService {
    private static instance: AzureDevOpsAuthService;
    private pca: PublicClientApplication;
    private readonly clientId = "872cd9fa-d31f-45e0-9eab-6e460a02d1f1"; // Visual Studio client ID
    private readonly adoResourceId = "499b84ac-1321-427f-aa17-267ca6975798"; // Azure DevOps app ID
    private readonly scope = `${this.adoResourceId}/.default`;
    private readonly secretKey = 'azureDevOpsToken';

    constructor(private context: vscode.ExtensionContext) {
        const msalConfig: Configuration = {
            auth: {
                clientId: this.clientId,
                authority: "https://login.microsoftonline.com/common",
            },
            system: {
                loggerOptions: {
                    loggerCallback: (level, message, containsPii) => {
                        if (!containsPii) {
                            console.log(`[MSAL] ${level}: ${message}`);
                        }
                    },
                    piiLoggingEnabled: false,
                    logLevel: 3, // Info level
                }
            }
        };

        this.pca = new PublicClientApplication(msalConfig);
    }

    public static getInstance(context: vscode.ExtensionContext): AzureDevOpsAuthService {
        if (!AzureDevOpsAuthService.instance) {
            AzureDevOpsAuthService.instance = new AzureDevOpsAuthService(context);
        }
        return AzureDevOpsAuthService.instance;
    }

    /**
     * Get a valid access token for Azure DevOps
     * This will return a cached token if valid, or prompt for authentication method choice if needed
     */
    public async getAccessToken(): Promise<string> {
        try {
            // First, try to get a cached token
            const cachedToken = await this.getCachedToken();
            if (cachedToken && this.isTokenValid(cachedToken)) {
                return cachedToken.accessToken;
            }

            // Try VS Code authentication silently first
            const vscodeToken = await this.getAccessTokenVSCodeAuthSilent();
            if (vscodeToken) {
                return vscodeToken;
            }

            // If no valid cached token, prompt user to choose authentication method
            const authMethod = await vscode.window.showQuickPick([
                {
                    label: 'Microsoft Account (VS Code)',
                    description: 'Use VS Code\'s built-in Microsoft authentication',
                    detail: 'Recommended: Uses your existing VS Code account'
                },
                {
                    label: 'Device Code Flow',
                    description: 'Use device code authentication in browser',
                    detail: 'Alternative method that opens a browser for authentication'
                }
            ], {
                placeHolder: 'Choose authentication method for Azure DevOps',
                ignoreFocusOut: true
            });

            if (!authMethod) {
                throw new Error('Authentication cancelled by user');
            }

            if (authMethod.label === 'Microsoft Account (VS Code)') {
                return await this.getAccessTokenVSCodeAuth();
            } else {
                return await this.getAccessTokenDeviceCode();
            }
        } catch (error) {
            this.logSecureError('Error getting access token', error);
            throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }



    /**
     * Get a valid access token for Azure DevOps using device code flow
     */
    public async getAccessTokenDeviceCode(): Promise<string> {
        try {
            // First, try to get a cached token
            const cachedToken = await this.getCachedToken();
            if (cachedToken && this.isTokenValid(cachedToken)) {
                return cachedToken.accessToken;
            }

            // Acquire a new token using device code flow
            const result = await this.acquireTokenByDeviceCodeFlow();
            if (result?.accessToken) {
                // Store the token securely
                await this.storeToken({
                    accessToken: result.accessToken,
                    expiresOn: result.expiresOn || new Date(Date.now() + 3600000)
                });
                return result.accessToken;
            } else {
                throw new Error('Failed to acquire access token via device code');
            }
        } catch (error) {
            this.logSecureError('Error getting access token (device code)', error);
            throw new Error(`Device code authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get authentication headers for Azure DevOps API calls
     */
    public async getAuthHeaders(): Promise<{ [key: string]: string }> {
        const accessToken = await this.getAccessToken();
        return {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Sign out the user and clear stored tokens
     */
    public async signOut(): Promise<void> {
        try {
            // Clear the stored token
            await this.context.secrets.delete(this.secretKey);
            
            // Clear MSAL cache
            const accounts = await this.pca.getTokenCache().getAllAccounts();
            for (const account of accounts) {
                await this.pca.getTokenCache().removeAccount(account);
            }

            // For VS Code authentication, we don't need to explicitly sign out 
            // as VS Code manages the session lifecycle
            // But we can show a message to inform the user
            const signOutChoice = await vscode.window.showInformationMessage(
                'Successfully signed out of Azure DevOps. Do you also want to sign out of your Microsoft account in VS Code?',
                'Yes', 'No'
            );

            if (signOutChoice === 'Yes') {
                // Try to sign out of Microsoft account in VS Code
                try {
                    const sessions = await vscode.authentication.getSession('microsoft', 
                        [`${this.adoResourceId}/.default`], 
                        { createIfNone: false }
                    );
                    if (sessions) {
                        vscode.window.showInformationMessage('Please use the VS Code account menu to sign out of your Microsoft account if needed.');
                    }
                } catch (error) {
                    // Ignore errors when checking for VS Code sessions
                    this.logSecureError('Could not check VS Code authentication sessions', error);
                }
            } else {
                vscode.window.showInformationMessage('Successfully signed out of Azure DevOps');
            }
        } catch (error) {
            this.logSecureError('Error during sign out', error);
            throw new Error(`Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Check if the user is currently authenticated
     */
    public async isAuthenticated(): Promise<boolean> {
        try {
            const cachedToken = await this.getCachedToken();
            if (cachedToken && this.isTokenValid(cachedToken)) {
                return true;
            }

            // Also check if there's a VS Code authentication session
            try {
                const session = await vscode.authentication.getSession('microsoft', 
                    [`${this.adoResourceId}/.default`], 
                    { createIfNone: false }
                );
                return !!session;
            } catch {
                return false;
            }
        } catch {
            return false;
        }
    }

    /**
     * Get a valid access token for Azure DevOps using VS Code's authentication API
     * This uses the built-in Microsoft authentication provider
     */
    public async getAccessTokenVSCodeAuth(): Promise<string> {
        try {
            // First, try to get a cached token
            const cachedToken = await this.getCachedToken();
            if (cachedToken && this.isTokenValid(cachedToken)) {
                return cachedToken.accessToken;
            }

            // Use VS Code's built-in Microsoft authentication provider
            const session = await vscode.authentication.getSession('microsoft', 
                [`${this.adoResourceId}/.default`], 
                { createIfNone: true }
            );
            
            if (session?.accessToken) {
                // Store the token securely
                await this.storeToken({
                    accessToken: session.accessToken,
                    expiresOn: new Date(Date.now() + 3600000) // Default 1 hour expiry
                });
                return session.accessToken;
            } else {
                throw new Error('Failed to acquire access token via VS Code authentication');
            }
        } catch (error) {
            this.logSecureError('Error getting access token (VS Code auth)', error);
            throw new Error(`VS Code authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get a valid access token for Azure DevOps using VS Code's authentication API (silent)
     * This tries to get an existing session without prompting the user
     */
    public async getAccessTokenVSCodeAuthSilent(): Promise<string | null> {
        try {
            // First, try to get a cached token
            const cachedToken = await this.getCachedToken();
            if (cachedToken && this.isTokenValid(cachedToken)) {
                return cachedToken.accessToken;
            }

            // Try to get an existing session without creating a new one
            const session = await vscode.authentication.getSession('microsoft', 
                [`${this.adoResourceId}/.default`], 
                { createIfNone: false }
            );
            
            if (session?.accessToken) {
                // Store the token securely
                await this.storeToken({
                    accessToken: session.accessToken,
                    expiresOn: new Date(Date.now() + 3600000) // Default 1 hour expiry
                });
                return session.accessToken;
            }
            
            return null; // No existing session
        } catch (error) {
            this.logSecureError('Error getting access token silently (VS Code auth)', error);
            return null;
        }
    }





    private async acquireTokenByDeviceCodeFlow(): Promise<AuthenticationResult | null> {
        try {
            return await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Starting device code authentication...",
                cancellable: false
            }, async () => {
                // Try to get accounts first for silent acquisition
                const accounts = await this.pca.getTokenCache().getAllAccounts();
                
                if (accounts.length > 0) {
                    // Try silent acquisition first
                    try {
                        const silentRequest = {
                            scopes: [this.scope],
                            account: accounts[0]
                        };
                        return await this.pca.acquireTokenSilent(silentRequest);
                    } catch (error) {
                        console.log('Silent acquisition failed, using device code flow');
                    }
                }

                // Use device code flow
                return await this.pca.acquireTokenByDeviceCode({
                    scopes: [this.scope],
                    deviceCodeCallback: (response) => {
                        // Show the device code to the user with better UI
                        const message = `To sign in to Azure DevOps:\n\n1. Go to: ${response.verificationUri}\n2. Enter code: ${response.userCode}\n\nThis code expires in ${Math.floor(response.expiresIn / 60)} minutes.`;
                        
                        vscode.window.showInformationMessage(
                            message,
                            { modal: false },
                            'Open Browser',
                            'Copy Code'
                        ).then(selection => {
                            if (selection === 'Open Browser') {
                                vscode.env.openExternal(vscode.Uri.parse(response.verificationUri));
                            } else if (selection === 'Copy Code') {
                                vscode.env.clipboard.writeText(response.userCode);
                                vscode.window.showInformationMessage('Device code copied to clipboard');
                            }
                        });
                        
                        // Also show in output channel for easy access
                        this.showDeviceCodeInOutput(response.verificationUri, response.userCode, response.expiresIn);
                    }
                });
            });
        } catch (error) {
            this.logSecureError('Device code token acquisition failed', error);
            throw error;
        }
    }

    private showDeviceCodeInOutput(verificationUri: string, userCode: string, expiresIn: number): void {
        const outputChannel = vscode.window.createOutputChannel('Azure DevOps Authentication');
        outputChannel.clear();
        outputChannel.appendLine('=== Azure DevOps Device Code Authentication ===');
        outputChannel.appendLine('');
        outputChannel.appendLine('To complete sign in:');
        outputChannel.appendLine(`1. Open: ${verificationUri}`);
        outputChannel.appendLine(`2. Enter code: ${userCode}`);
        outputChannel.appendLine('');
        outputChannel.appendLine(`Code expires in: ${Math.floor(expiresIn / 60)} minutes`);
        outputChannel.appendLine('');
        outputChannel.appendLine('Keep this window open until authentication is complete.');
        outputChannel.show(true);
    }

    private async getCachedToken(): Promise<AzureDevOpsToken | null> {
        try {
            const tokenString = await this.context.secrets.get(this.secretKey);
            if (tokenString) {
                const token = JSON.parse(tokenString) as AzureDevOpsToken;
                // Convert the string back to Date object
                token.expiresOn = new Date(token.expiresOn);
                return token;
            }
        } catch (error) {
            this.logSecureError('Error retrieving cached token', error);
        }
        return null;
    }

    private async storeToken(token: AzureDevOpsToken): Promise<void> {
        try {
            await this.context.secrets.store(this.secretKey, JSON.stringify(token));
        } catch (error) {
            this.logSecureError('Error storing token', error);
            throw error;
        }
    }

    private isTokenValid(token: AzureDevOpsToken): boolean {
        // Check if token expires within the next 5 minutes
        const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
        return token.expiresOn > fiveMinutesFromNow;
    }

    /**
     * Securely log errors without exposing sensitive information
     */
    private logSecureError(message: string, error: any): void {
        // Only log the error message, not the full error object which might contain tokens
        const safeMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`${message}: ${safeMessage}`);
    }
}
