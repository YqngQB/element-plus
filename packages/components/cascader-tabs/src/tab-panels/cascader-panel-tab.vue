<template>
  <el-cascader-panel
    v-show="!filtering"
    ref="panelRef"
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

// 当 panel 挂载且有初始值时,同步 nodes 到父组件
onMounted(() => {
  // 如果有初始值且 panel 已准备好,通知父组件更新 selectedNodes
  if (selectedValue.value && panelRef.value?.checkedNodes) {
    const nodes = panelRef.value.checkedNodes
    if (nodes.length > 0) {
      // 通过 onSelect 通知父组件,这样会触发 selectedNodes 的更新
      // 使用 silent 模式不触发 change 事件
      onSelect({
        value: selectedValue.value,
        nodes: nodes as CascaderNode[],
        tabKey: props.tabKey,
        silent: true, // 初始化时不触发 change 事件
      })
    }
  }
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

// 注册搜索处理器
onMounted(() => {
  registerSearchHandler(props.tabKey, handleSearch)
})

// 注销搜索处理器
onBeforeUnmount(() => {
  unregisterSearchHandler(props.tabKey)
})

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
