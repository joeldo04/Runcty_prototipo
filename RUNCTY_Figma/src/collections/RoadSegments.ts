import type { CollectionConfig } from 'payload'
import { systemOnly } from '@/access/runcty'
import { publicHooks } from '@/hooks/runcty'
import {
  geometrySchema,
  jsonValidator,
  restoreCoordinateTuples,
  roadSchema,
} from '@/lib/runcty-validation'
export const RoadSegments: CollectionConfig = {
  slug: 'road-segments',
  admin: { useAsTitle: 'name', group: 'RUNCTY · Ciudad' },
  access: { read: () => true, create: systemOnly, update: systemOnly, delete: systemOnly },
  hooks: publicHooks,
  fields: [
    { name: 'key', type: 'text', required: true, unique: true, index: true },
    { name: 'name', type: 'text', required: true },
    {
      name: 'points',
      type: 'json',
      required: true,
      hooks: { beforeValidate: [restoreCoordinateTuples] },
      validate: jsonValidator(geometrySchema),
    },
    {
      name: 'scores',
      type: 'json',
      required: true,
      validate: jsonValidator(roadSchema.shape.scores),
    },
    {
      name: 'factors',
      type: 'json',
      required: true,
      validate: jsonValidator(roadSchema.shape.factors),
    },
  ],
}
