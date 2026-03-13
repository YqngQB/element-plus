import type { ExtractPropTypes, PropType } from 'vue'
import type {
  ConstraintConfig,
  InheritState,
  PermissionDefinition,
} from '@element-plus/components/permission-table'

/**
 * 弹窗权限项
 * 布局与 PermissionTable 一致，但只有一级结构（弹窗名称 + 子权限）
 */
export interface DialogPermissionItem {
  /** 唯一标识 */
  id: string
  /** 弹窗名称 */
  label: string
  /** 该弹窗下的子权限列表（可选） */
  permissions?: PermissionDefinition[]
}

/**
 * 权限列表组件 Props
 */
export const permissionListProps = {
  /** 弹窗权限数据 */
  data: {
    type: Array as PropType<DialogPermissionItem[]>,
    default: () => [],
  },
  /** 继承状态（权限ID -> 继承状态） */
  inheritState: {
    type: Object as PropType<Record<string, InheritState>>,
    default: () => ({}),
  },
  /** 个人授权状态（权限ID -> 是否授权） */
  grantedState: {
    type: Object as PropType<Record<string, boolean>>,
    default: () => ({}),
  },
  /** 约束配置状态 */
  constraintState: {
    type: Object as PropType<Record<string, ConstraintConfig>>,
    default: () => ({}),
  },
  /** 角色拥有的权限ID集合，用于计算继承状态 */
  rolePermissions: {
    type: [Set, Array] as PropType<Set<string> | string[]>,
    default: undefined,
  },
  /** 是否显示继承状态（圆形图标） */
  showInherit: {
    type: Boolean,
    default: true,
  },
  /**
   * 未配置的权限项是否默认继承角色权限（仅在 showInherit=true 时生效）
   * - true: 未配置的权限项默认继承（根据 rolePermissions 判断 GRANTED 或 DENIED）
   * - false: 未配置的权限项默认不继承（当前行为）
   */
  defaultInherit: {
    type: Boolean,
    default: false,
  },
  /** 是否禁用 */
  disabled: {
    type: Boolean,
    default: false,
  },
  /** 是否只读 */
  readonly: {
    type: Boolean,
    default: false,
  },
  /** select 组件的统一 props */
  selectProps: {
    type: Object as PropType<Record<string, any>>,
    default: () => ({}),
  },
  /** 列表高度（虚拟滚动必需） */
  height: {
    type: [Number, String] as PropType<number | string>,
    default: 400,
  },
  /** 行高 */
  itemHeight: {
    type: Number,
    default: 48,
  },
  /** 缓冲区数量（前后各渲染多少额外行） */
  buffer: {
    type: Number,
    default: 5,
  },
  /**
   * 额外搜索文本提取函数，用于将插槽列的数据字段纳入搜索范围
   * 返回该行额外的可搜索文本；配合 splitHighlight（通过 ref 调用）可在插槽内高亮
   * @example :search-extractor="(item) => item.description ?? ''"
   */
  searchExtractor: {
    type: Function as PropType<(item: DialogPermissionItem) => string>,
    default: undefined,
  },
  /**
   * 额外列配置，仅在提供 #extra-header / #extra-cell slot 时生效
   * - width: 列宽，Number 为 px，String 可传 CSS 值（如 '20%'），默认 200
   * - order: 显示位置，'before-permissions' 在权限列左侧，'after-permissions' 在右侧（默认）
   */
  extraColumn: {
    type: Object as PropType<{
      width?: number | string
      order?: 'before-permissions' | 'after-permissions'
    }>,
    default: () => ({}),
  },
}

export type PermissionListProps = ExtractPropTypes<typeof permissionListProps>

// 重新导出相关类型
export type { ConstraintConfig, InheritState, PermissionDefinition }
