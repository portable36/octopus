export const IP_BLOCK_PORT = Symbol('IP_BLOCK_PORT');

export type BlockedIpRecord = {
  readonly id: string;
  readonly ipCidr: string;
  readonly reason: string | null;
  readonly expiresAt: Date | null;
  readonly isActive: boolean;
  readonly createdBy: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateBlockedIpInput = {
  readonly ipCidr: string;
  readonly reason?: string | null;
  readonly expiresAt?: Date | null;
  readonly createdBy: string | null;
};

export type UpdateBlockedIpInput = {
  readonly id: string;
  readonly reason?: string | null;
  readonly expiresAt?: Date | null;
  readonly isActive?: boolean;
  readonly actorUserId?: string | null;
};

export interface IpBlockPort {
  isBlocked(clientIp: string | undefined | null): Promise<boolean>;
  list(): Promise<readonly BlockedIpRecord[]>;
  create(input: CreateBlockedIpInput): Promise<BlockedIpRecord>;
  update(input: UpdateBlockedIpInput): Promise<BlockedIpRecord>;
  delete(id: string, actorUserId?: string | null): Promise<void>;
  refreshCache(): Promise<void>;
}
