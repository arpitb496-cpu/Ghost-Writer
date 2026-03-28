import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("WritingDNASoulboundModule", (m) => {
  const soulbound = m.contract("WritingDNASoulbound");
  return { soulbound };
});
