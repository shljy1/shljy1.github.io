<script setup lang="ts">
const appConfig = useAppConfig()
const navItems = [
  { label: "首页", to: "/" },
  { label: "关于", to: "/about" },
  { label: "项目", to: "/projects" },
]
</script>

<template>
  <header
    class="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80"
  >
    <div class="mx-auto max-w-5xl px-4">
      <nav class="flex h-16 items-center justify-between">
        <!-- Logo -->
        <NuxtLink
          to="/"
          class="text-xl font-bold text-gray-900 no-underline dark:text-white"
        >
          {{ appConfig.title }}
        </NuxtLink>

        <!-- Navigation -->
        <div class="flex items-center gap-6">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="text-sm text-gray-600 no-underline transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            active-class="text-gray-900 dark:text-white font-medium"
          >
            {{ item.label }}
          </NuxtLink>
        </div>
      </nav>
    </div>
  </header>
</template>
