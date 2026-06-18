import { buildProps, definePropType } from '@element-plus/utils'

import type { ExtractPropTypes } from 'vue'

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
 * 权限类型枚举
 */
export enum PermissionType {
  /** 可见性控制（按钮显示/隐藏、菜单显示/隐藏） */
  VISIBILITY = 'visibility',
  /** 操作权限（新增、编辑、删除、导出等） */
  OPERATION = 'operation',
  /** 数据范围（全部数据、本部门、本人等） */
  DATA_SCOPE = 'data_scope',
  /** 字段级权限（表格列、表单字段的显示/只读） */
  FIELD = 'field',
}

/**
 * 约束类型枚举
 */
export enum ConstraintType {
  /** 无约束（简单开关） */
  NONE = 'none',
  /** 枚举选择（单选/多选） */
  ENUM = 'enum',
  /** 人员选择（预留） */
  USER_SELECT = 'user_select',
  /** 角色选择（预留） */
  ROLE_SELECT = 'role_select',
  /** 自定义（预留） */
  CUSTOM = 'custom',
}

/**
 * 枚举选项
 */
export interface OptionItem {
  value: string | number
  label: string
  description?: string
}

/**
 * 权限定义元数据
 */
export interface PermissionMetadata {
  /** 默认值 */
  defaultValue?: any
  /** 可选项（ENUM类型使用） */
  options?: OptionItem[]
  /** 是否多选（ENUM类型使用） */
  multiple?: boolean
  /** 说明文档 */
  description?: string
  /** ElSelect 选择器配置（ENUM/USER_SELECT类型使用） */
  selectProps?: Record<string, any>
}

/**
 * 权限定义（描述一个权限项的元信息）
 */
export interface PermissionDefinition {
  /** 权限唯一标识 */
  id: string
  /** 显示名称 */
  label: string
  /** 权限类型 */
  type?: PermissionType
  /** 约束类型 */
  constraintType?: ConstraintType
  /** 元数据 */
  metadata?: PermissionMetadata
  /** 额外配置 (用于存放后端需要的参数) */
  extraConfig?: Record<string, unknown>
  /** UI配置 (预留) */
  // uiConfig?: Record<string, unknown>
}

/**
 * 约束配置
 */
export interface ConstraintConfig {
  /** 约束类型 */
  type: ConstraintType
  /** ENUM类型的值（单选为基础值/对象，多选为数组） */
  enumValue?:
    | string
    | number
    | boolean
    | Record<string, any>
    | (number | string | boolean | Record<string, any>)[]
  /** USER_SELECT类型的用户ID列表（预留） */
  // userIds?: string[]
  /** ROLE_SELECT类型的角色ID列表（预留） */
  // roleIds?: string[]
  /** CUSTOM类型的表达式（预留） */
  // expression?: string
}

/**
 * 权限配置（描述一个权限项的具体配置值）
 */
export interface PermissionConfig {
  /** 是否继承 */
  inherit: InheritState
  /** 是否授予 */
  granted: boolean
  /** 约束配置（根据 constraintType 决定使用哪个字段） */
  constraint?: ConstraintConfig
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
  permissions?: PermissionDefinition[]
  /** 子节点 */
  children?: PermissionNode[]
}

/**
 * 权限表格组件 Props
 */
export const permissionTableProps = buildProps({
  /**
   * @description 权限数据
   */
  data: {
    type: definePropType<PermissionNode[]>(Array),
    default: () => [],
  },
  /**
   * @description 继承状态（权限ID -> 继承状态）
   */
  inheritState: {
    type: definePropType<Record<string, InheritState>>(Object),
    default: () => ({}),
  },
  /**
   * @description 个人授权状态（权限ID -> 是否授权）
   */
  grantedState: {
    type: definePropType<Record<string, boolean>>(Object),
    default: () => ({}),
  },
  /**
   * @description 约束配置状态（权限ID -> 约束配置）
   */
  constraintState: {
    type: definePropType<Record<string, ConstraintConfig>>(Object),
    default: () => ({}),
  },
  /**
   * @description 角色权限集合
   */
  rolePermissions: {
    type: definePropType<Set<string> | string[]>([Array, Set]),
    default: () => [],
  },
  /**
   * @description 是否默认展开所有一级菜单
   */
  defaultExpandAll: {
    type: Boolean,
    default: false,
  },
  /**
   * @description 是否显示继承状态（圆形 checkbox）
   */
  showInherit: {
    type: Boolean,
    default: true,
  },
  /**
   * @description 未配置的权限项是否默认继承角色权限（仅在 showInherit=true 时生效）
   * - true: 未配置的权限项默认继承（根据 rolePermissions 判断 GRANTED 或 DENIED）
   * - false: 未配置的权限项默认不继承（当前行为）
   */
  defaultInherit: {
    type: Boolean,
    default: false,
  },
  /**
   * @description 是否禁用整个组件
   */
  disabled: Boolean,
  /**
   * @description 是否只读
   */
  readonly: Boolean,
  /**
   * @description 权限配置布局模式
   */
  layout: {
    type: definePropType<'table' | 'split'>(String),
    default: 'table',
  },
  /**
   * @description 左右布局下左侧菜单树宽度
   */
  splitTreeWidth: {
    type: definePropType<string | number>([String, Number]),
    default: 220,
  },
  /**
   * @description 左右布局下权限类型标题映射，key 对应 extraConfig.authorizationType；未配置的类型不会显示
   */
  permissionTypeLabels: {
    type: definePropType<Partial<Record<number, string>>>(Object),
    default: () => ({
      1: '数据权限',
      2: '按钮权限',
      3: '导出权限',
      4: '审核权限',
      5: '字段权限',
    }),
  },
  /**
   * @description 表格列宽配置（从左到右：一级菜单、二级菜单、三级页面、权限）
   */
  columnWidths: {
    type: definePropType<(string | number)[]>(Array),
    default: () => ['200px', '200px', '200px', 'auto'],
  } /**
   * @description ElSelect 选择器配置
   */,
  selectProps: {
    type: definePropType<Record<string, any>>(Object),
    default: () => ({}),
  },
} as const)

export type PermissionTableProps = ExtractPropTypes<typeof permissionTableProps>

/**
 * 权限表格组件 Emits
 */
export const permissionTableEmits = {
  /** 权限变更事件 */
  'permission-change': (
    id: string,
    data: {
      inherit: InheritState
      granted: boolean
      constraint?: ConstraintConfig
    }
  ) => typeof data === 'object',
  /** 继承状态更新 */
  'update:inheritState': (state: Record<string, InheritState>) =>
    typeof state === 'object',
  /** 授权状态更新 */
  'update:grantedState': (state: Record<string, boolean>) =>
    typeof state === 'object',
  /** 约束配置更新 */
  'update:constraintState': (state: Record<string, ConstraintConfig>) =>
    typeof state === 'object',
}

export type PermissionTableEmits = typeof permissionTableEmits
