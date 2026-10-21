<script setup lang="ts">
// Satır menüsü (05 §4, handoff 03 §8, T6-03; 268 px): Open ↵ (gerçek <a href>) · Open in new tab · Copy {birincil} · ─ ·
// uygulamanın `rowActions`'ı (pasif olan gerekçesiyle iki satır; yıkıcı en altta, kırmızı). `run` beklenmez (D20).
import { PhDotsThree } from '@phosphor-icons/vue'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'
import { computed, toRaw } from 'vue'
import type { RowAction } from '../../types/list'
import { useDataTableContext } from '../plugin'

const props = defineProps<{
  row: object
  /** Birincil hücre metni (aria etiketleri). */
  label: string
  /** Birincil sütun başlığı: "Copy Order no."; yoksa Copy öğesi yok. */
  primaryHeader?: string
  href?: string
  actions: RowAction[]
  open: boolean
}>()
const emit = defineEmits<{ 'update:open': [open: boolean]; open: [event: MouseEvent]; copy: [] }>()
const { i18n } = useDataTableContext()

/** Yıkıcı aksiyonlar en altta, kendi ayırıcısıyla. */
const ordered = computed(() => [
  ...props.actions.filter((a) => !a.destructive),
  ...props.actions.filter((a) => a.destructive),
])
const firstDestructive = computed(() => ordered.value.findIndex((a) => a.destructive))
const reasonOf = (a: RowAction): string | null => {
  const d = a.disabled?.(props.row)
  return typeof d === 'string' ? d : null
}
const isDisabled = (a: RowAction) => !!a.disabled?.(props.row)
const run = (a: RowAction) => {
  if (!isDisabled(a)) void a.run(toRaw(props.row))
}
/** Düz sol tık `row-open`; ⌘/Ctrl, orta ve sağ tık tarayıcıya kalır (D6). */
const onOpen = (e: MouseEvent) => {
  if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) emit('open', e)
}
</script>

<template>
  <DropdownMenuRoot :open="open" @update:open="(o) => emit('update:open', o)">
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        class="dt-row-more"
        tabindex="-1"
        :aria-label="i18n.t('row.actionsAria', { id: label })"
        @keydown.enter.space.stop
      >
        <PhDotsThree :size="16" weight="bold" aria-hidden="true" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent class="dt-menu dt-row-menu" align="end" :side-offset="4">
        <template v-if="href">
          <DropdownMenuItem as-child class="dt-menu-item">
            <a :href="href" @click="onOpen">
              {{ i18n.t('row.open') }}
              <kbd class="dt-kbd">↵</kbd>
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem as-child class="dt-menu-item">
            <a :href="href" target="_blank" rel="noopener">{{ i18n.t('row.openNewTab') }}</a>
          </DropdownMenuItem>
        </template>
        <DropdownMenuItem v-if="primaryHeader" class="dt-menu-item" @select="emit('copy')">
          {{ i18n.t('row.copyId', { column: primaryHeader }) }}
        </DropdownMenuItem>
        <DropdownMenuSeparator v-if="(href || primaryHeader) && ordered.length" class="dt-menu-sep" />
        <template v-for="(a, i) in ordered" :key="a.id">
          <DropdownMenuSeparator v-if="a.separatorBefore || i === firstDestructive" class="dt-menu-sep" />
          <DropdownMenuItem
            class="dt-menu-item"
            :class="{ 'is-destructive': a.destructive, 'is-two-line': reasonOf(a) }"
            :disabled="isDisabled(a)"
            @select="run(a)"
          >
            <component :is="a.icon" v-if="a.icon" :size="16" aria-hidden="true" />
            <span class="dt-menu-text">
              <span>{{ a.label }}</span>
              <span v-if="reasonOf(a)" class="dt-menu-sub">{{ reasonOf(a) }}</span>
            </span>
            <kbd v-if="a.shortcut" class="dt-kbd">{{ a.shortcut }}</kbd>
          </DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
