# @kbn/streams-ai-cli

Interactive CLI tool for managing and onboarding Elasticsearch streams using AI-powered workflows.

## Features

- **Stream Management**: Browse, select, and analyze streams
- **AI-Powered Workflows**: Partition streams, generate onboarding assets, create dashboards, rules, and SLOs
- **Interactive Chat**: Ask natural language questions about your data
- **Dataset Analysis**: Analyze and describe stream structure and fields
- **Connector Management**: Select and configure inference connectors
- **Time Range Selection**: Configure time ranges for analysis (Last 15m, 1h, 12h, 24h, 7d, or custom)
- **Log Viewer**: Built-in log buffer showing all operations

## Architecture

Built using React and [Ink](https://github.com/vadimdemedes/ink), providing a modern terminal UI experience.

### Directory Structure

```
src/cli_ink/
├── components/        # Reusable UI components
│   ├── Header.tsx     # Shows breadcrumbs and status line
│   ├── Menu.tsx       # Generic menu component
│   ├── Input.tsx      # Text input component
│   └── LogsDisplay.tsx # Log viewer
├── screens/           # Screen-specific components
│   ├── MainMenu.tsx
│   ├── SelectStream.tsx
│   ├── SelectConnector.tsx
│   ├── SetTimeRange.tsx
│   ├── StreamActions.tsx
│   ├── OnboardingMenu.tsx
│   ├── DescribeDataset.tsx
│   ├── ChatWithData.tsx
│   └── WorkflowResult.tsx
├── utils/            # Utilities
│   ├── log_buffer.ts  # Log buffering (1000 entries default)
│   └── time_ranges.ts # Time range utilities
├── types.ts          # TypeScript definitions
├── App.tsx           # Main application component
└── index.tsx         # Entry point

src/cli/              # Legacy implementation (deprecated)
```

## Navigation

### Global Keyboard Shortcuts

- **q**: Go back one level
- **l**: Show logs (from any screen)
- **CMD+C**: Clean exit

### Menu Structure

```
Main Menu
├── Select stream
│   ├── [List of streams]
│   │   ├── Describe dataset (with copy to clipboard)
│   │   ├── Chat with data
│   │   ├── Partition stream
│   │   ├── Onboard stream
│   │   │   ├── Full flow
│   │   │   ├── Description
│   │   │   ├── Processing
│   │   │   ├── NL Queries
│   │   │   ├── Anomaly detection
│   │   │   ├── Dashboards
│   │   │   ├── Rules
│   │   │   ├── SLOs
│   │   │   └── Field definitions
│   │   └── Analyze stream
│   └── Refresh list of streams
├── Select connector
├── Set time range
│   ├── Last 15 minutes
│   ├── Last hour
│   ├── Last 12 hours
│   ├── Last 24 hours
│   ├── Last 7 days
│   └── Custom range (e.g., now-7d,now)
├── Show logs
└── Exit
```

## Workflow Execution

When executing a workflow:
1. The workflow generates a change (displayed as JSON)
2. User can:
   - **a**: Apply the change
   - **c**: Copy the change to clipboard
   - **f**: Copy full analysis to clipboard (for describe dataset)
   - **q**: Go back

## Usage

This CLI is integrated into the Kibana development environment through the `@kbn/inference-cli` framework.

```bash
# Run from Kibana repository
yarn kbn streams-ai-cli
```

## Dependencies

- React and Ink for UI
- @kbn/inference-cli for LLM integration
- @kbn/streams-ai for workflow implementations
- @kbn/ai-tools for dataset analysis and ESQL agent
- copy-to-clipboard for clipboard operations
- @kbn/datemath for time range parsing
