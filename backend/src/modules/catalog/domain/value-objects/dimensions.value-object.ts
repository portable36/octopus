export interface DimensionsInput {
  readonly lengthMillimeters: number;
  readonly widthMillimeters: number;
  readonly heightMillimeters: number;
}

export class Dimensions {
  public readonly lengthMillimeters: number;
  public readonly widthMillimeters: number;
  public readonly heightMillimeters: number;

  private constructor(input: DimensionsInput) {
    this.lengthMillimeters = input.lengthMillimeters;
    this.widthMillimeters = input.widthMillimeters;
    this.heightMillimeters = input.heightMillimeters;
  }

  public static create(input: DimensionsInput): Dimensions {
    const values = [input.lengthMillimeters, input.widthMillimeters, input.heightMillimeters];
    if (values.some((value) => !Number.isFinite(value) || value < 0)) {
      throw new Error('Dimensions must be finite non-negative numbers.');
    }
    return new Dimensions(input);
  }
}
