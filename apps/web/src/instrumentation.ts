export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node');
  }
}

export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routeType: string },
): Promise<void> {
  const { logger } = await import('./server/logger');
  logger.error(
    { err: error, path: request.path, method: request.method, routeType: context.routeType },
    'request failed',
  );
}
