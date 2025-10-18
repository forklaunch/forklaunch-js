# Testing the Prompts Feature

## Overview
The `--prompts` argument has been successfully added to the `sync all` command. This allows users to provide pre-configured answers for prompts instead of having to answer them interactively.

## Usage
```bash
forklaunch sync all -P '{"svs-dummy": {"database": "none", "infrastructure": "none", "description": "none"}, "lib-dummy": {"description": "lib dummy"}}'
```

## Implementation Details

### 1. Added `--prompts` argument to sync all command
- Short form: `-P`
- Long form: `--prompts`
- Accepts JSON object with project names as keys and prompt answers as values

### 2. Created new prompt functions with answer support
- `prompt_with_validation_with_answers`
- `prompt_without_validation_with_answers`
- `prompt_comma_separated_list_with_answers`

### 3. Updated all sync setup functions
- `sync_service_setup`
- `sync_library_setup`
- `sync_router_setup`
- `sync_module_setup`
- `sync_worker_setup`

### 4. Modified `add_package_to_artifact` function
- Added `prompts_map` parameter
- Passes prompts to all sync setup functions

## Example JSON Structure
```json
{
  "svs-dummy": {
    "database": "none",
    "infrastructure": "none",
    "description": "none"
  },
  "lib-dummy": {
    "description": "lib dummy"
  },
  "rtr-dummy": {
    "infrastructure": "cache,queue"
  },
  "mod-dummy": {
    "database": "postgresql"
  },
  "wrk-dummy": {
    "type": "database",
    "description": "worker dummy"
  }
}
```

## Supported Prompt Fields
- **Service**: `database`, `infrastructure`, `description`
- **Library**: `description`
- **Router**: `infrastructure`
- **Module**: `database`
- **Worker**: `type`, `description`

## Behavior
- If a pre-provided answer exists for a project and field, it will be used automatically
- If the pre-provided answer is invalid, the system will fall back to interactive prompting
- If no pre-provided answer exists, the system will prompt interactively as before
- The system provides feedback when using pre-provided answers

## Testing
The feature has been successfully implemented and compiled without errors. The `--help` command shows the new argument is available.
