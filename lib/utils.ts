export function caseInsensitiveSorter<T>(mapper: (s: T) => string) {
  return (a: T, b: T) =>
    mapper(a)
      .toLowerCase()
      .localeCompare(mapper(b).toLowerCase());
}

export function isRelativePath(p: string) {
  return p[0] === "." || p[0] === "/";
}
