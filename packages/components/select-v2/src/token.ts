import type { OptionV2Props, SelectV2Instance, SelectV2Props } from './defaults'
import type { InjectionKey, Ref, Slot } from 'vue'
import type { Option } from './select.types'
import type { TooltipInstance } from '@element-plus/components/tooltip'

export interface SelectV2Context {
  props: SelectV2Props
  expanded: Ref<boolean>
  tooltipRef: Ref<TooltipInstance | undefined>
  contentId: Ref<string>
  onSelect: (option: Option) => void
  onHover: (idx?: number) => void
  onKeyboardNavigate: (direction: 'forward' | 'backward') => void
  onKeyboardSelect: () => void
  cachedOptions?: Ref<Option[]>
  deleteTag?: (event: MouseEvent, option: Option) => void
  getLabel?: (option: Option) => string | number
  getValue?: (option: Option) => any
  getDisabled?: (option: Option) => boolean
  getValueKey?: (value: any) => any
  tagStyle?: any
  collapseTagSize?: any
  selectDisabled?: any
}

export const selectV2InjectionKey: InjectionKey<SelectV2Context> = Symbol(
  'ElSelectV2Injection'
)

export const selectV2SlotKey: InjectionKey<Record<string, Slot | undefined>> =
  Symbol('ElSelectV2Slot')

export type { SelectV2Instance, OptionV2Props, SelectV2Props }
