<template>
  <div class="el-permission-table__split">
    <aside
      class="el-permission-table__split-tree"
      :style="{ width: normalizedTreeWidth }"
    >
      <div class="el-permission-table__split-search">
        <input
          v-model="searchKeyword"
          class="el-permission-table__split-search-input"
          placeholder="请输入，可模糊搜索"
          :disabled="disabled"
        />
      </div>
      <el-scrollbar class="el-permission-table__split-tree-body">
        <div class="el-permission-table__split-tree-list">
          <div
            v-for="row in visibleTreeRows"
            :key="row.node.id"
            class="el-permission-table__split-tree-node"
            :class="{
              'is-active': row.node.id === activeNodeId,
              'is-match': row.matched,
            }"
            :style="{ paddingLeft: `${8 + (row.level - 1) * 16}px` }"
            @click="selectNode(row.node.id)"
          >
            <span
              class="el-permission-table__split-tree-arrow"
              :class="{
                'is-leaf': !row.hasChildren,
                'is-expanded': isTreeExpanded(row.node.id) || !!searchKeyword,
              }"
              @click.stop="toggleTreeNode(row.node.id)"
            >
              <el-icon><ArrowRight /></el-icon>
            </span>
            <span
              class="el-permission-table__split-tree-label"
              @mouseenter="handleTreeLabelMouseEnter($event, row.node.label)"
              @mouseleave="hideTreeLabelTooltip"
            >
              {{ row.node.label }}
            </span>
            <span
              class="el-permission-table__split-tree-count"
              :class="{ 'is-active': getNodeCount(row.node).checked > 0 }"
            >
              {{ getNodeCount(row.node).checked }}/{{
                getNodeCount(row.node).total
              }}
            </span>
          </div>
        </div>
      </el-scrollbar>
    </aside>

    <section class="el-permission-table__split-content">
      <div class="el-permission-table__split-header">
        <div class="el-permission-table__split-title">
          <permission-checkbox
            v-if="selectedLeaves.length"
            class="el-permission-table__split-title-checkbox"
            :inherit="getNodeState(activeNodeId).inherit"
            :granted="getNodeState(activeNodeId).granted"
            :indeterminate="getNodeState(activeNodeId).indeterminate"
            :show-inherit="showInherit"
            :disabled="disabled"
            :readonly="readonly"
            :role-inherit-state="getRoleInheritState(activeNodeId)"
            @inherit-change="handleNodeInheritChange(activeNodeId, $event)"
            @granted-change="handleNodeGrantedChange(activeNodeId, $event)"
          >
            <template #inherit-granted-icon>
              <slot name="inherit-granted-icon" />
            </template>
            <template #inherit-denied-icon>
              <slot name="inherit-denied-icon" />
            </template>
          </permission-checkbox>
          <span>{{ activeNode?.label || '请选择左侧页面分类' }}</span>
        </div>
      </div>

      <el-scrollbar
        v-if="selectedLeaves.length"
        class="el-permission-table__split-body"
      >
        <table class="el-permission-table__split-table">
          <tbody>
            <template v-for="page in selectedLeaves" :key="page.id">
              <tr class="el-permission-table__split-page-row">
                <td :colspan="permissionColumns.length">
                  <div class="el-permission-table__split-page-title">
                    <permission-checkbox
                      :inherit="getNodeState(page.id).inherit"
                      :granted="getNodeState(page.id).granted"
                      :indeterminate="getNodeState(page.id).indeterminate"
                      :show-inherit="showInherit"
                      :disabled="disabled"
                      :readonly="readonly"
                      :role-inherit-state="getRoleInheritState(page.id)"
                      @inherit-change="handleNodeInheritChange(page.id, $event)"
                      @granted-change="handleNodeGrantedChange(page.id, $event)"
                    >
                      <template #inherit-granted-icon>
                        <slot name="inherit-granted-icon" />
                      </template>
                      <template #inherit-denied-icon>
                        <slot name="inherit-denied-icon" />
                      </template>
                    </permission-checkbox>
                    <span>{{ getNodePath(page).join(' > ') }}</span>
                    <span class="el-permission-table__split-page-count">
                      ({{ getNodeCount(page).checked }}/{{
                        getNodeCount(page).total
                      }})
                    </span>
                  </div>
                </td>
              </tr>
              <tr class="el-permission-table__split-sub-header">
                <td v-for="column in permissionColumns" :key="column.key">
                  {{ column.label }}
                </td>
              </tr>
              <tr class="el-permission-table__split-perm-row">
                <td v-for="column in permissionColumns" :key="column.key">
                  <div class="el-permission-table__split-permissions">
                    <div
                      v-for="perm in getPermissionsByColumn(page, column.key)"
                      :key="perm.id"
                      class="el-permission-table__permission-item el-permission-table__split-permission-item"
                      :class="[perm.constraintType, perm.type]"
                    >
                      <permission-checkbox
                        :inherit="cascade.getInheritState(perm.id)"
                        :granted="getPermissionGrantedState(perm)"
                        :indeterminate="cascade.getIndeterminateState(perm.id)"
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
                      <constraint-config
                        :constraint-type="perm.constraintType"
                        :model-value="getConstraintValue(perm.id)?.enumValue"
                        :options="perm.metadata?.options"
                        :multiple="perm.metadata?.multiple"
                        :disabled="disabled || readonly"
                        :inherit="cascade.getInheritState(perm.id)"
                        :label="perm.label"
                        :permission-select-props="perm.metadata?.selectProps"
                        :select-props="selectProps"
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
                    <span
                      v-if="!getPermissionsByColumn(page, column.key).length"
                      class="el-permission-table__split-empty"
                    >
                      -
                    </span>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </el-scrollbar>

      <div v-else class="el-permission-table__split-empty-view">
        请选择左侧页面分类
      </div>
    </section>
    <el-tooltip
      :visible="treeLabelTooltipVisible"
      :content="treeLabelTooltipContent"
      :virtual-ref="treeLabelTooltipRef"
      virtual-triggering
      placement="top"
      popper-class="el-permission-table__split-tree-tooltip"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { ElIcon } from '@element-plus/components/icon'
import { ElScrollbar } from '@element-plus/components/scrollbar'
import { ElTooltip } from '@element-plus/components/tooltip'
import { ArrowRight } from '@element-plus/icons-vue'
import { InheritState } from '../types'
import ConstraintConfig from './constraint-config.vue'
import PermissionCheckbox from './permission-checkbox.vue'

import type { useCascadeSelection } from '../composables'
import type {
  ConstraintConfig as ConstraintConfigType,
  ConstraintType,
  PermissionDefinition,
  PermissionNode,
} from '../types'

defineOptions({
  name: 'ElPermissionSplitPanel',
})

type Cascade = ReturnType<typeof useCascadeSelection>
type PermissionColumnKey = number | 'other'

interface PermissionColumn {
  key: PermissionColumnKey
  label: string
}

interface TreeRow {
  node: PermissionNode
  level: number
  hasChildren: boolean
  matched: boolean
}

const props = withDefaults(
  defineProps<{
    data?: PermissionNode[]
    cascade: Cascade
    showInherit: boolean
    disabled: boolean
    readonly: boolean
    selectProps: Record<string, any>
    splitTreeWidth: string | number
    permissionTypeLabels: Partial<Record<number, string>>
    defaultExpandAll: boolean
    getRoleInheritState: (id: string) => InheritState
    getPermissionGrantedState: (perm: PermissionDefinition) => boolean
    getConstraintValue: (id: string) => ConstraintConfigType | undefined
    handleInheritChange: (id: string, state: InheritState) => void
    handleGrantedChange: (id: string, granted: boolean) => void
    handleConstraintChange: (
      id: string,
      constraintType: ConstraintType,
      value: ConstraintConfigType['enumValue'] | undefined
    ) => void
  }>(),
  {
    data: () => [],
  }
)

const searchKeyword = ref('')
const activeNodeId = ref('')
const expandedNodeIds = ref<Set<string>>(new Set())
const treeLabelTooltipVisible = ref(false)
const treeLabelTooltipContent = ref('')
const treeLabelTooltipRef = ref<HTMLElement>()

const normalizedTreeWidth = computed(() => {
  if (typeof props.splitTreeWidth === 'number') {
    return `${props.splitTreeWidth}px`
  }
  return props.splitTreeWidth
})

const permissionColumns = computed<PermissionColumn[]>(() => {
  const configuredTypes = Object.keys(props.permissionTypeLabels)
    .map(Number)
    .filter((type) => Number.isFinite(type))

  const defaultOrder = [2, 1, 3, 4, 5]
  const orderedTypes = [
    ...defaultOrder.filter((type) => configuredTypes.includes(type)),
    ...configuredTypes
      .filter((type) => !defaultOrder.includes(type))
      .filter((type) => getAllAuthorizationTypes.value.has(type))
      .sort((a, b) => a - b),
  ]

  return orderedTypes
    .filter((type) => props.permissionTypeLabels[type])
    .map((type) => ({
      key: type,
      label: props.permissionTypeLabels[type]!,
    }))
})

const visiblePermissionTypes = computed(() => {
  return new Set(permissionColumns.value.map((column) => column.key))
})

const getAllAuthorizationTypes = computed(() => {
  const types = new Set<number>()
  const walk = (nodes: PermissionNode[]) => {
    nodes.forEach((node) => {
      node.permissions?.forEach((perm) => {
        const type = getPermissionType(perm)
        if (typeof type === 'number') types.add(type)
      })
      if (node.children?.length) walk(node.children)
    })
  }
  walk(props.data)
  return types
})

const getVisiblePermissions = (node: PermissionNode) => {
  const permissions: PermissionDefinition[] = []
  getLeaves(node).forEach((leaf) => {
    permissions.push(
      ...(leaf.permissions || []).filter((perm) =>
        visiblePermissionTypes.value.has(getPermissionType(perm))
      )
    )
  })
  return permissions
}

const getVisiblePagePermissions = (page: PermissionNode) => {
  return (page.permissions || []).filter((perm) =>
    visiblePermissionTypes.value.has(getPermissionType(perm))
  )
}

const activeNode = computed(() => {
  return findNodeById(activeNodeId.value)
})

const selectedLeaves = computed(() => {
  if (!activeNode.value) return []
  return getLeaves(activeNode.value)
})

const visibleTreeRows = computed<TreeRow[]>(() => {
  props.cascade.stateVersion.value

  const rows: TreeRow[] = []
  const keyword = searchKeyword.value.trim().toLowerCase()

  const isVisible = (node: PermissionNode): boolean => {
    if (!keyword) return true
    return (
      node.label.toLowerCase().includes(keyword) ||
      !!node.children?.some((child) => isVisible(child))
    )
  }

  const walk = (nodes: PermissionNode[], level: number) => {
    nodes.forEach((node) => {
      if (!isVisible(node)) return
      const hasChildren = !!node.children?.length
      const matched = !!keyword && node.label.toLowerCase().includes(keyword)

      rows.push({ node, level, hasChildren, matched })

      if (hasChildren && (keyword || expandedNodeIds.value.has(node.id))) {
        walk(node.children!, level + 1)
      }
    })
  }

  walk(props.data, 1)
  return rows
})

const selectNode = (id: string) => {
  hideTreeLabelTooltip()
  activeNodeId.value = id
}

const isTreeExpanded = (id: string) => expandedNodeIds.value.has(id)

const toggleTreeNode = (id: string) => {
  hideTreeLabelTooltip()
  const next = new Set(expandedNodeIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expandedNodeIds.value = next
}

const hideTreeLabelTooltip = () => {
  treeLabelTooltipVisible.value = false
}

const handleTreeLabelMouseEnter = (event: MouseEvent, label: string) => {
  const target = event.currentTarget as HTMLElement | null
  if (!target || target.scrollWidth <= target.clientWidth) {
    hideTreeLabelTooltip()
    return
  }

  treeLabelTooltipRef.value = target
  treeLabelTooltipContent.value = label
  treeLabelTooltipVisible.value = true
}

const findNodeById = (id: string): PermissionNode | undefined => {
  const walk = (nodes: PermissionNode[]): PermissionNode | undefined => {
    for (const node of nodes) {
      if (node.id === id) return node
      if (node.children?.length) {
        const found = walk(node.children)
        if (found) return found
      }
    }
  }

  return walk(props.data)
}

const getLeaves = (node: PermissionNode): PermissionNode[] => {
  if (!node.children?.length) return [node]
  const leaves: PermissionNode[] = []
  node.children.forEach((child) => {
    leaves.push(...getLeaves(child))
  })
  return leaves
}

const collectBranchIds = (nodes: PermissionNode[]): string[] => {
  const ids: string[] = []
  nodes.forEach((node) => {
    if (node.children?.length) {
      ids.push(node.id)
      ids.push(...collectBranchIds(node.children))
    }
  })
  return ids
}

watch(
  () => props.data,
  (data) => {
    if (!activeNodeId.value && data.length > 0) {
      activeNodeId.value = data[0].id
    } else if (activeNodeId.value && !findNodeById(activeNodeId.value)) {
      activeNodeId.value = data[0]?.id || ''
    }

    const branchIds = collectBranchIds(data)
    expandedNodeIds.value = new Set(branchIds)
  },
  { immediate: true, deep: true }
)

const getNodePath = (node: PermissionNode): string[] => {
  const path: string[] = []
  const walk = (nodes: PermissionNode[], parents: string[]): boolean => {
    for (const item of nodes) {
      const next = [...parents, item.label]
      if (item.id === node.id) {
        path.push(...next)
        return true
      }
      if (item.children?.length && walk(item.children, next)) {
        return true
      }
    }
    return false
  }
  walk(props.data, [])
  return path.length ? path : [node.label]
}

const getPermissionType = (perm: PermissionDefinition): PermissionColumnKey => {
  const type = Number(perm.extraConfig?.authorizationType)
  return Number.isFinite(type) && type > 0 ? type : 'other'
}

const getPermissionsByColumn = (
  page: PermissionNode,
  column: PermissionColumnKey
) => {
  return getVisiblePagePermissions(page).filter(
    (perm) => getPermissionType(perm) === column
  )
}

const getNodeState = (id: string) => {
  props.cascade.stateVersion.value

  return {
    inherit: props.cascade.getInheritState(id),
    granted: props.cascade.getGrantedState(id),
    indeterminate: props.cascade.getIndeterminateState(id),
  }
}

const isPermissionEffectivelyGranted = (perm: PermissionDefinition) => {
  const inherit = props.cascade.getInheritState(perm.id)
  if (inherit === InheritState.GRANTED) return true
  if (inherit === InheritState.DENIED) return false
  return props.getPermissionGrantedState(perm)
}

const getNodeCount = (node: PermissionNode) => {
  props.cascade.stateVersion.value

  const permissions = getVisiblePermissions(node)
  const checked = permissions.filter((perm) =>
    isPermissionEffectivelyGranted(perm)
  ).length
  return {
    checked,
    total: permissions.length,
  }
}

const handleNodeInheritChange = (id: string, state: InheritState) => {
  if (!id) return
  props.handleInheritChange(id, state)
}

const handleNodeGrantedChange = (id: string, granted: boolean) => {
  if (!id) return
  props.handleGrantedChange(id, granted)
}
</script>
