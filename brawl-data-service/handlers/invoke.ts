import type { Handler } from 'aws-lambda';
import {
  fetchAndFormatBattles,
  fetchAndFormatPlayer,
} from '../services/brawlClient.ts';
import type { FormattedBattle } from '../types/battle.ts';
import type { FormattedPlayerInfo } from '../types/player.ts';

// AWS Lambda entry point for the read path, invoked directly by the backend
// (running on EC2) via the AWS SDK. Configure the Lambda handler as the
// `handler` export of this file (e.g. `handlers/invoke.handler`).
//
// Returns the same shapes the Express routes do, so the backend's later
// HTTP→Invoke switch is a drop-in:
//   action 'player'  -> FormattedPlayerInfo        (mirrors GET /player/:tag/)
//   action 'battles' -> { battles: FormattedBattle[] } (mirrors GET /player/:tag/battles)
//
// Deploy: bundle TS→JS or ship a container image like the existing Dockerfile.

export interface InvokeEvent {
  action: 'player' | 'battles';
  playerTag: string;
}

type InvokeResult = FormattedPlayerInfo | { battles: FormattedBattle[] };

export const handler: Handler<InvokeEvent, InvokeResult> = async (event) => {
  const { action, playerTag } = event;

  if (typeof playerTag !== 'string' || !playerTag) {
    throw new Error('invoke handler: playerTag is required');
  }

  switch (action) {
    case 'player':
      return fetchAndFormatPlayer(playerTag);
    case 'battles': {
      const { battles } = await fetchAndFormatBattles(playerTag);
      return { battles };
    }
    default:
      throw new Error(`invoke handler: unknown action "${action}"`);
  }
};
