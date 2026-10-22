<script setup lang="ts">
// Görünüm seçici + menüsü (04 §7, handoff 03 §4.1, T3-01/02/03): üstte kaydetme bölümü (yalnızca düzenlenmişse, D27),
// Find a view…, System / My views bölümleri (D30: paylaşım yok), satır ⋯ menüsü, altta New view. Kısayol `V` DataTable'da.
import { PhCaretDown, PhCheck, PhDotsThree, PhMagnifyingGlass, PhPlus } from '@phosphor-icons/vue'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ListboxContent,
  ListboxFilter,
  ListboxGroup,
  ListboxGroupLabel,
  ListboxItem,
  ListboxRoot,
} from 'reka-ui'
import { computed, ref, watch } from 'vue'
import type { View } from '../../types/views'
import { SAVE_KBD } from '../interaction/kbd'
import { useDataTableContext } from '../plugin'
import Layer from '../ui/Layer.vue'

const props = defineProps<{
  sections: { system: View[]; personal: View[] }
  active: View | null
  edited: boolean
  hasDraft: (id: string) => boolean
  defaultId: string | null
  /** Adapter var: kaydetme, New view, Duplicate. */
  canSave: boolean
  /** Aktif görünüm üzerine yazılabilir (personal). */
  canWrite: boolean
  /** Telefon: popover yerine alt sayfa (T13-06). */
  sheet?: boolean
}>()
const emit = defineEmits<{
  select: [id: string]
  'save-changes': []
  'save-as': []
  discard: []
  new: []
  rename: [view: View]
  duplicate: [view: View]
  'set-default': [id: string]
  delete: [view: View]
}>()
const open = defineModel<boolean>('open', { default: false })
const { i18n } = useDataTableContext()
const q = ref('')
watch(open, (o) => {
  if (!o) q.value = ''
})

const label = computed(() => {
  const name = props.active?.name ?? i18n.t('views.title')
  return i18n.t(props.edited ? 'sr.viewEdited' : 'sr.view', { name })
})
const match = (v: View) => !q.value || v.name.toLocaleLowerCase().includes(q.value.toLocaleLowerCase())
const groups = computed(() =>
  (
    [
      ['system', 'views.system', 'views.builtIn'],
      ['personal', 'views.mine', 'views.onlyYou'],
    ] as const
  )
    .map(([key, title, hint]) => ({ key, title, hint, views: props.sections[key].filter(match) }))
    .filter((g) => g.views.length),
)
const isEdited = (v: View) => (v.id === props.active?.id ? props.edited : props.hasDraft(v.id))
const canEdit = (v: View) => props.canSave && v.kind !== 'system'

/** Dialog açan eylemler popover kapandıktan sonra: kapanış odağı tetikleyiciye dönerken dialog'u kapatmasın. */
const after = (fn: () => void) => {
  open.value = false
  setTimeout(fn, 0)
}
const pick = (id: unknown) => {
  if (typeof id !== 'string') return
  open.value = false
  emit('select', id)
}
</script>

<template>
  <Layer
    v-model:open="open"
    :sheet="sheet"
    :title="i18n.t('views.title')"
    hide-title
    content-class="dt-views"
    align="start"
  >
    <template #trigger>
      <button type="button" class="dt-btn dt-btn-ghost has-icon dt-view-trigger" :aria-label="label">
        <span class="dt-view-name">{{ active?.name ?? i18n.t('views.title') }}</span>
        <template v-if="edited">
          <span class="dt-view-dot" aria-hidden="true" />
          <span class="dt-view-edited">{{ i18n.t('views.edited') }}</span>
        </template>
        <PhCaretDown :size="14" aria-hidden="true" />
      </button>
    </template>
    <template v-if="edited && active">
      <div class="dt-pop-label">{{ i18n.t('views.editedName', { name: active.name }) }}</div>
      <template v-if="canWrite">
        <button type="button" class="dt-pop-item dt-view-action" @click="after(() => emit('save-changes'))">
          <span class="dt-view-action-main">
            {{ i18n.t('views.saveChanges') }}
            <kbd class="dt-kbd">{{ SAVE_KBD }}</kbd>
          </span>
          <span class="dt-view-action-sub">{{ i18n.t('views.updates', { name: active.name }) }}</span>
        </button>
        <button type="button" class="dt-pop-item dt-view-action" @click="after(() => emit('save-as'))">
          <span class="dt-view-action-main">{{ i18n.t('views.saveAsNew') }}</span>
          <span class="dt-view-action-sub">{{ i18n.t('views.keepsUnchanged', { name: active.name }) }}</span>
        </button>
      </template>
      <button
        v-else-if="canSave"
        type="button"
        class="dt-pop-item dt-view-action is-single"
        @click="after(() => emit('save-as'))"
      >
        <span class="dt-view-action-main">
          {{ i18n.t('views.saveAsMine') }}
          <kbd class="dt-kbd">{{ SAVE_KBD }}</kbd>
        </span>
      </button>
      <button type="button" class="dt-pop-item dt-view-action is-single" @click="after(() => emit('discard'))">
        <span class="dt-view-action-main">{{ i18n.t('views.discard') }}</span>
      </button>
      <div class="dt-pop-sep" />
    </template>
    <ListboxRoot :model-value="active?.id" selection-behavior="replace" highlight-on-hover @update:model-value="pick">
      <label class="dt-input has-icon dt-picker-search">
        <span class="dt-input-icon"><PhMagnifyingGlass :size="14" aria-hidden="true" /></span>
        <ListboxFilter v-model="q" auto-focus :placeholder="i18n.t('views.find')" :aria-label="i18n.t('views.find')" />
      </label>
      <ListboxContent class="dt-views-list">
        <ListboxGroup v-for="g in groups" :key="g.key">
          <ListboxGroupLabel class="dt-pop-label">
            {{ i18n.t(g.title) }}
            <span>{{ i18n.t(g.hint) }}</span>
          </ListboxGroupLabel>
          <div v-for="v in g.views" :key="v.id" class="dt-view-row" :class="{ 'is-active': v.id === active?.id }">
            <ListboxItem :value="v.id" class="dt-view-item">
              <PhCheck v-if="sheet && v.id === active?.id" :size="18" class="dt-view-check" aria-hidden="true" />
              <span class="dt-view-row-name">{{ v.name }}</span>
              <template v-if="isEdited(v)">
                <span class="dt-view-dot" aria-hidden="true" />
                <span class="dt-view-edited">{{ i18n.t('views.edited') }}</span>
              </template>
              <span v-if="v.id === defaultId" class="dt-view-default">{{ i18n.t('views.default') }}</span>
            </ListboxItem>
            <DropdownMenuRoot>
              <DropdownMenuTrigger as-child>
                <!-- Enter/Space ⋯'yi açar; Listbox'a ulaşıp satırı seçmesin (klavye). -->
                <button
                  type="button"
                  class="dt-icon-btn-sm dt-view-more"
                  :aria-label="i18n.t('common.more')"
                  @keydown.enter.space.stop
                >
                  <PhDotsThree :size="16" weight="bold" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent class="dt-menu dt-view-row-menu" side="right" align="start" :side-offset="8">
                  <DropdownMenuItem v-if="canEdit(v)" class="dt-menu-item" @select="after(() => emit('rename', v))">
                    {{ i18n.t('views.rename') }}
                  </DropdownMenuItem>
                  <DropdownMenuItem v-if="canSave" class="dt-menu-item" @select="after(() => emit('duplicate', v))">
                    {{ i18n.t('views.duplicate') }}
                  </DropdownMenuItem>
                  <DropdownMenuItem class="dt-menu-item" @select="emit('set-default', v.id)">
                    {{ i18n.t('views.setDefault') }}
                  </DropdownMenuItem>
                  <template v-if="canEdit(v)">
                    <DropdownMenuSeparator class="dt-menu-sep" />
                    <DropdownMenuItem class="dt-menu-item is-destructive" @select="after(() => emit('delete', v))">
                      {{ i18n.t('views.delete') }}
                    </DropdownMenuItem>
                  </template>
                  <div v-if="v.kind === 'system'" class="dt-view-note">{{ i18n.t('views.systemNote') }}</div>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenuRoot>
          </div>
        </ListboxGroup>
        <div v-if="!groups.length" class="dt-options-empty">{{ i18n.t('views.noMatch') }}</div>
      </ListboxContent>
    </ListboxRoot>
    <template v-if="canSave">
      <div class="dt-pop-sep" />
      <button type="button" class="dt-pop-item dt-view-new" @click="after(() => emit('new'))">
        <PhPlus :size="14" aria-hidden="true" />
        {{ i18n.t('views.new') }}
      </button>
    </template>
  </Layer>
</template>
