<script setup lang="ts">
// Çoklu seçim editörü (07 §5, 06 §7 T11-07): multiselect. Hücre içinde arama kutusu, altta seçenek listesi (reka Combobox,
// `multiple`). Yazmak süzer; eşleşen seçenek yoksa liste açılmaz (boş listbox olmaz, axe). Enter vurgulu seçeneği aç/kapar;
// seçim listeyi açık tutar, seçili seçenek tik alır, tekrar seçmek kaldırır. Listede olmayan metin yok sayılır: listede olmayan
// değer yalnızca yapıştırmayla girer ve "isn't an option" hatası alır (select ile aynı). Esc kaydedip çıkar (SheetGrid).
// Liste portalda: `dt-sheet-layer`.
import { PhCheck } from '@phosphor-icons/vue'
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxViewport,
} from 'reka-ui'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { badge } from '../../core/cells/renderCell'
import type { ColumnDef, OptionDef } from '../../types/columns'
import { useDataTableContext } from '../../core/plugin'
import { useSheetEditor } from './context'
import { focusEnd } from './useParseEnv'

type Value = string | number
const props = defineProps<{ modelValue: unknown; row: object; column: ColumnDef }>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()
const { locale } = useDataTableContext()
const lower = (t: string) => t.toLocaleLowerCase(locale)
const sheet = useSheetEditor()

const def = computed(() => props.column as Extract<ColumnDef, { type: 'multiselect' }>)
const values = computed<Value[]>(() => (Array.isArray(props.modelValue) ? (props.modelValue as Value[]) : []))
/** Sütunun seçenekleri: satıra göre kapalı olanlar yok, seçili olanlar kalır. */
const suggestions = computed<OptionDef[]>(() => {
  const d = def.value
  return d.options.filter((o) => values.value.includes(o.value) || !d.optionEnabled || d.optionEnabled(o, props.row))
})

const search = ref(sheet.seed() ?? '')
/** Süzme burada (reka'nınki kapalı): eşleşme yoksa liste hiç açılmaz. */
const shown = computed(() => {
  const q = lower(search.value.trim())
  return q ? suggestions.value.filter((o) => lower(o.label).includes(q)) : suggestions.value
})
const wantOpen = ref(true)
const open = computed({ get: () => wantOpen.value && shown.value.length > 0, set: (v) => (wantOpen.value = v) })
// reka listenin id'sini input'a geç yazıyor (aria-controls=""): açılınca DOM'daki gerçek id okunur (OptionCell ile aynı).
const listId = ref<string | undefined>()
watch(
  open,
  (o) => {
    if (o)
      void nextTick(() => {
        listId.value = document.querySelector<HTMLElement>('.dt-cell-list[role="listbox"]')?.id || undefined
      })
  },
  { immediate: true },
)
/** reka aç/kapa yapılmış yeni diziyi verir; arama temizlenir, liste açık kalır. */
const onPick = (v: unknown) => {
  if (!Array.isArray(v)) return
  emit('update:modelValue', v.length ? v : null)
  search.value = ''
  void nextTick(reveal)
}
const onKeydown = (e: KeyboardEvent) => {
  if (e.altKey && e.key === 'ArrowDown') {
    e.preventDefault()
    open.value = true
  }
}
const input = ref<{ $el: HTMLInputElement } | null>(null)
const reveal = () => focusEnd(input.value?.$el ?? null)
onMounted(() => void nextTick(reveal))

// Sabit bileşen: her render'da yeni bileşen üretmek öğeyi mousedown–mouseup arasında değiştirir, click kaybolur.
const Item = (p: { o: OptionDef }) => badge(p.o.tone, p.o.label)
</script>

<template>
  <ComboboxRoot
    v-model:open="open"
    class="dt-cell-editor is-multi"
    multiple
    :model-value="values"
    :reset-search-term-on-blur="false"
    :reset-search-term-on-select="false"
    ignore-filter
    @update:model-value="onPick"
  >
    <ComboboxAnchor class="dt-cell-anchor">
      <ComboboxInput
        ref="input"
        v-model="search"
        class="dt-cell-input"
        :display-value="() => search"
        autocomplete="off"
        :aria-label="column.header"
        :aria-controls="listId"
        @keydown="onKeydown"
      />
    </ComboboxAnchor>
    <ComboboxPortal>
      <ComboboxContent
        class="dt-pop dt-cell-list dt-sheet-layer"
        position="popper"
        align="start"
        :side-offset="2"
        :aria-label="column.header"
      >
        <ComboboxViewport>
          <ComboboxItem
            v-for="o in shown"
            :key="String(o.value)"
            class="dt-pop-item dt-cell-option"
            :value="o.value"
            :text-value="o.label"
          >
            <Item :o="o" />
            <ComboboxItemIndicator class="dt-cell-option-check">
              <PhCheck :size="14" aria-hidden="true" />
            </ComboboxItemIndicator>
            <kbd class="dt-kbd dt-cell-option-enter" aria-hidden="true">↵</kbd>
          </ComboboxItem>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
