/** Plaintext user fields — hashed by MetaCapiService before transmission. */
export type MetaCapiUserDataInput = {
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly clientIpAddress?: string | null;
  readonly clientUserAgent?: string | null;
};

export type MetaCapiCustomData = {
  readonly value: number;
  readonly currency: string;
  readonly orderId: string;
};

export type MetaCapiSendInput = {
  readonly eventName: string;
  readonly eventTime: number;
  readonly eventId: string;
  readonly userData: MetaCapiUserDataInput;
  readonly customData: MetaCapiCustomData;
};
