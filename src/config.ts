import dotenv from 'dotenv';
import { integrations } from './registry.js';
import { Integration } from './types.js';

// Load environment variables
dotenv.config();

export interface Config {
  enabledIntegrations: Integration[];
}

function loadConfig(): Config {
  const allNames = integrations.map(i => i.name);

  // Parse DISABLED_SERVICES
  const raw = process.env.DISABLED_SERVICES;
  const disabled: string[] = raw
    ? raw.split(',').map(s => s.trim().toLowerCase())
    : [];

  for (const name of disabled) {
    if (!allNames.includes(name)) {
      console.error(`⚠️  Unknown service "${name}" in DISABLED_SERVICES — ignoring. Known: ${allNames.join(', ')}`);
    }
  }

  const enabled = integrations.filter(i => !disabled.includes(i.name));

  // Validate config for each enabled integration
  const validIntegrations: Integration[] = [];

  for (const integration of enabled) {
    const result = integration.configSchema.safeParse(process.env);
    if (!result.success) {
      console.error(`❌ ${integration.name} is enabled but has invalid config:`);
      console.error(result.error.format());
      throw new Error(
        `${integration.name} configuration invalid. Check required environment variables.`
      );
    }
    validIntegrations.push(integration);
  }

  return { enabledIntegrations: validIntegrations };
}

export const config = loadConfig();
