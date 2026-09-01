/** Resolve asset root for pages in subfolders (tour/, hub/, teacher/) */
export function assetRoot() {
  if (typeof window === 'undefined') return '.';
  return /\/(tour|hub|teacher)\//.test(window.location.pathname) ? '..' : '.';
}

export function textureBasePath(small = false) {
  return `${assetRoot()}/${small ? 'textures-small' : 'textures-optimized'}`;
}

export function stickerBasePath() {
  return `${assetRoot()}/stickers`;
}
