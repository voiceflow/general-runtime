import { Node } from '@voiceflow/base-types';

import { S } from '@/runtime/lib/Constants';
import { HandlerFactory } from '@/runtime/lib/Handler';

type RandomStorage = Partial<Record<string, (string | null)[]>>;

const randomHandler: HandlerFactory<Node.Random.Node> = () => ({
  canHandle: (node) => !!node.random,
  handle: async (node, runtime) => {
    let nextId: string | null;

    if (!node.nextIds.length) {
      runtime.trace.debug('no random paths connected - exiting', Node.NodeType.RANDOM);
      return null;
    }

    if (node.nextIds.length === 1) {
      [nextId] = node.nextIds;
    } else if (node.random === 2) {
      // no duplicates random node
      let used: Set<string | null>;
      const { storage } = runtime;

      if (!storage.get<RandomStorage>(S.RANDOMS)) {
        // initialize randoms
        storage.set<RandomStorage>(S.RANDOMS, {});
      }

      if (storage.get<RandomStorage>(S.RANDOMS)?.[node.id]?.length) {
        used = new Set(storage.get<RandomStorage>(S.RANDOMS)![node.id]);
      } else {
        used = new Set();
        storage.set(S.RANDOMS, { ...storage.get<RandomStorage>(S.RANDOMS), [node.id]: [] });
      }

      // get all unused choices
      let choices = node.nextIds.filter((choice) => !used.has(choice));
      if (!choices.length) {
        // all choices have been used
        choices = node.nextIds;
        // reset used choices
        storage.set<RandomStorage>(S.RANDOMS, { ...storage.get<RandomStorage>(S.RANDOMS), [node.id]: [] });
      }

      nextId = choices[Math.floor(Math.random() * choices.length)];

      storage.set<RandomStorage>(S.RANDOMS, {
        ...storage.get<RandomStorage>(S.RANDOMS),
        [node.id]: [...storage.get<RandomStorage>(S.RANDOMS)![node.id]!, nextId],
      });
    } else {
      nextId = node.nextIds[Math.floor(Math.random() * node.nextIds.length)];
    }

    runtime.trace.debug('going down random path', Node.NodeType.RANDOM);

    return nextId;
  },
});

export default randomHandler;
