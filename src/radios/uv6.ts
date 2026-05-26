import {
  defineUv5rFamilyModel,
  UV5R_MODEL_UV6,
  UV5R_MODEL_UV6_ORIG,
} from './uv5rFamily.ts';

export const UV6 = defineUv5rFamilyModel({
  id: 'uv6',
  label: 'Baofeng UV-6 / UV-7',
  magics: [UV5R_MODEL_UV6, UV5R_MODEL_UV6_ORIG],
  vhf: [136_000_000, 174_000_000],
  uhf: [400_000_000, 520_000_000],
});
