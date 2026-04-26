import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'admin/users/:id', renderMode: RenderMode.Client },
  { path: 'expenses/edit/:id', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Prerender }
];
