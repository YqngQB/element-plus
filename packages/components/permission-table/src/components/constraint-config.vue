<template>
  <div class="el-constraint-config" :class="{ 'is-disabled': disabled }">
    <span class="el-permission-table__permission-label">
      {{ label }}
    </span>
    <!-- todo: 当前仅支持简单的人员选择，ENUM 与 USER_SELECT 类型暂时共用同一套配置 -->
    <template
      v-if="
        [ConstraintType.ENUM, ConstraintType.USER_SELECT].includes(
          constraintType
        )
      "
    >
      <el-select
        v-model="selectValue"
        :multiple="multiple"
        :disabled="effectiveDisabled"
        :placeholder="placeholder"
        :persistent="false"
        filterable
        collapse-tags
        collapse-tags-tooltip
        size="small"
        clearable
        class="el-constraint-config__select"
        v-bind="mergedSelectProps"
        @change="
          (value) => (multiple ? handleMultiChange(value) : handleChange(value))
        "
      >
        <el-option
          v-for="(item, index) in options"
          :key="getValue(item) || index"
          v-bind="getOptionProps(item)"
        />
      </el-select>
    </template>

    <!-- 其他类型：预留插槽 -->
    <template v-else-if="constraintType !== ConstraintType.NONE">
      <slot
        :type="constraintType"
        :value="modelValue"
        :inherit="inherit"
        :on-change="handleChange"
      >
        <span class="el-constraint-config__placeholder">
          {{ constraintType }} 类型暂不支持
        </span>
      </slot>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import ElSelect from '@element-plus/components/select'
import { useProps as useSelectProps } from '@element-plus/components/select-v2/src/useProps'
import { ConstraintType, InheritState } from '../types'

import type { OptionItem } from '../types'

defineOptions({
  name: 'ElConstraintConfig',
})

const { Option: ElOption } = ElSelect

const props = withDefaults(
  defineProps<{
    /** 约束类型 */
    constraintType?: ConstraintType
    /** 当前值（支持 string | number | boolean | object 及其数组，与 ElSelect 保持一致） */
    modelValue?:
      | string
      | number
      | boolean
      | Record<string, any>
      | (string | number | boolean | Record<string, any>)[]
    /** 可选项（ENUM 类型使用） */
    options?: OptionItem[]
    /** 是否多选（ENUM 类型使用） */
    multiple?: boolean
    /** 是否禁用 */
    disabled?: boolean
    /** 占位文本 */
    placeholder?: string
    /** 文本标签 */
    label?: string
    /** 继承关系 */
    inherit?: InheritState
    /** 权限级别的 ElSelect 配置 */
    permissionSelectProps?: Record<string, any>
    /** 全局 ElSelect 配置（降级用） */
    selectProps?: Record<string, any>
  }>(),
  {
    inherit: InheritState.NONE,
    constraintType: ConstraintType.NONE,
    modelValue: undefined,
    options: () => [],
    multiple: false,
    disabled: false,
    placeholder: '请选择',
    permissionSelectProps: () => ({}),
    selectProps: () => ({}),
  }
)

const emit = defineEmits<{
  'update:modelValue': [
    value:
      | string
      | number
      | boolean
      | Record<string, any>
      | (string | number | boolean | Record<string, any>)[]
      | undefined,
  ]
  change: [
    value:
      | string
      | number
      | boolean
      | Record<string, any>
      | (string | number | boolean | Record<string, any>)[]
      | undefined,
  ]
}>()

// 合并 selectProps：优先使用权限级别的配置，回退到全局配置
const mergedSelectProps = computed(() => {
  return {
    ...props.selectProps,
    ...props.permissionSelectProps,
  }
})

// 使用 select 的 props 处理器来支持灵活的数据格式
const { getLabel, getValue } = useSelectProps(mergedSelectProps as any)

// 获取选项的 props
const getOptionProps = (option: Record<string, any>) => ({
  label: getLabel(option),
  value: getValue(option),
})

// 计算实际的禁用状态（存在继承关系时必须禁用）
const effectiveDisabled = computed(
  () => props.disabled || props.inherit !== InheritState.NONE
)

// 单选值（支持 string | number | boolean | object）
const localValue = ref<
  string | number | boolean | Record<string, any> | undefined
>()

// 多选值（支持基础类型和对象的数组）
const localMultiValue = ref<
  (string | number | boolean | Record<string, any>)[]
>([])

// v-model 绑定的计算属性
const selectValue = computed({
  get: () => (props.multiple ? localMultiValue.value : localValue.value),
  set: (val) => {
    if (props.multiple) {
      localMultiValue.value = val as (
        | string
        | number
        | boolean
        | Record<string, any>
      )[]
    } else {
      localValue.value = val as
        | string
        | number
        | boolean
        | Record<string, any>
        | undefined
    }
  },
})

// 初始化本地值
watch(
  () => props.modelValue,
  (val) => {
    if (props.multiple) {
      localMultiValue.value = Array.isArray(val)
        ? val
        : val !== undefined
          ? [val]
          : []
    } else {
      localValue.value = Array.isArray(val) ? val[0] : val
    }
  },
  { immediate: true }
)

// 监听继承状态变化，有继承时清空值
watch(
  () => props.inherit,
  (inherit) => {
    if (inherit !== InheritState.NONE) {
      localValue.value = undefined
      localMultiValue.value = []
    }
  },
  { immediate: true }
)

// 处理单选变更
const handleChange = (
  val: string | number | boolean | Record<string, any> | undefined
) => {
  emit('change', val)
}

// 处理多选变更
const handleMultiChange = (
  val: (string | number | boolean | Record<string, any>)[]
) => {
  emit('change', val)
}
</script>
