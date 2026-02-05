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
  // 约束类型（仅权限项有值）
  constraintType?: string
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
              constraintType: perm.constraintType, // 保存约束类型
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
   * 性能优化：缓存 Map 引用，使用 for 循环
   */
  const getIndeterminateState = (id: string): boolean => {
    const inheritStatesRef = inheritStates.value
    const grantedStatesRef = grantedStates.value

    // 如果当前节点有继承状态，不能显示半选
    if ((inheritStatesRef.get(id) ?? 0) !== 0) {
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
      if ((inheritStatesRef.get(descId) ?? 0) !== 0) {
        continue
      }
      validCount++
      if (grantedStatesRef.get(descId)) {
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
   * 性能优化：减少 Map 查询，使用局部变量缓存
   */
  const setInheritState = (id: string, state: InheritState) => {
    const nodeInfo = nodeMap.value.get(id)
    if (!nodeInfo) return

    const newStates = new Map(inheritStates.value)
    const newGrantedStates = new Map(grantedStates.value)
    const oldState = newStates.get(id) ?? 0

    // 1. 设置当前节点
    newStates.set(id, state)

    // 2. 向下级联：设置所有后代
    const descendants = nodeInfo.descendantIds
    for (const descendant of descendants) {
      newStates.set(descendant, state)
    }

    // 3. 向上级联：设置为继承时，只对"不继承+未勾选"的祖先设置继承状态
    // 核心原则：角色有子级权限必然有父级权限，保持配置一致性
    if (state !== 0) {
      // 设置为继承（GRANTED 或 DENIED）时
      const ancestors = nodeInfo.ancestorIds
      for (const ancestorId of ancestors) {
        const ancestorInherit = newStates.get(ancestorId) ?? 0
        // 只有当祖先是"不继承+未勾选"状态时，才设置为继承状态
        // 如果祖先已经是"继承"或"不继承+已勾选"，则不处理（已经可访问）
        if (ancestorInherit === 0 && !newGrantedStates.get(ancestorId)) {
          newStates.set(ancestorId, state)
        }
      }
    }

    // 4. 处理继承状态变化对 granted 的影响
    // 当从继承状态变为不继承时，自动勾选个人权限
    if (oldState !== 0 && state === 0) {
      newGrantedStates.set(id, true)
      for (const descendant of descendants) {
        newGrantedStates.set(descendant, true)
      }
      // 向上检查祖先，如果祖先是继承状态（无论有权限还是无权限），都切换为"不继承+已勾选"
      // 确保满足核心原则：子级有权限 → 父级必然有权限
      // 避免角色权限变更导致的配置不一致问题
      const ancestors = nodeInfo.ancestorIds
      for (const ancestorId of ancestors) {
        const ancestorInherit = newStates.get(ancestorId) ?? 0
        // 如果祖先是继承状态（GRANTED = 1 或 DENIED = 2）
        if (ancestorInherit !== 0) {
          // 切换为"不继承+已勾选"，保证配置独立性和稳定性
          newStates.set(ancestorId, 0)
          newGrantedStates.set(ancestorId, true)
        }
      }
    } else if (state !== 0) {
      // 有继承状态时，清除个人权限（包括向上级联设置的祖先节点）
      newGrantedStates.set(id, false)
      for (const descendant of descendants) {
        newGrantedStates.set(descendant, false)
      }
      // 清除祖先节点的 granted 状态（仅限被设置为继承的节点）
      // 优化：缓存旧状态的读取
      const oldInheritStates = inheritStates.value
      const oldGrantedStates = grantedStates.value
      const ancestors = nodeInfo.ancestorIds
      for (const ancestorId of ancestors) {
        const ancestorInherit = oldInheritStates.get(ancestorId) ?? 0
        // 只清除原本是"不继承+未勾选"的祖先节点（因为它们被设置为继承了）
        if (ancestorInherit === 0 && !oldGrantedStates.get(ancestorId)) {
          newGrantedStates.set(ancestorId, false)
        }
      }
    }

    // 批量更新
    inheritStates.value = newStates
    grantedStates.value = newGrantedStates
    stateVersion.value++
  }

  /**
   * 设置个人权限状态（带级联）
   * 性能优化：减少 Map 查询，缓存继承状态引用
   */
  const setGrantedState = (id: string, granted: boolean) => {
    const nodeInfo = nodeMap.value.get(id)
    if (!nodeInfo) return

    // 如果有继承状态，不能设置个人权限
    const inheritStatesRef = inheritStates.value
    if ((inheritStatesRef.get(id) ?? 0) !== 0) {
      return
    }

    const newGrantedStates = new Map(grantedStates.value)
    const newInheritStates = new Map(inheritStatesRef)

    // 1. 设置当前节点
    newGrantedStates.set(id, granted)

    // 2. 向下级联
    const descendants = nodeInfo.descendantIds
    if (granted) {
      // 勾选时：只设置没有继承状态且没有约束的后代
      // 跳过有约束的权限项，因为约束值需要用户手动配置
      for (const descId of descendants) {
        const descNodeInfo = nodeMap.value.get(descId)
        const hasConstraint =
          descNodeInfo?.constraintType && descNodeInfo.constraintType !== 'none'
        // 排除：1. 有继承状态的 2. 有约束的权限项
        if ((inheritStatesRef.get(descId) ?? 0) === 0 && !hasConstraint) {
          newGrantedStates.set(descId, granted)
        }
      }
    } else {
      // 取消勾选时：核心原则反向应用 - 父级无权限 → 子级必然无权限
      // 所有后代（包括有继承状态的）都必须变成"不继承+未勾选"
      for (const descId of descendants) {
        const descInherit = inheritStatesRef.get(descId) ?? 0
        // 如果后代有继承状态，先切换为不继承
        if (descInherit !== 0) {
          newInheritStates.set(descId, 0)
        }
        // 取消勾选
        newGrantedStates.set(descId, false)
      }
    }

    // 3. 向上级联：仅在勾选时确保祖先也勾选（保证依赖关系）
    // 取消勾选时不影响祖先（父节点独立于子节点）
    if (granted) {
      // 子节点勾选时，向上确保所有祖先都勾选（子功能依托父菜单）
      const ancestors = nodeInfo.ancestorIds
      for (const ancestorId of ancestors) {
        // 跳过有继承状态的祖先
        if ((inheritStatesRef.get(ancestorId) ?? 0) !== 0) continue
        // 确保祖先勾选
        newGrantedStates.set(ancestorId, true)
      }
    }
    // 取消勾选时不处理祖先（保持祖先的独立性）

    // 批量更新
    inheritStates.value = newInheritStates
    grantedStates.value = newGrantedStates
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
