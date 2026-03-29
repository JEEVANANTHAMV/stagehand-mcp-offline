import * as fs from "fs";
// Check if LOCAL mode is enabled
const isLocalMode = process.env.STAGEHAND_ENV === "LOCAL";
// Check if CDP endpoint is provided (connect to existing Chrome)
const cdpEndpoint = process.env.CDP_ENDPOINT || "";
/**
 * Find the Chrome/Chromium executable path on the current platform.
 * Returns the first valid path found, or undefined if no browser is found.
 */
function findChromePath() {
    // Check environment variables first
    const envPath = process.env.CHROME_PATH || process.env.LIGHTHOUSE_CHROMIUM_PATH;
    if (envPath && fs.existsSync(envPath)) {
        return envPath;
    }
    // Platform-specific paths
    const platformPaths = [];
    if (process.platform === "linux") {
        platformPaths.push("/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium-browser", "/usr/bin/chromium", "/snap/bin/chromium", "/snap/bin/google-chrome");
    }
    else if (process.platform === "darwin") {
        platformPaths.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary");
    }
    else if (process.platform === "win32") {
        platformPaths.push("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe");
    }
    // Return the first existing path
    for (const path of platformPaths) {
        if (fs.existsSync(path)) {
            return path;
        }
    }
    return undefined;
}
// Default Configuration Values
const defaultConfig = {
    env: isLocalMode ? "LOCAL" : "BROWSERBASE",
    browserbaseApiKey: process.env.BROWSERBASE_API_KEY ?? "",
    browserbaseProjectId: process.env.BROWSERBASE_PROJECT_ID ?? "",
    proxies: false,
    server: {
        port: undefined,
        host: undefined,
    },
    viewPort: {
        browserWidth: 1024,
        browserHeight: 768,
    },
    modelName: process.env.MODEL_NAME || "gemini-2.0-flash", // Default Model
    modelBaseURL: process.env.MODEL_BASE_URL || process.env.OPENAI_BASE_URL || "",
    // LOCAL mode specific config
    screenshot: {
        enabled: process.env.SCREENSHOT_ENABLED !== "false",
        dir: process.env.SCREENSHOT_DIR || "/tmp/stagehand-screenshots",
        sessionId: process.env.STAGEHAND_SESSION_ID || "default",
    },
    localBrowserLaunchOptions: {
        headless: process.env.HEADLESS !== "false",
        executablePath: findChromePath(),
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    },
    cdpEndpoint: cdpEndpoint,
};
// Resolve final configuration by merging defaults, file config, and CLI options
export async function resolveConfig(cliOptions) {
    const cliConfig = await configFromCLIOptions(cliOptions);
    // Order: Defaults < File Config < CLI Overrides
    const mergedConfig = mergeConfig(defaultConfig, cliConfig);
    // --- Add Model API Key from Env Vars ---
    if (!mergedConfig.modelApiKey) {
        mergedConfig.modelApiKey =
            process.env.GEMINI_API_KEY ||
                process.env.GOOGLE_API_KEY ||
                process.env.OPENAI_API_KEY ||
                process.env.ANTHROPIC_API_KEY;
    }
    // --------------------------------
    // Only validate Browserbase keys in BROWSERBASE mode
    if (mergedConfig.env !== "LOCAL") {
        if (!mergedConfig.browserbaseApiKey) {
            console.warn("Warning: BROWSERBASE_API_KEY environment variable not set. Using dummy value.");
            mergedConfig.browserbaseApiKey = "dummy-browserbase-api-key";
        }
        if (!mergedConfig.browserbaseProjectId) {
            console.warn("Warning: BROWSERBASE_PROJECT_ID environment variable not set. Using dummy value.");
            mergedConfig.browserbaseProjectId = "dummy-browserbase-project-id";
        }
    }
    else {
        console.log("[Config] Running in LOCAL mode - Browserbase credentials not required");
    }
    if (!mergedConfig.modelApiKey) {
        console.warn("Warning: MODEL_API_KEY environment variable not set. Using dummy value.");
        mergedConfig.modelApiKey = "dummy-api-key";
    }
    return mergedConfig;
}
// Create Config structure based on CLI options
export async function configFromCLIOptions(cliOptions) {
    return {
        browserbaseApiKey: process.env.BROWSERBASE_API_KEY ?? "",
        browserbaseProjectId: process.env.BROWSERBASE_PROJECT_ID ?? "",
        server: {
            port: cliOptions.port,
            host: cliOptions.host,
        },
        proxies: cliOptions.proxies,
        context: {
            contextId: cliOptions.contextId,
            persist: cliOptions.persist,
        },
        viewPort: {
            browserWidth: cliOptions.browserWidth,
            browserHeight: cliOptions.browserHeight,
        },
        advancedStealth: cliOptions.advancedStealth,
        modelName: cliOptions.modelName,
        modelApiKey: cliOptions.modelApiKey,
        modelBaseURL: cliOptions.modelBaseURL,
        keepAlive: cliOptions.keepAlive,
        experimental: cliOptions.experimental,
    };
}
// Helper function to merge config objects, excluding undefined values
function pickDefined(obj) {
    if (!obj)
        return {};
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}
// Merge two configuration objects (overrides takes precedence)
function mergeConfig(base, overrides) {
    const baseFiltered = pickDefined(base);
    const overridesFiltered = pickDefined(overrides);
    // Create the result object
    const result = { ...baseFiltered };
    // For each property in overrides
    for (const [key, value] of Object.entries(overridesFiltered)) {
        if (key === "context" && value && result.context) {
            // Special handling for context object to ensure deep merge
            result.context = {
                ...result.context,
                ...value,
            };
        }
        else if (value &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            result[key] &&
            typeof result[key] === "object") {
            // Deep merge for other nested objects
            result[key] = {
                ...result[key],
                ...value,
            };
        }
        else {
            // Simple override for primitives, arrays, etc.
            result[key] = value;
        }
    }
    return result;
}
