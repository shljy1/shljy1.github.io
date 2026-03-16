import PixeliumVue from "@pixelium/web-vue"

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(PixeliumVue)
})
