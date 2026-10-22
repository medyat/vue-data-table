<script setup lang="ts">
// Seçenek hücre editörü (07 §5, T11-07): reka Combobox; yazmak listeyi süzer, Enter seçer, ilk Esc listeyi kapatır
// (ikinci Esc düzenlemeyi iptal eder — sheet, `aria-expanded` ve `defaultPrevented` üzerinden anlar). Listede olmayan
// metin ham kalır → "“Pump” isn't an option". Liste portalda: `dt-sheet-layer` dışarı tık sayılmaz. Alt↓ listeyi açar.
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxViewport,
} from 'reka-ui'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { optionLabel } from '../../core/cells/format'
import { badge } from '../../core/cells/renderCell'
import { useDataTableContext } from '../../core/plugin'
import type { ColumnDef, OptionDef } from '../../types/columns'
import { inputText, parseInput } from '../parse'
import { focusEnd, useParseEnv } from './useParseEnv'

const props = defineProps<{ modelValue: unknown; row: object; column: ColumnDef }>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()
const { i18n } = useDataTableContext()
const env = useParseEnv()
const def = computed(() => props.column as Extract<ColumnDef, { type: 'select' }>)
// Satıra göre kapalı seçenekler listede yok (`row` taslak satır); etiket çözümü tam listeden.
const options = computed(() => {
  const d = def.value
  return d.optionEnabled ? d.options.filter((o) => d.optionEnabled!(o, props.row)) : d.options
})
const open = ref(true)
// reka listenin id'sini input'a geç yazıyor (aria-controls=""): açılınca DOM'daki gerçek id okunur (axe aria-valid-attr-value).
const listId = ref<string | undefined>()
watch(
  open,
  (o) => {
    if (!o) return
    void nextTick(() => {
      listId.value = document.querySelector<HTMLElement>('.dt-cell-list[role="listbox"]')?.id || undefined
    })
  },
  { immediate: true },
)
const text = ref(inputText(props.column, props.modelValue))
const input = ref<{ $el: HTMLInputElement } | null>(null)
const inputEl = () => input.value?.$el ?? null
onMounted(() => void nextTick(() => focusEnd(inputEl())))

const onText = (v: string) => {
  text.value = v
  emit('update:modelValue', parseInput(props.column, v, env()))
}
const onSelect = (v: unknown) => {
  if (v === undefined || v === null) return
  emit('update:modelValue', v)
  text.value = optionLabel(def.value.options, v)
  open.value = false
  void nextTick(() => focusEnd(inputEl()))
}
const onKeydown = (e: KeyboardEvent) => {
  if (e.altKey && e.key === 'ArrowDown') {
    e.preventDefault()
    open.value = true
  }
}
// Sabit bileşen: her render'da yeni bileşen üretmek rozeti mousedown–mouseup arasında DOM'da değiştirir, click kaybolur.
const Item = (p: { o: OptionDef }) => badge(p.o.tone, p.o.label)
</script>

<template>
  <ComboboxRoot
    v-model:open="open"
    class="dt-cell-editor is-option"
    :model-value="(modelValue as string | number | undefined) ?? undefined"
    :reset-search-term-on-blur="false"
    @update:model-value="onSelect"
  >
    <!-- Liste hücreye göre konumlanır (altında, sağa hizalı): çapa editörün kendisi. -->
    <ComboboxAnchor class="dt-cell-anchor">
      <ComboboxInput
        ref="input"
        class="dt-cell-input"
        autocomplete="off"
        :aria-label="column.header"
        :aria-controls="listId"
        :model-value="text"
        :display-value="() => text"
        @update:model-value="onText"
        @keydown="onKeydown"
      />
    </ComboboxAnchor>
    <ComboboxPortal>
      <ComboboxContent
        class="dt-pop dt-cell-list dt-sheet-layer"
        position="popper"
        align="end"
        :side-offset="2"
        :aria-label="column.header"
      >
        <ComboboxViewport>
          <ComboboxItem
            v-for="o in options"
            :key="String(o.value)"
            class="dt-pop-item dt-cell-option"
            :value="o.value"
            :text-value="o.label"
          >
            <Item :o="o" />
            <kbd class="dt-kbd dt-cell-option-enter" aria-hidden="true">↵</kbd>
          </ComboboxItem>
          <ComboboxEmpty class="dt-options-empty">{{ i18n.t('picker.noMatch') }}</ComboboxEmpty>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
