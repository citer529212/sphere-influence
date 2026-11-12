import type { DifficultyId } from './information';

export const MAP_PRESENTATION: Record<DifficultyId, {name:string; description:string}> = {
  discovery: {name:'Малый архипелаг', description:'12 городов · низкие холмы и короткие проливы'},
  standard: {name:'Атлас фьордов', description:'16 городов · глубокие заливы и горные хребты'},
  expert: {name:'Расколотый пояс', description:'28 городов · высокие плато и южная островная дуга'},
};
