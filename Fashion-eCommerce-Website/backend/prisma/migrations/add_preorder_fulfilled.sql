-- Pre-order fulfillment: mark order lines when product is back in stock
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "preOrderFulfilledAt" TIMESTAMP(3);
