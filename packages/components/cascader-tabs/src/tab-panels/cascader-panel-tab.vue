<template>
  <el-cascader-panel
    v-show="!filtering"
    :ref="handleRef"
    v-model="checkedValue"
    :options="options"
    :props="panelProps"
    :border="false"
    :render-label="renderLabel"
    @expand-change="handleExpandChange"
  >
    <template #empty>
      <slot name="empty" />
    </template>
  </el-cascader-panel>

  <el-scrollbar
    v-show="filtering"
    ref="suggestionPanel"
    tag="ul"
    :class="ns.e('suggestion-panel')"
    :view-class="ns.e('suggestion-list')"
  >
    <template v-if="suggestions.length">
      <li
        v-for="item in suggestions"
        :key="item.uid"
        :class="[ns.e('suggestion-item'), ns.is('checked', item.checked)]"
        :tabindex="-1"
        @click="handleSuggestionClick(item)"
      >
        <span>{{ item.text }}</span>
        <el-icon v-if="item.checked">
          <check />
        </el-icon>
      </li>
    </template>
    <li v-else :class="ns.e('empty-text')">
      {{ t('el.cascader.noMatch') }}
    </li>
  </el-scrollbar>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ElCascaderPanel from '@element-plus/components/cascader-panel'
import ElScrollbar from '@element-plus/components/scrollbar'
import ElIcon from '@element-plus/components/icon'
import { Check } from '@element-plus/icons-vue'
import { useLocale, useNamespace } from '@element-plus/hooks'
import { injectCascaderTabsContext } from '../composables/use-cascader-tabs-context'

import type {
  CascaderNode,
  CascaderPanelInstance,
  CascaderValue,
  RenderLabel,
} from '@element-plus/components/cascader-panel'
import type { ScrollbarInstance } from '@element-plus/components/scrollbar'

defineOptions({
  name: 'ElCascaderPanelTab',
})

const props = withDefaults(
  defineProps<{
    /**
     * @description Tab key for registration
     */
    tabKey: string
    /**
     * @description Data of the options
     */
    options?: any[]
    /**
     * @description Configuration options for cascader panel
     */
    panelProps?: Record<string, any>
    /**
     * @description Custom render function for label
     */
    renderLabel?: RenderLabel
    /**
     * @description Filter method
     */
    filterMethod?: (node: CascaderNode, keyword: string) => boolean
    /**
     * @description Whether to show all levels in the input
     */
    showAllLevels?: boolean
    /**
     * @description Separator for levels
     */
    separator?: string
  }>(),
  {
    options: () => [],
    panelProps: () => ({}),
    filterMethod: (node: CascaderNode, keyword: string) =>
      node.text.includes(keyword),
    showAllLevels: true,
    separator: ' / ',
  }
)

const ns = useNamespace('cascader-tabs')
const { t } = useLocale()

// 初始化时还原选中状态
let isInit = true
const handleRef = (el: any) => {
  panelRef.value = el
  if (el && isInit) {
    syncCheckedNodesToParent(
      selectedValue.value ?? (props.panelProps?.multiple ? [] : ''),
      true
    )
  }
  isInit = false
}

const panelRef = ref<CascaderPanelInstance>()
const suggestionPanel = ref<ScrollbarInstance>()
const filtering = ref(false)
const suggestions = ref<CascaderNode[]>([])

// 注入父组件上下文
const context = injectCascaderTabsContext()

if (!context) {
  throw new Error('[ElCascaderPanelTab]: must be used inside ElCascaderTabs')
}

const {
  activeTab,
  keyword,
  selectedValue,
  onSelect,
  registerSearchHandler,
  unregisterSearchHandler,
} = context

const isActive = computed(() => activeTab.value === props.tabKey)

// 使用可写的 computed 实现双向绑定，类似 cascader.vue
const checkedValue = computed<CascaderValue>({
  get() {
    return selectedValue.value ?? (props.panelProps?.multiple ? [] : '')
  },
  set(val) {
    // 获取当前选中的节点
    const nodes = panelRef.value?.checkedNodes || []

    // 通知父组件更新
    onSelect({
      value: val,
      nodes: nodes as CascaderNode[],
      tabKey: props.tabKey,
    })
  },
})

// 注册和注销搜索处理器在组件挂载/卸载时执行
onMounted(() => {
  registerSearchHandler(props.tabKey, handleSearch)
})

onBeforeUnmount(() => {
  unregisterSearchHandler(props.tabKey)
})

/**
 * @description Calculate search suggestions
 */
const calculateSuggestions = (searchKeyword: string): void => {
  if (!searchKeyword) {
    filtering.value = false
    suggestions.value = []
    return
  }

  const { showAllLevels, separator, filterMethod } = props
  const res = panelRef.value
    ?.getFlattedNodes(!props.panelProps?.checkStrictly)
    ?.filter((node) => {
      if (node.isDisabled) return false
      node.calcText(showAllLevels, separator)
      return filterMethod(node, searchKeyword)
    })

  filtering.value = true
  suggestions.value = res || []
}

/**
 * @description Handle search filtering
 */
const handleSearch = (searchKeyword: string): void => {
  calculateSuggestions(searchKeyword)
}

/**
 * @description Handle suggestion item click
 */
const handleSuggestionClick = (node: CascaderNode): void => {
  const { checked } = node
  const isMultiple = props.panelProps?.multiple

  if (isMultiple) {
    panelRef.value?.handleCheckChange(node, !checked, false)
  } else {
    if (!checked) {
      panelRef.value?.handleCheckChange(node, true, false)
    }
    // 单选模式下，选择后触发 change，由父组件处理关闭逻辑
  }
}

/**@description Handle expand change
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handleExpandChange = (_value: CascaderValue): void => {
  // 可以emit事件通知父组件
}

/**
 * @description Handle value change
 */
/**
 * @description Get checked nodes
 */
const getCheckedNodes = (leafOnly = false) => {
  return panelRef.value?.getCheckedNodes(leafOnly)
}

/**
 * @description Clear checked nodes
 */
const clearCheckedNodes = () => {
  panelRef.value?.clearCheckedNodes()
}

// 监听 keyword 变化,当此 tab 激活时处理搜索
watch(
  () => [keyword.value, isActive.value],
  ([newKeyword, active]) => {
    if (active && typeof newKeyword === 'string') {
      handleSearch(newKeyword)
    }
  },
  { immediate: true }
)

// 防抖标志位，避免循环触发
let isUpdatingNodes = false

const syncCheckedNodesToParent = (
  value: CascaderValue,
  silent = true
): void => {
  if (!panelRef.value) return

  const nodes = panelRef.value.checkedNodes || []

  // 关键修复：只有当找到了节点时才同步
  // 如果 value 有值但 nodes 为空，说明这个 tab 的数据结构不匹配，不应该覆盖其他 tab 的结果
  // 例外：如果 value 本身为空，则应该同步（清空操作）
  const hasValue = value && (Array.isArray(value) ? value.length > 0 : true)
  if (hasValue && nodes.length === 0) {
    // 有值但找不到节点，说明不是这个 tab 的数据，跳过
    return
  }

  onSelect({
    value: value ?? (props.panelProps?.multiple ? [] : ''),
    nodes: nodes as CascaderNode[],
    tabKey: props.tabKey,
    silent,
  })
}

// 监听 selectedValue 变化,同步 nodes 到父组件
// 关键修复：
// 1. 移除 isActive 限制 - 所有 tab 都应该同步，否则第一次加载非激活 tab 的数据会丢失
// 2. 使用 immediate: true - 确保组件初始化时就同步
// 3. 使用 nextTick - 等待 Panel 内部的 watch 执行完成
// 4. 添加防抖机制 - 避免重复触发和循环调用
watch(
  () => checkedValue.value,
  (newValue, oldValue) => {
    // 防止循环触发
    if (isUpdatingNodes) return

    // 值未变化则跳过
    if (JSON.stringify(newValue) === JSON.stringify(oldValue)) return

    if (!panelRef.value) return

    isUpdatingNodes = true
    // nextTick(() => {
    syncCheckedNodesToParent(
      newValue ?? (props.panelProps?.multiple ? [] : ''),
      true
    )
    isUpdatingNodes = false
    // })
  },
  { deep: true, flush: 'post', immediate: true }
)

defineExpose({
  /**
   * @description Get checked nodes
   */
  getCheckedNodes,
  /**
   * @description Clear checked nodes
   */
  clearCheckedNodes,
  /**
   * @description Panel ref
   */
  panelRef,
})
</script>
