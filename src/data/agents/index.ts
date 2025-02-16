import { spktAgent } from './spktAgent';
import { caseResearchAgent } from './caseResearchAgent';
import { imageAgent } from './imageAgent';
import { hoaxCheckerAgent } from './hoaxCheckerAgent';
import { imageProcessorAgent } from './imageProcessorAgent';
import { modusKejahatanAgent } from './modusKejahatanAgent';
import crimeTrendAnalystAgent from './crimeTrendAnalystAgent';
import sentimentAnalystAgent from './sentimentAnalystAgent';
import type { ExtendedAgent } from '../../types';

export const agents: ExtendedAgent[] = [
  spktAgent,
  caseResearchAgent,
  imageAgent,
  hoaxCheckerAgent,
  imageProcessorAgent,
  modusKejahatanAgent,
  crimeTrendAnalystAgent,
  sentimentAnalystAgent
];

export {
  spktAgent,
  caseResearchAgent,
  imageAgent,
  hoaxCheckerAgent,
  imageProcessorAgent,
  modusKejahatanAgent,
  crimeTrendAnalystAgent,
  sentimentAnalystAgent
};