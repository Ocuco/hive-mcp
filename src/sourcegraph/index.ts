import { z } from 'zod';
import { Integration } from '../types.js';
import { SourcegraphClient } from './client.js';
import {
  sourcegraphTools,
  sourcegraphHandlers,
  setSourcegraphClient,
} from './tools.js';

const configSchema = z.object({
  SOURCEGRAPH_URL: z.string().url(),
  SOURCEGRAPH_TOKEN: z.string().min(1),
});

const sourcegraphIntegration: Integration = {
  name: 'sourcegraph',
  configSchema,

  init(config) {
    const client = new SourcegraphClient(config);
    setSourcegraphClient(client);
  },

  tools: sourcegraphTools,
  handlers: sourcegraphHandlers,
};

export default sourcegraphIntegration;
