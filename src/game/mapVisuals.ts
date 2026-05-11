import { RegionVisual } from './types';

export const worldWidth = 1200;
export const worldHeight = 720;

export const regionVisuals: Record<string, RegionVisual> = {
  'atlas-port': { id: 'atlas-port', path: 'M88 142 L176 126 L214 166 L194 224 L110 238 L74 194 Z', labelX: 142, labelY: 186, icon: 'anchor', iconX: 108, iconY: 214 },
  'mist-isles': { id: 'mist-isles', path: 'M196 120 L280 110 L320 152 L300 206 L214 216 L180 172 Z', labelX: 250, labelY: 166 },
  'northern-reef': { id: 'northern-reef', path: 'M300 150 L356 144 L380 174 L372 206 L326 220 L292 196 Z', labelX: 336, labelY: 185, icon: 'cable', iconX: 362, iconY: 192 },
  'storm-arc': { id: 'storm-arc', path: 'M128 260 L218 248 L252 286 L236 344 L146 358 L108 316 Z', labelX: 180, labelY: 304 },
  'deep-bay': { id: 'deep-bay', path: 'M236 236 L336 230 L372 276 L356 340 L258 348 L220 296 Z', labelX: 294, labelY: 292 },
  'western-broadcast': { id: 'western-broadcast', path: 'M76 374 L178 356 L214 404 L196 470 L94 486 L58 432 Z', labelX: 136, labelY: 425, icon: 'cable', iconX: 106, iconY: 460 },
  'drifting-isles': { id: 'drifting-isles', path: 'M232 370 L304 362 L334 392 L322 434 L260 448 L220 418 Z', labelX: 278, labelY: 407 },
  'sunset-docks': { id: 'sunset-docks', path: 'M144 492 L242 476 L276 520 L260 584 L164 596 L122 548 Z', labelX: 198, labelY: 544, icon: 'anchor', iconX: 164, iconY: 578 },
  'southern-equator': { id: 'southern-equator', path: 'M268 502 L352 492 L384 530 L372 586 L290 598 L252 558 Z', labelX: 318, labelY: 548 },

  'northern-isthmus': { id: 'northern-isthmus', path: 'M356 220 L424 206 L452 238 L438 290 L370 302 L346 258 Z', labelX: 396, labelY: 256 },
  'stone-strait': { id: 'stone-strait', path: 'M378 304 L444 292 L470 322 L458 372 L392 384 L366 346 Z', labelX: 418, labelY: 341 },
  'fog-isthmus': { id: 'fog-isthmus', path: 'M354 390 L424 378 L452 408 L442 458 L376 472 L346 432 Z', labelX: 396, labelY: 426 },
  'southern-strait': { id: 'southern-strait', path: 'M366 482 L438 468 L466 502 L456 554 L388 568 L356 526 Z', labelX: 408, labelY: 520 },

  'northern-hills': { id: 'northern-hills', path: 'M472 116 L566 104 L614 142 L600 208 L504 220 L458 172 Z', labelX: 536, labelY: 162, icon: 'mountain', iconX: 586, iconY: 150 },
  'volcanic-plateau': { id: 'volcanic-plateau', path: 'M570 106 L668 114 L716 156 L700 220 L606 232 L558 184 Z', labelX: 638, labelY: 166, icon: 'mountain', iconX: 686, iconY: 154 },
  'rocky-lands': { id: 'rocky-lands', path: 'M452 226 L546 216 L594 258 L582 324 L490 336 L444 286 Z', labelX: 518, labelY: 276 },
  'heart-meridian': { id: 'heart-meridian', path: 'M548 220 L646 230 L692 272 L680 338 L590 350 L540 300 Z', labelX: 616, labelY: 283 },
  'crimson-canyon': { id: 'crimson-canyon', path: 'M644 236 L742 248 L782 292 L768 356 L678 364 L632 314 Z', labelX: 708, labelY: 299, icon: 'mountain', iconX: 752, iconY: 292 },
  'ash-plains': { id: 'ash-plains', path: 'M436 342 L532 332 L578 374 L566 440 L474 452 L426 402 Z', labelX: 500, labelY: 392 },
  'eastern-hills': { id: 'eastern-hills', path: 'M530 350 L628 360 L676 404 L664 470 L574 482 L524 432 Z', labelX: 598, labelY: 413, icon: 'mountain', iconX: 652, iconY: 408 },
  'iron-ridges': { id: 'iron-ridges', path: 'M624 366 L724 378 L766 424 L754 486 L662 498 L612 448 Z', labelX: 690, labelY: 430, icon: 'mountain', iconX: 738, iconY: 426 },
  'southern-valleys': { id: 'southern-valleys', path: 'M474 462 L590 452 L650 500 L632 578 L518 592 L458 534 Z', labelX: 558, labelY: 525 },

  'iris-delta': { id: 'iris-delta', path: 'M818 126 L916 116 L958 158 L944 222 L850 234 L804 186 Z', labelX: 882, labelY: 171, icon: 'delta', iconX: 930, iconY: 158 },
  'emerald-delta': { id: 'emerald-delta', path: 'M904 112 L1002 122 L1042 166 L1028 228 L936 240 L890 188 Z', labelX: 968, labelY: 172, icon: 'delta', iconX: 1022, iconY: 166 },
  'central-delta': { id: 'central-delta', path: 'M810 236 L910 228 L952 274 L938 338 L842 350 L796 296 Z', labelX: 876, labelY: 292 },
  'river-belt': { id: 'river-belt', path: 'M900 242 L1004 252 L1044 300 L1030 362 L936 372 L888 322 Z', labelX: 968, labelY: 305, icon: 'delta', iconX: 1024, iconY: 302 },
  'eastern-node': { id: 'eastern-node', path: 'M812 354 L914 346 L956 394 L942 456 L846 468 L798 414 Z', labelX: 878, labelY: 409, icon: 'platform', iconX: 928, iconY: 398 },
  technopolis: { id: 'technopolis', path: 'M902 374 L1008 386 L1046 434 L1030 498 L936 508 L888 456 Z', labelX: 972, labelY: 441, icon: 'platform', iconX: 1024, iconY: 430 },
  'weaver-isles': { id: 'weaver-isles', path: 'M1018 268 L1074 258 L1104 286 L1094 330 L1046 342 L1008 310 Z', labelX: 1058, labelY: 302 },
  'southern-archipelago': { id: 'southern-archipelago', path: 'M968 520 L1048 512 L1084 548 L1072 604 L994 616 L956 574 Z', labelX: 1022, labelY: 563 },
  'data-port': { id: 'data-port', path: 'M818 484 L918 474 L960 520 L946 584 L852 598 L804 542 Z', labelX: 884, labelY: 541, icon: 'cable', iconX: 936, iconY: 530 },

  'node-t1': { id: 'node-t1', path: 'M42 286 L84 278 L106 300 L100 334 L64 344 L36 320 Z', labelX: 72, labelY: 312, icon: 'anchor', iconX: 92, iconY: 302 },
  'node-k1': { id: 'node-k1', path: 'M1086 164 L1130 158 L1156 182 L1148 216 L1110 224 L1080 198 Z', labelX: 1120, labelY: 190, icon: 'cable', iconX: 1144, iconY: 180 },
  'node-k2': { id: 'node-k2', path: 'M1080 500 L1124 494 L1150 520 L1142 554 L1104 562 L1074 536 Z', labelX: 1114, labelY: 527, icon: 'platform', iconX: 1136, iconY: 516 }
};
