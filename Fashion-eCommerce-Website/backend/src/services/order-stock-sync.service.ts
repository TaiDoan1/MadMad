import { syncMissingOrderOutboundDeductions } from "./stock-outbound.service";

/** @deprecated Use syncMissingOrderOutboundDeductions from stock-outbound.service */
export async function syncMissingOrderStockDeductions() {
  return syncMissingOrderOutboundDeductions();
}
