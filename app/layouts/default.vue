<template>
  <div class="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
    <TheHeader />
    <main class="flex-1">
      <slot />
    </main>
    <TheFooter />
  </div>
</template>
