export function caseInsensitiveSorter<T>(mapper: (s: T) => string) {
  return (a: T, b: T) =>
    mapper(a)
      .toLowerCase()
      .localeCompare(mapper(b).toLowerCase());
}

export function isRelativePath(p: string) {
  return p[0] === "." || p[0] === "/";
}

export function wrap(left: string, right: string) {
  return (src: string) => {
    return `${left}${src}${right}`;
  };
}

export function clone(obj: any) {
  if (null == obj || "object" !== typeof obj) {
    return obj;
  }
  const copy: any = {};
  for (const attr in obj) {
    if (obj.hasOwnProperty(attr)) {
      copy[attr] = obj[attr];
    }
  }
  return copy;
}
