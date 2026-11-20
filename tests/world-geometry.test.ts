import { describe, expect, it } from 'vitest';
import { canOccupyWorldPosition, findWorldPath, getAtlasCellScale, getFeetDepth, getWallFrontDepth, getWallOcclusionAlpha, moveAlongWalkableAxes, sortWorldObjectsByDepth } from '../src/game/world-geometry';
import { districtMaps, getPortalDestinations, worldInteractions } from '../src/game/world-data';

describe('world geometry', () => {
  it('draws actors and markers in feet-depth order inside a shared world layer', () => {
    const objects = [
      { id: 'front-npc', depth: 999, order: getFeetDepth(820) },
      { id: 'background', depth: 0, order: -1 },
      { id: 'player', depth: -1, order: getFeetDepth(710) },
      { id: 'back-npc', depth: 1, order: getFeetDepth(640) },
    ];
    expect(sortWorldObjectsByDepth(objects, ({ order }) => order).map(({ id }) => id)).toEqual(['background', 'back-npc', 'player', 'front-npc']);
  });

  it('stops the walk cycle when a wall prevents all displacement', () => {
    const wall = [{ x: 500, y: 500, width: 700, height: 400 }];
    const canStand = (x: number, y: number) => canOccupyWorldPosition(x, y, wall, 2400, 1600);
    expect(moveAlongWalkableAxes(470, 700, 490, 700, canStand)).toEqual({ x: 470, y: 700, moved: false });
    expect(moveAlongWalkableAxes(470, 700, 470, 720, canStand)).toEqual({ x: 470, y: 720, moved: true });
  });

  it('lists each waystone destination and its current lock state', () => {
    const progress = { tutorialDone: true, informantInterviewed: false, hasAccountsClue: false };
    expect(getPortalDestinations('oldTown', progress)).toEqual([
      { target: 'hq', available: true },
      { target: 'campus', available: false },
      { target: 'harbor', available: false },
    ]);
    expect(getPortalDestinations('oldTown', { ...progress, informantInterviewed: true }).every((item) => item.available)).toBe(true);
  });

  it('provides a direct harbor stairway waystone back to headquarters', () => {
    const harbor = districtMaps.harbor;
    const portal = harbor.portals.find((item) => item.target === 'hq');
    expect(portal).toBeDefined();
    const center = { x: portal!.x + portal!.width / 2, y: portal!.y + portal!.height / 2 };
    expect(center.x).toBeGreaterThan(1700);
    expect(center.y).toBeLessThan(400);
    expect(canOccupyWorldPosition(center.x, center.y, harbor.blockers, 2400, 1600)).toBe(true);
    expect(findWorldPath(harbor.spawn, center, harbor.blockers, 2400, 1600)).not.toBeNull();
  });
  it('keeps the full player body outside the airwall boundary', () => {
    expect(canOccupyWorldPosition(40, 800, [], 2400, 1600)).toBe(false);
    expect(canOccupyWorldPosition(120, 800, [], 2400, 1600)).toBe(true);
  });

  it('blocks the player body against wall rectangles while preserving clear paths', () => {
    const walls = [{ x: 500, y: 100, width: 700, height: 500 }];
    expect(canOccupyWorldPosition(700, 570, walls, 2400, 1600)).toBe(false);
    expect(canOccupyWorldPosition(700, 700, walls, 2400, 1600)).toBe(true);
  });

  it('uses the feet at a facade edge so the upper body can pass visually behind the wall', () => {
    const facade = [{ x: 520, y: 660, width: 810, height: 920 }];
    expect(canOccupyWorldPosition(850, 640, facade, 2400, 1600)).toBe(true);
    expect(canOccupyWorldPosition(850, 675, facade, 2400, 1600)).toBe(false);
  });

  it('sorts the wall front above actors behind it and below actors standing in front', () => {
    const wall = { x: 500, y: 100, width: 700, height: 500 };
    expect(getFeetDepth(570)).toBeLessThan(getWallFrontDepth(wall));
    expect(getFeetDepth(700)).toBeGreaterThan(getWallFrontDepth(wall));
  });

  it('keeps every district entrance and portal arrival point on walkable ground', () => {
    for (const district of Object.values(districtMaps)) {
      expect(canOccupyWorldPosition(district.spawn.x, district.spawn.y, district.blockers, 2400, 1600), `${district.id} spawn`).toBe(true);
      for (const portal of district.portals) {
        const arrival = districtMaps[portal.target].spawn;
        expect(canOccupyWorldPosition(portal.spawn.x, portal.spawn.y, districtMaps[portal.target].blockers, 2400, 1600), `${district.id} to ${portal.target} arrival`).toBe(true);
        expect(canOccupyWorldPosition(arrival.x, arrival.y, districtMaps[portal.target].blockers, 2400, 1600)).toBe(true);
      }
    }
  });

  it('scales cropped atlas cells by the cell size, not the full atlas size', () => {
    expect(getAtlasCellScale(443.5, 132)).toBeCloseTo(132 / 443.5, 6);
  });

  it('marks the player translucent beside an overlapping wall edge, not in the open road', () => {
    const wall = { x: 500, y: 500, width: 700, height: 400 };
    expect(getWallOcclusionAlpha(470, 700, [wall])).toBe(0.52);
    expect(getWallOcclusionAlpha(1230, 700, [wall])).toBe(0.52);
    expect(getWallOcclusionAlpha(800, 430, [wall])).toBe(1);
    expect(getWallOcclusionAlpha(1300, 700, [wall])).toBe(1);
    expect(getWallOcclusionAlpha(800, 930, [wall])).toBe(1);
  });

  it('keeps NPC task positions walkable and reachable from each district entrance', () => {
    for (const item of worldInteractions.filter((interaction) => interaction.id !== 'case-file')) {
      const district = districtMaps[item.region];
      expect(canOccupyWorldPosition(item.x, item.y, district.blockers, 2400, 1600), `${item.id} collision`).toBe(true);
      const path = findWorldPath(district.spawn, item, district.blockers, 2400, 1600, 48);
      expect(path, `${item.id} path`).not.toBeNull();
      path?.forEach((point) => expect(canOccupyWorldPosition(point.x, point.y, district.blockers, 2400, 1600), `${item.id} route point`).toBe(true));
    }
  });

  it('keeps every map portal reachable from its district entrance', () => {
    for (const district of Object.values(districtMaps)) {
      for (const portal of district.portals) {
        const x = portal.x + portal.width / 2;
        const y = portal.y + portal.height / 2;
        const angle = Math.atan2(district.spawn.y - y, district.spawn.x - x);
        const approach = { x: x + Math.cos(angle) * 92, y: y + Math.sin(angle) * 92 };
        const path = findWorldPath(district.spawn, approach, district.blockers, 2400, 1600, 48);
        expect(path, `${district.id} portal to ${portal.target}`).not.toBeNull();
        path?.forEach((point) => expect(canOccupyWorldPosition(point.x, point.y, district.blockers, 2400, 1600), `${district.id} portal route point`).toBe(true));
      }
    }
  });

  it('places old town waystones on separate walkable streets clear of NPCs', () => {
    const district = districtMaps.oldTown;
    for (const portal of district.portals) {
      const center = { x: portal.x + portal.width / 2, y: portal.y + portal.height / 2 };
      expect(canOccupyWorldPosition(center.x, center.y, district.blockers, 2400, 1600), `${portal.target} waystone`).toBe(true);
      const route = findWorldPath(district.spawn, center, district.blockers, 2400, 1600);
      expect(route, `${portal.target} route`).not.toBeNull();
      expect(Math.hypot(route!.at(-1)!.x - center.x, route!.at(-1)!.y - center.y)).toBeLessThan(60);
      for (const npc of worldInteractions.filter((item) => item.region === 'oldTown')) {
        expect(Math.hypot(npc.x - center.x, npc.y - center.y), `${portal.target} clear of ${npc.id}`).toBeGreaterThan(250);
      }
    }
    const [west, north, south] = district.portals.map((portal) => ({ x: portal.x + portal.width / 2, y: portal.y + portal.height / 2 }));
    expect(west.x).toBeLessThan(north.x - 600);
    expect(south.y).toBeGreaterThan(north.y + 600);
  });

  it('blocks roof interiors and wall footprints across all five street maps', () => {
    const roofSamples = [
      { region: 'hq', point: { x: 1200, y: 250 }, label: 'headquarters roof' },
      { region: 'hq', point: { x: 180, y: 1450 }, label: 'southwest roof' },
      { region: 'hq', point: { x: 2280, y: 1450 }, label: 'southeast roof' },
      { region: 'hq', point: { x: 600, y: 1430 }, label: 'south courtyard wall' },
      { region: 'oldTown', point: { x: 850, y: 700 }, label: 'green house north roof edge' },
      { region: 'oldTown', point: { x: 850, y: 900 }, label: 'green house roof center' },
      { region: 'oldTown', point: { x: 300, y: 250 }, label: 'northwest roof' },
      { region: 'oldTown', point: { x: 1200, y: 200 }, label: 'north roof' },
      { region: 'oldTown', point: { x: 2050, y: 200 }, label: 'northeast roof' },
      { region: 'oldTown', point: { x: 300, y: 700 }, label: 'west roof' },
      { region: 'oldTown', point: { x: 2050, y: 1250 }, label: 'southeast roof' },
      { region: 'oldTown', point: { x: 2050, y: 850 }, label: 'east street roofline' },
      { region: 'oldTown', point: { x: 200, y: 1450 }, label: 'southwest waterfront' },
      { region: 'campus', point: { x: 480, y: 300 }, label: 'northwest campus roof' },
      { region: 'campus', point: { x: 1900, y: 300 }, label: 'northeast campus roof' },
      { region: 'campus', point: { x: 400, y: 1050 }, label: 'southwest campus roof' },
      { region: 'campus', point: { x: 1960, y: 1050 }, label: 'southeast campus roof' },
      { region: 'campus', point: { x: 1900, y: 1480 }, label: 'southeast courtyard wall' },
      { region: 'harbor', point: { x: 1000, y: 250 }, label: 'harbor cafe roof' },
      { region: 'harbor', point: { x: 1300, y: 1450 }, label: 'harbor water' },
      { region: 'harbor', point: { x: 1000, y: 1150 }, label: 'harbor seawall' },
      { region: 'harbor', point: { x: 1600, y: 300 }, label: 'northeast harbor wall' },
      { region: 'hill', point: { x: 2000, y: 300 }, label: 'hill mansion roof' },
      { region: 'hill', point: { x: 800, y: 700 }, label: 'hill perimeter wall' },
      { region: 'hill', point: { x: 200, y: 1400 }, label: 'hill water' },
      { region: 'hill', point: { x: 150, y: 300 }, label: 'northwest hillside water' },
    ] as const;

    for (const sample of roofSamples) {
      const district = districtMaps[sample.region];
      expect(canOccupyWorldPosition(sample.point.x, sample.point.y, district.blockers, 2400, 1600), sample.label).toBe(false);
    }
  });

  it('sweeps a grid through every mapped roof, facade, fence, and shore blocker', () => {
    const footprints = [
      { region: 'hq', x: 0, y: 0, width: 2220, height: 620, label: 'headquarters facade' },
      { region: 'hq', x: 0, y: 1250, width: 330, height: 326, label: 'southwest house' },
      { region: 'hq', x: 1850, y: 1250, width: 550, height: 326, label: 'southeast house' },
      { region: 'hq', x: 300, y: 1370, width: 800, height: 130, label: 'west courtyard wall' },
      { region: 'hq', x: 1380, y: 1370, width: 840, height: 130, label: 'east courtyard wall' },
      { region: 'oldTown', x: 0, y: 0, width: 680, height: 470, label: 'northwest houses' },
      { region: 'oldTown', x: 650, y: 0, width: 1020, height: 440, label: 'north row houses' },
      { region: 'oldTown', x: 1650, y: 0, width: 750, height: 470, label: 'northeast houses' },
      { region: 'oldTown', x: 0, y: 460, width: 420, height: 450, label: 'west upper houses' },
      { region: 'oldTown', x: 0, y: 910, width: 330, height: 480, label: 'west lower houses' },
      { region: 'oldTown', x: 520, y: 660, width: 710, height: 920, label: 'green house roof and facade' },
      { region: 'oldTown', x: 1750, y: 780, width: 650, height: 800, label: 'east houses' },
      { region: 'campus', x: 0, y: 0, width: 1100, height: 680, label: 'northwest campus block' },
      { region: 'campus', x: 1320, y: 0, width: 1080, height: 680, label: 'northeast campus block' },
      { region: 'campus', x: 0, y: 740, width: 770, height: 760, label: 'southwest campus building' },
      { region: 'campus', x: 1550, y: 740, width: 850, height: 820, label: 'southeast campus building' },
      { region: 'harbor', x: 0, y: 0, width: 1520, height: 720, label: 'harbor cafe and west buildings' },
      { region: 'harbor', x: 1520, y: 0, width: 160, height: 620, label: 'northeast wall' },
      { region: 'harbor', x: 0, y: 1130, width: 2400, height: 90, label: 'seawall' },
      { region: 'harbor', x: 0, y: 1220, width: 2400, height: 356, label: 'harbor water and boats' },
      { region: 'hill', x: 1530, y: 0, width: 870, height: 800, label: 'hill mansion' },
      { region: 'hill', x: 500, y: 660, width: 700, height: 130, label: 'west compound wall' },
      { region: 'hill', x: 1510, y: 660, width: 890, height: 130, label: 'east compound wall' },
      { region: 'hill', x: 0, y: 0, width: 300, height: 430, label: 'northwest shoreline' },
      { region: 'hill', x: 0, y: 1100, width: 490, height: 500, label: 'southwest water' },
    ] as const;

    for (const footprint of footprints) {
      const district = districtMaps[footprint.region];
      for (let y = footprint.y + 80; y < footprint.y + footprint.height - 40; y += 40) {
        for (let x = footprint.x + 64; x < footprint.x + footprint.width - 40; x += 40) {
          expect(canOccupyWorldPosition(x, y, district.blockers, 2400, 1600), `${footprint.region} ${footprint.label} at ${x},${y}`).toBe(false);
        }
      }
    }
  });

  it('preserves the teaching plaza and street approaches beside roof blockers', () => {
    const clearSamples = [
      { region: 'hq', point: { x: 1190, y: 1120 }, label: 'headquarters spawn plaza' },
      { region: 'hq', point: { x: 1200, y: 1430 }, label: 'headquarters south gate' },
      { region: 'oldTown', point: { x: 1600, y: 680 }, label: 'old town spawn road' },
      { region: 'oldTown', point: { x: 1640, y: 840 }, label: 'old town east passage' },
      { region: 'oldTown', point: { x: 1000, y: 620 }, label: 'road above the green house' },
      { region: 'oldTown', point: { x: 470, y: 700 }, label: 'west street beside the house' },
      { region: 'oldTown', point: { x: 1260, y: 900 }, label: 'east street beside the green house' },
      { region: 'campus', point: { x: 1200, y: 1080 }, label: 'campus central plaza' },
      { region: 'campus', point: { x: 1200, y: 1480 }, label: 'campus south gate' },
      { region: 'harbor', point: { x: 2180, y: 800 }, label: 'harbor promenade' },
      { region: 'harbor', point: { x: 1000, y: 1080 }, label: 'harbor quay path' },
      { region: 'hill', point: { x: 205, y: 800 }, label: 'hill entrance path' },
      { region: 'hill', point: { x: 1240, y: 980 }, label: 'hill center path' },
    ] as const;

    for (const sample of clearSamples) {
      const district = districtMaps[sample.region];
      expect(canOccupyWorldPosition(sample.point.x, sample.point.y, district.blockers, 2400, 1600), sample.label).toBe(true);
    }
  });
});
