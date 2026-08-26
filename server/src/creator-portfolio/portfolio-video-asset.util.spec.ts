import { PortfolioVideoAssetState } from '@prisma/client';
import {
  PLAYABLE_ASSET_STATES,
  playableAssetWhere,
} from './portfolio-video-asset.util';

describe('playable portfolio asset states', () => {
  it('admits the two states whose bytes can be served', () => {
    expect(PLAYABLE_ASSET_STATES).toEqual([
      PortfolioVideoAssetState.READY,
      PortfolioVideoAssetState.LINK_ONLY,
    ]);
  });

  it('excludes a mirror that is still running or gave up', () => {
    expect(PLAYABLE_ASSET_STATES).not.toContain(
      PortfolioVideoAssetState.PROCESSING,
    );
    expect(PLAYABLE_ASSET_STATES).not.toContain(
      PortfolioVideoAssetState.FAILED,
    );
  });

  it('covers every state in the enum, so a new one must be triaged', () => {
    const all = Object.values(PortfolioVideoAssetState);
    const excluded = all.filter((s) => !PLAYABLE_ASSET_STATES.includes(s));
    expect([...PLAYABLE_ASSET_STATES, ...excluded].sort()).toEqual(
      [...all].sort(),
    );
  });

  it('builds a spreadable where fragment', () => {
    expect(playableAssetWhere()).toEqual({
      assetState: { in: PLAYABLE_ASSET_STATES },
    });
  });
});
