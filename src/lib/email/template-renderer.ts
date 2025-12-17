// Email Template Renderer
// Handles variable substitution and template rendering

import { AVAILABLE_VARIABLES } from '@/types/email'

/**
 * Renders an email template by substituting variables
 * Variables use Mustache-style syntax: {{variable_name}}
 *
 * @param template - Template string with {{variable}} placeholders
 * @param variables - Key-value pairs for variable substitution
 * @returns Rendered template with variables replaced
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let rendered = template

  // Replace each variable
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    rendered = rendered.replace(regex, value || '')
  })

  // Remove any unused variables (show as empty)
  rendered = rendered.replace(/{{[^}]+}}/g, '')

  return rendered
}

/**
 * Extracts all variables from a template string
 *
 * @param template - Template string containing {{variable}} syntax
 * @returns Array of unique variable names found in the template
 */
export function extractVariables(template: string): string[] {
  const regex = /{{\\s*([^}\\s]+)\\s*}}/g
  const variables: string[] = []
  let match

  while ((match = regex.exec(template)) !== null) {
    const variableName = match[1]
    if (!variables.includes(variableName)) {
      variables.push(variableName)
    }
  }

  return variables
}

/**
 * Validates that all variables in a template are available
 *
 * @param template - Template string to validate
 * @returns Object with validation result and any unknown variables
 */
export function validateTemplateVariables(template: string): {
  isValid: boolean
  unknownVariables: string[]
} {
  const usedVariables = extractVariables(template)
  const availableVariableKeys = AVAILABLE_VARIABLES.map(v => v.key)

  const unknownVariables = usedVariables.filter(
    variable => !availableVariableKeys.includes(variable)
  )

  return {
    isValid: unknownVariables.length === 0,
    unknownVariables,
  }
}

/**
 * Gets variable information for a given variable key
 *
 * @param key - Variable key to look up
 * @returns Variable information or undefined if not found
 */
export function getVariableInfo(key: string) {
  return AVAILABLE_VARIABLES.find(v => v.key === key)
}

/**
 * Gets all variables by category
 *
 * @param category - Category to filter by
 * @returns Array of variables in the specified category
 */
export function getVariablesByCategory(
  category: 'user' | 'company' | 'subscription' | 'lead' | 'system' | 'custom'
) {
  return AVAILABLE_VARIABLES.filter(v => v.category === category)
}

/**
 * Creates a preview of a template with example data
 *
 * @param template - Template string to preview
 * @returns Rendered template with example values
 */
export function previewTemplate(template: string): string {
  const exampleVariables: Record<string, string> = {}

  AVAILABLE_VARIABLES.forEach(variable => {
    if (variable.example) {
      exampleVariables[variable.key] = variable.example
    }
  })

  return renderTemplate(template, exampleVariables)
}

/**
 * Escapes HTML special characters to prevent XSS
 *
 * @param unsafe - Unsafe string that may contain HTML
 * @returns HTML-escaped string
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Sanitizes user input before using in variables
 *
 * @param value - Value to sanitize
 * @param allowHtml - Whether to allow HTML tags
 * @returns Sanitized value
 */
export function sanitizeVariable(value: string, allowHtml = false): string {
  if (!allowHtml) {
    return escapeHtml(value)
  }

  // If HTML is allowed, still remove dangerous tags/attributes
  // This is a simple implementation - for production, use a library like DOMPurify
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
}

/**
 * Generates a plain text version from HTML
 *
 * @param html - HTML content
 * @returns Plain text version
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim()
}
