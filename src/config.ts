import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Zod schema for environment validation
const envSchema = z.object({
  JIRA_BASE_URL: z.string().url(),
  JIRA_EMAIL: z.string().email(),
  JIRA_API_TOKEN: z.string().min(1),
  SOURCEGRAPH_URL: z.string().url(),
  SOURCEGRAPH_TOKEN: z.string().min(1),
});

// Parse and validate environment variables
function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    throw new Error('Environment validation failed');
  }

  return result.data;
}

export const config = loadConfig();

export type Config = z.infer<typeof envSchema>;

