import { listResources, readResource } from "./mcp/resources.js";
import { SessionManager } from "./sessionManager.js";
/**
 * MCP Server Context
 *
 * Central controller that connects the MCP server infrastructure with browser automation capabilities,
 * managing server instances, browser sessions, tool execution, and resource access.
 */
export class Context {
    config;
    server;
    sessionManager;
    // currentSessionId is a getter that delegates to SessionManager to ensure synchronization
    // This prevents desync between Context and SessionManager session tracking
    get currentSessionId() {
        return this.sessionManager.getActiveSessionId();
    }
    constructor(server, config, contextId) {
        this.server = server;
        this.config = config;
        this.sessionManager = new SessionManager(contextId);
    }
    getServer() {
        return this.server;
    }
    getSessionManager() {
        return this.sessionManager;
    }
    /**
     * Gets the Stagehand instance for the current session from SessionManager
     */
    async getStagehand(sessionId = this.currentSessionId) {
        const session = await this.sessionManager.getSession(sessionId, this.config);
        if (!session) {
            throw new Error(`No session found for ID: ${sessionId}`);
        }
        return session.stagehand;
    }
    async run(tool, args) {
        const sessionId = this.currentSessionId;
        try {
            console.error(`Executing tool: ${tool.schema.name} with args: ${JSON.stringify(args)}`);
            // Record the original args for history before modification
            const originalArgs = JSON.parse(JSON.stringify(args));
            // Inject session summary into args if they contain an instruction or action
            const session = this.sessionManager.browsers.get(sessionId);
            if (session?.sessionSummary) {
                if (args.instruction) {
                    args.instruction = `Context Summary:\n${session.sessionSummary}\n\nCurrent Task:\n${args.instruction}`;
                }
                else if (args.action) {
                    args.action = `Context Summary:\n${session.sessionSummary}\n\nCurrent Task:\n${args.action}`;
                }
            }
            // Check if this tool has a handle method (new tool system)
            if ("handle" in tool && typeof tool.handle === "function") {
                const toolResult = await tool.handle(this, args);
                if (toolResult?.action) {
                    const actionResult = await toolResult.action();
                    const content = actionResult?.content || [];
                    // Record original args result in history
                    const resultText = JSON.stringify(content);
                    this.sessionManager.addToolResult(sessionId, tool.schema.name, originalArgs, resultText);
                    // Pre-emptively summarize if needed
                    await this.summarizeHistoryIfNeeded(sessionId);
                    return {
                        content: Array.isArray(content)
                            ? content
                            : [{ type: "text", text: "Action completed successfully." }],
                        isError: false,
                    };
                }
                else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `${tool.schema.name} completed successfully.`,
                            },
                        ],
                        isError: false,
                    };
                }
            }
            else {
                // Fallback for any legacy tools without handle method
                throw new Error(`Tool ${tool.schema.name} does not have a handle method`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Tool ${tool.schema?.name || "unknown"} failed: ${errorMessage}`);
            // If we hit a token limit error (400), try to summarize and potentially hint the user
            if (errorMessage.includes("400") || errorMessage.includes("tokens")) {
                console.error("[Context] Token limit reached. Summarizing history to recover...");
                await this.summarizeHistoryIfNeeded(sessionId, true);
            }
            return {
                content: [{ type: "text", text: `Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
    /**
     * Summarizes the tool history if it exceeds a certain threshold.
     * This keeps the prompt size manageable.
     */
    async summarizeHistoryIfNeeded(sessionId, force = false) {
        const session = this.sessionManager.browsers.get(sessionId);
        if (!session)
            return;
        const history = session.toolHistory || [];
        const totalChars = history.reduce((sum, entry) => sum + (entry.result?.length || 0), 0);
        // Threshold: 15,000 characters (~4,000 tokens)
        if (totalChars < 15000 && !force)
            return;
        try {
            console.error(`[Context] Summarizing history for session ${sessionId} (${totalChars} characters)...`);
            const stagehand = session.stagehand;
            const llmClient = stagehand.llmClient;
            if (!llmClient || typeof llmClient.createChatCompletion !== 'function') {
                console.warn("[Context] Cannot summarize: llmClient not available/compatible.");
                return;
            }
            const historyText = history.map((h) => `Tool: ${h.tool}\nInput: ${JSON.stringify(h.input)}\nResult: ${h.result.substring(0, 1000)}...`).join("\n\n");
            const prompt = `You are a helper summarizing a browser automation session. 
Summarize the key discoveries and actions performed so far in a single, dense paragraph.
Focus on state changes, extracted data, and the current location.
THIS IS FOR A CONTINUATION OF THE SESSION. DO NOT INCLUDE INTRO/OUTRO.

History to summarize:
${historyText}`;
            const response = await llmClient.createChatCompletion({
                options: {
                    messages: [
                        { role: "system", content: "You are a concise summarizer." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0,
                    maxOutputTokens: 500,
                },
                logger: (log) => console.error(`[Summarizer]: ${log.message}`),
            });
            const summary = response.choices?.[0]?.message?.content || "";
            if (summary) {
                session.sessionSummary = (session.sessionSummary ? session.sessionSummary + "\n" : "") + summary;
                // Keep the summary concise - if it gets too big, summarize the summary itself
                if (session.sessionSummary.length > 2000) {
                    session.sessionSummary = "Summary so far: " + summary; // Reset to the latest dense summary
                }
                // Reset tool history after successful summarization
                session.toolHistory = [];
                // Also clear internal Stagehand history
                if (stagehand._history) {
                    stagehand._history = [];
                }
                console.error("[Context] History summarized successfully.");
            }
        }
        catch (err) {
            console.error("[Context] Failed to summarize history:", err);
        }
    }
    /**
     * List resources
     * Documentation: https://modelcontextprotocol.io/docs/concepts/resources
     */
    listResources() {
        return listResources();
    }
    /**
     * Read a resource by URI
     * Documentation: https://modelcontextprotocol.io/docs/concepts/resources
     */
    readResource(uri) {
        return readResource(uri);
    }
}
