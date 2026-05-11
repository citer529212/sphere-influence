export const ATLAS_VIEWBOX = '0 0 1200 720';

export type AtlasRegionVisual = {
  id: string;
  path: string;
  labelX: number;
  labelY: number;
  fontSize?: number;
  icon?: 'anchor' | 'mountain' | 'delta' | 'port';
};

export type AtlasLandmassSilhouette = {
  id: string;
  className: string;
  path: string;
};

export const ATLAS_LANDMASS_SILHOUETTES: AtlasLandmassSilhouette[] = [
  {
    id: 'atlas-west',
    className: 'landmass-silhouette atlas-west',
    path: 'M86 108 C176 70 312 78 372 146 C410 214 412 326 384 420 C350 520 280 586 176 596 C98 596 56 558 40 490 C24 420 26 300 40 212 C50 162 64 126 86 108 Z'
  },
  {
    id: 'meridian-core',
    className: 'landmass-silhouette meridian-core',
    path: 'M470 84 C560 50 712 56 792 116 C840 190 846 338 824 466 C802 580 722 644 596 646 C506 640 448 590 426 500 C400 406 404 256 424 166 C434 122 446 98 470 84 Z'
  },
  {
    id: 'concordat-east',
    className: 'landmass-silhouette concordat-east',
    path: 'M820 96 C904 62 1034 68 1100 126 C1148 196 1158 322 1142 448 C1126 562 1064 640 964 646 C882 644 824 600 794 528 C764 448 758 328 772 232 C782 164 794 122 820 96 Z'
  },
  {
    id: 'neutral-belt',
    className: 'landmass-silhouette neutral-belt',
    path: 'M368 146 C426 124 468 154 464 228 C462 314 460 440 472 542 C456 580 418 582 394 546 C372 488 370 366 368 248 C366 198 366 164 368 146 Z'
  },
  {
    id: 'neutral-belt-south',
    className: 'landmass-silhouette neutral-belt',
    path: 'M744 172 C790 154 822 186 824 246 C824 320 820 420 830 502 C816 534 786 534 768 504 C754 448 748 372 744 294 C742 236 742 198 744 172 Z'
  }
];

export const ATLAS_REGION_VISUALS: Record<string, AtlasRegionVisual> = {
  'mist-isles': {
    id: 'mist-isles',
    path: 'M58 116 L118 98 L170 118 L165 162 L106 182 L60 156 Z',
    labelX: 114,
    labelY: 138,
    fontSize: 12
  },
  'northern-reef': {
    id: 'northern-reef',
    path: 'M120 140 L230 120 L305 145 L305 215 L220 240 L130 215 Z',
    labelX: 214,
    labelY: 178
  },
  'polar-coast': {
    id: 'polar-coast',
    path: 'M305 145 L360 170 L378 245 L330 300 L250 300 L220 240 L305 215 Z',
    labelX: 308,
    labelY: 226
  },
  'storm-archipelago': {
    id: 'storm-archipelago',
    path: 'M130 215 L220 240 L250 300 L230 380 L150 415 L90 360 L92 280 Z',
    labelX: 166,
    labelY: 310,
    fontSize: 12
  },
  'deep-bay': {
    id: 'deep-bay',
    path: 'M230 380 L330 300 L372 360 L350 450 L280 520 L210 470 Z',
    labelX: 292,
    labelY: 398
  },
  'wind-isles': {
    id: 'wind-isles',
    path: 'M90 360 L150 415 L210 470 L190 540 L110 560 L52 510 L46 430 Z',
    labelX: 130,
    labelY: 478,
    fontSize: 12
  },
  'southern-equator': {
    id: 'southern-equator',
    path: 'M54 514 L122 496 L174 518 L166 568 L108 586 L60 560 Z',
    labelX: 114,
    labelY: 544,
    fontSize: 12
  },

  'north-isthmus': {
    id: 'north-isthmus',
    path: 'M386 170 L438 156 L464 196 L454 252 L410 274 L378 236 Z',
    labelX: 420,
    labelY: 214,
    fontSize: 12
  },
  'stone-strait': {
    id: 'stone-strait',
    path: 'M378 278 L424 270 L448 308 L438 366 L398 388 L370 350 Z',
    labelX: 408,
    labelY: 330,
    fontSize: 12
  },
  'fog-isthmus': {
    id: 'fog-isthmus',
    path: 'M370 394 L414 386 L440 426 L432 486 L390 508 L362 470 Z',
    labelX: 400,
    labelY: 446,
    fontSize: 12
  },
  'south-strait': {
    id: 'south-strait',
    path: 'M392 518 L438 510 L462 548 L452 604 L410 624 L382 586 Z',
    labelX: 420,
    labelY: 570,
    fontSize: 12
  },

  'northern-hills': {
    id: 'northern-hills',
    path: 'M486 124 L596 96 L666 122 L650 198 L560 216 L492 182 Z',
    labelX: 568,
    labelY: 154
  },
  'volcanic-plateau': {
    id: 'volcanic-plateau',
    path: 'M666 122 L760 116 L800 164 L776 228 L690 238 L650 198 Z',
    labelX: 726,
    labelY: 170,
    fontSize: 12
  },
  'rocky-lands': {
    id: 'rocky-lands',
    path: 'M492 182 L560 216 L574 296 L510 346 L454 304 L450 238 Z',
    labelX: 516,
    labelY: 262
  },
  'heart-meridian': {
    id: 'heart-meridian',
    path: 'M560 216 L690 238 L700 324 L620 366 L574 296 Z',
    labelX: 630,
    labelY: 286
  },
  'crimson-canyon': {
    id: 'crimson-canyon',
    path: 'M690 238 L776 228 L806 298 L782 378 L700 324 Z',
    labelX: 754,
    labelY: 302
  },
  'ash-plains': {
    id: 'ash-plains',
    path: 'M454 304 L510 346 L548 430 L532 520 L468 542 L430 474 L424 374 Z',
    labelX: 490,
    labelY: 430
  },
  'southern-valleys': {
    id: 'southern-valleys',
    path: 'M548 430 L620 366 L704 396 L782 378 L812 462 L798 548 L720 590 L640 566 L532 520 Z',
    labelX: 676,
    labelY: 490
  },

  'iris-delta': {
    id: 'iris-delta',
    path: 'M840 132 L934 106 L1000 128 L988 192 L900 210 L842 176 Z',
    labelX: 918,
    labelY: 158
  },
  'emerald-delta': {
    id: 'emerald-delta',
    path: 'M826 214 L900 210 L950 286 L920 354 L848 370 L806 314 Z',
    labelX: 878,
    labelY: 282
  },
  'central-delta': {
    id: 'central-delta',
    path: 'M988 192 L1062 188 L1100 236 L1086 304 L1018 330 L950 286 Z',
    labelX: 1028,
    labelY: 256
  },
  'river-belt': {
    id: 'river-belt',
    path: 'M1018 330 L1086 304 L1126 364 L1114 442 L1048 474 L990 430 Z',
    labelX: 1064,
    labelY: 386,
    fontSize: 12
  },
  technopolis: {
    id: 'technopolis',
    path: 'M848 370 L920 354 L990 430 L964 502 L888 520 L834 468 Z',
    labelX: 908,
    labelY: 438
  },
  'eastern-node': {
    id: 'eastern-node',
    path: 'M990 430 L1048 474 L1084 542 L1060 604 L986 620 L936 574 L964 502 Z',
    labelX: 1016,
    labelY: 528
  },
  'weaver-isles': {
    id: 'weaver-isles',
    path: 'M1096 250 L1132 206 L1160 228 L1152 268 L1112 282 L1084 256 Z',
    labelX: 1122,
    labelY: 248,
    fontSize: 12
  },
  'southern-archipelago': {
    id: 'southern-archipelago',
    path: 'M834 468 L888 520 L936 574 L902 634 L828 620 L790 556 Z',
    labelX: 862,
    labelY: 566,
    fontSize: 12
  }
};

export const ATLAS_SEA_NODES = [
  { id: 'node-t1', x: 300, y: 154, label: 'Узел Т-1' },
  { id: 'node-k1', x: 430, y: 632, label: 'Узел К-1' },
  { id: 'node-k2', x: 810, y: 628, label: 'Узел К-2' }
];

export const ATLAS_SEA_ROUTES = [
  'M112 146 Q220 116 300 154 Q352 180 408 220',
  'M116 548 Q262 604 430 632 Q422 594 410 566',
  'M810 628 Q902 616 962 594 Q1052 540 1120 246'
];
