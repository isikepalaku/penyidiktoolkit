import { spktAgent } from './spktAgent';
import { caseResearchAgent } from './caseResearchAgent';
import { imageAgent } from './imageAgent';
import { hoaxCheckerAgent } from './hoaxCheckerAgent';
import { imageProcessorAgent } from './imageProcessorAgent';
import { modusKejahatanAgent } from './modusKejahatanAgent';
import crimeTrendAnalystAgent from './crimeTrendAnalystAgent';
import sentimentAnalystAgent from './sentimentAnalystAgent';
import tipikorAnalystAgent from './tipikorAnalystAgent';
import { penyidikAiAgent } from './penyidikAiAgent';
import { dokpolAgent } from './dokpolAgent';
import { geminiImageAgent } from './geminiImageAgent';
import { tipidterAiAgent } from './tipidterAiAgent';
import { kuhapAgent } from './kuhapAgent';
import { encyclopediaPoliceAgent } from './encyclopediaPoliceAgent';
import { laporanInteljenAgent } from './laporanInteljenAgent';
import type { ExtendedAgent } from '../../types';

export const agents: ExtendedAgent[] = [
  spktAgent,
  caseResearchAgent,
  hoaxCheckerAgent,
  imageProcessorAgent,
  modusKejahatanAgent,
  crimeTrendAnalystAgent,
  sentimentAnalystAgent,
  tipikorAnalystAgent,
  dokpolAgent,
  encyclopediaPoliceAgent,
  laporanInteljenAgent
];

export {
  spktAgent,
  caseResearchAgent,
  imageAgent,
  hoaxCheckerAgent,
  imageProcessorAgent,
  modusKejahatanAgent,
  crimeTrendAnalystAgent,
  sentimentAnalystAgent,
  tipikorAnalystAgent,
  penyidikAiAgent,
  dokpolAgent,
  geminiImageAgent,
  tipidterAiAgent,
  kuhapAgent,
  encyclopediaPoliceAgent,
  laporanInteljenAgent
};
