<script setup lang="ts">
// Tarih editörü (04 §3, T2-04): `within` → solda hazır aralıklar + Custom range, sağda aralık takvimi; `eq/before/after` →
// Today + tek takvim. Hazır aralık tıklanınca uygulanır ve kapanır; özel aralıkta ikinci uç seçilince. Hafta başı yerel ayardan.
import { getDayOfWeek, getLocalTimeZone, parseDate, startOfWeek, today, type DateValue } from '@internationalized/date'
import { PhCaretLeft, PhCaretRight, PhCheck } from '@phosphor-icons/vue'
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
  RangeCalendarCell,
  RangeCalendarCellTrigger,
  RangeCalendarGrid,
  RangeCalendarGridBody,
  RangeCalendarGridHead,
  RangeCalendarGridRow,
  RangeCalendarHeadCell,
  RangeCalendarHeader,
  RangeCalendarHeading,
  RangeCalendarNext,
  RangeCalendarPrev,
  RangeCalendarRoot,
} from 'reka-ui'
import { computed, ref } from 'vue'
import type { DatePreset, FilterOp } from '../../types/query'
import { useDataTableContext } from '../plugin'

const props = defineProps<{ op: FilterOp; modelValue: unknown }>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown]; done: [] }>()
const { i18n, locale } = useDataTableContext()

const PRESETS: DatePreset[] = [
  'today',
  'this_week',
  'next_7_days',
  'this_month',
  'last_30_days',
  'this_quarter',
  'overdue',
]
const tz = getLocalTimeZone()
const now = today(tz)
const weekStartsOn = getDayOfWeek(startOfWeek(now, locale), 'en-US') as 0 | 1 | 2 | 3 | 4 | 5 | 6
const isRange = computed(() => props.op === 'within')
const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : null
const preset = computed(() => obj(props.modelValue)?.preset as string | undefined)
const custom = ref(false)

const safe = (s: unknown): DateValue | undefined => {
  try {
    return typeof s === 'string' && s ? parseDate(s.slice(0, 10)) : undefined
  } catch {
    return undefined
  }
}
const rangeValue = computed(() => {
  const o = obj(props.modelValue)
  return { start: safe(o?.from), end: safe(o?.to) }
})
const single = computed(() => safe(props.modelValue))

const pickPreset = (p: DatePreset) => {
  custom.value = false
  emit('update:modelValue', { preset: p })
  emit('done')
}
const onRange = (r: { start: DateValue | undefined; end: DateValue | undefined } | null) => {
  if (!r?.start || !r.end) return
  emit('update:modelValue', { from: r.start.toString(), to: r.end.toString() })
  emit('done')
}
const onSingle = (d: DateValue | undefined) => {
  if (!d) return
  emit('update:modelValue', d.toString())
  emit('done')
}
const pickToday = () => {
  emit('update:modelValue', { preset: 'today' })
  emit('done')
}
</script>

<template>
  <div class="dt-editor-date">
    <div class="dt-date-presets">
      <template v-if="isRange">
        <button
          v-for="p in PRESETS"
          :key="p"
          type="button"
          class="dt-pop-item dt-date-preset"
          :class="{ 'is-on': preset === p }"
          @click="pickPreset(p)"
        >
          {{ i18n.t(`date.${p}`) }}
          <PhCheck v-if="preset === p" :size="14" class="dt-pop-end" aria-hidden="true" />
        </button>
        <div class="dt-pop-sep" />
        <button
          type="button"
          class="dt-pop-item dt-date-preset"
          :class="{ 'is-on': custom || (!preset && rangeValue.start) }"
          @click="custom = true"
        >
          {{ i18n.t('date.customRange') }}
        </button>
      </template>
      <template v-else>
        <button
          type="button"
          class="dt-pop-item dt-date-preset"
          :class="{ 'is-on': preset === 'today' }"
          @click="pickToday"
        >
          {{ i18n.t('date.today') }}
          <PhCheck v-if="preset === 'today'" :size="14" class="dt-pop-end" aria-hidden="true" />
        </button>
      </template>
    </div>
    <RangeCalendarRoot
      v-if="isRange"
      v-slot="{ weekDays, grid }"
      class="dt-calendar"
      :model-value="rangeValue.start && rangeValue.end ? { start: rangeValue.start, end: rangeValue.end } : undefined"
      :locale="locale"
      :week-starts-on="weekStartsOn"
      :placeholder="rangeValue.start ?? now"
      @update:model-value="onRange"
    >
      <RangeCalendarHeader class="dt-cal-head">
        <RangeCalendarPrev class="dt-icon-btn-sm"><PhCaretLeft :size="16" aria-hidden="true" /></RangeCalendarPrev>
        <RangeCalendarHeading class="dt-cal-title" />
        <RangeCalendarNext class="dt-icon-btn-sm"><PhCaretRight :size="16" aria-hidden="true" /></RangeCalendarNext>
      </RangeCalendarHeader>
      <RangeCalendarGrid v-for="month in grid" :key="month.value.toString()" class="dt-cal-grid">
        <RangeCalendarGridHead>
          <RangeCalendarGridRow>
            <RangeCalendarHeadCell v-for="day in weekDays" :key="day" class="dt-cal-dow">
              {{ day }}
            </RangeCalendarHeadCell>
          </RangeCalendarGridRow>
        </RangeCalendarGridHead>
        <RangeCalendarGridBody>
          <RangeCalendarGridRow v-for="(week, i) in month.rows" :key="i">
            <RangeCalendarCell v-for="d in week" :key="d.toString()" :date="d" class="dt-cal-cell">
              <RangeCalendarCellTrigger :day="d" :month="month.value" class="dt-cal-day" />
            </RangeCalendarCell>
          </RangeCalendarGridRow>
        </RangeCalendarGridBody>
      </RangeCalendarGrid>
    </RangeCalendarRoot>
    <CalendarRoot
      v-else
      v-slot="{ weekDays, grid }"
      class="dt-calendar"
      :model-value="single"
      :locale="locale"
      :week-starts-on="weekStartsOn"
      :placeholder="single ?? now"
      @update:model-value="(d) => onSingle(d as DateValue | undefined)"
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
  </div>
</template>
