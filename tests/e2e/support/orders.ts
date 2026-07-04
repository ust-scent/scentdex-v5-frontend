import type { APIRequestContext } from "@playwright/test";
import { parseUnits, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { ORDER_TYPES, buildDomain, randomSalt, type Order } from "../../../lib/order";
import {
  PERMIT_SINGLE_TYPES,
  buildOrderPermit,
  buildPermit2Domain,
  serialisePermitSingle,
} from "../../../lib/permit2";

/**
 * Test-order factory. Produces REAL EIP-712 signatures (order + per-order
 * PermitSingle) with throwaway keys so POST /api/orders accepts them, then
 * posts them into the dev server's in-memory book.
 *
 * ⚠️ The keys below are PUBLIC test fixtures. Never send funds to them,
 * never reuse them outside tests.
 */
export const MAKER_KEY: Hex =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // hardhat #1
export const MAKER = privateKeyToAccount(MAKER_KEY);

export const SEPOLIA = 11155111;
/** Must match NEXT_PUBLIC_SDTTEST_* in playwright.config.ts. */
export const SDTTEST_DEX: Address =
  "0x5c70fFc6A08A418F10fbb0E7935eA5DbbF58aBC9";
export const SDT: Address = "0x3293462B4Ef0dbC20817562d295a368556689249";
export const WETH: Address = "0x1074D6FFb18130D7F3CC1E6471240FFc24abD047";
export const PAIR = "SDT-TEST/WETH-TEST";

export type PostedOrder = {
  orderHash: Hex;
  order: Order;
};

/**
 * Sign + post one order. Amounts are human strings at 18 decimals.
 * side "ask" = maker sells SDT for WETH; side "bid" = maker buys SDT
 * with WETH. feeSide/feeBps mirror PAIR_CONFIG["SDT-TEST/WETH-TEST"].
 */
export async function postSignedOrder(
  request: APIRequestContext,
  opts: {
    side: "ask" | "bid";
    /** SDT amount for asks; WETH amount for bids (maker-given size). */
    makerSize: string;
    /** counter amount the maker wants back. */
    takerSize: string;
  },
): Promise<PostedOrder> {
  const isAsk = opts.side === "ask";
  const order: Order = {
    maker: MAKER.address,
    makerToken: isAsk ? SDT : WETH,
    takerToken: isAsk ? WETH : SDT,
    makerAmount: parseUnits(opts.makerSize, 18),
    takerAmount: parseUnits(opts.takerSize, 18),
    expiry: BigInt(Math.floor(Date.now() / 1000) + 24 * 3600),
    nonce: BigInt(Math.floor(Date.now() / 1000)),
    salt: randomSalt(),
    feeSide: SDT, // SDT-TEST seller pays (ADR-0008)
    feeBps: 1000,
  };

  const signature = await MAKER.signTypedData({
    domain: buildDomain(SEPOLIA, SDTTEST_DEX),
    types: ORDER_TYPES,
    primaryType: "Order",
    message: order as unknown as Record<string, unknown>,
  } as Parameters<typeof MAKER.signTypedData>[0]);

  const permitSingle = buildOrderPermit({
    ownerNonce: 0,
    makerToken: order.makerToken,
    makerAmount: order.makerAmount,
    expiry: order.expiry,
    dex: SDTTEST_DEX,
  });
  const permitSignature = await MAKER.signTypedData({
    domain: buildPermit2Domain(SEPOLIA),
    types: PERMIT_SINGLE_TYPES,
    primaryType: "PermitSingle",
    message: permitSingle as unknown as Record<string, unknown>,
  } as Parameters<typeof MAKER.signTypedData>[0]);

  const res = await request.post("/api/orders", {
    data: {
      order: {
        maker: order.maker,
        makerToken: order.makerToken,
        takerToken: order.takerToken,
        makerAmount: order.makerAmount.toString(),
        takerAmount: order.takerAmount.toString(),
        expiry: order.expiry.toString(),
        nonce: order.nonce.toString(),
        salt: order.salt,
        feeSide: order.feeSide,
        feeBps: order.feeBps,
      },
      signature,
      pair: PAIR,
      chainId: SEPOLIA,
      permitSingle: serialisePermitSingle(permitSingle),
      permitSignature,
    },
  });
  if (res.status() !== 201) {
    throw new Error(
      `POST /api/orders failed: ${res.status()} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { order: { orderHash: Hex } };
  return { orderHash: body.order.orderHash, order };
}
