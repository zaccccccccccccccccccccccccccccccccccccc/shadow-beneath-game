import type { WorldRect } from './world-geometry';

/** Traced against the user's 1536x1024 red-road / white-eave reference.
 * Coordinates below are reference-image pixels, converted once to the unchanged
 * 2400x1600 world. Polygon vertices are absolute world coordinates, never local.
 * White eaves are separate visual occluders, not solid building footprints.
 */
function outline(vertices: readonly (readonly [number, number])[]): WorldRect {
  const polygon = vertices.map(([x, y]) => ({ x: x * 25 / 16, y: y * 25 / 16 }));
  const xs = polygon.map(p => p.x), ys = polygon.map(p => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y, polygon };
}

export const oldTownFootprints: WorldRect[] = [
  // Northern facades follow the rising sidewalk instead of a flat y=440 wall.
  outline([[0, 0], [1536, 0], [1536, 310], [1420, 310], [1360, 370],
    [1260, 408], [1160, 408], [1118, 370], [1110, 300], [1030, 300],
    [1015, 338], [1000, 335], [915, 350], [900, 300], [815, 300],
    [800, 370], [720, 380], [650, 381], [630, 375], [624, 302],
    [445, 320], [435, 390], [390, 380], [360, 350], [330, 295],
    [270, 270], [210, 255], [150, 238], [70, 213], [0, 190]]),
  // West houses: tapered corners preserve the curved left-hand stone lane.
  outline([[0, 285], [135, 325], [210, 378], [240, 450], [252, 520],
    [239, 600], [205, 644], [125, 682], [0, 730]]),
  // Green house / courtyard. The upper eave and western bend are not a 710x920 box.
  outline([[362, 550], [430, 539], [510, 556], [620, 530], [700, 547],
    [736, 578], [744, 650], [772, 686], [751, 732], [757, 810],
    [775, 840], [774, 947], [704, 946], [650, 940], [400, 944],
    [330, 955], [330, 855], [290, 818], [332, 763], [342, 680], [351, 606]]),
  // Southeast houses: diagonal roof edge leaves the broad curved road open.
  outline([[1536, 492], [1415, 500], [1300, 548], [1160, 625],
    [1070, 669], [1000, 720], [1015, 756], [1016, 882], [1030, 950],
    [1090, 946], [1200, 940], [1380, 945], [1536, 955]]),
  // Waterfront solid wall/water, not the walkable lane above it.
  outline([[0, 880], [150, 925], [240, 990], [250, 1024], [0, 1024]]),
];

export const oldTownOccluders: WorldRect[] = [
  outline([[395, 495], [440, 482], [505, 507], [606, 464], [690, 488],
    [754, 520], [742, 548], [690, 516], [610, 495], [510, 535], [435, 514], [395, 523]]),
  outline([[972, 692], [1058, 637], [1145, 590], [1255, 541], [1280, 560],
    [1160, 617], [1072, 665], [995, 724]]),
  outline([[318, 965], [470, 942], [630, 940], [760, 971], [760, 1009],
    [622, 977], [470, 975], [318, 997]]),
  outline([[1065, 972], [1185, 949], [1350, 953], [1382, 980],
    [1370, 1015], [1240, 992], [1080, 1008]]),
  outline([[445, 336], [580, 312], [626, 324], [624, 377], [535, 394], [454, 365]]),
  outline([[807, 324], [854, 309], [900, 341], [830, 357]]),
  outline([[1030, 316], [1102, 301], [1117, 336], [1042, 355]]),
];
