import { ref, shallowRef } from 'vue'

import type { ComputedRef, Ref } from 'vue'
import type { InheritState, PermissionNode } from '../types'

/**
 * 节点信息（用于快速查找）
 */
export interface NodeInfo {
  id: string
  node: PermissionNode
  // 父节点ID
  parentId: string | null
  // 直接子节点ID
  childIds: string[]
  // 所有后代ID（包括叶子权限）
  descendantIds: string[]
  // 所有祖先ID
  ancestorIds: string[]
  // 节点层级（level）：数值越大表示层级越深。1 = 一级目录（根级），2 = 二级目录，3 = 页面，4 = Tab 页，5 = 功能权限点（权限项）
  level: number
  // 该节点自身的权限ID
  permissionIds: string[]
}

/**
 * 级联选择 Composable
 * 高性能实现：使用 Map 进行 O(1) 查找，批量更新减少响应式触发
 */
export function useCascadeSelection(
  data: Ref<PermissionNode[]> | ComputedRef<PermissionNode[]>
) {
  // 节点映射：O(1) 查找
  const nodeMap = shallowRef<Map<string, NodeInfo>>(new Map())

  // 状态存储
  const inheritStates = shallowRef<Map<string, InheritState>>(new Map())
  const grantedStates = shallowRef<Map<string, boolean>>(new Map())

  // 状态版本号（用于触发响应式更新）- 使用 ref 确保响应式追踪
  const stateVersion = ref(0)

  /**
   * 构建节点映射（数据变化时调用）
   */
  const buildNodeMap = () => {
    const map = new Map<string, NodeInfo>()

    const traverse = (
      nodes: PermissionNode[],
      parentId: string | null,
      ancestorIds: string[],
      level: number
    ): string[] => {
      const allDescendants: string[] = []

      for (const node of nodes) {
        const nodeId = node.id
        const childIds: string[] = []
        const permissionIds: string[] = []
        let descendantIds: string[] = []

        // 收集该节点的权限ID，并将权限项也注册为节点
        if (node.permissions?.length) {
          for (const perm of node.permissions) {
            permissionIds.push(perm.id)
            allDescendants.push(perm.id)

            // 将权限项注册为叶子节点（关键修复）
            map.set(perm.id, {
              id: perm.id,
              node: { id: perm.id, label: perm.label }, // 模拟 PermissionNode
              parentId: nodeId,
              childIds: [],
              descendantIds: [],
              ancestorIds: [...ancestorIds, nodeId],
              level: level + 1,
              permissionIds: [],
            })
          }
        }

        // 递归处理子节点
        if (node.children?.length) {
          for (const child of node.children) {
            childIds.push(child.id)
          }
          descendantIds = traverse(
            node.children,
            nodeId,
            [...ancestorIds, nodeId],
            level + 1
          )
          allDescendants.push(...descendantIds)
        }

        // 存储节点信息
        map.set(nodeId, {
          id: nodeId,
          node,
          parentId,
          childIds,
          descendantIds: [...descendantIds, ...permissionIds],
          ancestorIds,
          level,
          permissionIds,
        })

        allDescendants.push(nodeId)
      }

      return allDescendants
    }

    traverse(data.value, null, [], 1)
    nodeMap.value = map
  }

  /**
   * 获取继承状态
   */
  const getInheritState = (id: string): InheritState => {
    return inheritStates.value.get(id) ?? 0
  }

  /**
   * 获取个人权限状态
   */
  const getGrantedState = (id: string): boolean => {
    return grantedStates.value.get(id) ?? false
  }

  /**
   * 计算半选状态（仅用于 granted）
   * 关键规则：有继承状态的节点不参与半选计算
   */
  const getIndeterminateState = (id: string): boolean => {
    // 如果当前节点有继承状态，不能显示半选
    if ((inheritStates.value.get(id) ?? 0) !== 0) {
      return false
    }

    const nodeInfo = nodeMap.value.get(id)
    if (!nodeInfo || nodeInfo.descendantIds.length === 0) {
      return false
    }

    const descendants = nodeInfo.descendantIds
    let checkedCount = 0
    let validCount = 0 // 有效计数（排除有继承状态的节点）

    for (const descId of descendants) {
      // 跳过有继承状态的后代节点
      if ((inheritStates.value.get(descId) ?? 0) !== 0) {
        continue
      }
      validCount++
      if (grantedStates.value.get(descId)) {
        checkedCount++
      }
    }

    // 没有有效的后代节点时，不显示半选
    if (validCount === 0) {
      return false
    }

    // 部分选中（不是全选也不是全未选）
    return checkedCount > 0 && checkedCount < validCount
  }

  /**
   * 设置继承状态（带级联）
   */
  const setInheritState = (id: string, state: InheritState) => {
    const nodeInfo = nodeMap.value.get(id)
    if (!nodeInfo) return

    const newStates = new Map(inheritStates.value)
    const oldState = newStates.get(id) ?? 0

    // 1. 设置当前节点
    newStates.set(id, state)

    // 2. 向下级联：设置所有后代
    for (const descId of nodeInfo.descendantIds) {
      newStates.set(descId, state)
    }

    // 3. 向上级联：不强制父节点跟随子节点的继承状态
    // 父节点的继承状态应该独立设置，不受子节点影响

    // 4. 处理继承状态变化对 granted 的影响
    const newGrantedStates = new Map(grantedStates.value)
    // 当从继承状态变为不继承时，自动勾选个人权限
    if (oldState !== 0 && state === 0) {
      newGrantedStates.set(id, true)
      for (const descId of nodeInfo.descendantIds) {
        newGrantedStates.set(descId, true)
      }
    } else if (state !== 0) {
      // 有继承状态时，清除个人权限
      newGrantedStates.set(id, false)
      for (const descId of nodeInfo.descendantIds) {
        newGrantedStates.set(descId, false)
      }
    }

    // 批量更新
    inheritStates.value = newStates
    grantedStates.value = newGrantedStates
    stateVersion.value++
  }

  /**
   * 设置个人权限状态（带级联）
   */
  const setGrantedState = (id: string, granted: boolean) => {
    const nodeInfo = nodeMap.value.get(id)
    if (!nodeInfo) return

    // 如果有继承状态，不能设置个人权限
    if ((inheritStates.value.get(id) ?? 0) !== 0) {
      return
    }

    const newStates = new Map(grantedStates.value)

    // 1. 设置当前节点
    newStates.set(id, granted)

    // 2. 向下级联：设置所有后代（只设置没有继承状态的）
    for (const descId of nodeInfo.descendantIds) {
      if ((inheritStates.value.get(descId) ?? 0) === 0) {
        newStates.set(descId, granted)
      }
    }

    // 3. 向上级联：仅在勾选时确保祖先也勾选（保证依赖关系）
    // 取消勾选时不影响祖先（父节点独立于子节点）
    if (granted) {
      // 子节点勾选时，向上确保所有祖先都勾选（子功能依托父菜单）
      for (const ancestorId of nodeInfo.ancestorIds) {
        // 跳过有继承状态的祖先
        if ((inheritStates.value.get(ancestorId) ?? 0) !== 0) continue
        // 确保祖先勾选
        newStates.set(ancestorId, true)
      }
    }
    // 取消勾选时不处理祖先（保持祖先的独立性）

    // 批量更新
    grantedStates.value = newStates
    stateVersion.value++
  }

  /**
   * 初始化状态
   */
  const initStates = (
    inheritState: Record<string, InheritState>,
    grantedState: Record<string, boolean>
  ) => {
    const newInherit = new Map<string, InheritState>()
    const newGranted = new Map<string, boolean>()

    for (const [key, value] of Object.entries(inheritState)) {
      newInherit.set(key, value)
    }
    for (const [key, value] of Object.entries(grantedState)) {
      newGranted.set(key, value)
    }

    inheritStates.value = newInherit
    grantedStates.value = newGranted
    stateVersion.value++
  }

  /**
   * 导出状态为普通对象
   */
  const exportStates = () => {
    const inheritState: Record<string, InheritState> = {}
    const grantedState: Record<string, boolean> = {}

    inheritStates.value.forEach((value, key) => {
      if (value !== 0) inheritState[key] = value
    })
    grantedStates.value.forEach((value, key) => {
      if (value) grantedState[key] = value
    })

    return { inheritState, grantedState }
  }

  /**
   * 获取所有选中的权限ID
   */
  const getGrantedKeys = (): string[] => {
    const keys: string[] = []
    grantedStates.value.forEach((value, key) => {
      if (value) keys.push(key)
    })
    return keys
  }

  /**
   * 获取所有有继承状态的ID
   */
  const getInheritedKeys = (): string[] => {
    const keys: string[] = []
    inheritStates.value.forEach((value, key) => {
      if (value !== 0) keys.push(key)
    })
    return keys
  }

  return {
    nodeMap,
    stateVersion,
    buildNodeMap,
    getInheritState,
    getGrantedState,
    getIndeterminateState,
    setInheritState,
    setGrantedState,
    initStates,
    exportStates,
    getGrantedKeys,
    getInheritedKeys,
  }
}
