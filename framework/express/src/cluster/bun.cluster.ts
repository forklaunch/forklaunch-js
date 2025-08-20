import { ClusterConfig } from '@forklaunch/core/http';
import { Express } from 'express';
import cluster, { Worker } from 'node:cluster';
import os from 'node:os';
import { serveExpress } from './bun.serve.shim';

export function startBunCluster(config: ClusterConfig<Express>) {
  const WORKERS = config.workerCount;
  const PORT = config.port;
  const HOST = config.host;

  const openTelemetryCollector = config.openTelemetryCollector;

  if (WORKERS > os.cpus().length) {
    throw new Error('Worker count cannot be greater than the number of CPUs');
  }

  if (cluster.isPrimary) {
    const workers = new Map<number, Worker>();
    let isShuttingDown = false;

    openTelemetryCollector.info(
      `[primary ${process.pid}] starting ${WORKERS} workers on :${PORT}. Ignoring routing strategy due to SO_REUSEPORT kernel level routing.`
    );

    function startWorker(i: number) {
      if (isShuttingDown) return;
      const worker = cluster.fork({
        WORKER_INDEX: String(i),
        PORT: String(PORT)
      });

      workers.set(worker.id, worker);

      worker.on('exit', () => {
        if (isShuttingDown) {
          return;
        }
        workers.delete(worker.id);
        openTelemetryCollector.warn(
          `worker ${worker.process.pid} died; restarting in 2s`
        );
        setTimeout(() => {
          if (!isShuttingDown) {
            startWorker(i);
          }
        }, 2000);
      });

      worker.on('message', (message: { type?: string }) => {
        if (message && message.type === 'worker-ready') {
          openTelemetryCollector.info(
            `Worker ${i} (PID: ${worker.process.pid}) ready`
          );
        }
      });
    }

    for (let i = 0; i < WORKERS; i++) {
      startWorker(i);
    }

    process.on('SIGINT', () => {
      isShuttingDown = true;
      openTelemetryCollector.info(
        'Received SIGINT, shutting down gracefully...'
      );
      workers.forEach((worker) => {
        worker.send({ type: 'shutdown' });
        worker.kill('SIGTERM');
      });
      setTimeout(() => {
        workers.forEach((worker) => worker.kill('SIGKILL'));
        process.exit(0);
      }, 5000);
    });
  } else {
    const PORT = Number(process.env.PORT || 6935);
    const IDX = process.env.WORKER_INDEX ?? '0';

    const server = serveExpress(
      config.expressApp,
      config.openTelemetryCollector,
      {
        port: PORT,
        host: HOST,
        reusePort: true,
        development: false,
        tls: config.ssl
      }
    );

    if (process.send) {
      process.send({ type: 'worker-ready', port: server.port, index: IDX });
    }

    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

      if (heapUsedMB > 100) {
        openTelemetryCollector.warn(
          `High memory usage on worker ${process.pid}: ${heapUsedMB} MB`
        );
      }
    }, 30000);

    process.on('SIGINT', () => {
      openTelemetryCollector.info(
        `[worker ${process.pid}] shutting down gracefully...`
      );
      server.stop();
      process.exit(0);
    });

    process.on('message', (message: { type?: string }) => {
      if (message?.type === 'shutdown') {
        openTelemetryCollector.info(
          `[worker ${process.pid}] received shutdown signal from primary`
        );
        server.stop();
        process.exit(0);
      }
    });

    process.on('uncaughtException', (err) => {
      openTelemetryCollector.error(
        `Uncaught exception on worker ${process.pid}:`,
        err
      );
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      openTelemetryCollector.error(
        `Unhandled rejection on worker ${process.pid}:`,
        reason
      );
      process.exit(1);
    });
  }
}
