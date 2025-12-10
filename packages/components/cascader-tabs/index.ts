import { withInstall, withNoopInstall } from '@element-plus/utils'
import CascaderTabs from './src/cascader-tabs.vue'
import CascaderPanelTab from './src/tab-panels/cascader-panel-tab.vue'

export const ElCascaderTabs = withInstall(CascaderTabs, {
  CascaderPanelTab,
})
export const ElCascaderPanelTab = withNoopInstall(CascaderPanelTab)
export default ElCascaderTabs

export * from './src/cascader-tabs'
export * from './src/types'

export type CascaderTabsInstance = InstanceType<typeof CascaderTabs> & unknown
export type CascaderPanelTabInstance = InstanceType<typeof CascaderPanelTab> &
  unknown
