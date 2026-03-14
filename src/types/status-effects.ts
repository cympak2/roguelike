export type StatusEffectType =
  | 'poison'
  | 'regenerate'
  | 'phase'
  | 'curse_weakness'
  | 'curse_frailty'
  | 'curse_wither';

export type PlayerStatusEffectType = Exclude<StatusEffectType, 'phase'>;

export interface StatusEffect {
  type: StatusEffectType;
  duration: number;
  power: number;
}

export interface PlayerStatusTickEvent {
  type: PlayerStatusEffectType;
  amount: number;
  kind: 'damage' | 'heal' | 'expired';
}
