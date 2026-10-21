import { ExtractedPageData } from '../../types/audit';

export type PageType =
  | 'home'
  | 'collection'
  | 'product'
  | 'article'
  | 'about'
  | 'contact'
  | 'policy'
  | 'utility';

export function classifyPageType(page: ExtractedPageData): PageType {
  const urlStr = page.url || '';
  let pathname = '';
  try {
    pathname = new URL(urlStr).pathname.toLowerCase();
  } catch {
    pathname = urlStr.toLowerCase();
  }

  // 1. Home
  if (pathname === '/' || pathname === '' || pathname === '/index.html' || pathname === '/index.php') {
    return 'home';
  }

  // 2. Utility pages (cart, checkout, account, login, register, 404, search)
  if (
    pathname.includes('/cart') ||
    pathname.includes('/checkout') ||
    pathname.includes('/account') ||
    pathname.includes('/login') ||
    pathname.includes('/signin') ||
    pathname.includes('/signup') ||
    pathname.includes('/register') ||
    pathname.includes('/search') ||
    pathname.includes('/404')
  ) {
    return 'utility';
  }

  // 3. Contact & Support
  if (
    pathname.includes('/contact') ||
    pathname.includes('/support') ||
    pathname.includes('/help') ||
    pathname.includes('/reach-us')
  ) {
    return 'contact';
  }

  // 4. Policy, Legal, Shipping, Returns, FAQ
  if (
    pathname.includes('/terms') ||
    pathname.includes('/privacy') ||
    pathname.includes('/shipping') ||
    pathname.includes('/returns') ||
    pathname.includes('/refund') ||
    pathname.includes('/legal') ||
    pathname.includes('/policy') ||
    pathname.includes('/faq')
  ) {
    return 'policy';
  }

  // 5. About / Story / Founder
  if (
    pathname.includes('/about') ||
    pathname.includes('/our-story') ||
    pathname.includes('/founder') ||
    pathname.includes('/who-we-are') ||
    pathname.includes('/mission')
  ) {
    return 'about';
  }

  // 6. Product
  const hasProductSchema = page.structuredData?.some((sd) =>
    sd.type.toLowerCase().includes('product')
  );
  if (
    pathname.startsWith('/product/') ||
    pathname.startsWith('/products/') ||
    pathname.startsWith('/item/') ||
    pathname.startsWith('/p/') ||
    hasProductSchema
  ) {
    return 'product';
  }

  // 7. Collection / Category
  if (
    pathname.startsWith('/collections/') ||
    pathname.startsWith('/collection/') ||
    pathname.startsWith('/category/') ||
    pathname.startsWith('/categories/') ||
    pathname.startsWith('/shop') ||
    pathname.startsWith('/catalog')
  ) {
    return 'collection';
  }

  // 8. Article / Blog
  const hasArticleSchema = page.structuredData?.some(
    (sd) =>
      sd.type.toLowerCase().includes('article') ||
      sd.type.toLowerCase().includes('blogposting') ||
      sd.type.toLowerCase().includes('newsarticle')
  );
  if (
    pathname.startsWith('/blog/') ||
    pathname.startsWith('/posts/') ||
    pathname.startsWith('/journal/') ||
    pathname.startsWith('/news/') ||
    pathname.startsWith('/articles/') ||
    pathname.startsWith('/article/') ||
    hasArticleSchema
  ) {
    return 'article';
  }

  // Fallback heuristics based on link graph and structure:
  const productLinkCount =
    page.internalLinks?.filter((l) =>
      /\/product\/|\/products\/|\/item\//i.test(l.url)
    ).length || 0;
  if (productLinkCount >= 4) {
    return 'collection';
  }

  if (page.wordCount > 600) {
    return 'article';
  }

  return 'utility';
}
