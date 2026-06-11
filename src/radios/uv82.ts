import { defineUv5rFamilyModel, UV5R_MODEL_UV82 } from './uv5rFamily.ts';

export const UV82 = defineUv5rFamilyModel({
  id: 'uv82',
  label: 'Baofeng UV-82',
  support: 'beta',
  magics: [UV5R_MODEL_UV82],
  vhf: [130_000_000, 176_000_000],
  uhf: [400_000_000, 521_000_000],
});
