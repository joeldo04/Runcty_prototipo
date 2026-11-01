import type { Access, FieldAccess, PayloadRequest } from 'payload'

export function isCMS(user: PayloadRequest['user']) {
  return user?.collection === 'admins'
}
export function isRunner(user: PayloadRequest['user']) {
  return user?.collection === 'users' && user.active !== false
}
export function isStaff(user: PayloadRequest['user']) {
  return isCMS(user) || (isRunner(user) && (user?.role === 'club' || user?.role === 'sistema'))
}
export function isSystem(user: PayloadRequest['user']) {
  return isCMS(user) || (isRunner(user) && user?.role === 'sistema')
}
export const staffOnly: Access = ({ req }) => isStaff(req.user)
export const systemOnly: Access = ({ req }) => isSystem(req.user)
export const runnerOnly: Access = ({ req }) => isRunner(req.user)
export const owned: Access = ({ req }) =>
  isStaff(req.user) || (isRunner(req.user) ? { owner: { equals: req.user!.id } } : false)
export const privateOwned: Access = ({ req }) =>
  isRunner(req.user) ? { owner: { equals: req.user!.id } } : false
export const staffField: FieldAccess = ({ req }) => isStaff(req.user)
export const systemField: FieldAccess = ({ req }) => isSystem(req.user)
export const ownUser: Access = ({ req }) =>
  isSystem(req.user) || (isRunner(req.user) ? { id: { equals: req.user!.id } } : false)
