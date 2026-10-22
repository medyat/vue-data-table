<script setup lang="ts">
// Tarih hücre editörü (07 §5, T11-07): yazılabilir ("24.10", "+7d", "today") + takvim popover'ı (reka Popover + Calendar).
// Popover üstünde çözümlenen tarih ("Wed, Oct 28 · in 7 days"); kapanınca odak input'a döner (ikinci Esc düzenlemeyi
// iptal eder). Popover portalda: `dt-sheet-layer` dışarı tık sayılmaz. Alt↓ takvimi açar.
import { getDayOfWeek, getLocalTimeZone, parseDate, startOfWeek, today, type DateValue } from '@internationalized/date'
import { PhCalendarBlank, PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue'
import {
  CalendarCell,
  CalendarCellTrigger,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHead,
  CalendarGridRow,
  CalendarHeadCell,
  CalendarHeader,
  CalendarHeading,
  CalendarNext,
  CalendarPrev,
  CalendarRoot,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from 'reka-ui'
import { computed, nextTick, onMounted, ref } from 'vue'
import { getFormat, toDate } from '../../core/format'
import { useDataTableContext } from '../../core/plugin'
import type { ColumnDef } from '../../types/columns'
import { inputText, parseInput } from '../parse'
import { focusEnd, useParseEnv } from './useParseEnv'

const props = defineProps<{ modelValue: unknown; row: object; column: ColumnDef }>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()
const { i18n, locale } = useDataTableContext()
const env = useParseEnv()
const fmt = getFormat(locale)
const dayFmt = new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' })
const el = ref<HTMLInputElement | null>(null)
const open = ref(false)
const text = ref(inputText(props.column, props.modelValue))
onMounted(() => focusEnd(el.value))

const tz = getLocalTimeZone()
const now = today(tz)
const weekStartsOn = getDayOfWeek(startOfWeek(now, locale), 'en-US') as 0 | 1 | 2 | 3 | 4 | 5 | 6
const safe = (s: unknown): DateValue | undefined => {
  try {
    return typeof s === 'string' && s ? parseDate(s.slice(0, 10)) : undefined
  } catch {
    return undefined
  }
}
const single = computed(() => safe(props.modelValue))
const resolved = computed(() => {
  const v = props.modelValue
  if (typeof v !== 'string' || !single.value) return null
  const d = toDate(v.slice(0, 10))
  return { day: dayFmt.format(d), relative: fmt.relative(d) }
})

const onInput = () => {
  text.value = el.value!.value
  emit('update:modelValue', parseInput(props.column, text.value, env()))
}
const onPick = (d: DateValue | undefined) => {
  if (!d) return
  const iso = d.toString()
  text.value = iso
  emit('update:modelValue', iso)
  open.value = false
}
const refocus = (e: Event) => {
  e.preventDefault()
  void nextTick(() => focusEnd(el.value))
}
const onKeydown = (e: KeyboardEvent) => {
  if (e.altKey && e.key === 'ArrowDown') {
    e.preventDefault()
    open.value = true
  }
}
</script>

<template>
  <span class="dt-cell-editor is-date">
    <input
      ref="el"
      class="dt-cell-input"
      type="text"
      :value="text"
      :aria-label="column.header"
      autocomplete="off"
      @input="onInput"
      @keydown="onKeydown"
    />
    <PopoverRoot v-model:open="open">
      <PopoverTrigger as-child>
        <button type="button" class="dt-cell-editor-btn" tabindex="-1" :aria-label="i18n.t('type.date')">
          <PhCalendarBlank :size="14" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          class="dt-pop dt-cell-date dt-sheet-layer"
          align="start"
          :side-offset="4"
          @close-auto-focus="refocus"
        >
          <div v-if="resolved" class="dt-cell-date-head">
            <strong>{{ resolved.day }}</strong>
            <span>{{ resolved.relative }}</span>
          </div>
          <CalendarRoot
            v-slot="{ weekDays, grid }"
            class="dt-calendar"
            :model-value="single"
            :locale="locale"
            :week-starts-on="weekStartsOn"
            :placeholder="single ?? now"
            @update:model-value="(d) => onPick(d as DateValue | undefined)"
          >
            <CalendarHeader class="dt-cal-head">
              <CalendarPrev class="dt-icon-btn-sm"><PhCaretLeft :size="16" aria-hidden="true" /></CalendarPrev>
              <CalendarHeading class="dt-cal-title" />
              <CalendarNext class="dt-icon-btn-sm"><PhCaretRight :size="16" aria-hidden="true" /></CalendarNext>
            </CalendarHeader>
            <CalendarGrid v-for="month in grid" :key="month.value.toString()" class="dt-cal-grid">
              <CalendarGridHead>
                <CalendarGridRow>
                  <CalendarHeadCell v-for="day in weekDays" :key="day" class="dt-cal-dow">{{ day }}</CalendarHeadCell>
                </CalendarGridRow>
              </CalendarGridHead>
              <CalendarGridBody>
                <CalendarGridRow v-for="(week, i) in month.rows" :key="i">
                  <CalendarCell v-for="d in week" :key="d.toString()" :date="d" class="dt-cal-cell">
                    <CalendarCellTrigger :day="d" :month="month.value" class="dt-cal-day" />
                  </CalendarCell>
                </CalendarGridRow>
              </CalendarGridBody>
            </CalendarGrid>
          </CalendarRoot>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </span>
</template>
