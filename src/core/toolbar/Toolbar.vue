<script setup lang="ts">
// Toolbar (05 §3, T1): yalnızca yapılandırılmış yuvalar; daralma toolbar'ın kendi genişliğiyle ölçülür (ResizeObserver).
// ≥1024 etiketli · 640–1023 arama ve Display ikon · <640 Display ⋯ içine, #toolbar-end compact.
import { PhMagnifyingGlass } from '@phosphor-icons/vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import SearchBox from './SearchBox.vue'

const props = defineProps<{
  /** null: arama yuvası yok. */
  search: string | null
  searchPlaceholder: string
  hasFilter: boolean
  hasDisplay: boolean
  /** ⋯ menüsünde en az bir öğe var mı. */
  hasMore: boolean
}>()
const emit = defineEmits<{ 'update:search': [value: string] }>()

const el = ref<HTMLElement | null>(null)
const size = ref<'full' | 'narrow' | 'phone'>('full')
const searchOpen = ref(false)
const searchBox = ref<InstanceType<typeof SearchBox> | null>(null)
let ro: ResizeObserver | undefined
onMounted(() => {
  const measure = () => {
    const w = el.value?.clientWidth ?? 1440
    size.value = w >= 1024 ? 'full' : w >= 640 ? 'narrow' : 'phone'
  }
  measure()
  if (typeof ResizeObserver !== 'undefined' && el.value) {
    ro = new ResizeObserver(measure)
    ro.observe(el.value)
  }
})
onBeforeUnmount(() => ro?.disconnect())

const openSearch = () => {
  searchOpen.value = true
  requestAnimationFrame(() => searchBox.value?.focus())
}
defineExpose({
  focusSearch: () => {
    if (size.value !== 'full' && !searchOpen.value && !props.search) openSearch()
    else searchBox.value?.focus()
  },
  size,
})
</script>

<template>
  <div ref="el" class="dt-toolbar" :class="`is-${size}`" role="toolbar">
    <template v-if="search !== null">
      <button
        v-if="size !== 'full' && !searchOpen && !search"
        type="button"
        class="dt-btn dt-btn-icon"
        :aria-label="searchPlaceholder"
        :data-dt-tip="searchPlaceholder"
        @click="openSearch"
      >
        <PhMagnifyingGlass :size="16" aria-hidden="true" />
      </button>
      <SearchBox
        v-else
        ref="searchBox"
        :model-value="search"
        :placeholder="searchPlaceholder"
        @update:model-value="(v) => emit('update:search', v)"
        @focusout="searchOpen = false"
      />
    </template>
    <slot v-if="hasFilter" name="filter" :icon-only="size === 'phone'" />
    <span class="dt-toolbar-spacer" />
    <slot v-if="hasDisplay && size !== 'phone'" name="display" :icon-only="size !== 'full'" />
    <slot
      v-if="hasMore || (hasDisplay && size === 'phone')"
      name="more"
      :with-display="hasDisplay && size === 'phone'"
    />
    <template v-if="$slots.end">
      <span class="dt-toolbar-sep" aria-hidden="true" />
      <slot name="end" :compact="size === 'phone'" />
    </template>
  </div>
</template>
