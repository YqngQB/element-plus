<template>
  <div
    :class="[ns.b('dropdown'), ns.is('multiple', isMultiple), popperClass]"
    :style="{ [isFitInputWidth ? 'width' : 'minWidth']: minWidth }"
  >
    <el-scrollbar
      v-if="isMultiple && isFilterable && select.states.selected.length > 0"
      tag="div"
      :wrap-class="ns.be('dropdown', 'tags')"
    >
      <div :class="ns.e('selection')" :style="{ width: minWidth }">
        <component :is="renderTag">
          <div
            v-for="item in select.states.selected"
            :key="select.getValueKey(item)"
            :class="ns.e('selected-item')"
          >
            <el-tag
              :closable="!selectDisabled && !item.isDisabled"
              :size="select.collapseTagSize"
              :type="select.props.tagType"
              :effect="select.props.tagEffect"
              disable-transitions
              :style="select.tagStyle"
              @close="select.deleteTag($event, item)"
            >
              <span :class="ns.e('tags-text')">
                <template v-if="selectSlot?.label">
                  <component
                    :is="selectSlot.label"
                    :index="item.index"
                    :label="item.currentLabel"
                    :value="item.value"
                  />
                </template>
                <template v-else>{{ item.currentLabel }}</template>
              </span>
            </el-tag>
          </div>
        </component>
      </div>
    </el-scrollbar>
    <div v-if="$slots.header" :class="ns.be('dropdown', 'header')">
      <slot name="header" />
    </div>
    <slot />
    <div v-if="$slots.footer" :class="ns.be('dropdown', 'footer')">
      <slot name="footer" />
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, inject, onMounted, ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { useNamespace } from '@element-plus/hooks'
import { selectKey, selectSlotKey } from './token'
import { BORDER_HORIZONTAL_WIDTH } from '@element-plus/constants'
import ElScrollbar from '@element-plus/components/scrollbar'
import ElTag from '@element-plus/components/tag'

export default defineComponent({
  name: 'ElSelectDropdown',

  componentName: 'ElSelectDropdown',

  components: {
    ElScrollbar,
    ElTag,
  },

  setup() {
    const select = inject(selectKey)!
    const selectSlot = inject(selectSlotKey)
    const ns = useNamespace('select')

    // computed
    const popperClass = computed(() => select.props.popperClass)
    const isMultiple = computed(() => select.props.multiple)
    const isFitInputWidth = computed(() => select.props.fitInputWidth)
    const isFilterable = computed(() => select.props.filterable)
    const minWidth = ref('')
    const selectDisabled = computed(() => select.props.disabled)

    // 默认 tag 插槽实现：直接渲染子节点
    const DefaultTag = (props: any, { slots }: any) => {
      return slots.default?.() || []
    }
    const renderTag = computed(() => {
      return selectSlot?.tag ?? DefaultTag
    })

    function updateMinWidth() {
      const offsetWidth = select.selectRef?.offsetWidth
      if (offsetWidth) {
        minWidth.value = `${offsetWidth - BORDER_HORIZONTAL_WIDTH}px`
      } else {
        minWidth.value = ''
      }
    }

    onMounted(() => {
      // TODO: updatePopper
      // popper.value.update()
      updateMinWidth()
      useResizeObserver(select.selectRef, updateMinWidth)
    })

    return {
      ns,
      minWidth,
      popperClass,
      isMultiple,
      isFitInputWidth,
      isFilterable,
      selectDisabled,
      select,
      renderTag,
      selectSlot,
    }
  },
})
</script>
