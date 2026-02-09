/**
 * Oscar Agent — Persona Definitions & Tool Gating
 * Controls which tools are available based on user role.
 */

import { type Persona, TOOL_REGISTRY } from "./types.js"

/** Persona hierarchy for tool access comparison */
const PERSONA_LEVELS: Record<Persona, number> = {
  read_only: 0,
  read_action: 1,
  full: 2,
}

/**
 * Get the list of tool names available for a given persona.
 */
export function getToolsForPersona(persona: Persona): string[] {
  const personaLevel = PERSONA_LEVELS[persona]
  return TOOL_REGISTRY
    .filter((t) => PERSONA_LEVELS[t.minPersona] <= personaLevel)
    .map((t) => t.name)
}

/**
 * Check if a specific tool is available for a persona.
 */
export function canUseTool(persona: Persona, toolName: string): boolean {
  const meta = TOOL_REGISTRY.find((t) => t.name === toolName)
  if (!meta) return false
  return PERSONA_LEVELS[persona] >= PERSONA_LEVELS[meta.minPersona]
}

/**
 * Map an Oscar user role to a chat persona.
 * Roles come from convex/lib/permissions.ts.
 */
export function personaFromRole(role: string): Persona {
  switch (role) {
    case "admin":
      return "full"
    case "office_manager":
      return "read_action"
    case "billing":
      return "read_action"
    case "clinical":
      return "read_only"
    case "front_desk":
      return "read_only"
    case "provider":
      return "read_only"
    default:
      return "read_only"
  }
}

/**
 * Get a human-readable label for a persona.
 */
export function personaLabel(persona: Persona): string {
  switch (persona) {
    case "read_only":
      return "Read Only"
    case "read_action":
      return "Read + Action"
    case "full":
      return "Full Access"
  }
}

/**
 * Get the description of what a persona can do, for display purposes.
 */
export function personaDescription(persona: Persona): string {
  switch (persona) {
    case "read_only":
      return "You can look up patient information, claims, schedules, and reports. You cannot perform actions like creating tasks or running eligibility checks."
    case "read_action":
      return "You can look up data and perform actions like creating tasks, running eligibility checks, and generating appeal letters. Actions require confirmation before execution."
    case "full":
      return "You have full access to all Oscar capabilities including data lookups and all available actions."
  }
}
