import { Integration } from './types.js';

// Register all integrations here.
// To add a new integration, import it and add it to the array.
import jira from './jira/index.js';
import sourcegraph from './sourcegraph/index.js';

export const integrations: Integration[] = [
  jira,
  sourcegraph,
];
