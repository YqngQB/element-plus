<template>
  <div class="m-4">
    <p>default</p>
    <el-select-v2
      v-model="value1"
      :options="options"
      multiple
      filterable
      placeholder="Select"
      style="width: 240px"
    />
  </div>
  <div class="m-4">
    <p>use collapse-tags</p>
    <el-select-v2
      v-model="value2"
      :options="options"
      multiple
      filterable
      collapse-tags
      placeholder="Select"
      style="width: 240px"
    />
  </div>
  <div class="m-4">
    <p>use collapse-tags-tooltip</p>
    <el-select-v2
      v-model="value3"
      :options="options"
      filterable
      multiple
      collapse-tags
      collapse-tags-tooltip
      placeholder="Select"
      style="width: 240px"
    />
  </div>
  <div class="m-4">
    <p>use max-collapse-tags</p>
    <el-select-v2
      v-model="value4"
      :options="options"
      multiple
      collapse-tags
      collapse-tags-tooltip
      :max-collapse-tags="3"
      placeholder="Select"
      style="width: 240px"
    />
  </div>
  <div class="m-4">
    <p>自定义标签 2.5.0</p>
    <el-select-v2
      v-model="value"
      :options="colors"
      filterable
      multiple
      placeholder="Select"
      style="width: 240px"
    >
      <template #default="{ item }">
        <div class="flex items-center">
          <el-tag :color="item.value" style="margin-right: 8px" size="small" />
          <span :style="{ color: item.value }">{{ item.label }}</span>
        </div>
      </template>
      <template #tag="{ data }">
        <el-tag v-for="(color, index) in value" :key="color" :color="color">
          {{ data[index] }}
        </el-tag>
      </template>
    </el-select-v2>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

const value1 = ref([])
const value2 = ref([])
const value3 = ref([])
const value4 = ref([])
const options = [
  { value: 'frontend', label: 'Frontend 开发' },
  { value: 'backend', label: 'Backend 开发' },
  { value: 'devops', label: 'DevOps 工程师' },
  { value: 'uiux', label: 'UI/UX 设计' },
  { value: 'qa', label: '测试工程师' },
  { value: 'datasci', label: '数据科学家' },
  { value: 'product', label: '产品经理' },
  { value: 'marketing', label: '市场/运营' },
  { value: 'sales', label: '销售' },
  { value: 'hr', label: '人力资源' },
  { value: 'nm', label: '24小时超长待机随叫随到纯牛马' },
]

const value = ref<string[]>([])
const colors = [
  {
    value: '#E63415',
    label: 'red',
  },
  {
    value: '#FF6600',
    label: 'orange',
  },
  {
    value: '#FFDE0A',
    label: 'yellow',
  },
  {
    value: '#1EC79D',
    label: 'green',
  },
  {
    value: '#14CCCC',
    label: 'cyan',
  },
  {
    value: '#4167F0',
    label: 'blue',
  },
  {
    value: '#6222C9',
    label: 'purple',
  },
]
colors.forEach((color) => {
  value.value.push(color.value)
})
</script>
