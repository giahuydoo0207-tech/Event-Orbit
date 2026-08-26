const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OCID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,127}$/;

export function normalizeChapterInput(input = {}) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const slug = typeof input.slug === 'string' ? input.slug.trim().toLowerCase() : '';
  const category = typeof input.category === 'string' ? input.category.trim() : '';
  const ocid = typeof input.ocid === 'string' ? input.ocid.trim().toLowerCase() : '';
  const description = typeof input.description === 'string' ? input.description.trim() : '';

  if (!name || !slug || !category || !ocid) {
    throw new Error('Name, slug, category, and Chapter OCID are required.');
  }
  if (name.length > 120) throw new Error('Chapter name must be 120 characters or fewer.');
  if (!SLUG_PATTERN.test(slug) || slug.length > 80) {
    throw new Error('Slug must use lowercase letters, numbers, and single hyphens only.');
  }
  if (category.length > 80) throw new Error('Category must be 80 characters or fewer.');
  if (!OCID_PATTERN.test(ocid)) throw new Error('Chapter OCID is invalid.');
  if (description.length > 1000) throw new Error('Description must be 1000 characters or fewer.');

  return { name, slug, category, ocid, description };
}
