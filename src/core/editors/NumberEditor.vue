<script setup lang="ts">
// Sayı editörü (04 §3, T2-05): tek değer ya da Min / Max ("and"); 250 ms sonra ve Enter'da uygular; `currency` sütununda
// para birimi segmented (değer düz sayı, para birimi ayrı alan); percentage `%` son eki; yerel ayara göre okunur.
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ColumnDef } from '../../types/columns'
import type { FilterOp } from '../../types/query'
import { parseNumber } from '../format/parse'
import { useDataTableContext } from '../plugin'

const props = defineProps<{
  column: ColumnDef
  op: FilterOp
  modelValue: unknown
  currency?: string
  /** `currency` sütunu: seçilebilir kodlar (sabit kod veya yüklü satırlardan). */
  currencies: string[]
}>()
const emit = defineEmits<{
  'update:modelValue': [value: number | [number | null, number | null] | undefined]
  'update:currency': [code: string]
  done: []
}>()
const { i18n, locale } = useDataTableContext()
const range = computed(() => props.op === 'between')
const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 6 })
const show = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? nf.format(n) : '')
const fromModel = () => {
  const v = props.modelValue
  if (range.value) return [show(Array.isArray(v) ? v[0] : undefined), show(Array.isArray(v) ? v[1] : undefined)]
  return [show(v), '']
}
const [a0, b0] = fromModel()
const a = ref(a0 ?? '')
const b = ref(b0 ?? '')
watch(
  () => [props.modelValue, props.op],
  () => {
    const [x, y] = fromModel()
    if (parseNumber(locale, a.value) !== parseNumber(locale, x ?? '')) a.value = x ?? ''
    if (parseNumber(locale, b.value) !== parseNumber(locale, y ?? '')) b.value = y ?? ''
  },
)
const first = ref<HTMLInputElement | null>(null)
onMounted(() => first.value?.focus())

const commit = () => {
  const min = parseNumber(locale, a.value)
  if (range.value) {
    const max = parseNumber(locale, b.value)
    emit('update:modelValue', min === null && max === null ? undefined : [min, max])
  } else emit('update:modelValue', min ?? undefined)
}
let timer: ReturnType<typeof setTimeout> | undefined
const onInput = () => {
  clearTimeout(timer)
  timer = setTimeout(commit, 250)
}
const onEnter = () => {
  clearTimeout(timer)
  commit()
  emit('done')
}
onBeforeUnmount(() => clearTimeout(timer))
const suffix = props.column.type === 'percentage' ? '%' : ''
</script>

<template>
  <div class="dt-editor-number">
    <ToggleGroupRoot
      v-if="currencies.length > 1"
      class="dt-seg dt-seg-xs"
      type="single"
      :model-value="currency"
      @update:model-value="(v) => v && emit('update:currency', String(v))"
    >
      <ToggleGroupItem v-for="c in currencies" :key="c" class="dt-seg-item" :value="c">{{ c }}</ToggleGroupItem>
    </ToggleGroupRoot>
    <div class="dt-editor-fields">
      <label class="dt-editor-field">
        <span v-if="range" class="dt-editor-label">{{ i18n.t('number.min') }}</span>
        <span class="dt-input" :class="{ 'has-suffix': suffix }">
          <input
            ref="first"
            v-model="a"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            @input="onInput"
            @keydown.enter.prevent="onEnter"
          />
          <span v-if="suffix" class="dt-input-end dt-input-suffix">{{ suffix }}</span>
        </span>
      </label>
      <template v-if="range">
        <span class="dt-editor-and">{{ i18n.t('number.and') }}</span>
        <label class="dt-editor-field">
          <span class="dt-editor-label">{{ i18n.t('number.max') }}</span>
          <span class="dt-input" :class="{ 'has-suffix': suffix }">
            <input
              v-model="b"
              type="text"
              inputmode="decimal"
              autocomplete="off"
              @input="onInput"
              @keydown.enter.prevent="onEnter"
            />
            <span v-if="suffix" class="dt-input-end dt-input-suffix">{{ suffix }}</span>
          </span>
        </label>
      </template>
    </div>
  </div>
</template>
