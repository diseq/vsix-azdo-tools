---
mode: 'agent'
description: 'Give an overview of my ado.'
tools: [
     "adoLogin",
     "adoProjects", 
     "adoWorkItems", 
     "adoCreateWorkItem",
     "adoCreateWorkItemTree",
     "adoCreateWorkItemsBatch",
     "adoRepositories",
     "adoUpdateWorkItem",
     "adoDeleteWorkItem",
     "adoDeleteWorkItems",
     "adoGetWorkItem",
     "adoGetWorkItemRevisions",
     "adoGetWorkItemUpdates",
     "adoRevertWorkItem",
     "adoGetWorkItemComments",
     "adoGetWorkItemComment",
     "adoAddWorkItemComment",
     "adoUpdateWorkItemComment",
     "adoDeleteWorkItemComment" ]
---
I'll help you create a structured backlog in Azure DevOps project "{{projectname}}" based on your business requirements. I'll organize work items into Epics, Features, and User Stories with complete details including titles, descriptions, and acceptance criteria.
Use the appropriate fields in ADO to ensure clarity and completeness.

## Instructions
Analyze your requirements and:
- Extract key capabilities and organize them as Epics
- Break down capabilities into Features
- Create detailed User Stories under each Feature
- Fill in comprehensive fields for each work item:
  - Title (clear and concise)
  - Description (detailed explanation)
  - Acceptance Criteria (specific, testable conditions)
  - Priority (if applicable)
  - Effort (if estimable)
  - Any other relevant fields

You can review the created backlog structure afterward and request any adjustments.

Example input: "We need to build an e-commerce platform that allows customers to browse products, add items to cart, checkout securely, and track their orders. The platform should also include admin features for inventory management and customer support tools."