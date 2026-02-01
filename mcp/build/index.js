import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
const API_URL = "https://teleworker.erbin.workers.dev";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
    console.error("Error: ADMIN_PASSWORD environment variable is required.");
    process.exit(1);
}
const server = new Server({
    name: "teleworker-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Helper for API calls
async function callApi(method, path, body) {
    const headers = {
        "X-Admin-Password": ADMIN_PASSWORD,
    };
    if (body)
        headers["Content-Type"] = "application/json";
    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.json();
}
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "list_reminders",
                description: "List all active reminders from Teleworker",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "create_reminder",
                description: "Create a new reminder",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Name of the reminder" },
                        message: { type: "string", description: "Message to send" },
                        when: {
                            type: "string",
                            description: "Cron expression (e.g. '* * * * *') or ISO date",
                        },
                        chatIds: {
                            type: "array",
                            items: { type: "string" },
                            description: "List of Chat IDs to notify",
                        },
                        ring: {
                            type: "number",
                            description: "1 to ring (call), 0 to just message",
                            default: 0,
                        },
                        active: {
                            type: "number",
                            description: "1 for active, 0 for inactive",
                            default: 1,
                        },
                        apiUrl: {
                            type: "string",
                            description: "Optional microservice API URL to check condition",
                        },
                    },
                    required: ["name", "message", "when", "chatIds"],
                },
            },
            {
                name: "delete_reminder",
                description: "Delete a reminder by ID",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "ID of the reminder to delete" },
                    },
                    required: ["id"],
                },
            },
        ],
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        if (name === "list_reminders") {
            const reminders = await callApi("GET", "/reminders");
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(reminders, null, 2),
                    },
                ],
            };
        }
        if (name === "create_reminder") {
            const ReminderSchema = z.object({
                name: z.string(),
                message: z.string(),
                when: z.string(),
                chatIds: z.array(z.string()),
                ring: z.number().optional(),
                active: z.number().optional(),
                apiUrl: z.string().optional(),
            });
            const body = ReminderSchema.parse(args);
            const result = await callApi("POST", "/reminders", body);
            return {
                content: [
                    {
                        type: "text",
                        text: `Reminder created: ${JSON.stringify(result, null, 2)}`,
                    },
                ],
            };
        }
        if (name === "delete_reminder") {
            const DeleteSchema = z.object({
                id: z.string(),
            });
            const { id } = DeleteSchema.parse(args);
            await callApi("DELETE", `/reminders/${id}`);
            return {
                content: [
                    {
                        type: "text",
                        text: `Reminder ${id} deleted successfully.`,
                    },
                ],
            };
        }
        throw new Error(`Unknown tool: ${name}`);
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${error.message}`,
                },
            ],
            isError: true,
        };
    }
});
const transport = new StdioServerTransport();
await server.connect(transport);
