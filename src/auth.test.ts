import { AzureDevOpsAuthService } from './auth';
import * as vscode from 'vscode';

// Mock @azure/msal-node
jest.mock('@azure/msal-node', () => ({
    PublicClientApplication: jest.fn().mockImplementation(() => ({
        getTokenCache: jest.fn().mockReturnValue({
            getAllAccounts: jest.fn().mockResolvedValue([]),
            removeAccount: jest.fn().mockResolvedValue(undefined),
        }),
        acquireTokenSilent: jest.fn(),
        acquireTokenInteractive: jest.fn(),
    })),
}));

describe('AzureDevOpsAuthService', () => {
    let authService: AzureDevOpsAuthService;
    let mockContext: vscode.ExtensionContext;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Reset singleton instance
        (AzureDevOpsAuthService as any).instance = undefined;

        mockContext = {
            subscriptions: [],
            secrets: {
                get: jest.fn(),
                store: jest.fn(),
                delete: jest.fn(),
            },
        } as any;

        authService = AzureDevOpsAuthService.getInstance(mockContext);
    });

    describe('getAuthHeaders', () => {
        it('should return bearer auth headers when access token is available', async () => {
            const mockToken = 'test-access-token';
            jest.spyOn(authService, 'getAccessToken').mockResolvedValue(mockToken);

            const headers = await authService.getAuthHeaders();

            expect(headers).toEqual({
                'Authorization': `Bearer ${mockToken}`,
                'Content-Type': 'application/json',
            });
        });

        it('should return headers with empty bearer token when no access token is available', async () => {
            jest.spyOn(authService, 'getAccessToken').mockResolvedValue('');

            const headers = await authService.getAuthHeaders();
            
            expect(headers).toEqual({
                'Authorization': 'Bearer ',
                'Content-Type': 'application/json',
            });
        });
    });

    describe('isAuthenticated', () => {
        it('should return true when valid cached token is available', async () => {
            const mockToken = { accessToken: 'test-token', expiresOn: new Date(Date.now() + 3600000) };
            jest.spyOn(authService as any, 'getCachedToken').mockResolvedValue(mockToken);
            jest.spyOn(authService as any, 'isTokenValid').mockReturnValue(true);

            const result = await authService.isAuthenticated();

            expect(result).toBe(true);
        });

        it('should return false when no valid token is available', async () => {
            jest.spyOn(authService as any, 'getCachedToken').mockResolvedValue(null);

            const result = await authService.isAuthenticated();

            expect(result).toBe(false);
        });
    });
});