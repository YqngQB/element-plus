import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PermissionTable from '../src/permission-table.vue'

import type { PermissionNode } from '../src/types'

const data: PermissionNode[] = [
  {
    id: 'purchase',
    label: '采购管理',
    children: [
      {
        id: 'base',
        label: '基础信息',
        children: [
          {
            id: 'register',
            label: '普药登记',
            permissions: [
              {
                id: 'register_edit',
                label: '编辑',
                extraConfig: { authorizationType: 2 },
              },
              {
                id: 'register_owner',
                label: '按制单人',
                constraintType: 'enum' as any,
                metadata: {
                  options: [{ label: '张三', value: 'zhangsan' }],
                },
                extraConfig: { authorizationType: 1 },
              },
              {
                id: 'register_export',
                label: '导出',
                extraConfig: { authorizationType: 3 },
              },
              {
                id: 'register_field',
                label: '查看所有',
                extraConfig: { authorizationType: 5 },
              },
              {
                id: 'register_other',
                label: '未知权限',
                extraConfig: { authorizationType: 99 },
              },
            ],
          },
          {
            id: 'supplier',
            label: '供应商',
            permissions: [
              {
                id: 'supplier_audit',
                label: '审核',
                extraConfig: { authorizationType: 4 },
              },
            ],
          },
        ],
      },
    ],
  },
]

describe('PermissionTable', () => {
  it('renders table layout by default', () => {
    const wrapper = mount(() => <PermissionTable data={data} />)

    expect(wrapper.find('.el-permission-table__table').exists()).toBe(true)
    expect(wrapper.find('.el-permission-table__split').exists()).toBe(false)
  })

  it('renders split layout and aggregates leaf pages for parent nodes', () => {
    const wrapper = mount(() => (
      <PermissionTable
        data={data}
        layout="split"
        showInherit={false}
        grantedState={{ register_edit: true, supplier_audit: true }}
      />
    ))

    expect(wrapper.find('.el-permission-table__split').exists()).toBe(true)
    expect(wrapper.text()).toContain('采购管理')
    expect(wrapper.find('.el-permission-table__split-info').exists()).toBe(
      false
    )
    expect(wrapper.text()).toContain('采购管理 > 基础信息 > 普药登记')
    expect(wrapper.text()).toContain('采购管理 > 基础信息 > 供应商')
    expect(wrapper.text()).toContain('按钮权限')
    expect(wrapper.text()).toContain('数据权限')
    expect(wrapper.text()).toContain('导出权限')
    expect(wrapper.text()).toContain('审核权限')
    expect(wrapper.text()).toContain('字段权限')
    expect(wrapper.text()).not.toContain('其他权限')
    expect(wrapper.text()).toContain('2/5')
  })

  it('uses permissionTypeLabels as visible permission type config', () => {
    const wrapper = mount(() => (
      <PermissionTable
        data={data}
        layout="split"
        showInherit={false}
        grantedState={{ register_edit: true, supplier_audit: true }}
        permissionTypeLabels={{
          1: '数据权限',
          2: '按钮权限',
          3: '导出权限',
          5: '字段权限',
        }}
      />
    ))

    expect(wrapper.text()).toContain('按钮权限')
    expect(wrapper.text()).toContain('数据权限')
    expect(wrapper.text()).toContain('导出权限')
    expect(wrapper.text()).toContain('字段权限')
    expect(wrapper.text()).not.toContain('审核权限')
    expect(wrapper.text()).not.toContain('审核')
    expect(wrapper.text()).toContain('1/4')
  })

  it('supports granting the current split title scope', async () => {
    const wrapper = mount(PermissionTable, {
      props: {
        data,
        layout: 'split',
        showInherit: false,
      },
    })

    const titleCheckbox = wrapper.find(
      '.el-permission-table__split-title-checkbox input'
    )
    expect(titleCheckbox.exists()).toBe(true)

    await titleCheckbox.setValue(true)
    await nextTick()

    const changedIds = wrapper.emitted('permission-change')!.map(([id]) => id)

    expect(changedIds).toEqual(['purchase'])
  })

  it('uses permission checkbox for split title and page title inheritance', () => {
    const wrapper = mount(() => (
      <PermissionTable data={data} layout="split" showInherit={true} />
    ))

    expect(
      wrapper
        .find(
          '.el-permission-table__split-title .el-permission-checkbox__inherit'
        )
        .exists()
    ).toBe(true)
    expect(
      wrapper.findAll(
        '.el-permission-table__split-page-title .el-permission-checkbox__inherit'
      )
    ).toHaveLength(2)
  })

  it('shows only the selected leaf page after clicking a leaf node', async () => {
    const wrapper = mount(() => (
      <PermissionTable data={data} layout="split" showInherit={false} />
    ))

    const leaf = wrapper
      .findAll('.el-permission-table__split-tree-node')
      .find((node) => node.text().includes('普药登记'))

    expect(leaf).toBeTruthy()
    await leaf!.trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('普药登记')
    expect(wrapper.find('.el-permission-table__split-info').exists()).toBe(
      false
    )
    expect(wrapper.text()).toContain('采购管理 > 基础信息 > 普药登记')
    expect(wrapper.text()).not.toContain('采购管理 > 基础信息 > 供应商')
  })

  it('keeps matching ancestors visible while searching', async () => {
    const wrapper = mount(() => (
      <PermissionTable data={data} layout="split" showInherit={false} />
    ))

    await wrapper
      .find('.el-permission-table__split-search-input')
      .setValue('普药')
    await nextTick()

    const treeText = wrapper
      .find('.el-permission-table__split-tree-body')
      .text()

    expect(treeText).toContain('采购管理')
    expect(treeText).toContain('基础信息')
    expect(treeText).toContain('普药登记')
    expect(treeText).not.toContain('供应商')
  })

  it('uses a single virtual tooltip for overflowing tree labels', async () => {
    const wrapper = mount(() => (
      <PermissionTable data={data} layout="split" showInherit={false} />
    ))

    const tooltips = wrapper.findAllComponents({ name: 'ElTooltip' })
    const treeTooltips = tooltips.filter(
      (tooltip) =>
        tooltip.props('popperClass') ===
        'el-permission-table__split-tree-tooltip'
    )
    expect(treeTooltips).toHaveLength(1)

    const label = wrapper.find('.el-permission-table__split-tree-label')
    Object.defineProperty(label.element, 'scrollWidth', {
      configurable: true,
      value: 200,
    })
    Object.defineProperty(label.element, 'clientWidth', {
      configurable: true,
      value: 80,
    })

    await label.trigger('mouseenter')
    await nextTick()

    const [tooltip] = treeTooltips
    expect(tooltip.props('visible')).toBe(true)
    expect(tooltip.props('content')).toBe(label.text())

    await label.trigger('mouseleave')
    await nextTick()

    expect(tooltip.props('visible')).toBe(false)
  })
})
