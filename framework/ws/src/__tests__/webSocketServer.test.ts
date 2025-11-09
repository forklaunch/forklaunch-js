import { ZodSchemaValidator } from '@forklaunch/validator/zod';
import { describe, expect, it, vi } from 'vitest';
import { WebSocketServer } from 'ws';
import { z } from 'zod/v3';
import type { EventSchema } from '../types/eventSchema.types';
import { ForklaunchWebSocketServer } from '../webSocketServer';

describe('ForklaunchWebSocketServer', () => {
  const schemas = {
    ping: { ts: z.number() },
    pong: { ts: z.number() },
    serverMessages: {
      chat: {
        type: z.literal('chat'),
        message: z.string(),
        userId: z.string()
      }
    },
    clientMessages: {
      response: z.object({
        status: z.string(),
        data: z.unknown()
      })
    },
    errors: {
      error: {
        code: z.string(),
        message: z.string()
      }
    },
    closeReason: {
      code: z.number(),
      message: z.string()
    }
  } satisfies EventSchema<ZodSchemaValidator>;

  const validator = new ZodSchemaValidator();

  describe('Constructor', () => {
    it('should create server with schema validator and event schemas', () => {
      const wss = new ForklaunchWebSocketServer(validator, schemas, {
        noServer: true
      });

      expect(wss).toBeInstanceOf(WebSocketServer);
    });

    it('should accept options and callback', () => {
      const callback = vi.fn();
      const wss = new ForklaunchWebSocketServer(
        validator,
        schemas,
        { noServer: true },
        callback
      );

      expect(wss).toBeInstanceOf(WebSocketServer);
      // Callback would be invoked when server actually starts
    });
  });

  describe('Event Listener Methods', () => {
    describe('on()', () => {
      it('should register connection listener', () => {
        const wss = new ForklaunchWebSocketServer(validator, schemas, {
          noServer: true
        });
        const listener = vi.fn();

        const superOnSpy = vi.spyOn(WebSocketServer.prototype, 'on');

        wss.on('connection', listener);

        expect(superOnSpy).toHaveBeenCalledWith(
          'connection',
          expect.any(Function)
        );

        superOnSpy.mockRestore();
      });

      it('should register error listener', () => {
        const wss = new ForklaunchWebSocketServer(validator, schemas, {
          noServer: true
        });
        const listener = vi.fn();

        const superOnSpy = vi.spyOn(WebSocketServer.prototype, 'on');

        wss.on('error', listener);

        expect(superOnSpy).toHaveBeenCalledWith('error', expect.any(Function));

        superOnSpy.mockRestore();
      });

      it('should register headers listener', () => {
        const wss = new ForklaunchWebSocketServer(validator, schemas, {
          noServer: true
        });
        const listener = vi.fn();

        const superOnSpy = vi.spyOn(WebSocketServer.prototype, 'on');

        wss.on('headers', listener);

        expect(superOnSpy).toHaveBeenCalledWith(
          'headers',
          expect.any(Function)
        );

        superOnSpy.mockRestore();
      });

      it('should register close listener', () => {
        const wss = new ForklaunchWebSocketServer(validator, schemas, {
          noServer: true
        });
        const listener = vi.fn();

        const superOnSpy = vi.spyOn(WebSocketServer.prototype, 'on');

        wss.on('close', listener);

        expect(superOnSpy).toHaveBeenCalledWith('close', expect.any(Function));

        superOnSpy.mockRestore();
      });

      it('should register listening listener', () => {
        const wss = new ForklaunchWebSocketServer(validator, schemas, {
          noServer: true
        });
        const listener = vi.fn();

        const superOnSpy = vi.spyOn(WebSocketServer.prototype, 'on');

        wss.on('listening', listener);

        expect(superOnSpy).toHaveBeenCalledWith(
          'listening',
          expect.any(Function)
        );

        superOnSpy.mockRestore();
      });
    });

    describe('once()', () => {
      it('should register one-time connection listener', () => {
        const wss = new ForklaunchWebSocketServer(validator, schemas, {
          noServer: true
        });
        const listener = vi.fn();

        const superOnceSpy = vi.spyOn(WebSocketServer.prototype, 'once');

        wss.once('connection', listener);

        expect(superOnceSpy).toHaveBeenCalledWith(
          'connection',
          expect.any(Function)
        );

        superOnceSpy.mockRestore();
      });
    });

    describe('addListener()', () => {
      it('should add connection listener', () => {
        const wss = new ForklaunchWebSocketServer(validator, schemas, {
          noServer: true
        });
        const listener = vi.fn();

        const superAddListenerSpy = vi.spyOn(
          WebSocketServer.prototype,
          'addListener'
        );

        wss.addListener('connection', listener);

        expect(superAddListenerSpy).toHaveBeenCalledWith(
          'connection',
          expect.any(Function)
        );

        superAddListenerSpy.mockRestore();
      });
    });

    describe('off()', () => {
      it('should remove connection listener', () => {
        const wss = new ForklaunchWebSocketServer(validator, schemas, {
          noServer: true
        });
        const listener = vi.fn();

        wss.on('connection', listener);

        const superOffSpy = vi.spyOn(WebSocketServer.prototype, 'off');

        wss.off('connection', listener);

        expect(superOffSpy).toHaveBeenCalledWith(
          'connection',
          expect.any(Function)
        );

        superOffSpy.mockRestore();
      });
    });

    describe('removeListener()', () => {
      it('should remove connection listener', () => {
        const wss = new ForklaunchWebSocketServer(validator, schemas, {
          noServer: true
        });
        const listener = vi.fn();

        wss.addListener('connection', listener);

        const superRemoveListenerSpy = vi.spyOn(
          WebSocketServer.prototype,
          'removeListener'
        );

        wss.removeListener('connection', listener);

        expect(superRemoveListenerSpy).toHaveBeenCalledWith(
          'connection',
          expect.any(Function)
        );

        superRemoveListenerSpy.mockRestore();
      });
    });
  });

  describe('Type Safety', () => {
    it('should type connection listener with ForklaunchWebSocket', () => {
      const wss = new ForklaunchWebSocketServer(validator, schemas, {
        noServer: true
      });

      wss.on('connection', (ws, request) => {
        ws.on('message', (data, isBinary) => {
          expect(data).toBeDefined();
          expect(isBinary).toBe(true);
        });
        expect(ws).toBeDefined();
        expect(request).toBeDefined();
      });

      expect(true).toBe(true);
    });

    it('should type onConnection listener with ForklaunchWebSocket', () => {
      const wss = new ForklaunchWebSocketServer(validator, schemas, {
        noServer: true
      });

      wss.on('connection', (ws, request) => {
        ws.emit(
          'message',
          {
            type: 'chat',
            message: 'test',
            userId: '123'
          },
          true
        );
        expect(ws).toBeDefined();
        expect(request).toBeDefined();
      });
    });
  });
});
