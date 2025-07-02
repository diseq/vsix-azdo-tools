// Quick test to verify extension tools are registered
// Run this in VS Code Developer Console (Help > Toggle Developer Tools)

console.log('=== Azure DevOps Extension Debug ===');

// Check if tools are registered
if (typeof vscode !== 'undefined' && vscode.lm) {
    console.log('✅ VS Code Language Model API available');
    
    // Try to get tool information (this may not work in all contexts)
    try {
        console.log('🔍 Checking for registered tools...');
        // Note: There's no public API to list registered tools,
        // but if tools are registered, they should work in chat
    } catch (error) {
        console.log('❌ Error checking tools:', error);
    }
} else {
    console.log('❌ VS Code Language Model API not available');
}

// Check if extension is active
if (typeof vscode !== 'undefined' && vscode.extensions) {
    const extension = vscode.extensions.getExtension('example.basic-mcp-extension');
    if (extension) {
        console.log('✅ Extension found:', extension.isActive ? 'Active' : 'Inactive');
        if (!extension.isActive) {
            console.log('⚠️  Extension not active - this might be the issue');
        }
    } else {
        console.log('❌ Extension not found - check installation');
    }
} else {
    console.log('❌ VS Code extensions API not available');
}

console.log('=== End Debug ===');
