interface RoleAwareUser {
  rol?: string;
}

interface BlockHelperOptions {
  fn(context: unknown): string;
  inverse(context: unknown): string;
}

export function isAdmin(
  this: unknown,
  user: RoleAwareUser | null | undefined,
  options: BlockHelperOptions,
): string {
  return user?.rol === 'admin' ? options.fn(this) : options.inverse(this);
}

export function isNotPremium(
  this: unknown,
  user: RoleAwareUser | null | undefined,
  options: BlockHelperOptions,
): string {
  return user?.rol !== 'premium' ? options.fn(this) : options.inverse(this);
}

export function isPremium(
  this: unknown,
  user: RoleAwareUser | null | undefined,
  options: BlockHelperOptions,
): string {
  return user?.rol === 'premium' ? options.fn(this) : options.inverse(this);
}

export function categoryName(
  categoryMap: Record<string, string> | null | undefined,
  categoryId: string | { toString(): string } | null | undefined,
): string {
  if (!categoryMap || categoryId == null) {
    return 'Categoría desconocida';
  }

  return categoryMap[categoryId.toString()] ?? 'Categoría desconocida';
}
