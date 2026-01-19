<template>
  <span
    class="el-permission-checkbox"
    :class="{
      'is-readonly': props.readonly,
    }"
    @click.stop
  >
    <!-- 继承状态（圆形） -->
    <span
      v-if="showInherit"
      class="el-permission-checkbox__inherit"
      :class="inheritStateClass"
      :title="inheritTitle"
      @click.stop="handleInheritClick"
    >
      <!-- 继承有权限：绿色圆形勾 -->
      <slot v-if="inherit === InheritState.GRANTED" name="inherit-granted-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            d="M8 12l3 3 5-6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </slot>
      <!-- 继承无权限：红色圆形叉 -->
      <slot
        v-else-if="inherit === InheritState.DENIED"
        name="inherit-denied-icon"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            d="M9 9l6 6M15 9l-6 6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </slot>
      <!-- 不继承：空圆形 -->
      <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
      </svg>
    </span>

    <!-- 个人权限（方形） -->
    <el-checkbox
      :model-value="granted"
      :indeterminate="indeterminate"
      :disabled="isGrantedDisabled"
      class="el-permission-checkbox__granted"
      @change="handleGrantedChange"
    />
  </span>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { ElCheckbox } from '@element-plus/components/checkbox'
import { InheritState } from '../types'

import type { ConstraintType } from '../types'

defineOptions({
  name: 'ElPermissionCheckbox',
})

const props = withDefaults(
  defineProps<{
    inherit?: InheritState
    granted?: boolean
    indeterminate?: boolean
    readonly?: boolean
    showInherit?: boolean
    disabled?: boolean
    /** 约束类型 */
    constraintType?: ConstraintType
    /** 角色决定的继承状态（当用户选择继承时，应该继承的状态） */
    roleInheritState?: InheritState
  }>(),
  {
    inherit: InheritState.NONE,
    granted: false,
    indeterminate: false,
    readonly: false,
    showInherit: true,
    disabled: false,
    roleInheritState: InheritState.DENIED,
  }
)

const emit = defineEmits<{
  'inherit-change': [state: InheritState]
  'granted-change': [granted: boolean]
}>()

// 是否禁用方形（圆形有继承状态时禁用，或组件整体禁用）
const isGrantedDisabled = computed(() => {
  return (
    props.disabled ||
    props.inherit !== InheritState.NONE ||
    props.readonly ||
    (!!props.constraintType && props.constraintType !== 'none')
  )
})

// 是否禁用圆形
const isInheritDisabled = computed(() => {
  return props.disabled || props.readonly
})

// 继承状态样式
const inheritStateClass = computed(() => ({
  'is-granted': props.inherit === InheritState.GRANTED,
  'is-denied': props.inherit === InheritState.DENIED,
  'is-none': props.inherit === InheritState.NONE,
  'is-readonly': props.readonly,
  'is-disabled': props.disabled,
}))

// 继承状态提示
const inheritTitle = computed(() => {
  switch (props.inherit) {
    case InheritState.GRANTED:
      return '继承有权限'
    case InheritState.DENIED:
      return '继承无权限'
    default:
      return '不继承'
  }
})

// 点击继承状态：切换「是否继承」，具体继承状态由角色决定
const handleInheritClick = () => {
  if (isInheritDisabled.value) return

  let newState: InheritState
  if (props.inherit === InheritState.NONE) {
    // 当前不继承 → 开启继承，使用角色决定的继承状态
    newState = props.roleInheritState
  } else {
    // 当前继承 → 关闭继承
    newState = InheritState.NONE
  }

  emit('inherit-change', newState)
}

// 点击个人权限
const handleGrantedChange = (val: boolean | string | number) => {
  if (props.disabled || props.readonly) return
  emit('granted-change', Boolean(val))
}
</script>
