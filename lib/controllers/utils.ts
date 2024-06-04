import { BaseRequest } from '@voiceflow/base-types';
import {
  ActionRequestDTO,
  GeneralRequestDTO,
  IntentRequestDTO,
  LaunchRequestDTO,
  NoReplyRequestDTO,
  RequestType,
  TextRequestDTO,
} from '@voiceflow/dtos';

import logger from '@/logger';
import { Config } from '@/types';

import { FullServiceMap } from '../services';
import { RuntimeRequest } from '../services/runtime/types';

export abstract class AbstractController {
  constructor(public services: FullServiceMap, public config: Config) {}
}

export function logMalformedRequest(request: Record<string, any> | null | undefined, type: 'action' | 'request') {
  if (!!request && validateRuntimeRequest(request)) {
    logger.info(
      `malformed request object [${type}], [type]=${request?.type}, [json]=${JSON.stringify(request, null, 2)}`
    );
  }
}

/**
 * Adapts malformed launch/geenral request which contains `payload: null` even though payloads cannot be null for these
 * request types.
 *
 * ```js
 *  { type: 'launch', payload: null }
 * ```
 */
function adaptMalformedReactChatRequest(
  request?: BaseRequest.LaunchRequest | BaseRequest.GeneralRequest
): undefined | BaseRequest.LaunchRequest | BaseRequest.GeneralRequest {
  if (!request) return request;
  if (!('payload' in request)) return request;
  if (request.payload !== null) return request;
  const { payload, ...rest } = request;
  return rest;
}

/**
 * Older versions of `react-chat` are sending malformed launch and general request payloads. We
 * need to adapt these into request payloads that fit the actual request types and DTOs.
 */
export function adaptMalformedRequest(request?: RuntimeRequest): undefined | RuntimeRequest {
  if (!request) return request;
  if (typeof request !== 'object') return request;
  if (!('type' in request) || typeof request.type !== 'string') return request;

  if (BaseRequest.isLaunchRequest(request)) return adaptMalformedReactChatRequest(request);
  if (BaseRequest.isGeneralRequest(request)) return adaptMalformedReactChatRequest(request);
  return request;
}

export function validateRuntimeRequest(request?: unknown) {
  if (typeof request !== 'object' || request === null) {
    return false;
  }
  if (!('type' in request)) {
    return false;
  }
  switch (request.type) {
    case RequestType.ACTION:
      return ActionRequestDTO.safeParse(request).success;
    case RequestType.INTENT:
      return IntentRequestDTO.safeParse(request).success;
    case RequestType.LAUNCH:
      return LaunchRequestDTO.safeParse(request).success;
    case RequestType.NO_REPLY:
      return NoReplyRequestDTO.safeParse(request).success;
    case RequestType.TEXT:
      return TextRequestDTO.safeParse(request).success;
    default:
      return GeneralRequestDTO.safeParse(request).success;
  }
}
