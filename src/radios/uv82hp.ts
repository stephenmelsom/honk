import { defineUv5rFamilyModel, UV5R_MODEL_UV82 } from './uv5rFamily.ts';

export const UV82HP = defineUv5rFamilyModel({
  id: 'uv82hp',
  label: 'Baofeng UV-82HP',
  magics: [UV5R_MODEL_UV82],
  vhf: [136_000_000, 175_000_000],
  uhf: [400_000_000, 521_000_000],
});
