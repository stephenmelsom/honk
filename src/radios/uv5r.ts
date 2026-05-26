import {
  defineUv5rFamilyModel,
  UV5R_MODEL_291,
  UV5R_MODEL_ORIG,
} from './uv5rFamily.ts';

export const UV5R = defineUv5rFamilyModel({
  id: 'uv5r',
  label: 'Baofeng UV-5R',
  magics: [UV5R_MODEL_291, UV5R_MODEL_ORIG],
  vhf: [136_000_000, 174_000_000],
  uhf: [400_000_000, 520_000_000],
});
