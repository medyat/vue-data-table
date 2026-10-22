<script setup lang="ts" generic="Row extends object">
// Bulk bar (05 §6, handoff 03 §7, T5-01/03/04): [sayaç] │ aksiyonlar (en fazla 3 `inBar`) │ ⋯ (kalanlar, yıkıcı en altta) │ ×.
// Yüzer (varsayılan: kartın altında ortada, 64 px, düzeni kaydırmaz) ya da toolbar'ın yerine. `run(rows)` beklenmez (D20).
import { PhDotsThree, PhX } from '@phosphor-icons/vue'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'
import { computed, ref } from 'vue'
import type { BulkAction } from '../types/list'
import { useDataTableContext } from '../core/plugin'
import Layer from '../core/ui/Layer.vue'

const props = defineProps<{
  rows: Row[]
  actions: Array<BulkAction<Row>>
  variant: 'floating' | 'toolbar'
  /** Telefon (handoff 04 §7): en çok 2 aksiyon + More alt sayfası; ikon üstte, etiket altta. */
  phone?: boolean
}>()
const emit = defineEmits<{ clear: [] }>()
defineSlots<{ default?: () => unknown }>()
const { i18n } = useDataTableContext()

const inBar = computed(() => props.actions.filter((a) => a.inBar).slice(0, props.phone ? 2 : 3))
/** ⋯ menüsü: bar'da olmayanlar; yıkıcılar en altta, ayırıcıdan sonra. */
const rest = computed(() => {
  const bar = new Set(inBar.value)
  const others = props.actions.filter((a) => !bar.has(a))
  return [...others.filter((a) => !a.destructive), ...others.filter((a) => a.destructive)]
})
const firstDestructive = computed(() => rest.value.findIndex((a) => a.destructive))
const disabledOf = (a: BulkAction<Row>): boolean | string => a.disabled?.(props.rows) ?? false
const tipOf = (a: BulkAction<Row>): string | undefined => {
  const d = disabledOf(a)
  return typeof d === 'string' ? d : undefined
}
const moreOpen = ref(false)
const run = (a: BulkAction<Row>) => {
  if (disabledOf(a)) return
  moreOpen.value = false
  void a.run(props.rows)
}
const btn = computed(() => (props.variant === 'toolbar' ? 'dt-btn has-icon' : 'dt-bulk-btn'))
</script>

<template>
  <div
    class="dt-bulk"
    :class="[`is-${variant}`, { 'is-phone': phone }]"
    role="toolbar"
    :aria-label="i18n.t('bulk.aria')"
  >
    <button
      v-if="variant === 'toolbar'"
      type="button"
      class="dt-btn dt-btn-icon"
      :aria-label="i18n.t('selection.clear')"
      :data-dt-tip="i18n.t('selection.clear')"
      @click="emit('clear')"
    >
      <PhX :size="16" aria-hidden="true" />
    </button>
    <span class="dt-bulk-count" role="status">{{ i18n.t('selection.selected', { count: rows.length }) }}</span>
    <span class="dt-bulk-sep" aria-hidden="true" />
    <slot>
      <button
        v-for="a in inBar"
        :key="a.id"
        type="button"
        :class="[btn, { 'is-destructive': a.destructive }]"
        :disabled="!!disabledOf(a)"
        :data-dt-tip="tipOf(a)"
        @click="run(a)"
      >
        <component :is="a.icon" v-if="a.icon" :size="phone ? 18 : 16" aria-hidden="true" />
        <span>{{ a.label }}</span>
      </button>
      <Layer v-if="rest.length && phone" v-model:open="moreOpen" sheet hide-title :title="i18n.t('bulk.moreAria')">
        <template #trigger>
          <button type="button" class="dt-bulk-btn dt-bulk-more" :aria-label="i18n.t('bulk.moreAria')">
            <PhDotsThree :size="18" weight="bold" aria-hidden="true" />
            <span>{{ i18n.t('common.more') }}</span>
          </button>
        </template>
        <div class="dt-bsheet-label">{{ i18n.t('selection.selected', { count: rows.length }) }}</div>
        <template v-for="(a, i) in rest" :key="a.id">
          <div v-if="i === firstDestructive" class="dt-bsheet-sep" />
          <button
            type="button"
            class="dt-bsheet-row"
            :class="{ 'is-destructive': a.destructive }"
            :disabled="!!disabledOf(a)"
            @click="run(a)"
          >
            <span class="dt-menu-text">
              <span>{{ a.label }}</span>
              <span v-if="tipOf(a)" class="dt-menu-sub">{{ tipOf(a) }}</span>
            </span>
          </button>
        </template>
      </Layer>
      <DropdownMenuRoot v-else-if="rest.length">
        <DropdownMenuTrigger as-child>
          <button
            type="button"
            :class="[btn, 'dt-bulk-more', { 'dt-btn-icon': variant === 'toolbar' }]"
            :aria-label="i18n.t('bulk.moreAria')"
          >
            <PhDotsThree :size="16" weight="bold" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            class="dt-menu dt-bulk-menu"
            :side="variant === 'floating' ? 'top' : 'bottom'"
            align="start"
            :side-offset="variant === 'floating' ? 12 : 4"
          >
            <template v-for="(a, i) in rest" :key="a.id">
              <DropdownMenuSeparator v-if="i === firstDestructive" class="dt-menu-sep" />
              <DropdownMenuItem
                class="dt-menu-item"
                :class="{ 'is-destructive': a.destructive, 'is-two-line': tipOf(a) }"
                :disabled="!!disabledOf(a)"
                @select="run(a)"
              >
                <span class="dt-menu-text">
                  <span>{{ a.label }}</span>
                  <span v-if="tipOf(a)" class="dt-menu-sub">{{ tipOf(a) }}</span>
                </span>
              </DropdownMenuItem>
            </template>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
    </slot>
    <template v-if="variant === 'floating'">
      <span class="dt-bulk-sep" aria-hidden="true" />
      <button
        type="button"
        class="dt-bulk-btn dt-bulk-icon"
        :aria-label="i18n.t('selection.clear')"
        :data-dt-tip="i18n.t('selection.clear')"
        @click="emit('clear')"
      >
        <PhX :size="16" aria-hidden="true" />
      </button>
    </template>
  </div>
</template>
