import { describe, expect, it, vi } from "vitest";
import {
  createRegisterPublicInterestService,
  REGISTER_INTEREST_DUPLICATE_MESSAGE,
  REGISTER_INTEREST_SUCCESS_MESSAGE,
  registerPublicInterestBodySchema,
  type RegisterPublicInterestEmailPort,
} from "../src/modules/register-public-interest";
import type { RegisterPublicInterest } from "../src/modules/register-public-interest";

function createHarness() {
  const store = new Map<string, RegisterPublicInterest>();
  const repository = {
    findByEmail: vi.fn(async (email: string) => store.get(email) ?? null),
    create: vi.fn(
      async (input: {
        name: string;
        email: string;
        companyName: string;
        product: string;
      }) => {
        const record: RegisterPublicInterest = {
          id: `id-${store.size + 1}`,
          ...input,
          createdAt: new Date("2026-01-01T00:00:00Z"),
          updatedAt: new Date("2026-01-01T00:00:00Z"),
        };
        store.set(input.email, record);
        return record;
      }
    ),
  };
  const sendTransactional = vi.fn(async () => ({
    mode: "sent" as const,
    messageId: "m-1",
  }));
  const email = { sendTransactional } as unknown as RegisterPublicInterestEmailPort;
  const service = createRegisterPublicInterestService({ repository, email });
  return { service, repository, sendTransactional };
}

const input = {
  name: "Jane",
  email: "Jane@Example.com",
  companyName: "Acme",
  product: "other-product",
};

describe("RegisterPublicInterestService", () => {
  it("persists a registration with a lowercase email and no email for other products", async () => {
    const { service, repository, sendTransactional } = createHarness();

    const result = await service.register(null, input);

    expect(result.message).toBe(REGISTER_INTEREST_SUCCESS_MESSAGE);
    expect(result.registerPublicInterest).toMatchObject({
      name: "Jane",
      email: "jane@example.com",
      companyName: "Acme",
      product: "other-product",
    });
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(sendTransactional).not.toHaveBeenCalled();
  });

  it("rejects a duplicate email", async () => {
    const { service, repository } = createHarness();
    await service.register(null, input);

    await expect(
      service.register(null, { ...input, email: "jane@example.com" })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: REGISTER_INTEREST_DUPLICATE_MESSAGE,
    });
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it("maps a duplicate-key race to the duplicate error", async () => {
    const { service, repository } = createHarness();
    repository.create.mockRejectedValueOnce(
      Object.assign(new Error("E11000"), { code: 11000 })
    );

    await expect(service.register(null, input)).rejects.toMatchObject({
      message: REGISTER_INTEREST_DUPLICATE_MESSAGE,
    });
  });

  it("sends a confirmation email for carbon-calculator", async () => {
    const { service, sendTransactional } = createHarness();

    await service.register(undefined, {
      ...input,
      product: "carbon-calculator",
    });

    expect(sendTransactional).toHaveBeenCalledTimes(1);
    expect(sendTransactional).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "jane@example.com",
        subject: "Carbo-Calc Interest Registered Successfully.",
        category: "transactional",
      })
    );
  });

  it("still succeeds when the carbon-calculator email fails", async () => {
    const { service, sendTransactional } = createHarness();
    sendTransactional.mockRejectedValueOnce(new Error("smtp down"));

    await expect(
      service.register(null, { ...input, product: "carbon-calculator" })
    ).resolves.toMatchObject({ message: REGISTER_INTEREST_SUCCESS_MESSAGE });
  });
});

describe("registerPublicInterestBodySchema", () => {
  it("validates limits and lowercases email", () => {
    const ok = registerPublicInterestBodySchema.safeParse(input);
    expect(ok.success && ok.data.email).toBe("jane@example.com");

    expect(
      registerPublicInterestBodySchema.safeParse({
        ...input,
        name: "x".repeat(21),
      }).success
    ).toBe(false);
    expect(
      registerPublicInterestBodySchema.safeParse({
        ...input,
        companyName: "x".repeat(31),
      }).success
    ).toBe(false);
    expect(
      registerPublicInterestBodySchema.safeParse({ ...input, product: "" })
        .success
    ).toBe(false);
  });
});
