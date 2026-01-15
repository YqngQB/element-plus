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
        v-model="localValue"
        :multiple="multiple"
        :disabled="disabled"
        :placeholder="placeholder"
        :options="options"
        filterable
        collapse-tags
        collapse-tags-tooltip
        size="small"
        class="el-constraint-config__select"
        @change="handleChange"
      >
        <el-option
          v-for="option in options"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
    </template>

    <!-- 其他类型：预留插槽 -->
    <template v-else-if="constraintType !== ConstraintType.NONE">
      <slot
        :type="constraintType"
        :value="modelValue"
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
import { ref, watch } from 'vue'
import { ElOption, ElSelect } from '@element-plus/components/select'
import { ConstraintType } from '../types'

import type { OptionItem } from '../types'

defineOptions({
  name: 'ElConstraintConfig',
})

const props = withDefaults(
  defineProps<{
    /** 约束类型 */
    constraintType?: ConstraintType
    /** 当前值 */
    modelValue?: string | number | (string | number)[]
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
  }>(),
  {
    constraintType: ConstraintType.NONE,
    modelValue: undefined,
    options: () => [],
    multiple: false,
    disabled: false,
    placeholder: '请选择',
  }
)

const emit = defineEmits<{
  'update:modelValue': [
    value: string | number | (string | number)[] | undefined,
  ]
  change: [value: string | number | (string | number)[] | undefined]
}>()

// 单选值
const localValue = ref<string | number | undefined>()

// 多选值
const localMultiValue = ref<(string | number)[]>([])

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

// 处理单选变更
const handleChange = (val: (string | number | boolean)[]) => {
  // 实际业务中后端不接受布尔值，需过滤掉
  const normalizedVal = val.filter(
    (v): v is string | number => typeof v !== 'boolean'
  )
  emit('update:modelValue', normalizedVal)
  emit('change', normalizedVal)
}
</script>
