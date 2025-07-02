# Azure DevOps Authentication

This VS Code extension supports multiple authentication methods for connecting to Azure DevOps:

## Available Sign-In Commands

### 1. Azure DevOps: Sign In (VS Code Auth) 🆕
- **Command**: `azureDevOps.signInVSCode`
- **Description**: Uses VS Code's built-in Microsoft authentication provider
- **Best for**: Users already signed into VS Code with a Microsoft account
- **How it works**: Leverages your existing VS Code authentication session
- **Advantages**: 
  - No additional browser windows
  - Uses your existing VS Code account
  - Seamless integration with VS Code's authentication system
  - Recommended method for most users

### 2. Azure DevOps: Sign In (Interactive Browser)
- **Command**: `azureDevOps.signInInteractive`
- **Description**: Uses a web browser-based authentication flow
- **Best for**: Standard desktop environments with browser access
- **How it works**: Opens your default browser to complete authentication

### 3. Azure DevOps: Sign In (Device Code)
- **Command**: `azureDevOps.signInDeviceCode`
- **Description**: Uses Microsoft's device code authentication flow
- **Best for**: Headless environments, remote development, or when browser redirection is problematic
- **How it works**: 
  1. Displays a device code and verification URL
  2. You open the URL in any browser (can be on a different device)
  3. Enter the provided code to complete authentication

### 4. Azure DevOps: Sign In (Default)
- **Command**: `azureDevOps.signIn`
- **Description**: Prompts you to choose between VS Code Auth and Device Code methods
- **Best for**: General use - will show a quick pick to select authentication method

## Usage Instructions

1. **Set Organization First**: Run `Azure DevOps: Set Organization` command to configure your Azure DevOps organization URL
2. **Choose Sign-In Method**: Select one of the sign-in commands based on your environment:
   - **Recommended**: Use `Azure DevOps: Sign In (VS Code Auth)` if you're already signed into VS Code
   - **Alternative**: Use `Azure DevOps: Sign In` to be prompted for authentication method
   - **Specific**: Use device code or interactive browser methods if needed
3. **Complete Authentication**: Follow the prompts to complete the authentication process
4. **Verify Connection**: Use `Azure DevOps: Test Connection` to verify everything is working

## Authentication Flow Details

### VS Code Authentication (Recommended)
- Uses VS Code's built-in Microsoft authentication provider
- Leverages your existing VS Code account session
- No additional browser windows or device codes needed
- Manages token refresh automatically through VS Code
- Most seamless experience for VS Code users

### Interactive Browser Flow
- Opens your default browser automatically
- Guides you through the Microsoft authentication process
- Automatically captures the authentication result
- Stores the token securely in VS Code

### Device Code Flow
- Provides a short code and URL
- You can complete authentication on any device with a browser
- Ideal for remote development scenarios
- Displays progress in VS Code while you authenticate

## Troubleshooting

### Common Issues
1. **"Organization not set"**: Run `Azure DevOps: Set Organization` first
2. **Authentication timeout**: Device codes expire after 15 minutes
3. **Network issues**: Ensure you can access dev.azure.com and login.microsoftonline.com

### Getting Help
- Use `Azure DevOps: Show Status` to check current authentication state
- Use `Azure DevOps: Debug API Call` to test connectivity
- Check the VS Code Developer Console for detailed error logs

## Security Notes

- Tokens are stored securely using VS Code's built-in secrets storage
- Tokens are automatically refreshed when possible
- Use `Azure DevOps: Sign Out` to clear stored credentials

---

# Azure DevOps Work Items API

## Important Note About Teams

When working with work items through WIQL queries, Azure DevOps requires a team to be specified in the API endpoint. The correct format is:

```
POST https://dev.azure.com/{organization}/{project}/{team}/_apis/wit/wiql?api-version=7.1
```

## Updated API Methods

### getWorkItems(projectName, teamName?, top?)
- **Parameters:**
  - `projectName`: Name of the Azure DevOps project  
  - `teamName` (optional): Name of the team. If not provided, the method will:
    1. Try to fetch available teams and use the first one
    2. Fall back to using the project name as the team name
  - `top` (optional): Maximum number of work items to return (default: 50)

### getWorkItemsForTeam(projectName, teamName, top?)
- Convenience method to explicitly specify a team
- All parameters are the same as above, but `teamName` is required

### getTeams(projectName)
- Returns all teams available in the specified project
- Use this to discover available teams before querying work items

## New Commands Added

### Azure DevOps: List Teams
- **Command**: `azureDevOps.listTeams`
- **Description**: Lists all teams in a selected project
- **Usage**: Helps you discover team names for use with work item queries

## Usage Examples

```typescript
// Get work items using default team resolution
const workItems = await apiService.getWorkItems('MyProject');

// Get work items for a specific team
const workItems = await apiService.getWorkItems('MyProject', 'MyTeam');

// Get teams for a project first
const teams = await apiService.getTeams('MyProject');
console.log('Available teams:', teams.map(t => t.name));

// Then get work items for a specific team
const workItems = await apiService.getWorkItemsForTeam('MyProject', teams[0].name);
```
