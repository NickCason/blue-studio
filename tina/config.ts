// Tina CMS schema for Studio Marginalia.
// Schema mirrors src/content/config.ts. Each post picks its `type` from a
// dropdown — Astro's Zod schema strips fields irrelevant to the chosen type.

import { defineConfig } from 'tinacms';

export default defineConfig({
  branch: 'main',
  clientId: process.env.TINA_PUBLIC_CLIENT_ID || '',
  token: process.env.TINA_TOKEN || '',

  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  media: {
    tina: {
      mediaRoot: 'images',
      publicFolder: 'public',
    },
  },

  schema: {
    collections: [
      {
        name: 'post',
        label: 'Posts',
        path: 'src/content/posts',
        format: 'md',
        fields: [
          {
            type: 'string',
            name: 'type',
            label: 'Post type',
            required: true,
            options: [
              { value: 'essay', label: 'Essay (longform)' },
              { value: 'note', label: 'Note (one paragraph)' },
              { value: 'quote', label: 'Quote' },
              { value: 'link', label: 'Link' },
              { value: 'photo', label: 'Photo' },
              { value: 'audio', label: 'Voice memo' },
            ],
          },
          { type: 'datetime', name: 'publishedAt', label: 'Published at', required: true },
          { type: 'boolean', name: 'draft', label: 'Draft (hide from feed)' },
          { type: 'string', name: 'tags', label: 'Tags', list: true },
          { type: 'string', name: 'threadId', label: 'Thread ID (optional)' },
          { type: 'string', name: 'title', label: 'Title (essay, link, voice memo)' },
          { type: 'string', name: 'dek', label: 'Dek (essay subtitle)' },
          { type: 'image', name: 'heroImage', label: 'Hero image (essay, optional)' },
          { type: 'string', name: 'source', label: 'Source (quote / link)' },
          { type: 'string', name: 'sourceUrl', label: 'Source URL (quote, optional)' },
          { type: 'string', name: 'url', label: 'URL (link)' },
          { type: 'image', name: 'ogImage', label: 'OG image (link, optional)' },
          { type: 'image', name: 'image', label: 'Image (photo)' },
          { type: 'string', name: 'caption', label: 'Caption (photo)' },
          { type: 'string', name: 'audioFile', label: 'Audio file path (voice memo)' },
          { type: 'string', name: 'duration', label: 'Duration mm:ss (voice memo)' },
          { type: 'string', name: 'context', label: 'Context line (voice memo)' },
          { type: 'string', name: 'transcript', label: 'Transcript (voice memo)' },
          { type: 'rich-text', name: 'body', label: 'Body', isBody: true },
        ],
      },

      {
        name: 'portfolio',
        label: 'Portfolio',
        path: 'src/content/portfolio',
        format: 'md',
        fields: [
          { type: 'string', name: 'name', label: 'Client name', required: true },
          { type: 'number', name: 'year', label: 'Year', required: true },
          { type: 'string', name: 'serviceCategory', label: 'Service category' },
          { type: 'string', name: 'pitch', label: 'One-line pitch', required: true },
          { type: 'image', name: 'image', label: 'Card image (optional)' },
          { type: 'string', name: 'externalUrl', label: 'External link (optional)' },
          { type: 'number', name: 'order', label: 'Display order' },
          { type: 'rich-text', name: 'body', label: 'Body', isBody: true },
        ],
      },

      {
        name: 'now',
        label: 'On her desk',
        path: 'src/content/now',
        format: 'json',
        fields: [
          { type: 'string', name: 'reading_title', label: 'Reading: title' },
          { type: 'string', name: 'reading_author', label: 'Reading: author' },
          { type: 'string', name: 'brewing', label: 'Brewing' },
          { type: 'string', name: 'listening_title', label: 'Listening: title' },
          { type: 'string', name: 'listening_artist', label: 'Listening: artist' },
        ],
      },

      {
        name: 'noticing',
        label: 'Noticing',
        path: 'src/content/noticing',
        format: 'json',
        fields: [
          { type: 'string', name: 'quote', label: 'Quote / observation', required: true },
          { type: 'string', name: 'source', label: 'Source / context', required: true },
          { type: 'datetime', name: 'publishedAt', label: 'Date', required: true },
        ],
      },

      {
        name: 'siteConfig',
        label: 'Site config',
        path: 'src/content/site',
        format: 'json',
        fields: [
          { type: 'number', name: 'issueNumber', label: 'Issue number', required: true },
          { type: 'string', name: 'season', label: 'Season', required: true },
          { type: 'string', name: 'year', label: 'Year label', required: true },
          { type: 'string', name: 'tagline', label: 'Tagline (optional)' },
        ],
      },
    ],
  },
});
