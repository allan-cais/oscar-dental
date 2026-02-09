/**
 * Oscar Agent — CLI Test Script
 *
 * Usage: cd agent && npx tsx test.ts
 *
 * Runs the Oscar agent with a test prompt and prints the streamed response.
 * Requires ANTHROPIC_API_KEY to be set in environment.
 */

import { createOscarAgent } from "./src/index.js"

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY not set. Export it before running:")
    console.error("   export ANTHROPIC_API_KEY=sk-ant-...")
    process.exit(1)
  }

  console.log("🦷 Oscar Agent — Test Runner")
  console.log("━".repeat(50))

  // Test prompt — asks about patients with upcoming appointments
  const testMessage = process.argv[2] || "What patients have upcoming appointments this week? Give me a summary."

  console.log(`\n📨 User: ${testMessage}`)
  console.log(`📋 Context: scheduling section`)
  console.log(`🔑 Persona: read_action`)
  console.log("━".repeat(50))
  console.log("")

  try {
    const agent = createOscarAgent({
      message: testMessage,
      context: {
        section: "scheduling",
        pageTitle: "Schedule",
      },
      persona: "read_action",
    })

    for await (const message of agent) {
      switch (message.type) {
        case "system":
          if (message.subtype === "init") {
            console.log("🔧 Agent initialized")
          }
          break

        case "assistant":
          // Extract text content from assistant messages
          if (message.message?.content) {
            for (const block of message.message.content) {
              if (block.type === "text") {
                process.stdout.write(block.text)
              } else if (block.type === "tool_use") {
                console.log(`\n🔨 Tool call: ${block.name}`)
                console.log(`   Args: ${JSON.stringify(block.input, null, 2)}`)
              }
            }
          }
          break

        case "result":
          console.log("\n")
          console.log("━".repeat(50))
          console.log("✅ Agent completed")
          if (message.usage) {
            console.log(`📊 Tokens — Input: ${message.usage.input_tokens}, Output: ${message.usage.output_tokens}`)
          }
          if ("total_cost_usd" in message) {
            console.log(`💰 Cost: $${(message as { total_cost_usd: number }).total_cost_usd.toFixed(4)}`)
          }
          break

        default:
          // Log other message types for debugging
          if (process.env.DEBUG) {
            console.log(`\n[DEBUG] ${message.type}:`, JSON.stringify(message, null, 2))
          }
      }
    }
  } catch (error) {
    console.error("\n❌ Agent error:", error)
    process.exit(1)
  }
}

main()
