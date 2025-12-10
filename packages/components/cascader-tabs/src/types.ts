import type {
  CascaderNode,
  CascaderValue,
} from '@element-plus/components/cascader-panel'
import type { Ref } from 'vue'

/**
 * @description Tab 配置项
 */
export interface TabConfig {
  /**
   * @description Tab 的唯一标识
   */
  key: string
  /**
   * @description Tab 标签文本
   */
  label: string
  /**
   * @description 使用的组件名称，默认为 'cascader-panel-tab'
   */
  component?: string
  /**
   * @description 传递给组件的 props
   */
  props?: Record<string, any>
  /**
   * @description 是否禁用该 Tab
   */
  disabled?: boolean
  /**
   * @description 是否懒加载该 Tab
   */
  lazy?: boolean
  /**
   * @description 是否可关闭该 Tab
   */
  closable?: boolean
  /**
   * @description Tab 面板的自定义属性
   */
  panelProps?: Record<string, any>
}

/**
 * @description 搜索处理器函数类型
 */
export type SearchHandler = (keyword: string) => void | Promise<void>

/**
 * @description 从任意 Tab 面板返回的选择结果
 */
export interface SelectResult {
  /**
   * @description 选中的值
   */
  value: CascaderValue
  /**
   * @description 选中的节点
   */
  nodes?: CascaderNode[]
  /**
   * @description 来源 Tab 的 key
   */
  tabKey?: string
  /**
   * @description 显示标签（当 nodes 不可用时使用，如自定义 tab）
   * 可以是单个字符串或字符串数组（用于 multiple 模式）
   */
  labels?: string | string[]
  /**
   * @description 静默更新，不触发 change 事件（用于初始化）
   */
  silent?: boolean
}

/**
 * @description 提供给子 Tab 面板的上下文
 */
export interface TabPanelContext {
  /**
   * @description 当前激活的 Tab key
   */
  activeTab: Readonly<Ref<string>>
  /**
   * @description 当前搜索关键字
   */
  keyword: Readonly<Ref<string>>
  /**
   * @description 当前选中的值
   */
  selectedValue: Readonly<Ref<CascaderValue | undefined>>
  /**
   * @description 选择值时的回调函数
   */
  onSelect: (result: SelectResult) => void
  /**
   * @description 为当前 Tab 注册搜索处理器
   */
  registerSearchHandler: (tabKey: string, handler: SearchHandler) => void
  /**
   * @description 注销当前 Tab 的搜索处理器
   */
  unregisterSearchHandler: (tabKey: string) => void
}

/**
 * @description 选中值的展示策略
 */
export type ShowCheckedStrategy = 'parent' | 'child' | 'all'

/**
 * @description Tab 名称类型
 */
export type TabName = string | number
