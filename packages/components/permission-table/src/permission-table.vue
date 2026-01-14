<template>
  <div class="el-permission-table">
    <table class="el-permission-table__table">
      <colgroup>
        <col style="width: 150px" />
        <col style="width: 150px" />
        <col style="width: 150px" />
        <col />
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
                  :role-inherit-state="getRoleInheritState(level1.id)"
                  @inherit-change="handleInheritChange(level1.id, $event)"
                  @granted-change="handleGrantedChange(level1.id, $event)"
                />
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
                    :role-inherit-state="getRoleInheritState(row.level2Id)"
                    @inherit-change="handleInheritChange(row.level2Id, $event)"
                    @granted-change="handleGrantedChange(row.level2Id, $event)"
                  />
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
                    :role-inherit-state="getRoleInheritState(row.level3Id)"
                    @inherit-change="handleInheritChange(row.level3Id, $event)"
                    @granted-change="handleGrantedChange(row.level3Id, $event)"
                  />
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
                    :role-inherit-state="getRoleInheritState(row.level4Id)"
                    @inherit-change="handleInheritChange(row.level4Id, $event)"
                    @granted-change="handleGrantedChange(row.level4Id, $event)"
                  />
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
                  >
                    <permission-checkbox
                      :inherit="perm.state.inherit"
                      :granted="perm.state.granted"
                      :indeterminate="perm.state.indeterminate"
                      :show-inherit="showInherit"
                      :disabled="disabled"
                      :role-inherit-state="getRoleInheritState(perm.id)"
                      @inherit-change="handleInheritChange(perm.id, $event)"
                      @granted-change="handleGrantedChange(perm.id, $event)"
                    />
                    <span class="el-permission-table__permission-label">
                      {{ perm.label }}
                    </span>
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
import { PermissionCheckbox } from './components'
import { useCascadeSelection } from './composables'
import { InheritState } from './types'

import type { PermissionNode } from './types'

defineOptions({
  name: 'ElPermissionTable',
})

interface NodeState {
  inherit: InheritState
  granted: boolean
  indeterminate: boolean
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
  permissions: { id: string; label: string; state: NodeState }[]
}

interface ProcessedLevel1 {
  id: string
  label: string
  state: NodeState
  permissions?: { id: string; label: string; state: NodeState }[]
  flatRows: FlatRow[]
}

const props = withDefaults(
  defineProps<{
    data?: PermissionNode[]
    inheritState?: Record<string, InheritState>
    grantedState?: Record<string, boolean>
    /** 角色拥有的权限ID集合，用于计算继承状态 */
    rolePermissions?: Set<string> | string[]
    defaultExpandAll?: boolean
    showInherit?: boolean
    disabled?: boolean
  }>(),
  {
    data: () => [],
    inheritState: () => ({}),
    grantedState: () => ({}),
    rolePermissions: undefined,
    defaultExpandAll: false,
    showInherit: true,
    disabled: false,
  }
)

// 解构常用 props 供模板使用
const { showInherit, disabled } = toRefs(props)

const emit = defineEmits<{
  'permission-change': [
    id: string,
    data: { inherit: InheritState; granted: boolean },
  ]
  'update:inheritState': [state: Record<string, InheritState>]
  'update:grantedState': [state: Record<string, boolean>]
}>()

// 使用级联选择 composable
const dataRef = computed(() => props.data)
const cascade = useCascadeSelection(dataRef)

// 监听数据变化，重建节点映射
watch(
  () => props.data,
  () => {
    cascade.buildNodeMap()
  },
  { immediate: true, deep: true }
)

// 监听外部状态变化，初始化内部状态
watch(
  [() => props.inheritState, () => props.grantedState],
  ([inheritState, grantedState]) => {
    cascade.initStates(inheritState, grantedState)
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

// 角色权限集合（标准化为 Set）
const rolePermissionsSet = computed(() => {
  if (!props.rolePermissions) return new Set<string>()
  return props.rolePermissions instanceof Set
    ? props.rolePermissions
    : new Set(props.rolePermissions)
})

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
  cascade.setInheritState(id, state)
  emitStates(id)
}

// 处理个人权限变更
const handleGrantedChange = (id: string, granted: boolean) => {
  cascade.setGrantedState(id, granted)
  emitStates(id)
}

// 触发状态更新事件
const emitStates = (changedId: string) => {
  const { inheritState, grantedState } = cascade.exportStates()

  emit('permission-change', changedId, {
    inherit: cascade.getInheritState(changedId),
    granted: cascade.getGrantedState(changedId),
  })
  emit('update:inheritState', inheritState)
  emit('update:grantedState', grantedState)
}

// 导出方法
const expandAll = () => {
  expandedLevel1.value = new Set(props.data.map((item) => item.id))
}

const collapseAll = () => {
  expandedLevel1.value = new Set()
}

defineExpose({
  expandAll,
  collapseAll,
  getGrantedKeys: cascade.getGrantedKeys,
  getInheritedKeys: cascade.getInheritedKeys,
  exportStates: cascade.exportStates,
})
</script>
