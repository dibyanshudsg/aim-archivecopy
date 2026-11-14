export interface HeroPlacement {
  bookX: number;
  baselineY: number;
  bookScale: number;
  focalX: number;
  focalY: number;
}

export type HeroDevice = 'desktop' | 'tablet' | 'phone';
export type HeroPlacements = Record<HeroDevice, HeroPlacement>;

export const HERO_PLACEMENT_DEFAULTS: HeroPlacements = {
  desktop:{bookX:23.5,baselineY:77.5,bookScale:100,focalX:50,focalY:50},
  tablet:{bookX:24,baselineY:78,bookScale:96,focalX:45,focalY:50},
  phone:{bookX:50,baselineY:76,bookScale:100,focalX:50,focalY:62},
};

export function resolveHeroPlacement(layout:Partial<Record<HeroDevice,Partial<HeroPlacement>>>|undefined,device:HeroDevice):HeroPlacement {
  const resolved = {...HERO_PLACEMENT_DEFAULTS[device],...(layout?.[device]??{})};
  if (device === 'phone' && resolved.focalY > 68) {
    resolved.focalY = 62;
  }
  return resolved;
}
