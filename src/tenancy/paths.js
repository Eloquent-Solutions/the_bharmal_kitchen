import { isMultiRestaurant } from '../firebase/config';
export function staffPath(path = '/') {
  if (!isMultiRestaurant || path === '/admin' || path.startsWith('/admin/')) return path;
  return `/admin${path === '/' ? '' : path}`;
}
export function businessPath(path) {
  return isMultiRestaurant && (path === '/admin' || path.startsWith('/admin/')) ? path.slice(6) || '/' : path;
}
