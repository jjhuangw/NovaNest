export const POSES = ['front', 'side', 'back'] as const
export type Pose = (typeof POSES)[number]

export const POSE_LABELS: Record<Pose, string> = { front: '正面', side: '側面', back: '背面' }

export function isPose(value: unknown): value is Pose {
  return typeof value === 'string' && (POSES as readonly string[]).includes(value)
}
