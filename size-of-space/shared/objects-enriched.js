import { SPACE_OBJECTS } from '../objects.js';
import { enrichObject } from './object-metadata.js';
import { chapterForIndex } from './chapters.js';

export const ENRICHED_OBJECTS = SPACE_OBJECTS.map((obj, index) => ({
  ...enrichObject(obj),
  index,
  chapter: chapterForIndex(index),
}));
