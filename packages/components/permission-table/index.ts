import { withInstall } from '@element-plus/utils'
import PermissionTable from './src/permission-table.vue'

import type { SFCWithInstall } from '@element-plus/utils'

export const ElPermissionTable: SFCWithInstall<typeof PermissionTable> =
  withInstall(PermissionTable)
export default ElPermissionTable

export * from './src/types'
export * from './src/adapters'
export * from './src/composables'
export {
  PermissionCheckbox,
  ConstraintConfig as ElConstraintConfig,
} from './src/components'
