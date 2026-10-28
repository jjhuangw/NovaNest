export const POSES = ['front', 'side', 'back'] as const
export type Pose = (typeof POSES)[number]

export function isPose(value: unknown): value is Pose {
  return typeof value === 'string' && (POSES as readonly string[]).includes(value)
}
