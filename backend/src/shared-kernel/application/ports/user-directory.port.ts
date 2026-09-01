export const USER_DIRECTORY = Symbol('USER_DIRECTORY');

export interface UserDirectory {
  existsById(userId: string): Promise<boolean>;
}
