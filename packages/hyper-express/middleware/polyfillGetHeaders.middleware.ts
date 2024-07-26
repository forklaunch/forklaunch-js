import { Request, Response } from '@forklaunch/hyper-express-fork';

// TODO: Move into fork, and create gh issue
export async function polyfillGetHeaders(req: Request, res: Response) {
    res.getHeaders = () => {
      return (res as unknown as { _headers: Record<string, string[]>})._headers;
    } 
}