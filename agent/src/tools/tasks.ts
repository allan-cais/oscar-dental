import { tool } from "@anthropic-ai/claude-agent-sdk"
import { z } from "zod"

export const createTask = tool(
  "create_task",
  "Create a HITL (human-in-the-loop) task for staff follow-up. This is an ACTION tool that requires user confirmation.",
  {
    title: z.string().describe("Task title"),
    description: z.string().describe("Detailed task description"),
    assignTo: z.enum(["front_desk", "billing", "clinical", "office_manager"]).describe("Role to assign the task to"),
    priority: z.enum(["low", "medium", "high", "urgent"]).describe("Task priority"),
    linkedResourceType: z.string().optional().describe("Type of linked resource (patient, claim, denial, etc.)"),
    linkedResourceId: z.string().optional().describe("ID of the linked resource"),
  },
  async ({ title, description, assignTo, priority, linkedResourceType, linkedResourceId }) => {
    console.log(`[Oscar Tool] create_task called`, { title, assignTo, priority })

    // In production, this would write to Convex. For now, return mock confirmation.
    const taskId = `TASK-${Math.floor(1000 + Math.random() * 9000)}`

    return {
      content: [{
        type: "text" as const,
        text: [
          `## Task Created`,
          `- **Task ID**: ${taskId}`,
          `- **Title**: ${title}`,
          `- **Description**: ${description}`,
          `- **Assigned To**: ${assignTo}`,
          `- **Priority**: ${priority}`,
          linkedResourceType ? `- **Linked ${linkedResourceType}**: ${linkedResourceId}` : null,
          ``,
          `_Task has been routed to the ${assignTo} queue._`,
        ].filter(Boolean).join("\n"),
      }],
    }
  }
)
