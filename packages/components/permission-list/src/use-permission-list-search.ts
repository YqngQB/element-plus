import { computed, ref, watch } from 'vue'

import type { ComputedRef, Ref } from 'vue'
import type { DialogPermissionItem } from './types'

export interface HighlightPart {
  text: string
  highlighted: boolean
}

export interface UsePermissionListSearchReturn {
  /** 当前搜索关键词 */
  searchKeyword: Ref<string>
  /** 匹配的数据行索引列表（升序排列） */
  matchedRowIndices: ComputedRef<number[]>
  /** 当前导航游标（matchedRowIndices 中的下标，-1 表示无匹配或未搜索） */
  currentMatchIndex: Ref<number>
  /** 匹配总行数 */
  matchCount: ComputedRef<number>
  /**
   * 执行搜索：设置关键词并跳转到第一个匹配行
   * @param keyword 搜索关键词（空字符串等同于 clearSearch）
   */
  search: (keyword: string) => void
  /** 跳转到下一个匹配行（环形） */
  nextMatch: () => void
  /** 跳转到上一个匹配行（环形） */
  prevMatch: () => void
  /** 清除搜索关键词，重置状态 */
  clearSearch: () => void
  /**
   * 将文本按关键词拆分为高亮分段，用于安全渲染（无需 v-html）
   * 无关键词时返回 [{ text, highlighted: false }]
   */
  splitHighlight: (text: string) => HighlightPart[]
}

/**
 * 转义正则表达式特殊字符，防止用户输入破坏 RegExp 构造
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * PermissionList 搜索 hook
 *
 * 负责：
 * 1. 根据关键词计算匹配行索引
 * 2. 维护上下导航游标
 * 3. 触发滚动（通过外部传入的 scrollToIndex 回调）
 * 4. 提供文本高亮分段工具函数
 *
 * 与 UI 完全解耦：调用方自行实现搜索输入框与导航按钮，只需调用 hook 暴露的方法。
 *
 * @param data 列表数据（响应式）
 * @param scrollToIndex 将虚拟列表滚动到指定数据行索引的回调
 */
export function usePermissionListSearch(
  data: Ref<DialogPermissionItem[]> | ComputedRef<DialogPermissionItem[]>,
  scrollToIndex: (index: number) => void,
  options?: {
    /**
     * 额外文本提取函数：从每条数据提取搜索用的附加文本（如插槽列字段）
     * 返回空字符串表示该行无附加可搜索内容
     */
    extraSearchText?: (item: DialogPermissionItem) => string
  }
): UsePermissionListSearchReturn {
  const searchKeyword = ref('')
  const currentMatchIndex = ref(-1)

  // 计算匹配行（行标题或任意子权限标题含关键词）
  const matchedRowIndices = computed<number[]>(() => {
    const keyword = searchKeyword.value.trim()
    if (!keyword) return []

    const regex = new RegExp(escapeRegExp(keyword), 'i')
    const result: number[] = []

    data.value.forEach((item, index) => {
      const labelMatch = regex.test(item.label)
      const permMatch = item.permissions?.some((p) => regex.test(p.label))
      const extraMatch = options?.extraSearchText
        ? regex.test(options.extraSearchText(item))
        : false
      if (labelMatch || permMatch || extraMatch) {
        result.push(index)
      }
    })

    return result
  })

  const matchCount = computed(() => matchedRowIndices.value.length)

  // 关键词或数据变化时，重置游标但保留关键词（数据更新后重新定位到第一个匹配）
  // 对比实际内容：避免 searchExtractor 等非稳定依赖导致 computed 重跑后误重置游标
  let prevIndices: number[] = []
  watch(matchedRowIndices, (indices) => {
    const same =
      indices.length === prevIndices.length &&
      indices.every((v, i) => v === prevIndices[i])
    prevIndices = indices
    if (same) return

    if (indices.length > 0) {
      currentMatchIndex.value = 0
      scrollToIndex(indices[0])
    } else {
      currentMatchIndex.value = -1
    }
  })

  /** 执行搜索 */
  const search = (keyword: string) => {
    const trimmed = keyword.trim()
    if (!trimmed) {
      clearSearch()
      return
    }
    searchKeyword.value = trimmed
    // watch(matchedRowIndices) 会自动触发滚动
  }

  /** 跳转到下一个匹配行（环形） */
  const nextMatch = () => {
    const total = matchedRowIndices.value.length
    if (total === 0) return
    const next = (currentMatchIndex.value + 1) % total
    currentMatchIndex.value = next
    scrollToIndex(matchedRowIndices.value[next])
  }

  /** 跳转到上一个匹配行（环形） */
  const prevMatch = () => {
    const total = matchedRowIndices.value.length
    if (total === 0) return
    const prev = (currentMatchIndex.value - 1 + total) % total
    currentMatchIndex.value = prev
    scrollToIndex(matchedRowIndices.value[prev])
  }

  /** 清除搜索 */
  const clearSearch = () => {
    searchKeyword.value = ''
    currentMatchIndex.value = -1
  }

  /**
   * 将文本按关键词拆分为高亮分段
   * 使用纯文本渲染（v-for + 条件标签），避免 v-html 带来 XSS 风险
   */
  const splitHighlight = (text: string): HighlightPart[] => {
    const keyword = searchKeyword.value.trim()
    if (!keyword) return [{ text, highlighted: false }]

    const regex = new RegExp(escapeRegExp(keyword), 'gi')
    const parts: HighlightPart[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          text: text.slice(lastIndex, match.index),
          highlighted: false,
        })
      }
      parts.push({ text: match[0], highlighted: true })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), highlighted: false })
    }

    return parts.length > 0 ? parts : [{ text, highlighted: false }]
  }

  return {
    searchKeyword,
    matchedRowIndices,
    currentMatchIndex,
    matchCount,
    search,
    nextMatch,
    prevMatch,
    clearSearch,
    splitHighlight,
  }
}
