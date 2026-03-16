<script setup lang="ts">
definePageMeta({
  layout: "default",
})
</script>

<template>
  <div class="py-20">
    <div class="mx-auto max-w-5xl px-4">
      <!-- Hero Section -->
      <section class="text-center">
        <h1
          class="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl"
        >
          你好，我是一名
          <px-tag size="large">前端开发者</px-tag>
        </h1>
        <p class="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
          一名热爱编程的开发者，专注于学习各个方面的前端知识
        </p>
      </section>

      <!-- Features Section -->
      <section class="mt-24">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
          我能做什么
        </h2>
        <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div
            class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
          >
            <div
              class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30"
            >
              <svg
                class="h-6 w-6 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
            <h3
              class="mt-4 text-lg font-semibold text-gray-900 dark:text-white"
            >
              前端开发
            </h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
              使用 Vue、React 等现代框架构建响应式用户界面
            </p>
          </div>

          <div
            class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
          >
            <div
              class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30"
            >
              <svg
                class="h-6 w-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"
                />
              </svg>
            </div>
            <h3
              class="mt-4 text-lg font-semibold text-gray-900 dark:text-white"
            >
              项目构建
            </h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
              使用vite,webpack等构建工具
            </p>
          </div>

          <div
            class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
          >
            <div
              class="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30"
            >
              <svg
                class="h-6 w-6 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                />
              </svg>
            </div>
            <h3
              class="mt-4 text-lg font-semibold text-gray-900 dark:text-white"
            >
              UI/UX 设计
            </h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
              注重用户体验，设计简洁美观的界面
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
