<script setup lang="ts">
// Popover ya da telefonda alt sayfa (05 §11, handoff 04 §6): aynı içerik, farklı kap. Alt sayfa reka Dialog'dur: scrim,
// odak hapsi, Esc, kapanınca odak tetikleyiciye. Tutamaç · başlık satırı (geri / başlık / metin düğmesi) · kayan gövde · alt düğme.
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from 'reka-ui'

defineProps<{
  sheet?: boolean
  /** Alt sayfanın erişilebilir adı; `hideTitle` ile yalnızca ekran okuyucuya. */
  title: string
  hideTitle?: boolean
  contentClass?: string
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
}>()
const emit = defineEmits<{ focusOutside: [e: CustomEvent<{ originalEvent: FocusEvent }>] }>()
const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <DialogRoot v-if="sheet" v-model:open="open">
    <DialogTrigger v-if="$slots.trigger" as-child><slot name="trigger" /></DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="dt-scrim" />
      <DialogContent class="dt-bsheet" :class="contentClass" :aria-describedby="undefined">
        <span class="dt-bsheet-handle" aria-hidden="true" />
        <div v-if="!hideTitle" class="dt-bsheet-head">
          <slot name="head-start" />
          <DialogTitle class="dt-bsheet-title">{{ title }}</DialogTitle>
          <slot name="head-end" />
        </div>
        <DialogTitle v-else class="dt-sr-only">{{ title }}</DialogTitle>
        <div class="dt-bsheet-body"><slot /></div>
        <div v-if="$slots.foot" class="dt-bsheet-foot"><slot name="foot" /></div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
  <PopoverRoot v-else v-model:open="open">
    <PopoverTrigger v-if="$slots.trigger" as-child><slot name="trigger" /></PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        class="dt-pop"
        :class="contentClass"
        :align="align"
        :side-offset="sideOffset ?? 4"
        @focus-outside="(e) => emit('focusOutside', e)"
      >
        <slot />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
