# Azure DevOps API Service Tests

This directory contains comprehensive tests for the `AzureDevOpsApiService` and related authentication services.

## Test Structure

### Files
- `azureDevOpsApi.test.ts` - Main test file for the Azure DevOps API service
- `auth.test.ts` - Tests for the authentication service
- `test-setup.ts` - Global test setup and configuration
- `__mocks__/vscode.ts` - Mock implementation of VS Code API for testing

### Configuration
- `jest.config.js` - Jest configuration for TypeScript and VS Code extension testing

## Running Tests

### Prerequisites
First, install the required dependencies:

```bash
npm install --save-dev jest @types/jest ts-jest
```

### Available Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage

The tests cover the following areas:

### AzureDevOpsApiService
- ✅ Singleton pattern implementation
- ✅ Organization URL handling and cleanup
- ✅ Connection testing
- ✅ Project fetching with error handling
- ✅ Team management
- ✅ Work item creation
- ✅ WIQL query execution at different scopes:
  - Organization level
  - Project level  
  - Team level
- ✅ Flexible work item querying with various filters
- ✅ Error handling for various failure scenarios

### AzureDevOpsAuthService
- ✅ Singleton pattern implementation
- ✅ Authentication header generation
- ✅ Authentication status checking
- ✅ Error handling for missing tokens

## Test Features

### Mocking Strategy
- **VS Code API**: Fully mocked to avoid dependencies on the actual VS Code environment
- **Fetch API**: Mocked to simulate HTTP requests without making actual network calls
- **Authentication Service**: Mocked to test API service in isolation

### Test Scenarios
- **Happy Path**: Normal successful operations
- **Error Handling**: Various error conditions and edge cases
- **Edge Cases**: Missing data, malformed responses, network failures
- **Parameter Validation**: Testing different input combinations

### Mock Data
Tests use realistic mock data that mirrors the actual Azure DevOps API responses, ensuring tests accurately reflect real-world usage.

## Writing New Tests

When adding new tests:

1. Follow the existing pattern of mocking external dependencies
2. Test both success and failure scenarios
3. Use descriptive test names that explain the expected behavior
4. Group related tests using `describe` blocks
5. Clean up mocks between tests using `beforeEach`

Example test structure:
```typescript
describe('NewFeature', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup mocks
    });

    it('should handle success case', async () => {
        // Arrange
        // Act  
        // Assert
    });

    it('should handle error case', async () => {
        // Test error scenarios
    });
});
```

## Debugging Tests

To debug failing tests:

1. Run tests with verbose output: `npm test -- --verbose`
2. Run specific test files: `npm test -- azureDevOpsApi.test.ts`
3. Use `console.log` in tests (but remove before committing)
4. Check mock call history with `expect(mockFunction).toHaveBeenCalledWith(...)`

## Continuous Integration

These tests are designed to run in CI/CD environments without external dependencies. All external services are mocked, making tests:
- Fast and reliable
- Independent of network conditions  
- Deterministic and repeatable
