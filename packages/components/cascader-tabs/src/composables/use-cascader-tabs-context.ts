import { inject, provide, readonly } from 'vue'

import type { InjectionKey, Ref } from 'vue'
import type { SearchHandler, SelectResult, TabPanelContext } from '../types'

/**
 * @description Cascader Tabs 上下文的注入键
 */
export const CASCADER_TABS_CONTEXT_KEY: InjectionKey<TabPanelContext> = Symbol(
  'cascaderTabsContext'
)

/**
 * @description 提供 Cascader Tabs 上下文的选项
 */
export interface ProvideCascaderTabsContextOptions {
  /**
   * @description 当前激活的 Tab key
   */
  activeTab: Ref<string>
  /**
   * @description 当前搜索关键字
   */
  keyword: Ref<string>
  /**
   * @description 当前选中的值
   */
  selectedValue: Ref<any>
  /**
   * @description 选择值时的回调函数
   */
  onSelect: (result: SelectResult) => void
  /**
   * @description 为 Tab 注册搜索处理器
   */
  registerSearchHandler: (tabKey: string, handler: SearchHandler) => void
  /**
   * @description 注销 Tab 的搜索处理器
   */
  unregisterSearchHandler: (tabKey: string) => void
}

/**
 * @description 向子组件提供 Cascader Tabs 上下文
 *
 * 此函数创建并提供一个上下文,子 Tab 面板可以注入该上下文
 * 以与父 CascaderTabs 组件进行交互。
 *
 * @param options - 上下文选项
 *
 * @example
 * ```ts
 * // 在父组件中
 * const { provideCascaderTabsContext } = useCascaderTabsContext()
 *
 * provideCascaderTabsContext({
 *   activeTab,
 *   keyword,
 *   onSelect: handleSelect,
 *   registerSearchHandler,
 *   unregisterSearchHandler
 * })
 * ```
 */
export function provideCascaderTabsContext(
  options: ProvideCascaderTabsContextOptions
): void {
  const context: TabPanelContext = {
    // 使用 readonly 防止子组件直接修改父组件状态
    activeTab: readonly(options.activeTab),
    keyword: readonly(options.keyword),
    selectedValue: readonly(options.selectedValue),
    onSelect: options.onSelect,
    registerSearchHandler: options.registerSearchHandler,
    unregisterSearchHandler: options.unregisterSearchHandler,
  }

  provide(CASCADER_TABS_CONTEXT_KEY, context)
}

/**
 * @description Inject cascader tabs context from parent component
 *
 * This function allows child tab panels to access the parent context.
 *
 * @returns The cascader tabs context or undefined if not provided
 *
 * @example
 * ```ts
 * // In child tab panel component
 * const context = injectCascaderTabsContext()
 *
 * if (context) {
 *   // Register search handler
 *   context.registerSearchHandler('my-tab', (keyword) => {
 *     console.log('Searching with:', keyword)
 *   })
 *
 *   // Handle selection
 *   context.onSelect({
 *     value: selectedValue,
 *     nodes: selectedNodes,
 *     tabKey: 'my-tab'
 *   })
 * }
 * ```
 */
export function injectCascaderTabsContext(): TabPanelContext | undefined {
  return inject(CASCADER_TABS_CONTEXT_KEY, undefined)
}

/**
 * @description Composable for cascader tabs context management
 *
 * This combines both provide and inject functionality for easier usage.
 *
 * @example
 * ```ts
 * // Parent component
 * const { provide: provideContext } = useCascaderTabsContext()
 * provideContext({ activeTab, keyword, onSelect, ... })
 *
 * // Child component
 * const { inject: injectContext } = useCascaderTabsContext()
 * const context = injectContext()
 * ```
 */
export function useCascaderTabsContext() {
  return {
    /**
     * @description Provide context to children
     */
    provide: provideCascaderTabsContext,
    /**
     * @description Inject context from parent
     */
    inject: injectCascaderTabsContext,
    /**
     * @description Context injection key
     */
    contextKey: CASCADER_TABS_CONTEXT_KEY,
  }
}
