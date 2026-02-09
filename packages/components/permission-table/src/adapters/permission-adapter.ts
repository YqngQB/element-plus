import type {
  ConstraintConfig,
  InheritState,
  PermissionDefinition,
  PermissionNode,
} from '../types'

/**
 * 后端权限信息模型（对应 AuthorizationInfoModel）
 */
export interface AuthorizationInfoModel {
  /** 页面路由id */
  sysRouteUid: string
  /** 权限key */
  authoriztionKey: number
  /** 权限名 */
  authoriztionName: string
  /** 权限关联弹窗 */
  popupMark?: string | null
  /** 权限类型（1数据，2按钮，3导出，4审核，5字段） */
  authorizationType?: number
  /** 权限项值（用户选择的枚举值） */
  authorizationItemValues?: (number | string | Record<string, any>)[]
  /** 是否继承（-1=不继承且无权限, 0=不继承且有权限, 1=继承） */
  isExtendPermission?: number
}

/**
 * 后端路由信息模型（对应 RouteInfoModel）
 */
export interface RouteInfoModel {
  /** 页面路由uid */
  sysRouteUid: string
  /** 是否继承（-1=不继承且无权限, 0=不继承且有权限, 1=继承） */
  isExtendPermission: number
}

/**
 * 提交给后端的完整数据结构
 */
export interface DispatchAuthorizationData {
  /** 权限信息列表 */
  authorizationInfos: AuthorizationInfoModel[]
  /** 路由信息列表 */
  routeInfos: RouteInfoModel[]
  [key: string]: any
}

/**
 * 角色权限数据（对应 PageRoleAuthViewModel）
 */
export interface RolePermissionData {
  /** 页面权限信息列表 */
  pageAuthorizations?: {
    /** 路由id */
    routeUid?: string
    /** 是否继承 (-1=不继承且无权限, 0=不继承且有权限, 1=继承) */
    isExtendPermission?: number
    /** 已拥有的权限详情 */
    authorizationInfos?: AuthorizationInfoModel[]
    [key: string]: any
  }[]
}

/**
 * 权限数据适配器 - 简化实用版
 * 直接对应后端 API 数据格式，贴合实际业务场景
 */
export class PermissionAdapter {
  /**
   * 将前端状态转换为后端所需的数据格式
   * 这是提交权限数据到后端时使用的主要方法
   *
   * @param permissionTree 权限树数据
   * @param inheritState 继承状态映射 { permissionId: InheritState }
   * @param grantedState 授权状态映射 { permissionId: boolean }
   * @param constraintState 约束状态映射 { permissionId: ConstraintConfig }
   * @returns 后端所需的数据格式
   */
  toBackendFormat(
    permissionTree: PermissionNode[],
    inheritState: Record<string, InheritState>,
    grantedState: Record<string, boolean>,
    constraintState: Record<string, ConstraintConfig>
  ): DispatchAuthorizationData {
    const authorizationInfos: AuthorizationInfoModel[] = []
    const routeInfos: RouteInfoModel[] = []

    // 遍历权限树
    this.traverseTree(permissionTree, (node: PermissionNode) => {
      // 1. 处理节点上的权限项
      if (node.permissions?.length) {
        node.permissions.forEach((perm: PermissionDefinition) => {
          const isExtendPermission = this.getIsExtendPermission(
            perm.id,
            inheritState,
            grantedState
          )

          // 获取约束值（枚举选项）
          const enumValue = constraintState[perm.id]?.enumValue
          const authorizationItemValues = enumValue
            ? Array.isArray(enumValue)
              ? enumValue
              : [enumValue]
            : undefined

          authorizationInfos.push({
            sysRouteUid: node.id,
            authoriztionKey: (perm.extraConfig?.authoriztionKey as number) || 0,
            authoriztionName: perm.label,
            popupMark: (perm.extraConfig?.popupMark as string) || null,
            authorizationType:
              (perm.extraConfig?.authorizationType as number) || 2,
            authorizationItemValues,
            isExtendPermission,
          })
        })
      }

      // 处理节点本身（所有节点都需要记录路由信息，包括叶子节点）
      const isExtendPermission = this.getIsExtendPermission(
        node.id,
        inheritState,
        grantedState
      )

      routeInfos.push({
        sysRouteUid: node.id,
        isExtendPermission,
      })
    })

    return {
      authorizationInfos,
      routeInfos,
    }
  }

  /**
   * 从后端数据格式转换为前端状态
   * 这是从后端获取权限数据后初始化前端状态时使用的方法
   *
   * @param backendData 后端返回的用户权限数据
   * @param rolePermissionData 角色权限数据（用于判断继承状态）
   * @returns 前端所需的三个状态对象
   */
  fromBackendFormat(
    backendData: DispatchAuthorizationData,
    rolePermissionData?: RolePermissionData
  ): {
    inheritState: Record<string, InheritState>
    grantedState: Record<string, boolean>
    constraintState: Record<string, ConstraintConfig>
  } {
    const inheritState: Record<string, InheritState> = {}
    const grantedState: Record<string, boolean> = {}
    const constraintState: Record<string, ConstraintConfig> = {}

    // 构建角色权限和路由映射表，用于快速查询
    const roleAuthMap = this.buildRoleAuthMap(rolePermissionData)

    // 解析用户权限信息
    if (backendData.authorizationInfos) {
      backendData.authorizationInfos.forEach((auth) => {
        // 使用路由uid + 权限key 作为唯一标识
        const permId = `${auth.sysRouteUid}_${auth.authoriztionKey}`

        const isExtendPermission = auth.isExtendPermission ?? -1

        // 判断继承状态
        if (isExtendPermission === 1) {
          // 用户选择了继承
          // 根据角色权限判断是继承有权限还是继承无权限
          const hasRolePerm = roleAuthMap.has(permId)
          inheritState[permId] = hasRolePerm ? 1 : 2 // GRANTED : DENIED
          grantedState[permId] = false // 继承时不设置授权状态
        } else if (isExtendPermission === 0) {
          // 用户不继承，使用自己的权限设置（有权限）
          inheritState[permId] = 0 // NONE
          grantedState[permId] = true
        } else {
          // isExtendPermission === -1，不继承且无权限
          inheritState[permId] = 0 // NONE
          grantedState[permId] = false
        }

        // 解析约束值
        if (auth.authorizationItemValues?.length) {
          constraintState[permId] = {
            type: 'enum' as any,
            enumValue: auth.authorizationItemValues,
          }
        }
      })
    }

    // 解析路由信息
    if (backendData.routeInfos) {
      backendData.routeInfos.forEach((route) => {
        const isExtendPermission = route.isExtendPermission

        if (isExtendPermission === 1) {
          // 用户选择了继承
          // 根据角色权限判断是继承有权限还是继承无权限
          const hasRoleRoute = roleAuthMap.has(route.sysRouteUid)
          inheritState[route.sysRouteUid] = hasRoleRoute ? 1 : 2 // GRANTED : DENIED
          grantedState[route.sysRouteUid] = false
        } else if (isExtendPermission === 0) {
          // 用户不继承，使用自己的权限设置（有权限）
          inheritState[route.sysRouteUid] = 0 // NONE
          grantedState[route.sysRouteUid] = true
        } else {
          // isExtendPermission === -1，不继承且无权限
          inheritState[route.sysRouteUid] = 0 // NONE
          grantedState[route.sysRouteUid] = false
        }
      })
    }

    return {
      inheritState,
      grantedState,
      constraintState,
    }
  }

  /**
   * 从角色权限数据中提取权限和路由ID集合
   * 用于组件的 rolePermissions prop
   *
   * @param rolePermissionData 角色权限数据
   * @returns 权限和路由ID的Set (格式: `${routeUid}_${authKey}` 或 `${routeUid}`)
   */
  extractRolePermissionIds(
    rolePermissionData?: RolePermissionData
  ): Set<string> {
    return this.buildRoleAuthMap(rolePermissionData)
  }

  /**
   * 构建角色权限和路由授权映射集合
   * 包含角色拥有的所有权限ID和路由ID
   *
   * @param rolePermissionData 角色权限数据
   * @returns 权限和路由ID的Set
   */
  private buildRoleAuthMap(
    rolePermissionData?: RolePermissionData
  ): Set<string> {
    const authSet = new Set<string>()

    if (rolePermissionData?.pageAuthorizations) {
      rolePermissionData.pageAuthorizations.forEach((page) => {
        // 添加权限项
        page.authorizationInfos?.forEach((auth) => {
          const permId = `${auth.sysRouteUid}_${auth.authoriztionKey}`
          authSet.add(permId)
        })
        // 添加路由
        if (page.routeUid) {
          authSet.add(page.routeUid)
        }
      })
    }

    return authSet
  }

  /**
   * 计算 isExtendPermission 值
   * 根据继承状态和授权状态计算后端所需的继承标识
   *
   * @param id 权限或节点ID
   * @param inheritState 继承状态映射
   * @param grantedState 授权状态映射
   * @returns -1=不继承且无权限, 0=不继承且有权限, 1=继承
   */
  private getIsExtendPermission(
    id: string,
    inheritState: Record<string, InheritState>,
    grantedState: Record<string, boolean>
  ): number {
    const inherit = inheritState[id]
    const granted = grantedState[id]

    // 如果状态都未设置，视为无权限（不继承且无权限）
    if (inherit === undefined && granted === undefined) {
      return -1
    }

    // 如果继承状态不是 NONE (0)，则表示继承
    if (inherit !== undefined && inherit !== 0) {
      return 1
    }

    // 不继承：根据 granted 状态判断
    // granted=true → 0 (不继承且有权限)
    // granted=false → -1 (不继承且无权限)
    return granted ? 0 : -1
  }

  /**
   * 遍历权限树
   * 深度优先遍历权限树结构
   *
   * @param nodes 节点数组
   * @param callback 每个节点的回调函数
   */
  private traverseTree(
    nodes: PermissionNode[],
    callback: (node: PermissionNode) => void
  ): void {
    if (!nodes || !Array.isArray(nodes)) {
      return
    }

    for (const node of nodes) {
      if (node) {
        callback(node)
        if (node.children?.length) {
          this.traverseTree(node.children, callback)
        }
      }
    }
  }
}

/**
 * 创建适配器实例的工厂函数
 * @returns PermissionAdapter 实例
 */
export function createPermissionAdapter(): PermissionAdapter {
  return new PermissionAdapter()
}

/**
 * 导出默认适配器实例（单例模式）
 */
export const defaultAdapter = new PermissionAdapter()
