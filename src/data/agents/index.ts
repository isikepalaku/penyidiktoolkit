import { spktAgent } from './spktAgent';
import { caseResearchAgent } from './caseResearchAgent';
import { imageAgent } from './imageAgent';
import { hoaxCheckerAgent } from './hoaxCheckerAgent';
import { imageProcessorAgent } from './imageProcessorAgent';
import type { ExtendedAgent } from '../../types';

export const agents: ExtendedAgent[] = [
  spktAgent,
  caseResearchAgent,
  imageAgent,
  hoaxCheckerAgent,
  imageProcessorAgent
];

export {
  spktAgent,
  caseResearchAgent,
  imageAgent,
  hoaxCheckerAgent,
  imageProcessorAgent
};