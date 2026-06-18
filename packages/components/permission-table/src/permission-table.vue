<template>
  <div class="el-permission-table">
    <permission-split-panel
      v-if="layout === 'split'"
      :data="props.data"
      :cascade="cascade"
      :show-inherit="showInherit"
      :disabled="disabled"
      :readonly="readonly"
      :select-props="props.selectProps"
      :split-tree-width="splitTreeWidth"
      :permission-type-labels="permissionTypeLabels"
      :default-expand-all="defaultExpandAll"
      :get-role-inherit-state="getRoleInheritState"
      :get-permission-granted-state="getPermissionGrantedState"
      :get-constraint-value="getConstraintValue"
      :handle-inherit-change="handleInheritChange"
      :handle-granted-change="handleGrantedChange"
      :handle-constraint-change="handleConstraintChange"
    >
      <template #inherit-granted-icon>
        <slot name="inherit-granted-icon" />
      </template>
      <template #inherit-denied-icon>
        <slot name="inherit-denied-icon" />
      </template>
    </permission-split-panel>
    <table v-else class="el-permission-table__table">
      <colgroup>
        <col :style="{ width: normalizedColumnWidths[0] }" />
        <col :style="{ width: normalizedColumnWidths[1] }" />
        <col :style="{ width: normalizedColumnWidths[2] }" />
        <col :style="{ width: normalizedColumnWidths[3] }" />
      </colgroup>
      <tbody>
        <template v-for="level1 in processedData" :key="level1.id">
          <!-- 一级菜单：可折叠的全宽行 -->
          <tr class="el-permission-table__row el-permission-table__row--level1">
            <td
              colspan="4"
              class="el-permission-table__cell el-permission-table__cell--level1"
            >
              <div
                class="el-permission-table__level1-content"
                @click="toggleLevel1(level1.id)"
              >
                <el-icon
                  class="el-permission-table__expand-icon"
                  :class="{ 'is-expanded': isLevel1Expanded(level1.id) }"
                >
                  <ArrowRight />
                </el-icon>
                <permission-checkbox
                  :inherit="level1.state.inherit"
                  :granted="level1.state.granted"
                  :indeterminate="level1.state.indeterminate"
                  :show-inherit="showInherit"
                  :disabled="disabled"
                  :readonly="readonly"
                  :role-inherit-state="getRoleInheritState(level1.id)"
                  @inherit-change="handleInheritChange(level1.id, $event)"
                  @granted-change="handleGrantedChange(level1.id, $event)"
                >
                  <template #inherit-granted-icon>
                    <slot name="inherit-granted-icon" />
                  </template>
                  <template #inherit-denied-icon>
                    <slot name="inherit-denied-icon" />
                  </template>
                </permission-checkbox>
                <span class="el-permission-table__label">
                  {{ level1.label }}
                </span>
              </div>
            </td>
          </tr>

          <!-- 展开的子内容（懒加载：首次展开才渲染，收起后用 v-show 隐藏不销毁） -->
          <template v-if="isLevel1Rendered(level1.id)">
            <tr
              v-for="(row, index) in level1.flatRows"
              v-show="isLevel1Expanded(level1.id)"
              :key="`${level1.id}-${index}`"
              class="el-permission-table__row"
            >
              <!-- 二级菜单 -->
              <td
                v-if="row.showLevel2"
                :rowspan="row.level2Rowspan"
                class="el-permission-table__cell el-permission-table__cell--level2"
              >
                <div class="el-permission-table__cell-content">
                  <permission-checkbox
                    v-if="row.level2Id && row.level2State"
                    :inherit="row.level2State.inherit"
                    :granted="row.level2State.granted"
                    :indeterminate="row.level2State.indeterminate"
                    :show-inherit="showInherit"
                    :disabled="disabled"
                    :readonly="readonly"
                    :role-inherit-state="getRoleInheritState(row.level2Id)"
                    @inherit-change="handleInheritChange(row.level2Id, $event)"
                    @granted-change="handleGrantedChange(row.level2Id, $event)"
                  >
                    <template #inherit-granted-icon>
                      <slot name="inherit-granted-icon" />
                    </template>
                    <template #inherit-denied-icon>
                      <slot name="inherit-denied-icon" />
                    </template>
                  </permission-checkbox>
                  <span class="el-permission-table__label">
                    {{ row.level2Label }}
                  </span>
                </div>
              </td>

              <!-- 三级页面 -->
              <td
                v-if="row.showLevel3"
                :rowspan="row.level3Rowspan"
                class="el-permission-table__cell el-permission-table__cell--level3"
              >
                <div class="el-permission-table__cell-content">
                  <permission-checkbox
                    v-if="row.level3Id && row.level3State"
                    :inherit="row.level3State.inherit"
                    :granted="row.level3State.granted"
                    :indeterminate="row.level3State.indeterminate"
                    :show-inherit="showInherit"
                    :disabled="disabled"
                    :readonly="readonly"
                    :role-inherit-state="getRoleInheritState(row.level3Id)"
                    @inherit-change="handleInheritChange(row.level3Id, $event)"
                    @granted-change="handleGrantedChange(row.level3Id, $event)"
                  >
                    <template #inherit-granted-icon>
                      <slot name="inherit-granted-icon" />
                    </template>
                    <template #inherit-denied-icon>
                      <slot name="inherit-denied-icon" />
                    </template>
                  </permission-checkbox>
                  <span class="el-permission-table__label">
                    {{ row.level3Label }}
                  </span>
                </div>
              </td>

              <!-- 四级Tab（只在有level4Id时显示） -->
              <td
                v-if="row.showLevel4 && row.level4Id"
                :rowspan="row.level4Rowspan"
                class="el-permission-table__cell el-permission-table__cell--level4"
              >
                <div class="el-permission-table__cell-content">
                  <permission-checkbox
                    :inherit="row.level4State?.inherit"
                    :granted="row.level4State?.granted"
                    :indeterminate="row.level4State?.indeterminate"
                    :show-inherit="showInherit"
                    :disabled="disabled"
                    :readonly="readonly"
                    :role-inherit-state="getRoleInheritState(row.level4Id)"
                    @inherit-change="handleInheritChange(row.level4Id, $event)"
                    @granted-change="handleGrantedChange(row.level4Id, $event)"
                  >
                    <template #inherit-granted-icon>
                      <slot name="inherit-granted-icon" />
                    </template>
                    <template #inherit-denied-icon>
                      <slot name="inherit-denied-icon" />
                    </template>
                  </permission-checkbox>
                  <span class="el-permission-table__label">
                    {{ row.level4Label }}
                  </span>
                </div>
              </td>

              <!-- 功能权限列（无四级Tab时合并列） -->
              <td
                :colspan="row.level4Id ? 1 : 2"
                class="el-permission-table__cell el-permission-table__cell--permissions"
              >
                <div class="el-permission-table__permissions">
                  <div
                    v-for="perm in row.permissions"
                    :key="perm.id"
                    class="el-permission-table__permission-item"
                    :class="[perm.constraintType, perm.type]"
                  >
                    <permission-checkbox
                      :inherit="perm.state.inherit"
                      :granted="getPermissionGrantedState(perm)"
                      :indeterminate="perm.state.indeterminate"
                      :show-inherit="showInherit"
                      :disabled="disabled"
                      :readonly="readonly"
                      :constraint-type="perm.constraintType"
                      :role-inherit-state="getRoleInheritState(perm.id)"
                      @inherit-change="handleInheritChange(perm.id, $event)"
                      @granted-change="handleGrantedChange(perm.id, $event)"
                    >
                      <template #inherit-granted-icon>
                        <slot name="inherit-granted-icon" />
                      </template>
                      <template #inherit-denied-icon>
                        <slot name="inherit-denied-icon" />
                      </template>
                    </permission-checkbox>
                    <!-- 约束配置器 -->
                    <constraint-config
                      :constraint-type="perm.constraintType"
                      :model-value="getConstraintValue(perm.id)?.enumValue"
                      :options="perm.metadata?.options"
                      :multiple="perm.metadata?.multiple"
                      :disabled="disabled || readonly"
                      :inherit="perm.state.inherit"
                      :label="perm.label"
                      :permission-select-props="perm.metadata?.selectProps"
                      :select-props="props.selectProps"
                      class="el-permission-table__constraint-config"
                      @change="
                        handleConstraintChange(
                          perm.id,
                          perm.constraintType!,
                          $event
                        )
                      "
                    />
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, toRefs, watch } from 'vue'
import { ElIcon } from '@element-plus/components/icon'
import { ArrowRight } from '@element-plus/icons-vue'
import {
  ConstraintConfig,
  PermissionCheckbox,
  PermissionSplitPanel,
} from './components'
import { useCascadeSelection } from './composables'
import { InheritState, permissionTableProps } from './types'
import { applyDefaultInheritState } from './utils'

import type {
  ConstraintConfig as ConstraintConfigType,
  ConstraintType,
  PermissionDefinition,
  PermissionNode,
} from './types'

defineOptions({
  name: 'ElPermissionTable',
})

interface NodeState {
  inherit: InheritState
  granted: boolean
  indeterminate: boolean
}

/** 处理后的权限项（包含定义和状态） */
interface ProcessedPermission extends PermissionDefinition {
  state: NodeState
  constraintValue?: ConstraintConfigType
}

interface FlatRow {
  showLevel2: boolean
  level2Id?: string
  level2Label?: string
  level2Rowspan?: number
  level2State?: NodeState
  showLevel3: boolean
  level3Id?: string
  level3Label?: string
  level3Rowspan?: number
  level3State?: NodeState
  showLevel4: boolean
  level4Id?: string
  level4Label?: string
  level4Rowspan?: number
  level4State?: NodeState
  permissions: ProcessedPermission[]
}

interface ProcessedLevel1 {
  id: string
  label: string
  state: NodeState
  permissions?: ProcessedPermission[]
  flatRows: FlatRow[]
}

const props = defineProps(permissionTableProps)

// 解构常用 props 供模板使用
const {
  showInherit,
  disabled,
  readonly,
  columnWidths,
  layout,
  splitTreeWidth,
  permissionTypeLabels,
  defaultExpandAll,
} = toRefs(props)

// 标准化列宽（支持数字和字符串）
const normalizedColumnWidths = computed(() => {
  return (columnWidths.value as (string | number)[]).map((width) => {
    if (!width) return 'auto'
    if (typeof width === 'number') return `${width}px`
    return String(width)
  })
})

const emit = defineEmits<{
  'permission-change': [
    id: string,
    data: {
      inherit: InheritState
      granted: boolean
      constraint?: ConstraintConfigType
    },
  ]
  'update:inheritState': [state: Record<string, InheritState>]
  'update:grantedState': [state: Record<string, boolean>]
  'update:constraintState': [state: Record<string, ConstraintConfigType>]
}>()

// 使用级联选择 composable
const dataRef = computed(() => props.data)
const cascade = useCascadeSelection(dataRef)

// 角色权限集合（标准化为 Set）- 需要在 applyDefaultInheritState 之前定义
const rolePermissionsSet = computed(() => {
  if (!props.rolePermissions) return new Set<string>()
  const value = props.rolePermissions as Set<string> | string[]
  return value instanceof Set ? value : new Set(value)
})

// 监听数据变化，重建节点映射
watch(
  () => props.data,
  () => {
    cascade.buildNodeMap()
  },
  { immediate: true, deep: true }
)

// 是否已完成首次初始化（用于 defaultInherit 逻辑）
// 默认继承只在首次初始化时生效，用户操作后不再覆盖
const isInitialized = ref(false)

// 监听外部状态变化，初始化内部状态
watch(
  [() => props.inheritState, () => props.grantedState],
  ([inheritState, grantedState]) => {
    // 如果启用了 showInherit 和 defaultInherit，且是首次初始化
    // 为未配置的节点填充默认继承状态
    let finalInheritState = inheritState
    let stateChanged = false

    if (props.showInherit && props.defaultInherit && !isInitialized.value) {
      const allNodeIds = Array.from(cascade.nodeMap.value.keys())
      // 只有当 nodeMap 有内容时才应用默认值并标记已初始化
      if (allNodeIds.length > 0) {
        finalInheritState = applyDefaultInheritState(
          inheritState,
          allNodeIds,
          rolePermissionsSet.value
        )
        stateChanged = finalInheritState !== inheritState
        // 标记已初始化，后续用户操作不再应用默认值
        isInitialized.value = true
      }
    }

    cascade.initStates(finalInheritState, grantedState)

    // 如果 defaultInherit 修改了状态，同步给父组件
    if (stateChanged) {
      emit('update:inheritState', finalInheritState)
    }
  },
  { immediate: true, deep: true }
)

// 展开状态
const expandedLevel1 = ref<Set<string>>(new Set())
// 已渲染过的一级菜单（用于懒加载，展开过的才渲染，收起后保留不销毁）
const renderedLevel1 = ref<Set<string>>(new Set())

// 初始化展开状态
watch(
  () => props.data,
  (data) => {
    if (props.defaultExpandAll && data.length > 0) {
      const allIds = data.map((item) => item.id)
      expandedLevel1.value = new Set(allIds)
      renderedLevel1.value = new Set(allIds)
    }
  },
  { immediate: true }
)

const isLevel1Expanded = (id: string) => expandedLevel1.value.has(id)
const isLevel1Rendered = (id: string) => renderedLevel1.value.has(id)

const toggleLevel1 = (id: string) => {
  const newExpandedSet = new Set(expandedLevel1.value)
  if (newExpandedSet.has(id)) {
    newExpandedSet.delete(id)
  } else {
    newExpandedSet.add(id)
    // 首次展开时标记为已渲染
    if (!renderedLevel1.value.has(id)) {
      const newRenderedSet = new Set(renderedLevel1.value)
      newRenderedSet.add(id)
      renderedLevel1.value = newRenderedSet
    }
  }
  expandedLevel1.value = newExpandedSet
}

// 计算每个层级的行数
const countRows = (node: PermissionNode): number => {
  if (!node.children?.length) {
    return 1
  }
  return node.children.reduce((sum, child) => sum + countRows(child), 0)
}

// 计算角色决定的继承状态
const getRoleInheritState = (id: string): InheritState => {
  // 如果角色拥有该权限，则继承有权限；否则继承无权限
  return rolePermissionsSet.value.has(id)
    ? InheritState.GRANTED
    : InheritState.DENIED
}

// 获取节点状态的辅助函数
const getNodeState = (id: string): NodeState => ({
  inherit: cascade.getInheritState(id),
  granted: cascade.getGrantedState(id),
  indeterminate: cascade.getIndeterminateState(id),
})

// 获取权限项的实际勾选状态（约束优先，但级联取消仍生效）
const getPermissionGrantedState = (perm: PermissionDefinition): boolean => {
  // 如果存在约束条件
  if (perm.constraintType && perm.constraintType !== 'none') {
    // 首先检查是否有约束值
    const constraintValue = constraintStateMap.value[perm.id]
    const hasConstraintValue =
      constraintValue?.enumValue !== undefined &&
      constraintValue?.enumValue !== null &&
      (Array.isArray(constraintValue?.enumValue)
        ? constraintValue?.enumValue.length > 0
        : !!constraintValue?.enumValue)

    // 关键逻辑：有约束值 AND 级联状态允许（级联中有 false 则也是 false）
    // 这样既保证了约束优先，又保留了父级取消勾选的级联效果
    const result = hasConstraintValue && cascade.getGrantedState(perm.id)
    // 如果有约束值，但是级联状态为 false,清空 约束值
    if (hasConstraintValue && !result) {
      constraintStateMap.value[perm.id] = {
        type: perm.constraintType!,
        enumValue: undefined,
      }
      emit('update:constraintState', { ...constraintStateMap.value })
    }
    return result
  }
  // 无约束时，使用级联选择的 granted 状态
  return cascade.getGrantedState(perm.id)
}

// 处理数据，生成扁平化行
const processedData = computed<ProcessedLevel1[]>(() => {
  // 依赖 stateVersion 触发更新

  cascade.stateVersion.value

  return props.data.map((level1) => {
    const flatRows: FlatRow[] = []
    const level1State = getNodeState(level1.id)

    if (!level1.children?.length) {
      return {
        id: level1.id,
        label: level1.label,
        state: level1State,
        permissions: level1.permissions?.map((p) => ({
          ...p,
          state: getNodeState(p.id),
        })),
        flatRows: [],
      }
    }

    level1.children.forEach((level2) => {
      const level2Rowspan = countRows(level2)
      const level2State = getNodeState(level2.id)

      if (!level2.children?.length) {
        flatRows.push({
          showLevel2: true,
          level2Id: level2.id,
          level2Label: level2.label,
          level2Rowspan,
          level2State,
          showLevel3: true,
          level3Id: undefined,
          level3Label: '-',
          level3Rowspan: 1,
          showLevel4: true,
          level4Id: undefined,
          level4Label: undefined,
          level4Rowspan: 1,
          permissions: (level2.permissions || []).map((p) => ({
            ...p,
            state: getNodeState(p.id),
          })),
        })
      } else {
        level2.children.forEach((level3, level3Index) => {
          const level3Rowspan = countRows(level3)
          const level3State = getNodeState(level3.id)

          if (!level3.children?.length) {
            flatRows.push({
              showLevel2: level3Index === 0,
              level2Id: level2.id,
              level2Label: level2.label,
              level2Rowspan,
              level2State,
              showLevel3: true,
              level3Id: level3.id,
              level3Label: level3.label,
              level3Rowspan,
              level3State,
              showLevel4: true,
              level4Id: undefined,
              level4Label: undefined,
              level4Rowspan: 1,
              permissions: (level3.permissions || []).map((p) => ({
                ...p,
                state: getNodeState(p.id),
              })),
            })
          } else {
            level3.children.forEach((level4, level4Index) => {
              const level4State = getNodeState(level4.id)
              flatRows.push({
                showLevel2: level3Index === 0 && level4Index === 0,
                level2Id: level2.id,
                level2Label: level2.label,
                level2Rowspan,
                level2State,
                showLevel3: level4Index === 0,
                level3Id: level3.id,
                level3Label: level3.label,
                level3Rowspan,
                level3State,
                showLevel4: true,
                level4Id: level4.id,
                level4Label: level4.label,
                level4Rowspan: 1,
                level4State,
                permissions: (level4.permissions || []).map((p) => ({
                  ...p,
                  state: getNodeState(p.id),
                })),
              })
            })
          }
        })
      }
    })

    return {
      id: level1.id,
      label: level1.label,
      state: level1State,
      permissions: level1.permissions?.map((p) => ({
        ...p,
        state: getNodeState(p.id),
      })),
      flatRows,
    }
  })
})

// 处理继承状态变更
const handleInheritChange = (id: string, state: InheritState) => {
  // 传入角色权限集合，以便子节点根据实际权限设置继承状态
  cascade.setInheritState(id, state, rolePermissionsSet.value)
  emitStates(id)
}

// 处理个人权限变更
const handleGrantedChange = (id: string, granted: boolean) => {
  cascade.setGrantedState(id, granted)
  emitStates(id)
}

// 约束状态（内部维护）
const constraintStateMap = ref<Record<string, ConstraintConfigType>>({})

// 初始化约束状态
watch(
  () => props.constraintState,
  (state) => {
    constraintStateMap.value = { ...state }
  },
  { immediate: true, deep: true }
)

// 获取约束配置
const getConstraintValue = (id: string): ConstraintConfigType | undefined => {
  return constraintStateMap.value[id]
}

// 处理约束配置变更
const handleConstraintChange = (
  id: string,
  constraintType: ConstraintType,
  value: ConstraintConfigType['enumValue'] | undefined
) => {
  // debugger
  constraintStateMap.value[id] = {
    type: constraintType,
    enumValue: value,
  }

  // 对于有约束的权限项，值的变化直接影响 granted 状态
  // 如果有值，设置 granted 为 true；无值时设置为 false
  if (
    value !== undefined &&
    value !== null &&
    (Array.isArray(value) ? value.length > 0 : !!value)
  ) {
    cascade.setGrantedState(id, true)
  } else {
    cascade.setGrantedState(id, false)
  }

  emitStates(id)
}

// 触发状态更新事件
const emitStates = (changedId: string) => {
  const { inheritState, grantedState } = cascade.exportStates()

  emit('permission-change', changedId, {
    inherit: cascade.getInheritState(changedId),
    granted: cascade.getGrantedState(changedId),
    constraint: constraintStateMap.value[changedId],
  })
  emit('update:inheritState', inheritState)
  emit('update:grantedState', grantedState)
  emit('update:constraintState', { ...constraintStateMap.value })
}

/**
 * 导出组件方法
 */

// 展开所有一级菜单
const expandAll = () => {
  expandedLevel1.value = new Set(props.data.map((item) => item.id))
}
// 收起所有一级菜单
const collapseAll = () => {
  expandedLevel1.value = new Set()
}

/**
 * 重置组件状态
 * @param resetData 是否同时重置数据状态（约束配置），默认 false
 */
const reset = (resetData = false) => {
  // 清空展开状态
  expandedLevel1.value = new Set()
  // 清空已渲染状态，下次展开时重新渲染
  renderedLevel1.value = new Set()
  // 重置初始化标记，下次加载数据时可以重新应用 defaultInherit
  isInitialized.value = false

  // 可选：重置约束配置状态
  if (resetData) {
    constraintStateMap.value = {}
    emit('update:constraintState', {})
  }
}

defineExpose({
  // 展开/收起控制
  expandAll,
  collapseAll,
  reset,
  toggleLevel1,
  isLevel1Expanded,
  expandedLevel1,

  // 级联选择核心（包含 nodeMap, stateVersion, setInheritState, setGrantedState 等）
  cascade,

  // 状态查询
  getRoleInheritState,
  getNodeState,

  // 约束配置
  constraintStateMap,
  getConstraintValue,
  handleConstraintChange,

  // 数据相关
  processedData,
  rolePermissionsSet,
  isInitialized,
})
</script>
