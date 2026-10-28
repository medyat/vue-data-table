import { createDataTable, createLocalStoragePreferences, createLocalStorageViews } from '@medyat/vue-data-table'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { settings } from './settings'

createApp(App)
  .use(router)
  .use(
    createDataTable({
      locale: settings.locale,
      viewsAdapter: createLocalStorageViews({ scope: 'playground' }),
      preferences: createLocalStoragePreferences({ scope: 'playground' }),
    }),
  )
  .mount('#app')
