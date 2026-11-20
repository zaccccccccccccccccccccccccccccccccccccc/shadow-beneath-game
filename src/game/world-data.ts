import type { CopyKey } from './localization';

export const DISTRICT_WIDTH = 2400;
export const DISTRICT_HEIGHT = 1600;

export type RegionId = 'hq' | 'oldTown' | 'campus' | 'harbor' | 'hill';

export interface Point { x: number; y: number }
export interface WorldBlocker { x: number; y: number; width: number; height: number }
export interface WorldPortal {
  x: number;
  y: number;
  width: number;
  height: number;
  target: RegionId;
  spawn: Point;
  unlock?: 'tutorial' | 'informant' | 'accounts';
}
export interface DistrictMap {
  id: RegionId;
  label: CopyKey;
  spawn: Point;
  overview: Point;
  portals: WorldPortal[];
  blockers: WorldBlocker[];
}

export const districtMaps: Record<RegionId, DistrictMap> = {
  hq: {
    id: 'hq', label: 'districtHQ', spawn: { x: 1190, y: 1120 }, overview: { x: 90, y: 160 },
    portals: [{ x: 2280, y: 700, width: 100, height: 190, target: 'oldTown', spawn: { x: 1600, y: 680 }, unlock: 'tutorial' }],
    blockers: [{ x: 0, y: 0, width: 2220, height: 620 }, { x: 0, y: 1250, width: 330, height: 326 }, { x: 1850, y: 1250, width: 550, height: 326 }, { x: 300, y: 1370, width: 800, height: 130 }, { x: 1380, y: 1370, width: 840, height: 130 }, { x: 0, y: 0, width: DISTRICT_WIDTH, height: 24 }, { x: 0, y: 0, width: 24, height: DISTRICT_HEIGHT }, { x: DISTRICT_WIDTH - 24, y: 0, width: 24, height: DISTRICT_HEIGHT }, { x: 0, y: DISTRICT_HEIGHT - 24, width: DISTRICT_WIDTH, height: 24 }],
  },
  oldTown: {
    id: 'oldTown', label: 'districtOldTown', spawn: { x: 1600, y: 680 }, overview: { x: 290, y: 120 },
    portals: [
      { x: 590, y: 575, width: 180, height: 100, target: 'hq', spawn: { x: 2180, y: 800 } },
      { x: 1450, y: 550, width: 180, height: 100, target: 'campus', spawn: { x: 1200, y: 1080 }, unlock: 'informant' },
      { x: 1410, y: 1400, width: 180, height: 100, target: 'harbor', spawn: { x: 2180, y: 800 }, unlock: 'informant' },
    ],
    blockers: [{ x: 0, y: 0, width: 680, height: 470 }, { x: 650, y: 0, width: 1020, height: 440 }, { x: 1650, y: 0, width: 750, height: 470 }, { x: 0, y: 460, width: 420, height: 450 }, { x: 0, y: 910, width: 330, height: 480 }, { x: 520, y: 660, width: 710, height: 920 }, { x: 1750, y: 780, width: 650, height: 800 }, { x: 0, y: 1390, width: 400, height: 186 }, { x: 0, y: 0, width: DISTRICT_WIDTH, height: 24 }, { x: 0, y: 0, width: 24, height: DISTRICT_HEIGHT }, { x: DISTRICT_WIDTH - 24, y: 0, width: 24, height: DISTRICT_HEIGHT }, { x: 0, y: DISTRICT_HEIGHT - 24, width: DISTRICT_WIDTH, height: 24 }],
  },
  campus: {
    id: 'campus', label: 'districtCampus', spawn: { x: 1200, y: 1080 }, overview: { x: 200, y: 255 },
    portals: [
      { x: 1110, y: 570, width: 180, height: 100, target: 'oldTown', spawn: { x: 1600, y: 680 } },
      { x: 20, y: 700, width: 100, height: 190, target: 'harbor', spawn: { x: 2180, y: 800 } },
      { x: 2280, y: 700, width: 100, height: 190, target: 'hill', spawn: { x: 205, y: 800 }, unlock: 'accounts' },
    ],
    blockers: [{ x: 0, y: 0, width: 1100, height: 680 }, { x: 1320, y: 0, width: 1080, height: 680 }, { x: 0, y: 740, width: 770, height: 760 }, { x: 1550, y: 740, width: 850, height: 820 }, { x: 0, y: 0, width: DISTRICT_WIDTH, height: 24 }, { x: 0, y: 0, width: 24, height: DISTRICT_HEIGHT }, { x: DISTRICT_WIDTH - 24, y: 0, width: 24, height: DISTRICT_HEIGHT }, { x: 0, y: DISTRICT_HEIGHT - 24, width: DISTRICT_WIDTH, height: 24 }],
  },
  harbor: {
    id: 'harbor', label: 'districtHarbor', spawn: { x: 2180, y: 800 }, overview: { x: 92, y: 312 },
    portals: [
      { x: 1810, y: 190, width: 180, height: 100, target: 'hq', spawn: { x: 2180, y: 800 } },
      { x: 2180, y: 20, width: 180, height: 100, target: 'oldTown', spawn: { x: 1600, y: 680 } },
      { x: 2280, y: 700, width: 100, height: 190, target: 'campus', spawn: { x: 820, y: 800 } },
    ],
    blockers: [{ x: 0, y: 1220, width: 2400, height: 356 }, { x: 0, y: 0, width: 1520, height: 720 }, { x: 1520, y: 0, width: 160, height: 620 }, { x: 0, y: 1130, width: 2400, height: 90 }, { x: 0, y: 0, width: DISTRICT_WIDTH, height: 24 }, { x: 0, y: 0, width: 24, height: DISTRICT_HEIGHT }, { x: DISTRICT_WIDTH - 24, y: 0, width: 24, height: DISTRICT_HEIGHT }, { x: 0, y: DISTRICT_HEIGHT - 24, width: DISTRICT_WIDTH, height: 24 }],
  },
  hill: {
    id: 'hill', label: 'districtHill', spawn: { x: 205, y: 800 }, overview: { x: 295, y: 312 },
    portals: [
      { x: 20, y: 700, width: 100, height: 190, target: 'campus', spawn: { x: 1480, y: 800 } },
      { x: 1110, y: 1480, width: 180, height: 100, target: 'harbor', spawn: { x: 2100, y: 1080 }, unlock: 'accounts' },
    ],
    blockers: [{ x: 1530, y: 0, width: 870, height: 800 }, { x: 500, y: 660, width: 700, height: 130 }, { x: 1510, y: 660, width: 890, height: 130 }, { x: 0, y: 0, width: 300, height: 430 }, { x: 0, y: 1100, width: 490, height: 500 }, { x: 0, y: 0, width: DISTRICT_WIDTH, height: 24 }, { x: 0, y: 0, width: 24, height: DISTRICT_HEIGHT }, { x: DISTRICT_WIDTH - 24, y: 0, width: 24, height: DISTRICT_HEIGHT }, { x: 0, y: DISTRICT_HEIGHT - 24, width: DISTRICT_WIDTH, height: 24 }],
  },
};

export interface InteractionChoice { label: CopyKey; reply: CopyKey; clue?: CopyKey }
export interface WorldInteraction {
  id: string;
  name: CopyKey;
  intro: CopyKey;
  x: number;
  y: number;
  atlasCell: number;
  region: RegionId;
  choices: InteractionChoice[];
}

export interface CompanionSnackSpot {
  id: string;
  region: RegionId;
  x: number;
  y: number;
  spirit: '獬豸' | '白泽' | '貔貅' | '麒麟' | '玄武' | '青龙';
  lesson: '明辨曲直' | '求证核实' | '守住边界' | '克制私欲' | '守责到底' | '公开透明';
}

export const companionSnackSpots: CompanionSnackSpot[] = [
  { id: 'hq-mint', region: 'hq', x: 1060, y: 1080, spirit: '獬豸', lesson: '明辨曲直' },
  { id: 'hq-plum', region: 'hq', x: 1650, y: 1000, spirit: '白泽', lesson: '求证核实' },
  { id: 'oldtown-pear', region: 'oldTown', x: 1420, y: 600, spirit: '貔貅', lesson: '守住边界' },
  { id: 'harbor-cake', region: 'harbor', x: 2050, y: 900, spirit: '麒麟', lesson: '克制私欲' },
  { id: 'campus-bean', region: 'campus', x: 1210, y: 1100, spirit: '玄武', lesson: '守责到底' },
  { id: 'hill-tea', region: 'hill', x: 360, y: 850, spirit: '青龙', lesson: '公开透明' },
];

export const worldInteractions: WorldInteraction[] = [
  { id: 'mentor', name: 'npcMentor', intro: 'mentorIntro', x: 820, y: 890, atlasCell: 1, region: 'hq', choices: [{ label: 'askHow', reply: 'mentorReply' }, { label: 'endTalk', reply: 'endTalk' }] },
  { id: 'supervisor', name: 'npcSupervisor', intro: 'supervisorIntro', x: 1390, y: 850, atlasCell: 0, region: 'hq', choices: [{ label: 'askMission', reply: 'supervisorReply' }] },
  { id: 'case-file', name: 'objectiveFile', intro: 'fileIntro', x: 1510, y: 1030, atlasCell: 0, region: 'hq', choices: [{ label: 'optionRecord', reply: 'resultRecord', clue: 'clueBudget' }, { label: 'optionMissingPage', reply: 'resultMissingPage', clue: 'clueMissingPage' }] },
  { id: 'colleague', name: 'npcColleague', intro: 'colleagueIntro', x: 890, y: 1140, atlasCell: 7, region: 'campus', choices: [{ label: 'optionPolite', reply: 'resultPolite' }] },
  { id: 'informant', name: 'npcInformant', intro: 'informantIntro', x: 1180, y: 630, atlasCell: 2, region: 'oldTown', choices: [{ label: 'optionAskMeeting', reply: 'resultMeeting', clue: 'clueMeeting' }, { label: 'optionAskPackage', reply: 'resultPackage', clue: 'cluePackage' }] },
  { id: 'developer', name: 'npcDeveloper', intro: 'developerIntro', x: 1640, y: 840, atlasCell: 6, region: 'oldTown', choices: [{ label: 'optionPolite', reply: 'resultPolite' }] },
  { id: 'cafe-owner', name: 'npcCafe', intro: 'cafeIntro', x: 1210, y: 810, atlasCell: 3, region: 'harbor', choices: [{ label: 'optionCheckRegister', reply: 'resultRegister', clue: 'clueRegister' }] },
  { id: 'student', name: 'npcStudent', intro: 'studentIntro', x: 980, y: 930, atlasCell: 4, region: 'campus', choices: [{ label: 'optionStudentID', reply: 'resultStudentID', clue: 'clueStudentID' }] },
  { id: 'treasurer', name: 'npcTreasurer', intro: 'treasurerIntro', x: 1480, y: 900, atlasCell: 5, region: 'campus', choices: [{ label: 'optionAccount', reply: 'resultAccount', clue: 'clueAccounts' }] },
  { id: 'hill-guard', name: 'npcColleague', intro: 'colleagueIntro', x: 1240, y: 980, atlasCell: 7, region: 'hill', choices: [{ label: 'optionPolite', reply: 'resultPolite' }] },
];

export function unlocked(portal: WorldPortal, progress: { tutorialDone: boolean; informantInterviewed: boolean; hasAccountsClue: boolean }): boolean {
  if (portal.unlock === 'tutorial') return progress.tutorialDone;
  if (portal.unlock === 'informant') return progress.informantInterviewed;
  if (portal.unlock === 'accounts') return progress.hasAccountsClue;
  return true;
}

export function getPortalDestinations(area: RegionId, progress: Parameters<typeof unlocked>[1]): Array<{ target: RegionId; available: boolean }> {
  return districtMaps[area].portals.map((portal) => ({ target: portal.target, available: unlocked(portal, progress) }));
}
