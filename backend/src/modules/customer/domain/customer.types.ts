export type CustomerAddressRecord = {
  readonly id: string;
  readonly userId: string;
  readonly label: string;
  readonly recipientName: string;
  readonly phone: string | null;
  readonly line1: string;
  readonly line2: string | null;
  readonly city: string;
  readonly region: string | null;
  readonly postalCode: string | null;
  readonly countryCode: string;
  readonly isDefault: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CustomerProfileRecord = {
  readonly userId: string;
  readonly displayName: string;
  readonly phone: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};
