import { shallowRef } from 'vue'
import { tryOnScopeDispose } from '@vueuse/core'

import type { SearchHandler } from '../types'

/**
 * @description 管理搜索处理器注册表的组合式函数
 *
 * 此组合式函数维护不同 Tab 的搜索处理器注册表。
 * 每个 Tab 可以注册自己的搜索处理器,当用户在搜索输入框中输入时将被调用。
 *
 * @example
 * ```ts
 * const { registerSearchHandler, getSearchHandler } = useSearchRegistry()
 *
 * // 为 Tab 注册处理器
 * registerSearchHandler('cascader', (keyword) => {
 *   console.log('搜索 cascader:', keyword)
 * })
 *
 * // 获取并调用处理器
 * const handler = getSearchHandler('cascader')
 * handler?.('test')
 * ```
 */
export function useSearchRegistry() {
  // 使用 shallowRef 以获得更好的性能,因为不需要深层响应式
  const searchHandlers = shallowRef<Map<string, SearchHandler>>(new Map())

  /**
   * @description 为特定 Tab 注册搜索处理器
   * @param tabKey - Tab 的唯一标识
   * @param handler - 搜索处理器函数
   */
  const registerSearchHandler = (
    tabKey: string,
    handler: SearchHandler
  ): void => {
    searchHandlers.value.set(tabKey, handler)
  }

  /**
   * @description 注销特定 Tab 的搜索处理器
   * @param tabKey - Tab 的唯一标识
   */
  const unregisterSearchHandler = (tabKey: string): void => {
    searchHandlers.value.delete(tabKey)
  }

  /**
   * @description 获取特定 Tab 的搜索处理器
   * @param tabKey - Tab 的唯一标识
   * @returns 搜索处理器函数,如果未找到则返回 undefined
   */
  const getSearchHandler = (tabKey: string): SearchHandler | undefined => {
    return searchHandlers.value.get(tabKey)
  }

  /**
   * @description 检查特定 Tab 的搜索处理器是否存在
   * @param tabKey - Tab 的唯一标识
   * @returns 如果处理器存在返回 true,否则返回 false
   */
  const hasSearchHandler = (tabKey: string): boolean => {
    return searchHandlers.value.has(tabKey)
  }

  /**
   * @description 清空所有已注册的搜索处理器
   */
  const clearSearchHandlers = (): void => {
    searchHandlers.value.clear()
  }

  // 组件卸载时自动清理
  tryOnScopeDispose(() => {
    clearSearchHandlers()
  })

  return {
    /**
     * @description 为 Tab 注册搜索处理器
     */
    registerSearchHandler,
    /**
     * @description 注销 Tab 的搜索处理器
     */
    unregisterSearchHandler,
    /**
     * @description 获取 Tab 的搜索处理器
     */
    getSearchHandler,
    /**
     * @description 检查搜索处理器是否存在
     */
    hasSearchHandler,
    /**
     * @description 清空所有已注册的处理器
     */
    clearSearchHandlers,
  }
}

export type UseSearchRegistryReturn = ReturnType<typeof useSearchRegistry>
