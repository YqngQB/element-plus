import { withInstall } from '@element-plus/utils'
import PermissionList from './src/permission-list.vue'

export const ElPermissionList = withInstall(PermissionList)
export default ElPermissionList

export * from './src/types'

export type PermissionListInstance = InstanceType<typeof PermissionList>
