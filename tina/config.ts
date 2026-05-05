// Tina CMS schema for Studio Marginalia.
// Schema mirrors src/content/config.ts. Each post picks its `type` from a
// dropdown — Astro's Zod schema strips fields irrelevant to the chosen type.

import { defineConfig } from 'tinacms';

const branch = process.env.NEXT_PUBLIC_TINA_BRANCH || process.env.HEAD || 'main';

export default defineConfig({
  branch,
  clientId: process.env.TINA_PUBLIC_CLIENT_ID ?? '',
  token: process.env.TINA_TOKEN ?? '',

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
        ui: {
          filename: {
            // Nina sets the slug; Tina suggests one from the title.
            readonly: false,
            slugify: (values: any) => {
              const t = values?.title || values?.source || values?.url || 'note';
              return String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
            },
          },
        },
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
          {
            type: 'datetime',
            name: 'publishedAt',
            label: 'Published at',
            required: true,
            ui: { dateFormat: 'YYYY-MM-DD' },
          },
          { type: 'boolean', name: 'draft', label: 'Draft (hide from feed)' },
          { type: 'string', name: 'tags', label: 'Tags', list: true },
          { type: 'string', name: 'threadId', label: 'Thread ID (optional, e.g. notes-from-the-build)' },

          // -- Essay / Link / Audio share Title --
          { type: 'string', name: 'title', label: 'Title (essay, link, voice memo)' },

          // -- Essay --
          { type: 'string', name: 'dek', label: 'Dek (essay subtitle)', ui: { component: 'textarea' } },
          { type: 'image', name: 'heroImage', label: 'Hero image (essay, optional)' },

          // -- Quote --
          { type: 'string', name: 'source', label: 'Source (quote / link)' },
          { type: 'string', name: 'sourceUrl', label: 'Source URL (quote, optional)' },

          // -- Link --
          { type: 'string', name: 'url', label: 'URL (link)' },
          { type: 'image', name: 'ogImage', label: 'OG image (link, optional)' },

          // -- Photo --
          { type: 'image', name: 'image', label: 'Image (photo)' },
          { type: 'string', name: 'caption', label: 'Caption (photo)', ui: { component: 'textarea' } },

          // -- Audio --
          { type: 'string', name: 'audioFile', label: 'Audio file path (voice memo, e.g. my-slug/audio.mp3)' },
          { type: 'string', name: 'duration', label: 'Duration mm:ss (voice memo)' },
          { type: 'string', name: 'context', label: 'Context line (voice memo, e.g. "in the car")' },
          { type: 'string', name: 'transcript', label: 'Transcript (voice memo)', ui: { component: 'textarea' } },

          // -- Body (markdown body of the post) --
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
          { type: 'number', name: 'order', label: 'Display order (lower = earlier)' },
          { type: 'rich-text', name: 'body', label: 'Body', isBody: true },
        ],
      },

      {
        name: 'now',
        label: 'On her desk',
        path: 'src/content/now',
        format: 'json',
        match: { include: 'now' },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            type: 'object',
            name: 'reading',
            label: 'Reading',
            fields: [
              { type: 'string', name: 'title' },
              { type: 'string', name: 'author' },
            ],
          },
          { type: 'string', name: 'brewing', label: 'Brewing', ui: { component: 'textarea' } },
          {
            type: 'object',
            name: 'listening',
            label: 'Listening',
            fields: [
              { type: 'string', name: 'title' },
              { type: 'string', name: 'artist' },
            ],
          },
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
          { type: 'datetime', name: 'publishedAt', label: 'Date', required: true, ui: { dateFormat: 'YYYY-MM-DD' } },
        ],
      },

      {
        name: 'site',
        label: 'Site config',
        path: 'src/content/site',
        format: 'json',
        match: { include: 'site' },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          { type: 'number', name: 'issueNumber', label: 'Issue number', required: true },
          { type: 'string', name: 'season', label: 'Season (Spring/Summer/Fall/Winter)', required: true },
          { type: 'string', name: 'year', label: 'Year label (e.g. "year one")', required: true },
          { type: 'string', name: 'tagline', label: 'Tagline (optional)' },
        ],
      },
    ],
  },
});
