/**
 * Mock chat responses for demo mode when no API key / agent is available.
 * Organized by dashboard section.
 */

export interface MockResponse {
  content: string
  delay: number // ms to simulate
  toolCalls?: { name: string; args: string; result: string }[]
}

const GENERIC_RESPONSES: MockResponse[] = [
  {
    content: "I can help you with patient lookups, claims management, scheduling, denials tracking, and more. What would you like to know?",
    delay: 800,
  },
  {
    content: "I have access to patient records, claims pipeline data, appointment schedules, and denial/appeal tracking. How can I assist you today?",
    delay: 600,
  },
]

const SECTION_RESPONSES: Record<string, MockResponse[]> = {
  patients: [
    {
      content: "Here's a quick patient summary:\n\n**Active Patients**: 1,247\n**New This Month**: 23\n**Pending Matches**: 4\n\nYou can ask me to look up a specific patient by name, ID, or phone number.",
      delay: 1000,
    },
    {
      content: "Looking up the patient...\n\n**Lisa Patel** (PAT-1001)\n- DOB: 1985-03-14\n- Insurance: Delta Dental PPO (DD-9847231)\n- Outstanding Balance: $245.00\n- Next Appointment: Feb 10, 2026 at 9:00 AM\n- Notes: Crown prep D2740 in progress. Follow-up needed.\n\n_PHI accessed: patient demographics and financial information._",
      delay: 1500,
      toolCalls: [{ name: "lookup_patient", args: '{"query":"Lisa Patel"}', result: "Found 1 patient" }],
    },
  ],
  scheduling: [
    {
      content: "Here's today's schedule overview:\n\n**5 appointments** across 2 providers\n- Dr. Sarah Mitchell: 3 appointments (Op 1, Op 2)\n- Dr. James Park: 2 appointments (Op 2, Op 3)\n\n**3 open slots** available today\n\nWould you like details on a specific time or provider?",
      delay: 1200,
      toolCalls: [{ name: "get_schedule", args: '{}', result: "5 appointments found" }],
    },
  ],
  rcm: [
    {
      content: "RCM Overview:\n\n**Claims Pipeline**\n- Scrubbed: 1 | Submitted: 1 | Pending: 1 | Denied: 2 | Paid: 1\n\n**Denials Requiring Attention**\n- DEN-301: Lisa Patel — Missing pre-auth (D2740) — Deadline: Feb 19\n- DEN-298: James Thompson — Frequency limit (D2750-D2752) — $3,600\n\n**A/R Summary**: $48,750 outstanding, 28 avg days\n\nWhat would you like to drill into?",
      delay: 1400,
      toolCalls: [
        { name: "get_claims_summary", args: '{}', result: "6 claims found" },
        { name: "get_denial_details", args: '{}', result: "3 denials found" },
      ],
    },
  ],
  payments: [
    {
      content: "Payment Summary:\n\n**Collections This Month**: $12,450\n**Outstanding Patient Balances**: $15,700\n**Active Payment Plans**: 8\n**Text-to-Pay Pending**: 3 links sent, awaiting payment\n\nI can look up specific patient balances or payment plan details.",
      delay: 1000,
    },
  ],
  reputation: [
    {
      content: "Reputation Overview:\n\n**Google Rating**: 4.6 stars (127 reviews)\n**This Month**: 4 new reviews (3 positive, 1 negative)\n**Response Rate**: 92%\n**Pending Responses**: 2 AI drafts ready for review\n\nWould you like to see the pending review responses?",
      delay: 1100,
    },
  ],
  dashboard: [
    {
      content: "Good morning! Here's your daily snapshot:\n\n**Today's Schedule**: 5 appointments, $4,200 production target\n**Pending Denials**: 3 (appeal deadlines approaching)\n**A/R Alert**: 12 claims over 60 days ($8,340)\n**Recent Payment**: $245 collected via Text-to-Pay\n**Reviews**: 1 new 1-star review needs response\n\nWhat would you like to focus on?",
      delay: 1300,
    },
  ],
}

/**
 * Get a mock response based on the user's message and current section.
 */
export function getMockResponse(message: string, section: string): MockResponse {
  const lowerMsg = message.toLowerCase()

  // Check for section-specific responses
  const sectionResponses = SECTION_RESPONSES[section]
  if (sectionResponses && sectionResponses.length > 0) {
    // Simple keyword matching for more relevant responses
    if (lowerMsg.includes("patient") && SECTION_RESPONSES.patients) {
      return SECTION_RESPONSES.patients[Math.floor(Math.random() * SECTION_RESPONSES.patients.length)]
    }
    if ((lowerMsg.includes("schedule") || lowerMsg.includes("appointment")) && SECTION_RESPONSES.scheduling) {
      return SECTION_RESPONSES.scheduling[0]
    }
    if ((lowerMsg.includes("claim") || lowerMsg.includes("denial") || lowerMsg.includes("ar")) && SECTION_RESPONSES.rcm) {
      return SECTION_RESPONSES.rcm[0]
    }
    return sectionResponses[Math.floor(Math.random() * sectionResponses.length)]
  }

  return GENERIC_RESPONSES[Math.floor(Math.random() * GENERIC_RESPONSES.length)]
}

/**
 * Get suggested prompts for the empty state based on current section.
 */
export function getSuggestedPrompts(section: string): string[] {
  switch (section) {
    case "patients":
      return [
        "Look up patient Lisa Patel",
        "Which patients have outstanding balances?",
        "Show me new patients this month",
      ]
    case "scheduling":
      return [
        "What's on the schedule today?",
        "Find open slots this week",
        "Which patients are confirmed for tomorrow?",
      ]
    case "rcm":
      return [
        "Show me denied claims needing attention",
        "What's our current A/R summary?",
        "Which claims are over 60 days?",
      ]
    case "payments":
      return [
        "Show outstanding patient balances",
        "How many text-to-pay links are pending?",
        "Which payment plans are overdue?",
      ]
    case "reputation":
      return [
        "What's our current Google rating?",
        "Show pending review responses",
        "Any new negative reviews?",
      ]
    default:
      return [
        "Give me today's practice snapshot",
        "Any urgent items needing attention?",
        "What denials have upcoming deadlines?",
      ]
  }
}
