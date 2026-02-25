import express, { Request, Response, NextFunction } from 'express';
import type { Server } from 'http';

const MAX_BODY_BYTES = 64 * 1024;
const API_VERSION = '1.0';

export class ApiService {
    private _app: express.Express | null = null;
    private _server: Server | null = null;
    private _port = 0;
    private _isRunning = false;

    onPlayRundownItem: ((index: number) => void) | null = null;
    onStopRundownItem: ((index: number) => void) | null = null;
    onHideGraphic: ((graphicId: string) => void) | null = null;
    onExecuteScript: ((script: string) => void) | null = null;

    get isRunning(): boolean { return this._isRunning; }
    get port(): number { return this._port; }

    start(port: number): void {
        if (this._isRunning) return;
        this._port = port;

        const app = express();
        app.use(express.json({ limit: `${MAX_BODY_BYTES}b` }));

        // CORS
        app.use((_req: Request, res: Response, next: NextFunction) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            if (_req.method === 'OPTIONS') { res.sendStatus(204); return; }
            next();
        });

        app.get('/api/status', (_req: Request, res: Response) => {
            res.json({ status: this._isRunning ? 'running' : 'stopped', port: this._port, version: API_VERSION });
        });

        app.post('/api/rundown/:index/play', (req: Request, res: Response) => {
            const index = parseInt(req.params.index as string, 10);
            if (isNaN(index)) { res.status(400).json({ error: 'Invalid index' }); return; }
            if (this.onPlayRundownItem) this.onPlayRundownItem(index);
            res.json({ message: `Playing item ${index}` });
        });

        app.post('/api/rundown/:index/stop', (req: Request, res: Response) => {
            const index = parseInt(req.params.index as string, 10);
            if (isNaN(index)) { res.status(400).json({ error: 'Invalid index' }); return; }
            if (this.onStopRundownItem) this.onStopRundownItem(index);
            res.json({ message: `Stopping item ${index}` });
        });

        app.post('/api/graphics/:id/hide', (req: Request, res: Response) => {
            const graphicId = req.params.id as string;
            if (this.onHideGraphic) this.onHideGraphic(graphicId);
            res.json({ message: `Hiding graphic ${graphicId}` });
        });

        app.post('/api/script', (req: Request, res: Response) => {
            const { script } = req.body || {};
            if (!script) { res.status(400).json({ error: "Missing 'script' property in request body" }); return; }
            if (this.onExecuteScript) this.onExecuteScript(script);
            res.json({ message: 'Script executed', script });
        });

        app.use((_req: Request, res: Response) => {
            res.status(404).json({ error: 'Not Found' });
        });

        app.use((err: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
            if (err.type === 'entity.too.large') {
                res.status(413).json({ error: `Request body too large (limit ${MAX_BODY_BYTES} bytes)` });
                return;
            }
            console.error('API error:', err.message);
            res.status(500).json({ error: 'Internal Server Error', detail: err.message });
        });

        this._app = app;
        this._server = app.listen(port, 'localhost', () => {
            this._isRunning = true;
            console.log(`API server listening on http://localhost:${port}`);
        });
    }

    stop(): void {
        if (!this._isRunning) return;
        this._isRunning = false;
        if (this._server) {
            this._server.close();
            this._server = null;
        }
    }
}
