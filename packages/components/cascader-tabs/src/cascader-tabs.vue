<template>
  <el-tooltip
    ref="tooltipRef"
    :visible="popperVisible"
    :teleported="teleported"
    :popper-class="[ns.e('dropdown'), popperClass!]"
    :popper-style="popperStyle"
    :fallback-placements="fallbackPlacements"
    :stop-popper-mouse-event="false"
    :gpu-acceleration="false"
    :placement="placement"
    :transition="`${ns.namespace.value}-zoom-in-top`"
    :effect="effect"
    pure
    :persistent="persistent"
    @hide="handlePopperHide"
  >
    <template #default>
      <div
        ref="wrapperRef"
        v-clickoutside:[contentRef]="handleClickOutside"
        :class="cascaderKls"
        :style="cascaderStyle"
        @click="() => togglePopperVisible(readonly ? undefined : true)"
        @keydown="handleKeyDown"
        @mouseenter="inputHover = true"
        @mouseleave="inputHover = false"
      >
        <el-input
          ref="inputRef"
          v-model="inputValue"
          :placeholder="currentPlaceholder"
          :readonly="readonly"
          :disabled="isDisabled"
          :validate-event="false"
          :size="realSize"
          :class="inputClass"
          :tabindex="multiple && filterable && !isDisabled ? -1 : undefined"
          @compositionstart="handleComposition"
          @compositionupdate="handleComposition"
          @compositionend="handleComposition"
          @input="handleInput"
        >
          <template v-if="$slots.prefix" #prefix>
            <slot name="prefix" />
          </template>
          <template #suffix>
            <el-icon
              v-if="clearBtnVisible"
              key="clear"
              :class="[nsInput.e('icon'), 'icon-circle-close']"
              @click.stop="handleClear"
            >
              <component :is="clearIcon" />
            </el-icon>
            <el-icon
              v-else
              key="arrow-down"
              :class="cascaderIconKls"
              @click.stop="togglePopperVisible()"
            >
              <arrow-down />
            </el-icon>
          </template>
        </el-input>

        <div
          v-if="multiple"
          ref="tagWrapper"
          :class="[ns.e('tags'), ns.is('validate', Boolean(validateState))]"
        >
          <slot name="tag" :data="tags" :delete-tag="deleteTag">
            <el-tag
              v-for="tag in showTagList"
              :key="tag.key"
              :type="tagType"
              :size="tagSize"
              :effect="tagEffect"
              :hit="tag.hitState"
              :closable="tag.closable"
              disable-transitions
              @close="deleteTag(tag)"
            >
              <span>{{ tag.text }}</span>
            </el-tag>
          </slot>
          <el-tooltip
            v-if="collapseTags && tags.length > maxCollapseTags"
            ref="tagTooltipRef"
            :disabled="popperVisible || !collapseTagsTooltip"
            :fallback-placements="['bottom', 'top', 'right', 'left']"
            placement="bottom"
            :popper-class="popperClass"
            :popper-style="popperStyle"
            :effect="effect"
            :persistent="persistent"
          >
            <template #default>
              <el-tag
                :closable="false"
                :size="tagSize"
                :type="tagType"
                :effect="tagEffect"
                disable-transitions
              >
                <span :class="ns.e('tags-text')">
                  + {{ tags.length - maxCollapseTags }}
                </span>
              </el-tag>
            </template>
            <template #content>
              <el-scrollbar :max-height="maxCollapseTagsTooltipHeight">
                <div :class="ns.e('collapse-tags')">
                  <div
                    v-for="(tag, idx) in collapseTagList"
                    :key="idx"
                    :class="ns.e('collapse-tag')"
                  >
                    <el-tag
                      :key="tag.key"
                      class="in-tooltip"
                      :type="tagType"
                      :size="tagSize"
                      :effect="tagEffect"
                      :hit="tag.hitState"
                      :closable="tag.closable"
                      disable-transitions
                      @close="deleteTag(tag)"
                    >
                      <span>{{ tag.text }}</span>
                    </el-tag>
                  </div>
                </div>
              </el-scrollbar>
            </template>
          </el-tooltip>
          <input
            v-if="filterable && !isDisabled"
            v-model="searchInputValue"
            type="text"
            :class="ns.e('search-input')"
            :placeholder="presentText ? '' : inputPlaceholder"
            @input="(e) => handleInput(searchInputValue, e as InputEvent)"
            @click.stop="togglePopperVisible(true)"
            @keydown.delete="handleDelete"
            @compositionstart="handleComposition"
            @compositionupdate="handleComposition"
            @compositionend="handleComposition"
          />
        </div>
      </div>
    </template>

    <template #content>
      <el-tabs
        v-model="activeTabModel"
        :class="ns.e('tabs')"
        @tab-change="onTabChange"
      >
        <el-tab-pane
          v-for="tab in tabs"
          :key="tab.key"
          :label="tab.label"
          :name="tab.key"
        >
          <!-- 默认使用 cascader-panel-tab 组件 -->
          <component
            :is="ElCascaderPanelTab"
            v-if="tab.component === 'cascader-panel-tab'"
            :tab-key="tab.key"
            v-bind="tab.props || {}"
          />
          <!-- 自定义组件插槽 -->
          <slot
            v-else
            :name="`tab-panel-${tab.component || tab.key}`"
            :tab-config="tab"
            :tab-key="tab.key"
          />
        </el-tab-pane>
      </el-tabs>
    </template>
  </el-tooltip>
</template>

<script lang="ts" setup>
import { computed, ref, useAttrs } from 'vue'
import { debugWarn, getEventCode } from '@element-plus/utils'
import ElInput from '@element-plus/components/input'
import ElTooltip from '@element-plus/components/tooltip'
import ElTabs, { ElTabPane } from '@element-plus/components/tabs'
import ElTag from '@element-plus/components/tag'
import ElIcon from '@element-plus/components/icon'
import ElScrollbar from '@element-plus/components/scrollbar'
import ElCascaderPanelTab from './tab-panels/cascader-panel-tab.vue'
import {
  useFormDisabled,
  useFormItem,
  useFormSize,
} from '@element-plus/components/form'
import { ClickOutside as vClickoutside } from '@element-plus/directives'
import {
  useComposition,
  useFocusController,
  useLocale,
  useNamespace,
} from '@element-plus/hooks'
import { EVENT_CODE, UPDATE_MODEL_EVENT } from '@element-plus/constants'
import { ArrowDown } from '@element-plus/icons-vue'
import { cascaderTabsEmits, cascaderTabsProps } from './cascader-tabs'
import { useCascaderTabs } from './composables/use-cascader-tabs'

import type { StyleValue } from 'vue'
import type { TooltipInstance } from '@element-plus/components/tooltip'
import type { InputInstance } from '@element-plus/components/input'
import type { Tag } from '@element-plus/components/cascader-panel'

defineOptions({
  name: 'ElCascaderTabs',
})

const props = defineProps(cascaderTabsProps)
const emit = defineEmits(cascaderTabsEmits)
const attrs = useAttrs()

let pressDeleteCount = 0

const ns = useNamespace('cascader-tabs')
const nsInput = useNamespace('input')

const { t } = useLocale()
const { formItem } = useFormItem()
const isDisabled = useFormDisabled()
const { isComposing, handleComposition } = useComposition({
  afterComposition(event) {
    const text = (event.target as HTMLInputElement)?.value
    handleInput(text)
  },
})

const tooltipRef = ref<TooltipInstance>()
const tagTooltipRef = ref<TooltipInstance>()
const inputRef = ref<InputInstance>()
const tagWrapper = ref<HTMLDivElement>()
const inputHover = ref(false)

// 使用核心 Composable
const {
  popperVisible,
  activeTab,
  inputValue,
  searchInputValue,
  displayValue,
  isFiltering,
  tags,
  togglePopperVisible,
  handleTabChange: onTabChange,
  handleSearchInput,
  deleteTag: coreDeleteTag,
  handleClear: coreClear,
  handleSelect,
  registerSearchHandler,
  unregisterSearchHandler,
} = useCascaderTabs({
  tabs: props.tabs,
  defaultActiveTab: props.defaultActiveTab,
  filterable: props.filterable,
  debounce: props.debounce,
  beforeFilter: props.beforeFilter,
  clearKeywordOnTabChange: props.clearKeywordOnTabChange,
  closeOnTabChange: props.closeOnTabChange,
  separator: props.separator,
  showAllLevels: props.showAllLevels,
  multiple: computed(() => !!props.props?.multiple).value,
  isDisabled: isDisabled.value,
  initialModelValue: props.modelValue,
  emitModelValue: (value) => emit(UPDATE_MODEL_EVENT, value),
  emitChange: (value) => emit('change', value),
  emitTabChange: (name) => emit('tabChange', name),
  emitRemoveTag: (value) => emit('removeTag', value),
})

const multiple = computed(() => !!props.props?.multiple)
const readonly = computed(() => !props.filterable || multiple.value)
const realSize = useFormSize()
const tagSize = computed(() =>
  realSize.value === 'small' ? 'small' : 'default'
)
const tagType = computed(() => props.tagType)
const tagEffect = computed(() => props.tagEffect)
const maxCollapseTagsTooltipHeight = computed(
  () => props.maxCollapseTagsTooltipHeight
)

const inputPlaceholder = computed(
  () => props.placeholder ?? t('el.cascader.placeholder')
)

const currentPlaceholder = computed(() =>
  searchInputValue.value || tags.value.length > 0 || isComposing.value
    ? ''
    : inputPlaceholder.value
)

const presentText = computed(() => displayValue.value)

const validateState = computed(() => formItem?.validateState || '')

const cascaderStyle = computed(() => attrs.style as StyleValue)

const cascaderKls = computed(() => [
  ns.b(),
  ns.m(realSize.value),
  ns.is('disabled', isDisabled.value),
  attrs.class,
])

const cascaderIconKls = computed(() => [
  nsInput.e('icon'),
  'icon-arrow-down',
  ns.is('reverse', popperVisible.value),
])

const inputClass = computed(() => ns.is('focus', isFocused.value))

const contentRef = computed(() => tooltipRef.value?.popperRef?.contentRef)

const clearBtnVisible = computed(() => {
  if (
    !props.clearable ||
    isDisabled.value ||
    isFiltering.value ||
    (!inputHover.value && !isFocused.value)
  )
    return false

  return !!presentText.value
})

const showTagList = computed(() => {
  if (!multiple.value) return []
  return props.collapseTags
    ? tags.value.slice(0, props.maxCollapseTags)
    : tags.value
})

const collapseTagList = computed(() => {
  if (!multiple.value) return []
  return props.collapseTags ? tags.value.slice(props.maxCollapseTags) : []
})

const activeTabModel = computed({
  get: () => activeTab.value,
  set: (val) => {
    activeTab.value = val as string
  },
})

const { isFocused, handleBlur } = useFocusController(inputRef, {
  disabled: isDisabled,
  beforeBlur(event) {
    return tagTooltipRef.value?.isFocusInsideContent(event)
  },
  afterBlur() {
    if (props.validateEvent) {
      formItem?.validate?.('blur').catch((err) => debugWarn(err))
    }
  },
})

const handleClickOutside = (event: Event) => {
  if (isFocused.value) {
    const _event = new FocusEvent('blur', event)
    handleBlur(_event)
  }
  togglePopperVisible(false)
}

const handlePopperHide = () => {
  // 当 popper 隐藏时的逻辑
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (isComposing.value) return
  const code = getEventCode(e)

  switch (code) {
    case EVENT_CODE.enter:
    case EVENT_CODE.numpadEnter:
      togglePopperVisible()
      break
    case EVENT_CODE.down:
      togglePopperVisible(true)
      e.preventDefault()
      break
    case EVENT_CODE.esc:
      if (popperVisible.value === true) {
        e.preventDefault()
        e.stopPropagation()
        togglePopperVisible(false)
      }
      break
    case EVENT_CODE.tab:
      togglePopperVisible(false)
      break
  }
}

const handleClear = () => {
  coreClear()
  togglePopperVisible(false)
  emit('clear')
}

const handleInput = (val: string, e?: InputEvent) => {
  !popperVisible.value && togglePopperVisible(true)

  if (e && 'isComposing' in e && e.isComposing) return

  handleSearchInput(val)
}

const handleDelete = () => {
  const lastTag = tags.value[tags.value.length - 1]
  pressDeleteCount = searchInputValue.value ? 0 : pressDeleteCount + 1

  if (
    !lastTag ||
    !pressDeleteCount ||
    (props.collapseTags && tags.value.length > props.maxCollapseTags)
  )
    return

  if (lastTag.hitState) {
    deleteTag(lastTag)
  } else {
    lastTag.hitState = true
  }
}

const deleteTag = (tag: Tag) => {
  coreDeleteTag(tag)
}

defineExpose({
  /**
   * @description toggle the visible of popper
   */
  togglePopperVisible,
  /**
   * @description cascader content ref
   */
  contentRef,
  /**
   * @description selected content text
   */
  presentText,
  /**
   * @description register search handler for custom tabs
   */
  registerSearchHandler,
  /**
   * @description unregister search handler for custom tabs
   */
  unregisterSearchHandler,
  /**
   * @description handle select nodes
   */
  handleSelect,
})
</script>
