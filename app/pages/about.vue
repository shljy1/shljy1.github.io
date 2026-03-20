<script setup lang="ts">
definePageMeta({
  layout: "default",
})
</script>

<template>
  <div class="py-20">
    <div class="mx-auto max-w-5xl px-4">
      <!-- About Header -->
      <section class="text-center">
        <h1
          class="text-4xl font-bold tracking-tight text-gray-900 dark:text-white"
        >
          关于我
        </h1>
      </section>

      <!-- Bio Section -->
      <section class="mt-16">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">工作</h2>
        <div class="mt-6 space-y-4 text-gray-600 dark:text-gray-400">
          <p>
            我是一名前端开发者，目前在宁波工作，对 Web 技术充满热情。从 2021
            年开始编程，一直在不断学习和成长。
          </p>
          <p>
            我相信好的代码不仅要能运行，还要优雅、可维护。我追求简洁的设计和高效的实现。
          </p>
          <p>
            工作之余，我喜欢阅读技术博客、学习开源框架的源码，以及探索新技术。
          </p>
        </div>
        <div class="mt-6 space-y-4">
          <div>
            <h3 class="font-medium text-gray-900 dark:text-white">框架</h3>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Vue、React、UniApp
            </p>
          </div>
          <div>
            <h3 class="font-medium text-gray-900 dark:text-white">语言</h3>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              TypeScript、JavaScript、GLSL、Sass
            </p>
          </div>
          <div>
            <h3 class="font-medium text-gray-900 dark:text-white">知识</h3>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              vite、echarts、three.js、cesium、webgl、tailwindcss、unocss
            </p>
          </div>
        </div>
      </section>
      <px-divider></px-divider>
      <section class="mt-4">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">游戏</h2>
        <div class="mt-8">
          <ul>
            <li>英雄联盟</li>
            <li>魔兽争霸3</li>
            <li>DOTA2</li>
            <li>埃尔登法环</li>
            <li>杀戮尖塔</li>
            <li>狼人杀</li>
            <li>雀魂</li>
            <li>...</li>
          </ul>
        </div>
      </section>
      <px-divider></px-divider>
      <section class="mt-4">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">影视</h2>
        <div class="mt-8">
          <ul>
            <li>《剑雨》</li>
            <li>《肖申克的救赎》</li>
            <li>《陆小凤传奇》</li>
            <li>《请回答1988》</li>
            <li>《仙剑一》</li>
            <li>90、00年代的港剧</li>
          </ul>
        </div>
      </section>
      <section class="mt-4">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">音乐</h2>
        <div class="mt-8">
          <ul>
            <li>《杀破狼》</li>
            <li>《会呼吸的痛》</li>
            <li>《富士山下》</li>
            <li>徐良、许嵩、汪苏泷、本兮</li>
          </ul>
        </div>
      </section>
      <px-divider></px-divider>
      <section class="mt-4">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">书籍</h2>
        <div class="mt-8">
          <ul>
            <li>《城南旧事》</li>
            <li>《三体》</li>
            <li>《春秋》</li>
            <li>《红楼梦》</li>
          </ul>
        </div>
      </section>
      <px-divider></px-divider>
      <section class="mt-4">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">动漫</h2>
        <div class="mt-8">
          <ul>
            <li>《clannad》</li>
            <li>《海贼王》</li>
            <li>《叛逆的鲁鲁修》</li>
            <li>《未来日记》</li>
          </ul>
        </div>
      </section>
      <px-divider></px-divider>
      <section class="mt-4">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">爱好</h2>
        <div class="mt-8">
          <ul>
            <li>各种棋牌、桌游</li>
            <li>篮球</li>
            <li>唱歌(虽然五音不全)</li>
            <li>喜欢推理和解谜</li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>

<style lang="scss" scoped>
li + li {
  margin-top: 8px;
}
h2 {
  -webkit-text-stroke-color: rgb(170 170 170);
  -webkit-text-stroke-width: 0.5px;
  color: transparent;
}
</style>
