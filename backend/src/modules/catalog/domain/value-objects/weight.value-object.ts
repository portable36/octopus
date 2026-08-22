export class Weight {
  private constructor(public readonly grams: number) {}

  public static create(grams: number): Weight {
    if (!Number.isFinite(grams) || grams < 0) {
      throw new Error('Weight must be a finite non-negative number of grams.');
    }
    return new Weight(grams);
  }
}
