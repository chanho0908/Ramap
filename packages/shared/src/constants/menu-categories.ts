/**
 * 사용자에게 노출하는 라멘 메뉴 카테고리
 */
export const MENU_CATEGORIES = [
  { id: 'tonkotsu', label: '돈코츠' },
  { id: 'shoyu', label: '쇼유' },
  { id: 'shio', label: '시오' },
  { id: 'miso', label: '미소' },
  { id: 'tori', label: '토리' },
  { id: 'tsukemen', label: '츠케멘' },
  { id: 'mazesoba', label: '마제소바' },
  { id: 'aburasoba', label: '아부라소바' },
  { id: 'jiro', label: '지로계' },
  { id: 'niboshi_gyokai', label: '니보시/어패류' },
  { id: 'iekei', label: '이에케' },
  { id: 'hiyashi', label: '히야시' },
  { id: 'chukasoba', label: '츄카소바' },
  { id: 'tomato', label: '토마토라멘' },
] as const;

export type MenuCategoryId = (typeof MENU_CATEGORIES)[number]['id'];

const MENU_CATEGORY_LABELS = new Map<string, string>(
  MENU_CATEGORIES.map((category) => [category.id, category.label])
);

export function getMenuCategoryLabel(categoryId: string): string {
  return MENU_CATEGORY_LABELS.get(categoryId) ?? categoryId;
}
