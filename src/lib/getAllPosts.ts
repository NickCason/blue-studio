import { getCollection, type CollectionEntry } from 'astro:content';

export type AnyPost = CollectionEntry<'posts'>;

export async function getAllPosts(opts: { includeDrafts?: boolean } = {}): Promise<AnyPost[]> {
  const posts = await getCollection('posts', ({ data }) => opts.includeDrafts || !data.draft);
  posts.sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
  return posts;
}

export function postSlug(p: AnyPost): string {
  return p.slug;
}
