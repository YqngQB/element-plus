import { placements } from '@popperjs/core'
import {
  buildProps,
  definePropType,
  iconPropType,
  isBoolean,
} from '@element-plus/utils'
import { useEmptyValuesProps, useSizeProp } from '@element-plus/hooks'
import { useTooltipContentProps } from '@element-plus/components/tooltip'
import { tagProps } from '@element-plus/components/tag'
import { CHANGE_EVENT, UPDATE_MODEL_EVENT } from '@element-plus/constants'
import { CircleClose } from '@element-plus/icons-vue'

import type {
  CascaderNode,
  CascaderOption,
  CascaderProps,
  CascaderValue,
} from '@element-plus/components/cascader-panel'
import type { Placement, PopperEffect } from '@element-plus/components/popper'
import type { TabConfig, TabName } from './types'

/**
 * @description CascaderTabs 组件属性
 */
export const cascaderTabsProps = buildProps({
  /**
   * @description 绑定值
   */
  modelValue: [Number, String, Array] as any,
  /**
   * @description 选项数据
   */
  options: {
    type: definePropType<CascaderOption[]>(Array),
    default: () => [],
  },
  /**
   * @description 级联面板的配置选项
   */
  props: {
    type: definePropType<CascaderProps>(Object),
    default: () => ({}),
  },
  /**
   * @description Tabs 配置
   */
  tabs: {
    type: definePropType<TabConfig[]>(Array),
    default: () => [],
  },
  /**
   * @description 默认激活的 Tab key
   */
  defaultActiveTab: String,
  /**
   * @description 输入框尺寸
   */
  size: useSizeProp,
  /**
   * @description 输入框占位文本
   */
  placeholder: String,
  /**
   * @description 是否禁用
   */
  disabled: Boolean,
  /**
   * @description 是否可清空选中值
   */
  clearable: Boolean,
  /**
   * @description 自定义清空图标组件
   */
  clearIcon: {
    type: iconPropType,
    default: CircleClose,
  },
  /**
   * @description 是否可搜索选项
   */
  filterable: Boolean,
  /**
   * @description 自定义搜索逻辑,第一个参数是 `node`,第二个是 `keyword`,需返回布尔值表示是否匹配
   */
  filterMethod: {
    type: definePropType<(node: CascaderNode, keyword: string) => boolean>(
      Function
    ),
    default: (node: CascaderNode, keyword: string) =>
      node.text.includes(keyword),
  },
  /**
   * @description 选项标签分隔符
   */
  separator: {
    type: String,
    default: ' / ',
  },
  /**
   * @description 是否在输入框中显示选中值的完整路径
   */
  showAllLevels: {
    type: Boolean,
    default: true,
  },
  /**
   * @description 是否在多选模式下折叠标签
   */
  collapseTags: Boolean,
  /**
   * @description 折叠标签时显示的最大标签数量,需配合 collapse-tags 使用
   */
  maxCollapseTags: {
    type: Number,
    default: 1,
  },
  /**
   * @description 鼠标悬停于折叠标签时是否显示所有选中的标签,需配合 collapse-tags 使用
   */
  collapseTagsTooltip: Boolean,
  /**
   * @description 折叠标签提示的最大高度(像素),需配合 collapse-tags-tooltip 使用
   */
  maxCollapseTagsTooltipHeight: {
    type: [String, Number],
  },
  /**
   * @description 输入过滤关键字时的防抖延迟(毫秒)
   */
  debounce: {
    type: Number,
    default: 300,
  },
  /**
   * @description 过滤前的钩子函数,参数为过滤值。返回 `false` 或返回被拒绝的 `Promise` 则中止过滤
   */
  beforeFilter: {
    type: definePropType<(value: string) => boolean | Promise<any>>(Function),
    default: () => true,
  },
  /**
   * @description 下拉框的弹出位置
   */
  placement: {
    type: definePropType<Placement>(String),
    values: placements,
    default: 'bottom-start',
  },
  /**
   * @description 下拉框的备用弹出位置列表
   */
  fallbackPlacements: {
    type: definePropType<Placement[]>(Array),
    default: ['bottom-start', 'bottom', 'top-start', 'top', 'right', 'left'],
  },
  /**
   * @description 下拉框的自定义类名
   */
  popperClass: useTooltipContentProps.popperClass,
  /**
   * @description 下拉框的自定义样式
   */
  popperStyle: useTooltipContentProps.popperStyle,
  /**
   * @description 是否将弹出框插入到 body 元素
   */
  teleported: useTooltipContentProps.teleported,
  /**
   * @description Tooltip 主题,内置主题: `dark` / `light`
   */
  effect: {
    type: definePropType<PopperEffect>(String),
    default: 'light',
  },
  /**
   * @description 标签类型
   */
  tagType: { ...tagProps.type, default: 'info' },
  /**
   * @description 标签效果
   */
  tagEffect: { ...tagProps.effect, default: 'light' },
  /**
   * @description 是否触发表单验证
   */
  validateEvent: {
    type: Boolean,
    default: true,
  },
  /**
   * @description 当下拉框未激活且 `persistent` 为 `false` 时,下拉框将被销毁
   */
  persistent: {
    type: Boolean,
    default: true,
  },
  /**
   * @description 选中值的展示策略。`parent`:显示父级;`child`:显示子级
   */
  showCheckedStrategy: {
    type: String,
    values: ['parent', 'child'],
    default: 'child',
  },
  /**
   * @description 是否在点击节点时选中或取消选中
   */
  checkOnClickNode: Boolean,
  /**
   * @description 是否显示单选框或复选框前缀
   */
  showPrefix: {
    type: Boolean,
    default: true,
  },
  /**
   * @description 切换 Tab 时是否清空搜索关键字
   */
  clearKeywordOnTabChange: {
    type: Boolean,
    default: false,
  },
  /**
   * @description 切换 Tab 时是否关闭弹出层
   */
  closeOnTabChange: {
    type: Boolean,
    default: false,
  },
  ...useEmptyValuesProps,
} as const)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const emitChangeFn = (value: CascaderValue | null | undefined) => true

/**
 * @description CascaderTabs 组件事件
 */
export const cascaderTabsEmits = {
  [UPDATE_MODEL_EVENT]: emitChangeFn,
  [CHANGE_EVENT]: emitChangeFn,
  /**
   * @description 当激活的 Tab 改变时触发
   */
  tabChange: (name: TabName) =>
    typeof name === 'string' || typeof name === 'number',
  /**
   * @description 当输入框获得焦点时触发
   */
  focus: (evt: FocusEvent) => evt instanceof FocusEvent,
  /**
   * @description 当输入框失去焦点时触发
   */
  blur: (evt: FocusEvent) => evt instanceof FocusEvent,
  /**
   * @description 当点击清空按钮时触发
   */
  clear: () => true,
  /**
   * @description 当下拉框的可见性改变时触发
   */
  visibleChange: (val: boolean) => isBoolean(val),
  /**
   * @description 当展开选项改变时触发
   */
  expandChange: (val: CascaderValue) => !!val,
  /**
   * @description 在多选模式下移除标签时触发
   */
  removeTag: (val: CascaderNode['valueByOption']) => !!val,
}

export type CascaderTabsProps = typeof cascaderTabsProps
export type CascaderTabsEmits = typeof cascaderTabsEmits
