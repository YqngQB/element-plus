import { computed, nextTick, ref, watch } from 'vue'
import { debounce } from 'lodash-unified'
import { isPromise } from '@element-plus/utils'
import { useSearchRegistry } from './use-search-registry'
import { provideCascaderTabsContext } from './use-cascader-tabs-context'

import type {
  CascaderNode,
  CascaderValue,
  Tag,
} from '@element-plus/components/cascader-panel'
import type { SelectResult, TabConfig, TabName } from '../types'

/**
 * @description useCascaderTabs 组合式函数的选项
 */
export interface UseCascaderTabsOptions {
  /**
   * @description Tabs 配置
   */
  tabs: TabConfig[]
  /**
   * @description 默认激活的 Tab key
   */
  defaultActiveTab?: string
  /**
   * @description 是否可搜索选项
   */
  filterable?: boolean
  /**
   * @description 输入过滤关键字时的防抖延迟(毫秒)
   */
  debounce?: number
  /**
   * @description 过滤前的钩子函数
   */
  beforeFilter?: (value: string) => boolean | Promise<any>
  /**
   * @description 切换 Tab 时是否清空搜索关键字
   */
  clearKeywordOnTabChange?: boolean
  /**
   * @description 切换 Tab 时是否关闭弹出层
   */
  closeOnTabChange?: boolean
  /**
   * @description 选项标签分隔符
   */
  separator?: string
  /**
   * @description 是否在输入框中显示选中值的完整路径
   */
  showAllLevels?: boolean
  /**
   * @description 是否为多选模式
   */
  multiple?: boolean
  /**
   * @description 是否禁用
   */
  isDisabled?: boolean
  /**
   * @description 更新 model 值的触发函数
   */
  emitModelValue?: (value: CascaderValue) => void
  /**
   * @description change 事件的触发函数
   */
  emitChange?: (value: CascaderValue) => void
  /**
   * @description Tab 切换事件的触发函数
   */
  emitTabChange?: (name: TabName) => void
  /**
   * @description 移除标签事件的触发函数
   */
  emitRemoveTag?: (value: CascaderValue) => void
  /**
   * @description 获取当前 model 值的函数（保持响应式）
   */
  initialModelValue?: () => CascaderValue | undefined
}

/**
 * @description CascaderTabs 组件的核心组合式函数
 *
 * 此组合式函数管理 CascaderTabs 组件的核心状态和逻辑,
 * 包括弹出层可见性、激活的 Tab、搜索关键字和选择处理。
 *
 * @param options - 配置选项
 *
 * @example
 * ```ts
 * const {
 *   popperVisible,
 *   activeTab,
 *   keyword,
 *   inputValue,
 *   displayValue,
 *   togglePopperVisible,
 *   handleSelect
 * } = useCascaderTabs({
 *   tabs: tabsConfig,
 *   filterable: true,
 *   debounce: 300
 * })
 * ```
 */
export function useCascaderTabs(options: UseCascaderTabsOptions) {
  const {
    tabs,
    defaultActiveTab,
    filterable = false,
    debounce: debounceDelay = 300,
    beforeFilter = () => true,
    clearKeywordOnTabChange = false,
    closeOnTabChange = false,
    separator = ' / ',
    showAllLevels = true,
    multiple = false,
    isDisabled = false,
    emitModelValue,
    emitChange,
    emitTabChange,
    emitRemoveTag,
    initialModelValue,
  } = options

  // ========== State Management ==========

  /**
   * @description Popper visibility state
   */
  const popperVisible = ref(false)

  /**
   * @description Current active tab key
   */
  const activeTab = ref<string>(
    defaultActiveTab || (tabs.length > 0 ? tabs[0].key : '')
  )

  /**
   * @description Current search keyword
   */
  const keyword = ref('')

  /**
   * @description Input box value
   */
  const inputValue = ref('')

  /**
   * @description Search input value (for multiple mode)
   */
  const searchInputValue = ref('')

  /**
   * @description Selected value
   * 使用 computed 属性实现响应式同步，参考 Cascader 的 checkedValue 实现
   */
  const selectedValue = computed<CascaderValue | undefined>({
    get() {
      return initialModelValue ? initialModelValue() : undefined
    },
    set(val) {
      if (emitModelValue) emitModelValue(val as CascaderValue)
      if (emitChange) emitChange(val as CascaderValue)
    },
  })

  /**
   * @description Selected nodes
   */
  const selectedNodes = ref<CascaderNode[]>([])

  /**
   * @description Tags for multiple mode
   */
  const tags = ref<Tag[]>([])

  /**
   * @description Whether currently in search filtering mode
   */
  const isFiltering = ref(false)

  // ========== Search Registry ==========

  const { registerSearchHandler, unregisterSearchHandler, getSearchHandler } =
    useSearchRegistry()

  // ========== Computed Properties ==========

  /**
   * @description Display value for input
   */
  const displayValue = computed(() => {
    if (!selectedNodes.value.length) return ''

    if (multiple) {
      return ''
    }

    const node = selectedNodes.value[0]
    return node ? formatNodeText(node) : ''
  })

  /**
   * @description Current search keyword based on mode
   */
  const searchKeyword = computed(() =>
    multiple ? searchInputValue.value : inputValue.value
  )

  // ========== Helper Functions ==========

  /**
   * @description Format node text for display
   */
  const formatNodeText = (node: CascaderNode): string => {
    return node.calcText(showAllLevels, separator)
  }

  /**
   * @description Format display value for selected nodes
   */
  const formatDisplayValue = (nodes: CascaderNode[]): string => {
    if (!nodes.length) return ''

    if (multiple) {
      return ''
    }

    return formatNodeText(nodes[0])
  }

  /**
   * @description Generate tag object from node
   */
  const genTag = (node: CascaderNode): Tag => {
    return {
      node,
      key: node.uid,
      text: node.calcText(showAllLevels, separator),
      hitState: false,
      closable: !isDisabled && !node.isDisabled,
    }
  }

  // ========== Popper Management ==========

  /**
   * @description Toggle popper visibility
   */
  const togglePopperVisible = (visible?: boolean): void => {
    const newVisible = visible ?? !popperVisible.value

    if (newVisible !== popperVisible.value) {
      popperVisible.value = newVisible

      if (newVisible) {
        // 当打开面板时,如果没有搜索关键字,确保不处于过滤状态
        if (!keyword.value) {
          isFiltering.value = false
        }
      } else if (filterable) {
        // 当关闭面板时,同步显示值
        syncInputValue()
      }
    }
  }

  /**
   * @description Sync input value with display value
   */
  const syncInputValue = (): void => {
    const value = displayValue.value
    inputValue.value = value
    searchInputValue.value = value
    keyword.value = ''
    isFiltering.value = false
  }

  // ========== Tab Management ==========

  /**
   * @description Handle tab change
   */
  const handleTabChange = (tabKey: TabName): void => {
    activeTab.value = String(tabKey)

    if (clearKeywordOnTabChange) {
      keyword.value = ''
      inputValue.value = displayValue.value
      searchInputValue.value = displayValue.value
      isFiltering.value = false
    }

    if (closeOnTabChange) {
      togglePopperVisible(false)
    }

    emitTabChange?.(tabKey)
  }

  // ========== Search Management ==========

  /**
   * @description Handle search input
   */
  const handleSearchInput = (value: string): void => {
    keyword.value = value

    if (!value) {
      isFiltering.value = false
      return
    }

    if (!filterable) return

    handleFilterDebounced()
  }

  /**
   * @description Handle filter logic
   */
  const handleFilter = (): void => {
    const { value } = keyword

    if (!value) {
      isFiltering.value = false
      return
    }

    const passed = beforeFilter(value)

    if (isPromise(passed)) {
      passed
        .then(() => {
          dispatchSearch(value)
        })
        .catch(() => {
          isFiltering.value = false
        })
    } else if (passed !== false) {
      dispatchSearch(value)
    } else {
      isFiltering.value = false
    }
  }

  /**
   * @description Dispatch search to active tab's handler
   */
  const dispatchSearch = (searchValue: string): void => {
    const handler = getSearchHandler(activeTab.value)

    if (handler) {
      isFiltering.value = true
      const result = handler(searchValue)

      if (isPromise(result)) {
        result.catch(() => {
          isFiltering.value = false
        })
      }
    } else {
      isFiltering.value = false
    }
  }

  /**
   * @description Debounced filter handler
   */
  const handleFilterDebounced = debounce(handleFilter, debounceDelay)

  // ========== Selection Management ==========

  /**
   * @description Handle selection from any tab
   */
  const handleSelect = (result: SelectResult): void => {
    const { value, nodes = [], labels, silent = false } = result

    // 如果没有传递 nodes 但传递了 labels，创建临时节点对象
    let actualNodes = nodes
    if (nodes.length === 0 && labels) {
      actualNodes = createTempNodesFromLabels(value, labels)
    }

    // Update selected nodes
    selectedNodes.value = actualNodes

    // Emit events
    // silent 模式：只更新 v-model，不触发 change 事件
    // 非 silent 模式：同时更新 v-model 和触发 change 事件
    if (!silent) {
      emitModelValue?.(value)
      emitChange?.(value)
    } else {
      emitModelValue?.(value)
    }

    // Close popper if not in multiple mode
    if (!multiple) {
      nextTick(() => {
        togglePopperVisible(false)
      })
    }

    // Clear search state
    keyword.value = ''
    isFiltering.value = false
  }

  /**
   * @description Sync input value with display value
   * Similar to cascader's syncPresentTextValue
   */
  const syncPresentTextValue = (): void => {
    const { value } = displayValue
    inputValue.value = value
    searchInputValue.value = value
  }

  /**
   * @description Calculate and update tags for multiple mode
   */
  const calculatePresentTags = (): void => {
    if (!multiple) return

    const nodes = selectedNodes.value
    const allTags: Tag[] = []
    nodes.forEach((node) => allTags.push(genTag(node)))
    tags.value = allTags
  }

  /**
   * @description Create temporary nodes from labels for custom tabs
   */
  const createTempNodesFromLabels = (
    value: CascaderValue,
    labels: string | string[]
  ): CascaderNode[] => {
    // 处理空值情况
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return []
    }

    const labelArray = Array.isArray(labels) ? labels : [labels]
    const valueArray = Array.isArray(value)
      ? Array.isArray(value[0])
        ? (value as any[][])
        : [value as any[]]
      : [[value]]

    return valueArray.map((val, index) => {
      const label = labelArray[index] || String(val)
      // 创建一个类 CascaderNode 的临时对象
      return {
        uid: Date.now() + index,
        value: Array.isArray(val) ? val[val.length - 1] : val,
        valueByOption: val,
        label,
        pathLabels: [label],
        calcText: () => label,
        doCheck: () => {},
      } as unknown as CascaderNode
    })
  }

  /**
   * @description Delete a tag in multiple mode
   */
  const deleteTag = (tag: Tag): void => {
    const node = tag.node as CascaderNode

    // 调用 Panel 的方法取消选中
    node.doCheck(false)

    // 计算新值
    const newNodes = selectedNodes.value.filter((n) => n.uid !== node.uid)
    const newValue = newNodes.map((n) => n.valueByOption)

    // 通过 handleSelect 统一处理，触发正常的 change 事件
    handleSelect({
      value: newValue as CascaderValue,
      nodes: newNodes,
      silent: false, // 非静默模式，触发 change 事件
    })

    // 触发 removeTag 事件
    emitRemoveTag?.(node.valueByOption)
  }

  /**
   * @description Clear selection
   */
  const handleClear = (): void => {
    selectedValue.value = undefined
    selectedNodes.value = []
    tags.value = []
    inputValue.value = ''
    searchInputValue.value = ''
    keyword.value = ''
    isFiltering.value = false

    emitModelValue?.(undefined as any)
    emitChange?.(undefined as any)
  }

  // ========== Watchers ==========

  /**
   * @description Watch keyword changes to trigger search
   * 只监听 keyword，不监听 searchKeyword，避免选择值后触发搜索
   */
  watch(keyword, (value) => {
    if (value !== undefined) {
      handleSearchInput(value)
    }
  })

  /**
   * @description Watch display value changes to sync input
   * Similar to cascader: watch(presentText, syncPresentTextValue, { immediate: true })
   */
  watch(displayValue, syncPresentTextValue, { immediate: true })

  /**
   * @description Watch selected nodes to update tags in multiple mode
   */
  watch(selectedNodes, calculatePresentTags, { deep: true })

  /**
   * @description Watch active tab changes
   */
  watch(activeTab, () => {
    // Tab change logic is handled in handleTabChange
  })

  // ========== Context Provider ==========

  /**
   * @description Provide context to child tab panels
   */
  provideCascaderTabsContext({
    activeTab,
    keyword,
    selectedValue,
    onSelect: handleSelect,
    registerSearchHandler,
    unregisterSearchHandler,
  })

  // ========== Return API ==========

  return {
    // State
    popperVisible,
    activeTab,
    keyword,
    inputValue,
    searchInputValue,
    displayValue,
    selectedValue,
    selectedNodes,
    isFiltering,
    tags,
    searchKeyword,

    // Methods
    togglePopperVisible,
    handleTabChange,
    handleSearchInput,
    handleSelect,
    handleClear,
    syncInputValue,
    deleteTag,
    registerSearchHandler,
    unregisterSearchHandler,
    formatDisplayValue,
  }
}

export type UseCascaderTabsReturn = ReturnType<typeof useCascaderTabs>
