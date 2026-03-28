import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("StyleLeaderboardModule", (m) => {
  const leaderboard = m.contract("StyleLeaderboard");
  return { leaderboard };
});
