"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {};
  },
  onLoad() {
  },
  methods: {
    goToMerge() {
      common_vendor.index.navigateTo({
        url: "/pages/merge/merge"
      });
    },
    goToProcess() {
      common_vendor.index.navigateTo({
        url: "/pages/process/process"
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o((...args) => $options.goToMerge && $options.goToMerge(...args)),
    b: common_vendor.o((...args) => $options.goToProcess && $options.goToProcess(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-83a5a03c"], ["__file", "D:/my/tare2/pdf2/frontend/src/pages/index/index.vue"]]);
wx.createPage(MiniProgramPage);
