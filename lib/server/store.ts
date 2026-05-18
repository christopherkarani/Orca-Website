import type { OrcaTier } from "@/lib/billing/entitlements";

export type AccountRecord = {
  id: string;
  clerkUserId?: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerRecord = {
  id: string;
  accountId: string;
  stripeCustomerId: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionRecord = {
  id: string;
  accountId: string;
  customerId: string;
  stripeSubscriptionId: string;
  tier: OrcaTier;
  status: string;
  seatCount: number;
  currentPeriodEnd?: string;
  createdAt: string;
  updatedAt: string;
};

export type LicenseRecord = {
  id: string;
  accountId: string;
  customerId: string;
  subscriptionId?: string;
  sourceEventId?: string;
  tier: OrcaTier;
  status: "active" | "revoked";
  seatCount: number;
  features: string[];
  licenseKey: string;
  signature: string;
  issuedAt: string;
  renewsAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionRecord = {
  token: string;
  accountId: string;
  expiresAt: string;
  createdAt: string;
};

export type LoginTokenRecord = {
  tokenHash: string;
  accountId: string;
  expiresAt: string;
  consumedAt?: string;
  createdAt: string;
};

export type AccountApiKeyRecord = {
  id: string;
  accountId: string;
  name: string;
  keyPrefix: string;
  keyLast4: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
};

export type WebhookEventStatus = "processing" | "processed";

export type UpsertAccountInput = {
  id?: string;
  clerkUserId?: string;
  email: string;
};

export type UpsertSubscriptionInput = {
  id?: string;
  accountId: string;
  customerId: string;
  stripeSubscriptionId: string;
  tier: OrcaTier;
  status: string;
  seatCount: number;
  currentPeriodEnd?: string;
};

export type IssueLicenseOptions = {
  privateKeyPem: string;
  keyVersion: string;
  sourceEventId?: string;
  now?: Date;
};

export type OrcaStore = {
  upsertAccount(input: UpsertAccountInput): Promise<AccountRecord>;
  getAccountById(id: string): Promise<AccountRecord | null>;
  getAccountByEmail(email: string): Promise<AccountRecord | null>;
  getAccountByClerkUserId(clerkUserId: string): Promise<AccountRecord | null>;
  upsertCustomer(input: {
    accountId: string;
    stripeCustomerId: string;
    email: string;
  }): Promise<CustomerRecord>;
  getCustomerByStripeId(stripeCustomerId: string): Promise<CustomerRecord | null>;
  upsertSubscription(input: UpsertSubscriptionInput): Promise<SubscriptionRecord>;
  getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<SubscriptionRecord | null>;
  getCurrentSubscriptionForAccount(accountId: string): Promise<SubscriptionRecord | null>;
  getCurrentEntitledSubscriptionForAccount(
    accountId: string
  ): Promise<SubscriptionRecord | null>;
  issueLicenseForAccount(
    accountId: string,
    options: IssueLicenseOptions
  ): Promise<LicenseRecord>;
  revokePaidLicenseForAccount(
    accountId: string,
    options: IssueLicenseOptions
  ): Promise<LicenseRecord>;
  getCurrentLicenseForAccount(accountId: string): Promise<LicenseRecord | null>;
  claimWebhookEvent(eventId: string, type: string, created: number): Promise<boolean>;
  completeWebhookEvent(eventId: string): Promise<void>;
  releaseWebhookEvent(eventId: string): Promise<void>;
  createApiKey(input: {
    id: string;
    accountId: string;
    name: string;
    keyHash: string;
    keyPrefix: string;
    keyLast4: string;
    scopes: string[];
  }): Promise<AccountApiKeyRecord>;
  listApiKeys(accountId: string): Promise<AccountApiKeyRecord[]>;
  revokeApiKey(accountId: string, keyId: string): Promise<void>;
  getActiveApiKeyByHash(keyId: string, keyHash: string): Promise<AccountApiKeyRecord | null>;
};
