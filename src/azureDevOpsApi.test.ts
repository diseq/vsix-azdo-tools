import { AzureDevOpsApiService } from './azureDevOpsApi';
import { AzureDevOpsAuthService } from './auth';
import * as vscode from 'vscode';

// Mock fetch globally
global.fetch = jest.fn();

// Mock AzureDevOpsAuthService
jest.mock('./auth', () => ({
    AzureDevOpsAuthService: {
        getInstance: jest.fn(),
    },
}));

describe('AzureDevOpsApiService', () => {
    let apiService: AzureDevOpsApiService;
    let mockContext: vscode.ExtensionContext;
    let mockAuthService: jest.Mocked<AzureDevOpsAuthService>;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Setup mocks
        mockAuthService = {
            getAuthHeaders: jest.fn(),
        } as any;

        (AzureDevOpsAuthService.getInstance as jest.Mock).mockReturnValue(mockAuthService);

        // Create mock context
        mockContext = {
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
            },
            subscriptions: [],
        } as any;

        // Create new instance for each test
        apiService = AzureDevOpsApiService.getInstance(mockContext);
    });

    describe('Basic functionality', () => {
        it('should have required methods', () => {
            expect(typeof apiService.getProjects).toBe('function');
            expect(typeof apiService.testConnection).toBe('function');
            expect(typeof apiService.setOrganization).toBe('function');
            expect(typeof apiService.getOrganization).toBe('function');
        });

        it('should return the same instance when called multiple times', () => {
            const instance1 = AzureDevOpsApiService.getInstance(mockContext);
            const instance2 = AzureDevOpsApiService.getInstance(mockContext);
            
            expect(instance1).toBe(instance2);
        });
    });
});
