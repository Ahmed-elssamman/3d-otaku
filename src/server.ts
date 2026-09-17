import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';

const angularApp = new AngularNodeAppEngine({ trustProxyHeaders: false });

export function renderStorefront(request: Request): Promise<Response | null> {
  return angularApp.handle(request);
}

export const reqHandler = createNodeRequestHandler(async (request, response, next) => {
  try {
    const rendered = await angularApp.handle(request);
    if (rendered) {
      rendered.headers.set('Cache-Control', 'no-store');
      await writeResponseToNodeResponse(rendered, response);
    } else next();
  } catch (error) {
    next(error);
  }
});
