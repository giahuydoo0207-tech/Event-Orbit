export function resolveChapterFromEvents(chapterInput, events = []) {
  const input = String(chapterInput || '').trim().toLowerCase();
  if (!input) return null;

  for (const event of events) {
    const chapter = event?.chapter;
    if (!chapter) continue;

    const identifiers = [event.chapterId, chapter.id, chapter.slug, chapter.ocid]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase());

    if (identifiers.includes(input)) return chapter;
  }

  return null;
}
