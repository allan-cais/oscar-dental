import { tool } from "@anthropic-ai/claude-agent-sdk"
import { z } from "zod"
import { MOCK_APPOINTMENTS, MOCK_OPEN_SLOTS } from "../mock-data.js"

export const getSchedule = tool(
  "get_schedule",
  "Get the appointment schedule for a specific date or date range, optionally filtered by provider.",
  {
    date: z.string().optional().describe("Date in YYYY-MM-DD format (defaults to today)"),
    providerId: z.string().optional().describe("Filter by provider ID (e.g. PROV-01)"),
  },
  async ({ date, providerId }) => {
    console.log(`[Oscar Tool] get_schedule called`, { date, providerId })
    let appointments = [...MOCK_APPOINTMENTS]

    if (date) appointments = appointments.filter((a) => a.date === date)
    if (providerId) appointments = appointments.filter((a) => a.providerId === providerId)

    if (appointments.length === 0) {
      return { content: [{ type: "text" as const, text: `No appointments found${date ? ` for ${date}` : ""}${providerId ? ` with provider ${providerId}` : ""}.` }] }
    }

    const grouped = new Map<string, typeof appointments>()
    for (const apt of appointments) {
      const key = apt.date
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(apt)
    }

    const lines: string[] = [`## Schedule (${appointments.length} appointments)`]

    for (const [aptDate, apts] of grouped) {
      lines.push(``, `### ${aptDate}`)
      for (const a of apts.sort((x, y) => x.startTime.localeCompare(y.startTime))) {
        lines.push(
          `- **${a.startTime}–${a.endTime}** | ${a.patientName} | ${a.type} | ${a.providerName} (${a.operatory}) | Status: ${a.status}${a.procedureCodes ? ` | Codes: ${a.procedureCodes.join(", ")}` : ""}`
        )
      }
    }

    return { content: [{ type: "text" as const, text: lines.join("\n") }] }
  }
)

export const getOpenSlots = tool(
  "get_open_slots",
  "Find available appointment slots, optionally filtered by date or minimum duration.",
  {
    date: z.string().optional().describe("Date in YYYY-MM-DD format to check for slots"),
    minDuration: z.number().optional().describe("Minimum slot duration in minutes"),
  },
  async ({ date, minDuration }) => {
    console.log(`[Oscar Tool] get_open_slots called`, { date, minDuration })
    let slots = [...MOCK_OPEN_SLOTS]

    if (date) slots = slots.filter((s) => s.date === date)
    if (minDuration) slots = slots.filter((s) => s.duration >= minDuration)

    if (slots.length === 0) {
      return { content: [{ type: "text" as const, text: `No open slots found${date ? ` for ${date}` : ""}${minDuration ? ` with minimum ${minDuration} minutes` : ""}.` }] }
    }

    const lines = [
      `## Open Slots (${slots.length} available)`,
      ``,
      `| Date | Time | Duration | Provider | Operatory |`,
      `|------|------|----------|----------|-----------|`,
      ...slots.map((s) =>
        `| ${s.date} | ${s.startTime}–${s.endTime} | ${s.duration} min | ${s.providerName} | ${s.operatory} |`
      ),
    ]

    return { content: [{ type: "text" as const, text: lines.join("\n") }] }
  }
)
