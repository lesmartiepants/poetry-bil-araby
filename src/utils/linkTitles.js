export const shareBrand = 'poetry بالعربي';
export const defaultShareTitle = `${shareBrand}: Experience Arabic Poetry`;

export function poemShareTitle(title, poet) {
  if (!title) return defaultShareTitle;
  return poet ? `${shareBrand}: Read ${poet}’s poem “${title}”` : `${shareBrand}: Read “${title}”`;
}
