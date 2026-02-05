import { InheritState } from '../types'

/**
 * 应用默认继承状态
 * 遍历所有节点，为未配置继承状态的节点设置默认值
 * 根据 rolePermissions 判断：有权限 → GRANTED，无权限 → DENIED
 *
 * @param inheritState 当前继承状态（后端返回的配置）
 * @param allNodeIds 所有节点 ID 列表
 * @param rolePermissions 角色权限集合
 * @returns 填充默认值后的继承状态
 */
export function applyDefaultInheritState(
  inheritState: Record<string, InheritState>,
  allNodeIds: string[],
  rolePermissions: Set<string>
): Record<string, InheritState> {
  const result = { ...inheritState }

  // 遍历所有节点
  for (const nodeId of allNodeIds) {
    // 如果该节点没有配置继承状态（后端没有返回）
    if (result[nodeId] === undefined || result[nodeId] === null) {
      // 根据 rolePermissions 判断默认继承状态
      result[nodeId] = rolePermissions.has(nodeId)
        ? InheritState.GRANTED
        : InheritState.DENIED
    }
  }

  return result
}
