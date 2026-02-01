import { Hono } from "hono";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createDb } from "../db";
import { reminders, type NewReminder } from "../db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { Env } from "../services/scheduler";

/*
 * Custom SSEServerTransport for Hono/Cloudflare
 * The SDK's builtin SSEServerTransport expects Node.js req/res.
 * We need one that works with Hono's Context and returning a Response stream.
 */
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

// Custom Env type for this file
type MCPEnv = Env & {
  ADMIN_PASSWORD?: string;
};

class HonoSSETransport implements Transport {
  private _writer: WritableStreamDefaultWriter<any> | null = null;
  private _reader: ReadableStreamDefaultReader<any> | null = null;

  // Public property required by Transport interface? SDK types might be loose, but let's make it public to be safe.
  // Actually, the Transport interface doesn't enforce private/public, but if we pass it where it expects a specific shape.
  // The error "Property 'sessionId' is private... but not in type 'Transport'" suggests Transport might have it or just structural typing issue.
  // Let's make it public to silence the structural type error if it expects "sessionId" to be missing or present.
  // Wait, the error says "Property 'sessionId' is private in 'HonoSSETransport' but NOT in 'Transport'".
  // This usually means I'm passing it to something expecting exactly Transport, and my extra private property is fine?
  // No, TypeScript structural typing matches shape.
  // Actually, usually Transport interface is simple { start, send, close, onmessage... }.
  // The error likely means I defined it private in implementation but I'm trying to assign it to something that expects it public?
  // Or simply, I should just make it public readonly or ignore it.

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(
    private writer: WritableStreamDefaultWriter<Uint8Array>,
    public sessionId: string,
  ) {}

  async start(): Promise<void> {
    // Send initial endpoint event
    // The client expects an "endpoint" event with the URL to POST messages to.
    // In our case, we'll tell it to POST to /mcp/messages?sessionId=...
    const endpointEvent = `event: endpoint\ndata: /mcp/messages?sessionId=${this.sessionId}\n\n`;
    await this.writer.write(new TextEncoder().encode(endpointEvent));
  }

  async send(message: JSONRPCMessage): Promise<void> {
    const data = JSON.stringify(message);
    const event = `event: message\ndata: ${data}\n\n`;
    await this.writer.write(new TextEncoder().encode(event));
  }

  async close(): Promise<void> {
    try {
      await this.writer.close();
    } catch (e) {}
    this.onclose?.();
  }

  // Called when we receive a message via the POST endpoint
  handlePostMessage(message: JSONRPCMessage) {
    this.onmessage?.(message);
  }
}

// Global map to store active sessions (In-memory, per-isolate)
// Limitations: If CF scales to multiple isolates, this breaks.
// For a personal bot, single isolate/Durable Object is better, but this is "good enough" for low traffic.
const sessions = new Map<string, HonoSSETransport>();

const app = new Hono<{ Bindings: MCPEnv }>();

// 1. GET /sse - The Entry Point
app.get("/sse", async (c) => {
  // Auth Check
  const token = c.req.query("token") || c.req.header("X-Admin-Password");
  if (c.env.ADMIN_PASSWORD && token !== c.env.ADMIN_PASSWORD) {
    return c.text("Unauthorized", 401);
  }

  const sessionId = nanoid();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const transport = new HonoSSETransport(writer, sessionId);
  sessions.set(sessionId, transport);

  // Initialize MCP Server per connection
  const server = new Server(
    {
      name: "teleworker-cf",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Setup Tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "list_reminders",
          description: "List all active reminders",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "create_reminder",
          description: "Create a new reminder",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string" },
              message: { type: "string" },
              when: { type: "string", description: "Cron or ISO Date" },
              chatIds: { type: "array", items: { type: "string" } },
              ring: { type: "number" },
              active: { type: "number" },
              apiUrl: { type: "string" },
            },
            required: ["name", "message", "when", "chatIds"],
          },
        },
        {
          name: "delete_reminder",
          description: "Delete a reminder by ID",
          inputSchema: {
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const db = createDb(c.env.DB);
    const { name, arguments: args } = request.params;

    try {
      if (name === "list_reminders") {
        const all = await db.select().from(reminders);
        return {
          content: [{ type: "text", text: JSON.stringify(all, null, 2) }],
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
        const newReminder: NewReminder = {
          id: nanoid(),
          ...body,
          chatIds: JSON.stringify(body.chatIds), // FIX: Serialize array to string for DB
          ring: body.ring ?? 0,
          active: body.active ?? 1,
          apiUrl: body.apiUrl || null,
          count: 0,
          createdAt: new Date().toISOString(),
        };
        // Drizzle/SQLite expects chatIds to be a string per strict schema?
        // Actually schema says text, but we used JSON.parse/stringify manually before?
        // Let's check schema. If chatIds is text, we need to stringify it if it's an array.
        await db.insert(reminders).values(newReminder as any); // Cast to any to avoid strict type mismatch if schema expects string
        return {
          content: [
            { type: "text", text: JSON.stringify(newReminder, null, 2) },
          ],
        };
      }
      if (name === "delete_reminder") {
        const { id } = z.object({ id: z.string() }).parse(args);
        await db.delete(reminders).where(eq(reminders.id, id));
        return { content: [{ type: "text", text: "Deleted" }] };
      }
      throw new Error("Unknown tool");
    } catch (e: any) {
      return {
        content: [{ type: "text", text: "Error: " + e.message }],
        isError: true,
      };
    }
  });

  // Connect transport
  // Note: We don't await connect() here because it blocks? Actually server.connect expects us to be ready.
  server.connect(transport);

  // Clean up on close
  c.req.raw.signal.addEventListener("abort", () => {
    sessions.delete(sessionId);
    transport.close();
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

// 2. POST /messages - The Client sends messages here
app.post("/messages", async (c) => {
  const sessionId = c.req.query("sessionId");
  if (!sessionId || !sessions.has(sessionId)) {
    return c.text("Session not found", 404);
  }

  const transport = sessions.get(sessionId)!;
  const body = await c.req.json();

  // Pass message to the transport (which passes to the server)
  transport.handlePostMessage(body);

  return c.text("Accepted", 202);
});

// 3. GET /client-script - Helper to get the local bridge script
app.get("/client-script", (c) => {
  const scriptProp = `
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { EventSource } from "eventsource";

// Config from Arg or Default
const SERVER_URL = process.argv[2] || "https://teleworker.erbin.workers.dev/mcp/sse?token=YOUR_ADMIN_PASSWORD";

async function main() {
  // 1. Connect as Client to Remote SSE
  // We need to polyfill EventSource for Node < 18 or if SDK needs it
  global.EventSource = EventSource;

  const transport = new SSEClientTransport(new URL(SERVER_URL));
  const client = new Client({ name: "bridge-client", version: "1.0" }, { capabilities: {} });

  await client.connect(transport);

  // 2. Serve as Server to Local Stdio (Claude)
  const server = new Server({ name: "bridge-server", version: "1.0" }, {
    capabilities: { tools: {} }
  });

  // Forward Tool List
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const result = await client.listTools();
    return { tools: result.tools };
  });

  // Forward Tool Calls
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const result = await client.callTool(req.params);
    return result;
  });

  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
  
  console.error("Bridge running connecting to " + SERVER_URL);
}

main().catch(console.error);
`;
  return c.text(scriptProp);
});

export { app as mcpRoute };
