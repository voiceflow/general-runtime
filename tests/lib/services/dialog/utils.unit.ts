/* eslint-disable no-unused-expressions */
import { expect } from 'chai';
import sinon from 'sinon';

import * as utils from '@/lib/services/dialog/utils';
import * as CommandHandler from '@/lib/services/runtime/handlers/command';
import * as eventUtils from '@/lib/services/runtime/handlers/event';
import * as RuntimeModule from '@/runtime';
import * as Client from '@/runtime/lib/Client';

import { mockFulfilledIntentRequest, mockLM, mockUnfulfilledIntentRequest } from './fixture';

describe('dialog manager utilities unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('getDMPrefixIntentName', () => {
    it('assembles the correct DM-context intent name', async () => {
      const intentName = 'dummy';
      const hash = utils.dmPrefix(intentName);
      const result = utils.getDMPrefixIntentName(intentName);

      expect(result).to.equal(`${utils.VF_DM_PREFIX}${hash}_${intentName}`);
    });
  });

  describe('getSlotNameByID', () => {
    it('finds the correct slot name given ID', () => {
      const result = utils.getSlotNameByID('tjl3zwj', mockLM);

      expect(result).to.equal('size');
    });
  });

  describe('fillStringEntities', () => {
    it('fills a given string with slot notation with actual slot values', () => {
      const result = utils.fillStringEntities('I want {{[size].tjl3zwj}} {{[size].tjl3zwj}} chicken wings', mockUnfulfilledIntentRequest);

      expect(result).to.equal('I want large large chicken wings');
    });

    it("doesn't modify a string without entity placeholders", () => {
      const input = 'I want some chicken wings';
      const result = utils.fillStringEntities(input, mockUnfulfilledIntentRequest);

      expect(result).to.equal(input);
    });

    it('Fills unpopulated entity placeholders with an empty string', () => {
      const input = 'I want some {{[foo].bar}} chicken wings';
      const result = utils.fillStringEntities(input, mockUnfulfilledIntentRequest);

      expect(result).to.equal('I want some  chicken wings');
    });
  });

  describe('getUnfulfilledEntity', () => {
    it('gets one unfulfilled required entity model', () => {
      const result = utils.getUnfulfilledEntity(mockUnfulfilledIntentRequest, mockLM);

      expect(result).to.not.be.undefined;
      expect(result?.id).to.be.equal('4w253zil');
    });

    it('returns undefined if all required entities are fulfilled', () => {
      const result = utils.getUnfulfilledEntity(mockFulfilledIntentRequest, mockLM);

      expect(result).to.be.undefined;
    });
  });

  describe('isIntentInScope', () => {
    it('action response', async () => {
      const programID = 'program-id';
      const nodeID = 'node-id';
      const node = { nodeID };
      const program = { getNode: sinon.stub().returns(node) };
      const currentFrame = { getProgramID: sinon.stub().returns(programID), getNodeID: sinon.stub().returns(nodeID), variables: { var2: 'val2' } };
      const runtime = {
        stack: { top: sinon.stub().returns(currentFrame) },
        getProgram: sinon.stub().resolves(program),
        variables: { var1: 'val1' },
        getAction: sinon.stub().returns(RuntimeModule.Action.RUNNING),
        getRequest: sinon.stub().returns({}),
      };
      const client = { createRuntime: sinon.stub().returns(runtime) };
      const ClientStub = sinon.stub(Client, 'default');
      const mergeStub = sinon.stub(RuntimeModule.Store, 'merge');
      const combinedVars = { var1: 'val1', var2: 'val2' };
      mergeStub.returns(combinedVars as any);
      ClientStub.returns(client);

      const CommandHandlerStub = sinon.stub(CommandHandler, 'default');
      const commandCanHandle = sinon.stub().returns(false);
      CommandHandlerStub.returns({ canHandle: commandCanHandle } as any);

      const { isIntentInScope } = utils;

      const context = { data: { api: 'api' }, versionID: 'versionID', state: 'state', request: 'request' };
      expect(await isIntentInScope(context as any)).to.eql(false);
      expect(client.createRuntime.args).to.eql([[context.versionID, context.state, context.request]]);
      expect(runtime.stack.top.callCount).to.eql(1);
      expect(currentFrame.getProgramID.args).to.eql([[]]);
      expect(runtime.getProgram.args).to.eql([[programID]]);
      expect(currentFrame.getNodeID.args).to.eql([[]]);
      expect(program.getNode.args).to.eql([[nodeID]]);
      expect(mergeStub.args).to.eql([[runtime.variables, currentFrame.variables]]);
      expect(runtime.getAction.args).to.eql([[]]);
      expect(commandCanHandle.args).to.eql([[runtime]]);
    });

    it('no node', async () => {
      const programID = 'program-id';
      const nodeID = 'node-id';
      const program = { getNode: sinon.stub().returns(null) };
      const currentFrame = { getProgramID: sinon.stub().returns(programID), getNodeID: sinon.stub().returns(nodeID), variables: { var2: 'val2' } };
      const runtime = {
        stack: { top: sinon.stub().returns(currentFrame) },
        getProgram: sinon.stub().resolves(program),
        variables: { var1: 'val1' },
        getAction: sinon.stub().returns(RuntimeModule.Action.REQUEST),
        getRequest: sinon.stub().returns({}),
      };
      const client = { createRuntime: sinon.stub().returns(runtime) };
      const ClientStub = sinon.stub(Client, 'default');
      const mergeStub = sinon.stub(RuntimeModule.Store, 'merge');
      const combinedVars = { var1: 'val1', var2: 'val2' };
      mergeStub.returns(combinedVars as any);
      ClientStub.returns(client);
      const CommandHandlerStub = sinon.stub(CommandHandler, 'default');
      const commandCanHandle = sinon.stub().returns(false);
      CommandHandlerStub.returns({ canHandle: commandCanHandle } as any);

      const { isIntentInScope } = utils;

      const context = { data: { api: 'api' }, versionID: 'versionID', state: 'state', request: 'request' };
      expect(await isIntentInScope(context as any)).to.eql(false);
      expect(commandCanHandle.args).to.eql([[runtime]]);
    });

    it('event handlers no match', async () => {
      const programID = 'program-id';
      const nodeID = 'node-id';
      const node = { nodeID };
      const program = { getNode: sinon.stub().returns(node) };
      const currentFrame = { getProgramID: sinon.stub().returns(programID), getNodeID: sinon.stub().returns(nodeID), variables: { var2: 'val2' } };
      const runtime = {
        stack: { top: sinon.stub().returns(currentFrame) },
        getProgram: sinon.stub().resolves(program),
        variables: { var1: 'val1' },
        getAction: sinon.stub().returns(RuntimeModule.Action.REQUEST),
        getRequest: sinon.stub().returns({}),
      };
      const client = { createRuntime: sinon.stub().returns(runtime) };
      const ClientStub = sinon.stub(Client, 'default');
      const mergeStub = sinon.stub(RuntimeModule.Store, 'merge');
      const combinedVars = { var1: 'val1', var2: 'val2' };
      mergeStub.returns(combinedVars as any);
      ClientStub.returns(client);
      const CommandHandlerStub = sinon.stub(CommandHandler, 'default');
      const commandCanHandle = sinon.stub().returns(false);
      CommandHandlerStub.returns({ canHandle: commandCanHandle } as any);

      const { isIntentInScope } = utils;

      const context = { data: { api: 'api' }, versionID: 'versionID', state: 'state', request: 'request' };
      expect(await isIntentInScope(context as any)).to.eql(false);
      expect(commandCanHandle.args).to.eql([[runtime]]);
    });

    it('intent match', async () => {
      const programID = 'program-id';
      const nodeID = 'node-id';
      const node = { nodeID, interactions: [{ event: 'event' }] };
      const program = { getNode: sinon.stub().returns(node) };
      const currentFrame = { getProgramID: sinon.stub().returns(programID), getNodeID: sinon.stub().returns(nodeID), variables: { var2: 'val2' } };
      const runtime = {
        stack: { top: sinon.stub().returns(currentFrame) },
        getProgram: sinon.stub().resolves(program),
        variables: { var1: 'val1' },
        getAction: sinon.stub().returns(RuntimeModule.Action.REQUEST),
        getRequest: sinon.stub().returns({}),
      };
      const client = { createRuntime: sinon.stub().returns(runtime) };
      const ClientStub = sinon.stub(Client, 'default');
      const mergeStub = sinon.stub(RuntimeModule.Store, 'merge');
      const combinedVars = { var1: 'val1', var2: 'val2' };
      mergeStub.returns(combinedVars as any);
      ClientStub.returns(client);
      const findEventMatcherStub = sinon.stub(eventUtils, 'findEventMatcher');
      findEventMatcherStub.returns(true as any);
      const CommandHandlerStub = sinon.stub(CommandHandler, 'default');
      const commandCanHandle = sinon.stub().returns(false);
      CommandHandlerStub.returns({ canHandle: commandCanHandle } as any);

      const { isIntentInScope } = utils;

      const context = { data: { api: 'api' }, versionID: 'versionID', state: 'state', request: 'request' };
      expect(await isIntentInScope(context as any)).to.eql(true);
      expect(findEventMatcherStub.args).to.eql([[{ event: node.interactions[0].event, runtime, variables: combinedVars }]]);
      expect(commandCanHandle.args).to.eql([[runtime]]);
    });

    it('command match', async () => {
      const programID = 'program-id';
      const nodeID = 'node-id';
      const node = { nodeID, interactions: [{ event: 'event' }] };
      const program = { getNode: sinon.stub().returns(node) };
      const currentFrame = { getProgramID: sinon.stub().returns(programID), getNodeID: sinon.stub().returns(nodeID), variables: { var2: 'val2' } };
      const runtime = {
        stack: { top: sinon.stub().returns(currentFrame) },
        getProgram: sinon.stub().resolves(program),
        variables: { var1: 'val1' },
        getAction: sinon.stub().returns(RuntimeModule.Action.REQUEST),
        getRequest: sinon.stub().returns({}),
      };
      const client = { createRuntime: sinon.stub().returns(runtime) };
      const ClientStub = sinon.stub(Client, 'default');
      const mergeStub = sinon.stub(RuntimeModule.Store, 'merge');
      const combinedVars = { var1: 'val1', var2: 'val2' };
      mergeStub.returns(combinedVars as any);
      ClientStub.returns(client);
      const findEventMatcherStub = sinon.stub(eventUtils, 'findEventMatcher');
      findEventMatcherStub.returns(false as any);
      const CommandHandlerStub = sinon.stub(CommandHandler, 'default');
      const commandCanHandle = sinon.stub().returns(true);
      CommandHandlerStub.returns({ canHandle: commandCanHandle } as any);

      const { isIntentInScope } = utils;

      const context = { data: { api: 'api' }, versionID: 'versionID', state: 'state', request: 'request' };
      expect(await isIntentInScope(context as any)).to.eql(true);
      expect(commandCanHandle.args).to.eql([[runtime]]);
    });

    it('no match', async () => {
      const programID = 'program-id';
      const nodeID = 'node-id';
      const node = { nodeID, variable: 'var1' };
      const program = { getNode: sinon.stub().returns(node) };
      const currentFrame = { getProgramID: sinon.stub().returns(programID), getNodeID: sinon.stub().returns(nodeID), variables: { var2: 'val2' } };
      const runtime = {
        stack: { top: sinon.stub().returns(currentFrame) },
        getProgram: sinon.stub().resolves(program),
        variables: { var1: 'val1' },
        getAction: sinon.stub().returns(RuntimeModule.Action.REQUEST),
        getRequest: sinon.stub().returns({}),
      };
      const client = { createRuntime: sinon.stub().returns(runtime) };
      const ClientStub = sinon.stub(Client, 'default');
      const mergeStub = sinon.stub(RuntimeModule.Store, 'merge');
      const combinedVars = { var1: 'val1', var2: 'val2' };
      mergeStub.returns(combinedVars as any);
      ClientStub.returns(client);
      const findEventMatcherStub = sinon.stub(eventUtils, 'findEventMatcher');
      findEventMatcherStub.returns(false as any);
      const CommandHandlerStub = sinon.stub(CommandHandler, 'default');
      CommandHandlerStub.returns({ canHandle: sinon.stub().returns(false) } as any);

      const { isIntentInScope } = utils;

      const context = { data: { api: 'api' }, versionID: 'versionID', state: 'state', request: 'request' };
      expect(await isIntentInScope(context as any)).to.eql(false);
    });
  });
});
