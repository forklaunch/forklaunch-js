export function isPath<Path extends `/${string}`>(path: string): path is Path {
  return path.startsWith('/');
}
