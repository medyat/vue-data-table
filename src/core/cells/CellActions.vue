<script setup lang="ts" generic="Row extends object">
// Hücre aksiyonları overlay'i (03 · actions, T7): sağ kenarda ≤ 2 düğme, fazlası ⋯ menüsünde; metin yerleşimi değişmez.
import { PhDotsThree } from '@phosphor-icons/vue'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'reka-ui'
import { computed, toRaw } from 'vue'
import type { CellAction } from '../../types/columns'
import { useDataTableContext } from '../plugin'

const props = defineProps<{ actions: Array<CellAction<Row>>; row: Row }>()
const { i18n } = useDataTableContext()

type Item = Omit<CellAction<Row>, 'reveal' | 'menu'> & { menu?: Array<Omit<CellAction<Row>, 'reveal' | 'menu'>> }

const visible = computed(() => props.actions.filter((a) => a.when?.(props.row) ?? true))
const always = computed(() => visible.value.some((a) => a.reveal === 'always'))
/** 2'den çoksa: ilk aksiyon + ⋯ (kalanlar menüde). Tek aksiyonun kendi `menu`'sü ⋯ olarak çizilir. */
const buttons = computed<Item[]>(() => (visible.value.length > 2 ? visible.value.slice(0, 1) : visible.value))
const overflow = computed<Item[]>(() => (visible.value.length > 2 ? visible.value.slice(1) : []))

const disabledOf = (a: Item): string | boolean => a.disabled?.(props.row) ?? false
const tipOf = (a: Item): string => {
  const d = disabledOf(a)
  return typeof d === 'string' ? `${a.label} — ${d}` : a.label
}
const run = (a: Item) => {
  if (disabledOf(a)) return
  void a.run?.(toRaw(props.row))
}
</script>

<template>
  <span v-if="visible.length" class="dt-cell-actions" :class="{ 'is-always': always }">
    <template v-for="a in buttons" :key="a.id">
      <DropdownMenuRoot v-if="a.menu?.length">
        <DropdownMenuTrigger as-child>
          <button
            type="button"
            class="dt-cell-action"
            :class="{ 'is-destructive': a.destructive }"
            tabindex="-1"
            :aria-label="a.label"
            :data-dt-tip="a.label"
          >
            <component :is="a.icon" :size="14" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent class="dt-menu dt-menu-cell" align="end" :side-offset="4">
            <DropdownMenuItem
              v-for="m in a.menu"
              :key="m.id"
              class="dt-menu-item"
              :class="{ 'is-destructive': m.destructive }"
              :disabled="!!disabledOf(m)"
              @select="run(m)"
            >
              <component :is="m.icon" :size="16" aria-hidden="true" />
              {{ m.label }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
      <button
        v-else
        type="button"
        class="dt-cell-action"
        :class="{ 'is-destructive': a.destructive }"
        tabindex="-1"
        :aria-label="a.label"
        :aria-disabled="disabledOf(a) ? 'true' : undefined"
        :data-dt-tip="tipOf(a)"
        @click="run(a)"
      >
        <component :is="a.icon" :size="14" aria-hidden="true" />
      </button>
    </template>
    <DropdownMenuRoot v-if="overflow.length">
      <DropdownMenuTrigger as-child>
        <button
          type="button"
          class="dt-cell-action"
          tabindex="-1"
          :aria-label="i18n.t('common.more')"
          :data-dt-tip="i18n.t('common.more')"
        >
          <PhDotsThree :size="14" weight="bold" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent class="dt-menu dt-menu-cell" align="end" :side-offset="4">
          <DropdownMenuItem
            v-for="m in overflow"
            :key="m.id"
            class="dt-menu-item"
            :class="{ 'is-destructive': m.destructive }"
            :disabled="!!disabledOf(m)"
            @select="run(m)"
          >
            <component :is="m.icon" :size="16" aria-hidden="true" />
            {{ m.label }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
  </span>
</template>
