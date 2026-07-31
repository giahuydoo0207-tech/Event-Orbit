// Verification script for Chapter Console Event ID resolution
import { initialEvents } from '../src/api/mockData.js';

console.log('--- Testing Initial Events Legacy Mapping ---');
initialEvents.forEach(ev => {
  console.log(`Event ID: ${ev.id} | Slug: ${ev.slug} | Name: ${ev.name} | Chapter: ${ev.chapterId}`);
});
