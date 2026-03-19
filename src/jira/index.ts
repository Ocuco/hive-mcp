import { z } from 'zod';
import { Integration } from '../types.js';
import { JiraClient } from './client.js';
import {
  jiraTools,
  jiraHandlers,
  setJiraClient,
} from './tools.js';
import {
  jiraResourceTemplates,
  listJiraResources,
  readJiraResource,
  initJiraResources,
} from './resources.js';

const configSchema = z.object({
  JIRA_BASE_URL: z.string().url(),
  JIRA_API_TOKEN: z.string().min(1),
});

const jiraIntegration: Integration = {
  name: 'jira',
  configSchema,

  init(config) {
    const client = new JiraClient(config);
    setJiraClient(client);
    initJiraResources(client);
  },

  tools: jiraTools,
  handlers: jiraHandlers,
  resourceTemplates: jiraResourceTemplates,
  listResources: listJiraResources,
  readResource: readJiraResource,
};

export default jiraIntegration;
