import { spktAgent } from './spktAgent';
import { forensicAgent } from './forensicAgent';
import { behavioralAgent } from './behavioralAgent';
import { witnessAgent } from './witnessAgent';
import { reportAgent } from './reportAgent';
import { imageAgent } from './imageAgent';
import type { ExtendedAgent } from '../../types';

export const agents: ExtendedAgent[] = [
  spktAgent,
  forensicAgent,
  behavioralAgent,
  witnessAgent,
  reportAgent,
  imageAgent
];

export {
  spktAgent,
  forensicAgent,
  behavioralAgent,
  witnessAgent,
  reportAgent,
  imageAgent
};