<script setup lang="ts">
definePageMeta({
  layout: "default",
})
import { ref } from "vue"
import { pixelateImage, imageDataToDataURL } from "@pixelium/web-vue"
import p1 from "~/assets/img/1.jpg"

const pixel = ref("")
const show = ref(false)
const showDialog = ref(false)
const inputValue = ref("")
const errorMsg = ref("")
// 正确的验证数字
const correctCode = "0108"

pixelateImage(p1, 32, {}).then((res) => {
  if (!res) {
    return
  }
  pixel.value = imageDataToDataURL(res)
})

// 点击像素图片时打开对话框
const handleClick = () => {
  if (!show.value) {
    showDialog.value = true
    inputValue.value = ""
    errorMsg.value = ""
  }
}

const submitHandler = () => {
  if (inputValue.value === correctCode) {
    show.value = true
    showDialog.value = false
    errorMsg.value = ""
    return true
  } else {
    errorMsg.value = "请重新输入"
    inputValue.value = ""
    return false
  }
}
</script>

<template>
  <div class="py-10">
    <px-image v-if="show" :src="p1" style="height: 300px"></px-image>
    <px-image
      v-else
      :src="pixel"
      style="height: 300px; cursor: pointer"
      @click="handleClick()"
    ></px-image>

    <!-- 验证对话框 -->
    <ClientOnly>
      <px-dialog
        v-model:visible="showDialog"
        title="验证"
        @before-ok="submitHandler"
      >
        <div class="p-4">
          <p class="mb-4 text-gray-600">请输入正确的数字以显示清晰图像</p>
          <px-input
            v-model="inputValue"
            type="text"
            class="w-full border border-gray-300 rounded px-3 py-2 mb-2 focus:outline-none focus:border-blue-500"
            placeholder="请输入验证数字"
          />
          <p v-if="errorMsg" class="text-red-500 text-sm mb-2">
            {{ errorMsg }}
          </p>
        </div>
      </px-dialog>
    </ClientOnly>
  </div>
</template>
