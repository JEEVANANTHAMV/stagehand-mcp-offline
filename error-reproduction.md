# Error Reproduction Guide

## Command to Start the Server

```bash
export NVM_DIR="/home/desktopuser/.nvm" && . "$NVM_DIR/nvm.sh" && \
STAGEHAND_ENV=LOCAL \
HEADLESS=false \
MODEL_NAME=openai/qwen3-max \
MODEL_BASE_URL=http://localhost:8001/v1 \
OPENAI_API_KEY=test \
node /home/desktopuser/Downloads/stagehand-mcp-offline/dist/program.js --port 3001 --experimental > /tmp/mcp.log 2>&1 &
```

## Error Sample

```
[Config] Running in LOCAL mode - Browserbase credentials not required
Listening on http://localhost:3001
Put this in your client config:
{
  "mcpServers": {
    "browserbase": {
      "type": "http",
      "url": "http://localhost:3001/mcp"
    }
  }
}
If your client supports streamable HTTP, you can use the /mcp endpoint instead.
Executing tool: browserbase_session_create with args: {}
[SessionManager] Default session browserbase_session_53bc7b4a-19ff-4b97-93de-4ad32a2104e9_1773328672794_ef4a5a6d-a61e-4fed-8940-0e700cec8805 not found, creating.
[SessionManager] Creating LOCAL Stagehand session browserbase_session_53bc7b4a-19ff-4b97-93de-4ad32a2104e9_1773328672794_ef4a5a6d-a61e-4fed-8940-0e700cec8805...
[SessionManager] Creating LOCAL Stagehand instance for session browserbase_session_53bc7b4a-19ff-4b97-93de-4ad32a2104e9_1773328672794_ef4a5a6d-a61e-4fed-8940-0e700cec8805
Stagehand[LOCAL][browserbase_session_53bc7b4a-19ff-4b97-93de-4ad32a2104e9_1773328672794_ef4a5a6d-a61e-4fed-8940-0e700cec8805]: Launching local browser
[SessionManager] LOCAL Stagehand initialized with session: browserbase_session_53bc7b4a-19ff-4b97-93de-4ad32a2104e9_1773328672794_ef4a5a6d-a61e-4fed-8940-0e700cec8805
[SessionManager] Session created and active: browserbase_session_53bc7b4a-19ff-4b97-93de-4ad32a2104e9_1773328672794_ef4a5a6d-a61e-4fed-8940-0e700cec8805
Executing tool: browserbase_stagehand_navigate with args: {"url":"https://google.com"}
[Screenshot] Captured: /tmp/stagehand-screenshots/default/1773328674280.jpg
Executing tool: browserbase_stagehand_act with args: {"action":"Click the search box"}
Tool browserbase_stagehand_act failed: Failed to perform action: Unexpected message role.
[shutdown-supervisor] Shutting down Chrome pid=28430 (reason=Stagehand process completed, deletingUserDataDir=true)
```

## Error Details

- **Error Message**: `Unexpected message role`
- **Tool**: `browserbase_stagehand_act`
- **Action**: `Click the search box`
- **Root Cause**: The Vercel AI SDK's `InvalidMessageRoleError` is thrown when the model returns a message with a role that is not one of the expected roles (system, user, assistant, tool).

## Steps to Reproduce

1. Start the server with the command above
2. Connect to the MCP server at `http://localhost:3001/mcp`
3. Create a session: `browserbase_session_create`
4. Navigate to a URL: `browserbase_stagehand_navigate` with `{"url":"https://google.com"}`
5. Try to perform an action: `browserbase_stagehand_act` with `{"action":"Click the search box"}`
6. The error will occur

## Technical Analysis

### Error Source
The error "Unexpected message role" is coming from the Vercel AI SDK's `InvalidMessageRoleError` which is thrown when the model returns a message with a role that is not one of the expected roles (system, user, assistant, tool).

### Root Cause
The issue is in how the `convertToLanguageModelMessage` function in the `ai` package converts messages. The function has a `switch` statement that handles the expected roles (system, user, assistant, tool), and throws an `InvalidMessageRoleError` in the `default` case for any other role.

### Model Response Format
The custom model endpoint returns the correct format:
- Role: "assistant"
- Content: null (when using tool calls)
- Tool calls: array of objects with `id`, `type`, and `function` properties

### Why the Error Occurs
The error occurs because the Vercel AI SDK's `@ai-sdk/openai` package parses the response and converts it to an internal format. When the response contains tool calls, the SDK creates content parts with type "tool-call". However, when the `toResponseMessages` function tries to convert these parts back to messages, it might encounter an issue with the role validation.

### Affected Tools
- `browserbase_stagehand_act` - Performs actions on the page
- `browserbase_stagehand_observe` - Finds interactive elements
- `browserbase_stagehand_extract` - Extracts data from the page
- `browserbase_stagehand_agent` - Runs autonomous agent tasks

### Working Tools
- `browserbase_session_create` - Creates a new browser session
- `browserbase_session_close` - Closes the current session
- `browserbase_stagehand_navigate` - Navigates to a URL
- `browserbase_screenshot` - Takes a screenshot
- `browserbase_stagehand_get_url` - Gets the current URL

## Potential Solutions

1. **Check the model endpoint response format**: Ensure the model endpoint returns the correct format for tool calls.
2. **Update the Vercel AI SDK**: Check if there's a newer version of the SDK that handles this case better.
3. **Use a different model provider**: Try using a different model provider that's fully compatible with the Vercel AI SDK.
4. **Modify the Stagehand library**: Patch the Stagehand library to handle this case better.

## Environment

- **Operating System**: Linux 5.15
- **Node.js**: v24.14.0 (via nvm)
- **Stagehand**: v3.0.3
- **Vercel AI SDK**: Latest version
- **Model**: qwen3-max (via custom OpenAI-compatible endpoint)
