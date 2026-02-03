<template>
  <div
    ref="containerRef"
    :class="ns.b()"
    :style="{
      height:
        typeof props.height === 'number' ? props.height + 'px' : props.height,
    }"
  >
    <!-- 表头 -->
    <div :class="ns.e('header')">
      <div :class="ns.e('header-cell')" style="width: 280px">
        <permission-checkbox
          :inherit="allInheritState"
          :granted="allGrantedState"
          :indeterminate="allIndeterminateState"
          :show-inherit="showInherit"
          :disabled="disabled"
          :readonly="readonly"
          :role-inherit-state="allRoleInheritState"
          @inherit-change="handleAllInheritChange"
          @granted-change="handleAllGrantedChange"
        >
          <template #inherit-granted-icon>
            <slot name="inherit-granted-icon" />
          </template>
          <template #inherit-denied-icon>
            <slot name="inherit-denied-icon" />
          </template>
        </permission-checkbox>
        <span>全选 (共 {{ data.length }} 条)</span>
      </div>
      <div :class="ns.e('header-cell')" style="flex: 1">权限配置</div>
    </div>

    <!-- 虚拟滚动容器 -->
    <el-scrollbar
      ref="scrollbarRef"
      :height="bodyHeight"
      @scroll="handleScroll"
    >
      <!-- 占位元素，撑开滚动高度 -->
      <div :style="{ height: totalHeight + 'px', position: 'relative' }">
        <!-- 可视区域内的行 -->
        <div
          v-for="item in visibleItems"
          :key="item.data.id"
          :class="ns.e('row')"
          :style="{
            position: 'absolute',
            top: item.top + 'px',
            left: 0,
            right: 0,
            height: itemHeight + 'px',
          }"
        >
          <!-- 弹窗名称列 -->
          <div :class="ns.e('cell')" style="width: 280px">
            <permission-checkbox
              :inherit="getInheritState(item.data.id)"
              :granted="getGrantedState(item.data.id)"
              :indeterminate="getIndeterminateState(item.data.id)"
              :show-inherit="showInherit"
              :disabled="disabled"
              :readonly="readonly"
              :role-inherit-state="getRoleInheritState(item.data.id)"
              @inherit-change="handleInheritChange(item.data.id, $event)"
              @granted-change="handleGrantedChange(item.data.id, $event)"
            >
              <template #inherit-granted-icon>
                <slot name="inherit-granted-icon" />
              </template>
              <template #inherit-denied-icon>
                <slot name="inherit-denied-icon" />
              </template>
            </permission-checkbox>
            <span class="el-permission-table__label">
              {{ item.data.label }}
            </span>
          </div>

          <!-- 权限列 -->
          <div :class="ns.e('cell')" style="flex: 1">
            <el-scrollbar wrap-style="max-height: 32px;">
              <div :class="ns.e('permissions')">
                <template v-if="item.data.permissions?.length">
                  <div
                    v-for="perm in item.data.permissions"
                    :key="perm.id"
                    :class="ns.e('permission-item')"
                  >
                    <permission-checkbox
                      :inherit="getInheritState(perm.id)"
                      :granted="getPermissionGrantedState(perm)"
                      :indeterminate="getPermIndeterminateState(perm.id)"
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
                      :inherit="getInheritState(perm.id)"
                      :label="perm.label"
                      :permission-select-props="perm.metadata?.selectProps"
                      :select-props="props.selectProps"
                      :class="ns.e('constraint-config')"
                      @change="
                        handleConstraintChange(
                          perm.id,
                          perm.constraintType!,
                          $event
                        )
                      "
                    />
                  </div>
                </template>
                <span v-else :class="ns.e('empty-perm')">-</span>
              </div>
            </el-scrollbar>
          </div>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useNamespace } from '@element-plus/hooks'
import { ElScrollbar } from '@element-plus/components/scrollbar'
import { InheritState } from '@element-plus/components/permission-table'
import PermissionCheckbox from '../../permission-table/src/components/permission-checkbox.vue'
import ConstraintConfig from '../../permission-table/src/components/constraint-config.vue'
import { useCascadeSelection } from '../../permission-table/src/composables'
import { permissionListProps } from './types'

import type { ConstraintType } from '@element-plus/components/permission-table'
import type {
  ConstraintConfig as ConstraintConfigType,
  DialogPermissionItem,
} from './types'

defineOptions({
  name: 'ElPermissionList',
})

const props = defineProps(permissionListProps)

const emit = defineEmits<{
  'permission-change': [
    changedId: string,
    detail: {
      inherit: InheritState
      granted: boolean
      constraint?: ConstraintConfigType
    },
  ]
  'update:inheritState': [state: Record<string, InheritState>]
  'update:grantedState': [state: Record<string, boolean>]
  'update:constraintState': [state: Record<string, ConstraintConfigType>]
}>()

const ns = useNamespace('permission-list')

// 滚动容器引用
const scrollbarRef = ref<InstanceType<typeof ElScrollbar>>()
// 根容器引用（用于计算百分比高度）
const containerRef = ref<HTMLElement>()
// 实际计算出的高度
const computedHeight = ref(400)

// 标准化高度（内部计算用，统一返回数字）
// - 数字/数字字符串: 直接使用
// - CSS 单位(%/calc/vh/vw): 通过 ResizeObserver 获取实际渲染高度
const normalizedHeight = computed(() => {
  const h = props.height
  if (typeof h === 'number') return h
  if (typeof h === 'string') {
    // 百分比、calc 等 CSS 单位，使用实际计算的高度
    if (
      h.includes('%') ||
      h.includes('calc') ||
      h.includes('vh') ||
      h.includes('vw')
    ) {
      return computedHeight.value
    }
    // 纯数字字符串（如 "500" 或 "500px"）
    const num = Number.parseInt(h, 10)
    return Number.isNaN(num) ? 400 : num
  }
  return 400
})

// 表头高度
const headerHeight = 40

// 内容区高度
const bodyHeight = computed(() => normalizedHeight.value - headerHeight)

// 总高度
const totalHeight = computed(() => props.data.length * props.itemHeight)

// 当前滚动位置
const scrollTop = ref(0)

// 可视区域内的项目
const visibleItems = computed(() => {
  const start = Math.max(
    0,
    Math.floor(scrollTop.value / props.itemHeight) - props.buffer
  )
  const visibleCount = Math.ceil(bodyHeight.value / props.itemHeight)
  const end = Math.min(
    props.data.length,
    start + visibleCount + props.buffer * 2
  )

  const items: { data: DialogPermissionItem; top: number; index: number }[] = []
  for (let i = start; i < end; i++) {
    items.push({
      data: props.data[i],
      top: i * props.itemHeight,
      index: i,
    })
  }
  return items
})

// 滚动处理
const handleScroll = ({ scrollTop: top }: { scrollTop: number }) => {
  scrollTop.value = top
}

// ========== 状态管理 ==========

// 将 DialogPermissionItem 转换为 PermissionNode 格式供 cascade 使用
const cascadeData = computed(() => {
  return props.data.map((item) => ({
    id: item.id,
    label: item.label,
    permissions: item.permissions,
    children: undefined, // 弹窗权限是扁平的，没有子节点
  }))
})

// 使用级联选择 composable（与 permission-table 一致）
const cascade = useCascadeSelection(cascadeData)

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

// 约束配置状态（独立管理）
const constraintStateMap = ref<Record<string, ConstraintConfigType>>({})

// 初始化约束状态
watch(
  () => props.constraintState,
  (constraintState) => {
    constraintStateMap.value = { ...constraintState }
  },
  { immediate: true, deep: true }
)

// 角色权限集合
const rolePermissionsSet = computed(() => {
  if (!props.rolePermissions) return new Set<string>()
  const value = props.rolePermissions as Set<string> | string[]
  return value instanceof Set ? value : new Set(value)
})

// 获取继承状态
const getInheritState = (id: string): InheritState => {
  return cascade.getInheritState(id)
}

// 获取授权状态
const getGrantedState = (id: string): boolean => {
  return cascade.getGrantedState(id)
}

// 获取半选状态（弹窗级别）
const getIndeterminateState = (id: string): boolean => {
  return cascade.getIndeterminateState(id)
}

// 获取权限项的半选状态
const getPermIndeterminateState = (id: string): boolean => {
  return cascade.getIndeterminateState(id)
}

// 获取角色继承状态
const getRoleInheritState = (id: string): InheritState => {
  return rolePermissionsSet.value.has(id)
    ? InheritState.GRANTED
    : InheritState.DENIED
}

// 计算全部的继承状态
const allInheritState = computed((): InheritState => {
  if (props.data.length === 0) return InheritState.NONE

  let hasInherit = false
  let hasNotInherit = false

  for (const item of props.data) {
    const state = cascade.getInheritState(item.id)
    if (state !== InheritState.NONE) {
      hasInherit = true
    } else {
      hasNotInherit = true
    }
    if (hasInherit && hasNotInherit) break
  }

  // 如果全部都是继承状态，返回 GRANTED（假设都是同一种继承状态）
  if (hasInherit && !hasNotInherit) {
    return cascade.getInheritState(props.data[0].id)
  }

  return InheritState.NONE
})

// 计算全部的授权状态
const allGrantedState = computed((): boolean => {
  if (props.data.length === 0) return false

  return props.data.every((item) => cascade.getGrantedState(item.id))
})

// 计算全部的半选状态
const allIndeterminateState = computed((): boolean => {
  if (props.data.length === 0) return false

  const grantedCount = props.data.filter((item) =>
    cascade.getGrantedState(item.id)
  ).length

  return grantedCount > 0 && grantedCount < props.data.length
})

// 计算全部的角色继承状态
const allRoleInheritState = computed((): InheritState => {
  if (props.data.length === 0) return InheritState.DENIED

  const allHasPermission = props.data.every((item) =>
    rolePermissionsSet.value.has(item.id)
  )

  return allHasPermission ? InheritState.GRANTED : InheritState.DENIED
})

// 触发状态更新事件（与 ElPermissionTable 一致）
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

// 处理全部继承状态变更
const handleAllInheritChange = (state: InheritState) => {
  for (const item of props.data) {
    cascade.setInheritState(item.id, state)
  }

  // 使用统一的事件发射
  if (props.data.length > 0) {
    emitStates(props.data[0].id)
  }
}

// 处理全选/取消全选
const handleAllGrantedChange = (granted: boolean) => {
  for (const item of props.data) {
    cascade.setGrantedState(item.id, granted)
  }

  // 使用统一的事件发射
  if (props.data.length > 0) {
    emitStates(props.data[0].id)
  }
}

// 处理继承状态变更
const handleInheritChange = (id: string, state: InheritState) => {
  cascade.setInheritState(id, state)
  emitStates(id)
}

// 处理授权状态变更
const handleGrantedChange = (id: string, granted: boolean) => {
  cascade.setGrantedState(id, granted)
  emitStates(id)
}

// 获取权限项的实际勾选状态（约束优先，与 permission-table 一致）
const getPermissionGrantedState = (perm: any): boolean => {
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

// 获取约束配置
const getConstraintValue = (id: string): ConstraintConfigType | undefined => {
  return constraintStateMap.value[id]
}

// 处理约束配置变更
const handleConstraintChange = (
  id: string,
  constraintType: ConstraintType,
  value: string | number | (string | number)[] | undefined
) => {
  constraintStateMap.value[id] = {
    type: constraintType,
    enumValue: value,
  }

  // 对于有约束的权限项，值的变化直接影响 granted 状态
  // 如果有值，设置 granted 为 true；无值时设置为 false
  const hasValue =
    value !== undefined &&
    value !== null &&
    (Array.isArray(value) ? value.length > 0 : !!value)

  cascade.setGrantedState(id, hasValue)

  emitStates(id)
}

// 重置
const reset = () => {
  // cascade 没有 reset 方法，通过重新初始化实现
  cascade.initStates({}, {})
  constraintStateMap.value = {}
  scrollTop.value = 0
  scrollbarRef.value?.setScrollTop(0)
}

// 滚动到指定索引
const scrollToIndex = (index: number) => {
  scrollbarRef.value?.setScrollTop(index * props.itemHeight)
}

// 监听容器尺寸变化（支持百分比高度）
let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  await nextTick()

  if (containerRef.value) {
    // 初始计算高度
    computedHeight.value = containerRef.value.clientHeight || 400

    // 监听尺寸变化
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height
        if (height > 0) {
          computedHeight.value = height
        }
      }
    })
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

defineExpose({
  reset,
  scrollToIndex,
})
</script>
