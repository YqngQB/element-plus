import type { ExtractPropTypes, PropType } from 'vue'

/**
 * 继承状态枚举
 * NONE - 不继承（空圆圈）
 * GRANTED - 继承有权限（绿色对勾圆圈）
 * DENIED - 继承无权限（红色叉圆圈）
 */
export enum InheritState {
  NONE = 0,
  GRANTED = 1,
  DENIED = 2,
}

/**
 * 权限项定义
 */
export interface Permission {
  id: string
  label: string
}

/**
 * 权限节点定义
 * 支持最多4层嵌套结构
 */
export interface PermissionNode {
  /** 唯一标识 */
  id: string
  /** 显示标签 */
  label: string
  /** 功能权限列表 */
  permissions?: Permission[]
  /** 子节点 */
  children?: PermissionNode[]
}

/**
 * 权限表格组件 Props
 */
export const permissionTableProps = {
  /** 权限数据 */
  data: {
    type: Array as PropType<PermissionNode[]>,
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
  /** 是否默认展开所有一级菜单 */
  defaultExpandAll: {
    type: Boolean,
    default: true,
  },
  /** 是否显示继承状态（圆形 checkbox） */
  showInherit: {
    type: Boolean,
    default: true,
  },
  /** 是否禁用整个组件 */
  disabled: {
    type: Boolean,
    default: false,
  },
  /** 是否只读 */
  readonly: {
    type: Boolean,
    default: false,
  },
}

export type PermissionTableProps = ExtractPropTypes<typeof permissionTableProps>

/**
 * 权限表格组件 Emits
 */
export const permissionTableEmits = {
  /** 权限变更事件 */
  'permission-change': (
    id: string,
    data: { inherit: InheritState; granted: boolean }
  ) => typeof id === 'string' && typeof data === 'object',
  /** 继承状态更新 */
  'update:inheritState': (state: Record<string, InheritState>) =>
    typeof state === 'object',
  /** 授权状态更新 */
  'update:grantedState': (state: Record<string, boolean>) =>
    typeof state === 'object',
}

export type PermissionTableEmits = typeof permissionTableEmits
