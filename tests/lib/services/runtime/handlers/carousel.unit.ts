import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { CarouselHandler } from '@/lib/services/runtime/handlers/carousel';
import { StorageType } from '@/lib/services/runtime/types';
import { Action } from '@/runtime';

describe('Carousel handler', () => {
  describe('canHandle', () => {
    it('false', () => {
      expect(
        CarouselHandler(null as any).canHandle({} as any, null as any, null as any, null as any)
      ).to.eql(false);
    });

    it('true', () => {
      expect(
        CarouselHandler(null as any).canHandle(
          { type: 'carousel' } as any,
          null as any,
          null as any,
          null as any
        )
      ).to.eql(true);
    });
  });

  describe('handle is blocking', () => {
    it('action is running', () => {
      const CARD_DESCRIPTION = 'card description';
      const slateTransformed = [{ text: CARD_DESCRIPTION }];
      const utils = {
        addNoReplyTimeoutIfExists: sinon.stub(),
        slateInjectVariables: sinon.stub().returnsArg(0),
        slateToPlaintext: sinon.stub().returns(CARD_DESCRIPTION),
        sanitizeVariables: sinon.stub().returnsArg(0),
      };
      const handler = CarouselHandler(utils as any);

      const node: BaseNode.Carousel.Node = {
        id: 'node-id',
        isBlocking: true,
        layout: BaseNode.Carousel.CarouselLayout.LIST,
        type: BaseNode.NodeType.CAROUSEL,
        cards: [
          {
            id: 'card-1',
            title: 'Card Nike',
            description: slateTransformed,
            imageUrl: 'image/{image1}.jpeg',
            buttons: [
              {
                name: 'Button Nike buy',
                request: {
                  type: `button-1-abcd`,
                  payload: {},
                },
              },
              {
                name: 'Button Nike review',
                request: {
                  type: `button-2-xyz`,
                  payload: {},
                },
              },
            ],
          },
        ],
      };

      const runtime = {
        getAction: sinon.stub().returns(Action.RUNNING),
        getRequest: sinon.stub().returns({}),
        trace: { addTrace: sinon.stub() },
        storage: { delete: sinon.stub() },
      };
      const variables = {
        getState: sinon.stub().returns({ var1: 'val 1', image1: 'sample-image' }),
      };
      expect(handler.handle(node, runtime as any, variables as any, null as any)).to.eql(node.id);
      expect(utils.addNoReplyTimeoutIfExists.args).to.eql([[node, runtime]]);
      expect(runtime.storage.delete.callCount).to.eql(2);
      expect(runtime.storage.delete.args).to.eql([
        [StorageType.NO_MATCHES_COUNTER],
        [StorageType.NO_REPLIES_COUNTER],
      ]);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: BaseTrace.TraceType.CAROUSEL,
            payload: {
              layout: node.layout,
              cards: [
                {
                  id: 'card-1',
                  title: 'Card Nike',
                  description: {
                    slate: slateTransformed,
                    text: 'card description',
                  },
                  imageUrl: 'image/sample-image.jpeg',
                  buttons: [
                    {
                      name: 'Button Nike buy',
                      request: {
                        type: `button-1-abcd`,
                        payload: {},
                      },
                    },
                    {
                      name: 'Button Nike review',
                      request: {
                        type: `button-2-xyz`,
                        payload: {},
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      ]);
    });

    describe('action is not response', () => {
      it('command can handle', () => {
        const output = 'next-id';
        const commandHandler = {
          canHandle: sinon.stub().returns(true),
          handle: sinon.stub().returns(output),
        };
        const noReplyHandler = { canHandle: sinon.stub().returns(false) };
        const utils = {
          commandHandler,
          noReplyHandler,
        };
        const handler = CarouselHandler(utils as any);

        const node = {
          id: 'node-id',
          isBlocking: true,
          type: BaseNode.NodeType.CAROUSEL,
          cards: [],
        };
        const runtime = {
          getAction: sinon.stub().returns(Action.REQUEST),
          setAction: sinon.stub(),
          getRequest: sinon.stub().returns({}),
          storage: { delete: sinon.stub() },
        };
        const variables = { var1: 'val1' };
        expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(
          output
        );

        expect(commandHandler.canHandle.args).to.eql([[runtime]]);
        expect(commandHandler.handle.args).to.eql([[runtime, variables]]);
      });

      it('noReply can handle', () => {
        const output = 'next-id';
        const commandHandler = { canHandle: sinon.stub().returns(false) };
        const noReplyHandler = {
          canHandle: sinon.stub().returns(true),
          handle: sinon.stub().returns(output),
        };
        const utils = {
          commandHandler,
          noReplyHandler,
        };
        const handler = CarouselHandler(utils as any);

        const node = {
          id: 'node-id',
          isBlocking: true,
          type: BaseNode.NodeType.CAROUSEL,
          cards: [],
        };
        const runtime = {
          getAction: sinon.stub().returns(Action.REQUEST),
          setAction: sinon.stub(),
          getRequest: sinon.stub().returns({}),
          storage: { delete: sinon.stub() },
        };
        const variables = { var1: 'val1' };
        expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(
          output
        );

        expect(noReplyHandler.handle.args).to.eql([[node, runtime, variables]]);
      });
    });

    describe('command can not handle', () => {
      it('nomatch handler', () => {
        const commandHandler = { canHandle: sinon.stub().returns(false) };
        const noReplyHandler = { canHandle: sinon.stub().returns(false) };
        const noMatchHandler = { handle: sinon.stub().returns('no-match-path') };
        const utils = {
          commandHandler,
          noReplyHandler,
          noMatchHandler,
        };
        const handler = CarouselHandler(utils as any);

        const node = {
          id: 'node-id',
          isBlocking: true,
          type: BaseNode.NodeType.CAROUSEL,
          cards: [],
        };

        const runtime = {
          getAction: sinon.stub().returns(Action.REQUEST),
          getRequest: sinon.stub().returns({}),
          trace: { addTrace: sinon.stub() },
          storage: { delete: sinon.stub() },
        };
        const variables = { var1: 'val1' };
        expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(
          'no-match-path'
        );

        expect(commandHandler.canHandle.args).to.eql([[runtime]]);
        expect(noMatchHandler.handle.args).to.eql([[node, runtime, variables]]);
      });
    });
  });

  describe('handle non blocking', () => {
    it('action is running', () => {
      const CARD_DESCRIPTION = 'card description';
      const slateTransformed = [{ text: CARD_DESCRIPTION }];
      const utils = {
        addNoReplyTimeoutIfExists: sinon.stub(),
        slateInjectVariables: sinon.stub().returnsArg(0),
        slateToPlaintext: sinon.stub().returns(CARD_DESCRIPTION),
        sanitizeVariables: sinon.stub().returnsArg(0),
      };
      const handler = CarouselHandler(utils as any);

      const node: BaseNode.Carousel.Node = {
        id: 'node-id',
        isBlocking: false,
        layout: BaseNode.Carousel.CarouselLayout.LIST,
        type: BaseNode.NodeType.CAROUSEL,
        nextId: 'next-id',
        cards: [
          {
            id: 'card-1',
            title: 'Card Nike',
            description: slateTransformed,
            imageUrl: '',
            buttons: [
              {
                name: 'Button Nike buy',
                request: {
                  type: `button-1-abcd`,
                  payload: {},
                },
              },
              {
                name: 'Button Nike review',
                request: {
                  type: `button-2-xyz`,
                  payload: {},
                },
              },
            ],
          },
        ],
      };

      const runtime = {
        getAction: sinon.stub().returns(Action.RUNNING),
        getRequest: sinon.stub().returns({}),
        trace: { addTrace: sinon.stub() },
        storage: { delete: sinon.stub() },
      };
      const variables = { getState: sinon.stub().returns({ var1: 'val 1' }) };
      expect(handler.handle(node, runtime as any, variables as any, null as any)).to.eql(
        node.nextId
      );
      expect(utils.addNoReplyTimeoutIfExists.callCount).to.eql(0);
      expect(runtime.storage.delete.callCount).to.eql(0);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: BaseTrace.TraceType.CAROUSEL,
            payload: {
              layout: node.layout,
              cards: [
                {
                  id: 'card-1',
                  title: 'Card Nike',
                  description: {
                    slate: slateTransformed,
                    text: 'card description',
                  },
                  imageUrl: '',
                  buttons: [
                    {
                      name: 'Button Nike buy',
                      request: {
                        type: `button-1-abcd`,
                        payload: {},
                      },
                    },
                    {
                      name: 'Button Nike review',
                      request: {
                        type: `button-2-xyz`,
                        payload: {},
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      ]);
    });

    describe('action is not response', () => {
      it('command can handle', () => {
        const output = 'next-id';
        const commandHandler = {
          canHandle: sinon.stub().returns(true),
          handle: sinon.stub().returns(output),
        };
        const noReplyHandler = { canHandle: sinon.stub().returns(false) };
        const utils = {
          commandHandler,
          noReplyHandler,
        };
        const handler = CarouselHandler(utils as any);

        const node = {
          id: 'node-id',
          isBlocking: false,
          type: BaseNode.NodeType.CAROUSEL,
          cards: [],
        };
        const runtime = {
          getAction: sinon.stub().returns(Action.REQUEST),
          setAction: sinon.stub(),
          getRequest: sinon.stub().returns({}),
          storage: { delete: sinon.stub() },
        };
        const variables = { var1: 'val1' };
        expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(
          output
        );

        expect(commandHandler.canHandle.args).to.eql([[runtime]]);
        expect(commandHandler.handle.args).to.eql([[runtime, variables]]);
      });
    });
  });
});
