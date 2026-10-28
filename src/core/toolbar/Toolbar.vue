<script setup lang="ts">
// Toolbar (05 §3, §11; T1, T13): yalnızca yapılandırılmış yuvalar; daralma kartın genişliğiyle (`size`, DataTable ölçer).
// Sıra: görünüm · [arama · Filter] (tam ortada) · [Display · ⋯] │ birincil (köşeli parantez: birleşik düğme grubu, D43).
// Masaüstünde üç sütunlu ızgara (iki yan eşit pay). ≥1024 etiketli · 640–1023 arama ve Display ikon ·
// <640 telefon (yanlar ve gruplar display: contents, düz flex sırası):
// görünüm · boşluk · arama · Filter · ⋯ · ayırıcı · birincil (CSS order);
// arama açılınca toolbar'ın yerini alır (T13-03), Cancel temizleyip kapatır.
import { PhMagnifyingGlass } from '@phosphor-icons/vue'
import { computed, ref } from 'vue'
import { useDataTableContext } from '../plugin'
import SearchBox from './SearchBox.vue'

const props = defineProps<{
  size: 'full' | 'narrow' | 'phone'
  /** null: arama yuvası yok. */
  search: string | null
  searchPlaceholder: string
  hasFilter: boolean
  hasDisplay: boolean
  /** ⋯ menüsünde en az bir öğe var mı. */
  hasMore: boolean
}>()
const emit = defineEmits<{ 'update:search': [value: string] }>()
const { i18n } = useDataTableContext()

const searchOpen = ref(false)
const searchBox = ref<InstanceType<typeof SearchBox> | null>(null)
const phone = computed(() => props.size === 'phone')
const phoneSearch = computed(() => phone.value && (searchOpen.value || !!props.search))
const openSearch = () => {
  searchOpen.value = true
  requestAnimationFrame(() => searchBox.value?.focus())
}
const cancelSearch = () => {
  searchOpen.value = false
  emit('update:search', '')
}
defineExpose({
  focusSearch: () => {
    if (props.size !== 'full' && !searchOpen.value && !props.search) openSearch()
    else searchBox.value?.focus()
  },
})
</script>

<template>
  <div class="dt-toolbar" :class="[`is-${size}`, { 'is-zoned': !phoneSearch }]" role="toolbar">
    <template v-if="phoneSearch">
      <SearchBox
        ref="searchBox"
        :model-value="search ?? ''"
        :placeholder="searchPlaceholder"
        phone
        @update:model-value="(v) => emit('update:search', v)"
      />
      <button type="button" class="dt-btn dt-btn-ghost dt-search-cancel" @click="cancelSearch">
        {{ i18n.t('common.cancel') }}
      </button>
    </template>
    <template v-else>
      <div class="dt-toolbar-side is-start"><slot name="view" /></div>
      <div class="dt-btn-group">
        <template v-if="search !== null">
          <button
            v-if="size !== 'full' && !searchOpen && !search"
            type="button"
            class="dt-btn dt-btn-icon dt-search-open"
            :aria-label="searchPlaceholder"
            :data-dt-tip="searchPlaceholder"
            @click="openSearch"
          >
            <PhMagnifyingGlass :size="phone ? 20 : 16" aria-hidden="true" />
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
        <slot v-if="hasFilter" name="filter" :icon-only="phone" :phone="phone" />
      </div>
      <span class="dt-toolbar-spacer" />
      <div class="dt-toolbar-side is-end">
        <div class="dt-btn-group">
          <slot v-if="hasDisplay && !phone" name="display" :icon-only="size !== 'full'" />
          <slot v-if="hasMore || (hasDisplay && phone)" name="more" :phone="phone" />
        </div>
        <template v-if="$slots.end">
          <span class="dt-toolbar-sep" aria-hidden="true" />
          <span class="dt-toolbar-end"><slot name="end" :compact="phone" /></span>
        </template>
      </div>
    </template>
  </div>
</template>
