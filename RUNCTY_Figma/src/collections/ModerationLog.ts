import type { CollectionConfig } from 'payload'
import { staffOnly } from '@/access/runcty'
export const ModerationLog: CollectionConfig = {
  slug: 'moderation-log',
  admin: { useAsTitle: 'item', group: 'RUNCTY · Moderación' },
  access: { read: staffOnly, create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'item', type: 'text', required: true },
    { name: 'decision', type: 'text', required: true },
    { name: 'reason', type: 'text' },
    { name: 'moderator', type: 'text', required: true },
    { name: 'source', type: 'text', required: true },
  ],
}
