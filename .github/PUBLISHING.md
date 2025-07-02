# Publishing to Visual Studio Marketplace

This document explains how to set up and use the GitHub Action workflow to automatically publish your VS Code extension to the Visual Studio Marketplace.

## Prerequisites

1. **Visual Studio Marketplace Publisher Account**
   - Visit [Visual Studio Marketplace Publisher Management](https://marketplace.visualstudio.com/manage)
   - Create a publisher account if you don't have one
   - Note your publisher ID (should match the `publisher` field in `package.json`)

2. **Personal Access Token (PAT)**
   - Go to [Azure DevOps Personal Access Tokens](https://dev.azure.com/_usersSettings/tokens)
   - Create a new token with the following scopes:
     - **Marketplace**: `Acquire` and `Manage`
   - Copy the token value (you won't be able to see it again)

## Setup Instructions

### 1. Configure GitHub Repository Secret

1. Go to your GitHub repository: `https://github.com/diseq/vsix-azdo-tools`
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `VSCE_PAT`
5. Value: Paste your Personal Access Token
6. Click **Add secret**

### 2. Publishing Process

The workflow is configured to publish automatically when you create a Git tag that starts with `v`:

```bash
# Example: Publishing version 0.1.0
git tag v0.1.0
git push origin v0.1.0
```

**Important**: Make sure the tag version matches the version in your `package.json` file.

### 3. Workflow Behavior

- **On Pull Requests**: Only builds and tests the extension
- **On Push to Main**: Builds, tests, and uploads artifacts
- **On Version Tags** (e.g., `v0.1.0`): Builds, tests, and publishes to the marketplace

## Manual Publishing (Alternative)

If you prefer to publish manually, you can use the VS Code Extension Manager CLI:

```bash
# Install vsce globally
npm install -g @vscode/vsce

# Build the package
npm run vsce:package

# Publish (you'll be prompted for your PAT)
npx @vscode/vsce publish

# Or publish with PAT
npx @vscode/vsce publish -p YOUR_PERSONAL_ACCESS_TOKEN
```

## Version Management

1. Update the version in `package.json`:
   ```json
   {
     "version": "0.1.1"
   }
   ```

2. Create a corresponding Git tag:
   ```bash
   git add package.json
   git commit -m "Bump version to 0.1.1"
   git tag v0.1.1
   git push origin main
   git push origin v0.1.1
   ```

3. The GitHub Action will automatically publish the new version

## Troubleshooting

### Common Issues

1. **"Failed to publish" error**
   - Verify your PAT has the correct permissions
   - Check that the publisher in `package.json` matches your marketplace account
   - Ensure the version number hasn't been published before

2. **"Authentication failed" error**
   - Verify the `VSCE_PAT` secret is correctly set in GitHub
   - Check that your PAT hasn't expired

3. **"Package validation failed" error**
   - Review the extension manifest (`package.json`)
   - Ensure all required fields are present and valid
   - Check that the extension builds successfully locally

### Viewing Publish Status

1. Go to **Actions** tab in your GitHub repository
2. Click on the workflow run triggered by your tag
3. Check the "publish" job for detailed logs

### Marketplace Status

After successful publishing, you can verify your extension at:
`https://marketplace.visualstudio.com/items?itemName=diseq.azdo-tools`

## Security Best Practices

- Never commit your Personal Access Token to the repository
- Use GitHub repository secrets for sensitive data
- Regularly rotate your Personal Access Tokens
- Consider using environment protection rules for additional security

## Additional Resources

- [VS Code Extension Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce CLI Documentation](https://github.com/Microsoft/vscode-vsce)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
