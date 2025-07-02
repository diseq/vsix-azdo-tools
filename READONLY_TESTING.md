# Azure DevOps Extension - Readonly Mode Testing

This document provides test cases for the readonly mode feature.

## Test Cases

### Test 1: Toggle Readonly Mode
1. Open VS Code Command Palette (`Ctrl+Shift+P`)
2. Run `Azure DevOps: Toggle Readonly Mode`
3. **Expected**: See confirmation message showing readonly mode is enabled/disabled

### Test 2: Check Status Display
1. Run `Azure DevOps: Show Status`
2. **Expected**: Status panel shows readonly mode status with appropriate icon:
   - 🔒 Enabled (write operations blocked) - when readonly is on
   - 🔓 Disabled (write operations allowed) - when readonly is off

### Test 3: Test Write Operation Blocking (Commands)
**Prerequisites**: Enable readonly mode first

1. Try to create a work item using any creation method
2. **Expected**: Operation should fail with message: "Cannot create work item: Readonly mode is enabled. Use 'Azure DevOps: Toggle Readonly Mode' to disable it."

### Test 4: Test Write Operation Blocking (Chat Tools)
**Prerequisites**: Enable readonly mode first, be authenticated

1. Use chat with: `@workspace Create a new task in [project] titled "Test Task"`
2. **Expected**: Tool should fail with readonly mode error message

### Test 5: Test Read Operations Still Work
**Prerequisites**: Readonly mode enabled, authenticated

1. Run `Azure DevOps: Test Connection`
2. Use chat with: `@workspace List projects`
3. Use chat with: `@workspace Show work items in [project]`
4. **Expected**: All read operations should work normally

### Test 6: Configuration Setting
1. Open VS Code Settings (`Ctrl+,`)
2. Search for "Azure DevOps"
3. Find "Azure DevOps Tools: Readonly" setting
4. Toggle the setting
5. **Expected**: Setting should persist and affect the extension behavior

## Manual Testing Script

```bash
# Test the packaged extension
cd c:\work\vsix-azdo
code --install-extension .\azdo-tools-0.1.0.vsix --force
```

Then test the commands and features as described above.

## Protected Operations

The following operations should be blocked when readonly mode is enabled:

### Work Items
- ✅ Create work item
- ✅ Update work item  
- ✅ Delete work item
- ✅ Create work item tree
- ✅ Create work items batch
- ✅ Revert work item

### Comments
- ✅ Add work item comment
- ✅ Update work item comment
- ✅ Delete work item comment

### Allowed Operations (Read-only)
- ✅ List projects
- ✅ Get work items
- ✅ Get work item details
- ✅ Get work item revisions
- ✅ Get work item updates
- ✅ Get work item comments
- ✅ Test connection
- ✅ Authentication operations
- ✅ Show status
