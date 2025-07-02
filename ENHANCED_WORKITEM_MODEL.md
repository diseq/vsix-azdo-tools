# Enhanced WorkItem Model

The WorkItem interface has been significantly extended to include all common Azure DevOps work item fields, making it much easier to access work item data without having to dig into the raw `fields` object.

## Available Properties

### Basic Properties
- `id: number` - Work item ID
- `title: string` - Work item title
- `workItemType: string` - Type (Bug, User Story, Task, etc.)
- `state: string` - Current state (New, Active, Resolved, etc.)
- `url: string` - Direct link to work item

### System Fields
- `assignedTo?: string` - Display name of assigned person
- `createdBy?: string` - Display name of creator
- `changedBy?: string` - Display name of last person to modify
- `createdDate?: string` - Creation timestamp
- `changedDate?: string` - Last modification timestamp
- `activatedDate?: string` - When work item was activated
- `resolvedDate?: string` - When work item was resolved
- `closedDate?: string` - When work item was closed

### Core Fields
- `areaPath?: string` - Area path classification
- `iterationPath?: string` - Iteration/sprint assignment
- `teamProject?: string` - Project name
- `description?: string` - Detailed description
- `acceptanceCriteria?: string` - Acceptance criteria
- `reproductionSteps?: string` - Steps to reproduce (for bugs)
- `systemInfo?: string` - System information
- `tags?: string` - Work item tags

### Planning & Estimation
- `storyPoints?: number` - Story points estimate
- `effort?: number` - Effort estimate
- `originalEstimate?: number` - Original time estimate
- `remainingWork?: number` - Remaining work hours
- `completedWork?: number` - Completed work hours
- `activity?: string` - Activity type

### Priority & Business Value
- `priority?: number` - Priority level
- `severity?: string` - Severity level
- `risk?: string` - Risk assessment
- `businessValue?: number` - Business value score
- `timeCriticality?: number` - Time criticality score

### Version & Release
- `foundIn?: string` - Version where issue was found
- `integratedIn?: string` - Version where fix was integrated

### Relations & Links
- `parent?: number` - Parent work item ID
- `links?: Array` - Related work item links

### Custom Fields Access
- `fields?: { [key: string]: any }` - All raw fields from Azure DevOps API, including custom fields

### Internal API Fields
- `rev?: number` - Revision number
- `_links?: object` - API links object

## Usage Examples

```typescript
// Access common fields directly
console.log(workItem.title);
console.log(workItem.assignedTo);
console.log(workItem.storyPoints);

// Access custom fields through the fields property
console.log(workItem.fields?.['Custom.RequestType']);
console.log(workItem.fields?.['Custom.Complexity']);

// Access any Azure DevOps field using its reference name
console.log(workItem.fields?.['Microsoft.VSTS.Common.AcceptanceCriteria']);
```

## Benefits

1. **Type Safety**: All common fields are strongly typed
2. **IntelliSense**: Better IDE support with auto-completion
3. **Backwards Compatible**: Existing code using `fields` continues to work
4. **Custom Field Support**: Custom fields remain accessible via the `fields` property
5. **Comprehensive**: Covers most commonly used Azure DevOps work item fields

## Migration

No migration is required. Existing code will continue to work as the `fields` property is still available. New code can take advantage of the directly accessible properties for better type safety and readability.
