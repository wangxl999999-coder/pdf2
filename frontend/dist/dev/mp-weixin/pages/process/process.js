"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const _sfc_main = {
  data() {
    return {
      currentFile: null,
      pages: [],
      activeTool: "select",
      dragIndex: -1,
      touchStartY: 0,
      touchStartIndex: 0,
      isProcessing: false
    };
  },
  computed: {
    allSelected() {
      return this.pages.length > 0 && this.pages.every((p) => p.selected);
    },
    canProcess() {
      if (this.pages.length === 0)
        return false;
      const hasSelectedPages = this.pages.some((p) => p.selected);
      const hasRotations = this.pages.some((p) => p.rotation !== 0);
      const hasOrderChanges = this.pages.some((p, i) => p.pageNum !== i + 1);
      return hasSelectedPages || hasRotations || hasOrderChanges;
    }
  },
  onUnload() {
    this.cleanupFile();
  },
  methods: {
    chooseFile() {
      common_vendor.index.chooseMessageFile({
        count: 1,
        type: "file",
        extension: [".pdf"],
        success: async (res) => {
          common_vendor.index.showLoading({
            title: "加载中...",
            mask: true
          });
          try {
            await this.uploadAndLoadFile(res.tempFiles[0]);
            common_vendor.index.hideLoading();
          } catch (error) {
            common_vendor.index.hideLoading();
            common_vendor.index.showToast({
              title: error.message || "加载失败",
              icon: "none"
            });
          }
        },
        fail: (err) => {
          if (err.errMsg && err.errMsg.includes("cancel")) {
            return;
          }
          common_vendor.index.showToast({
            title: "选择文件失败",
            icon: "none"
          });
        }
      });
    },
    rechooseFile() {
      common_vendor.index.showModal({
        title: "提示",
        content: "更换文件将丢失当前修改，确定更换吗？",
        success: (res) => {
          if (res.confirm) {
            this.cleanupFile();
            this.currentFile = null;
            this.pages = [];
            this.chooseFile();
          }
        }
      });
    },
    async uploadAndLoadFile(file) {
      const result = await utils_api.api.uploadFile(file.path);
      if (result.success && result.files.length > 0) {
        this.currentFile = result.files[0];
        const pageResult = await utils_api.api.getPageInfo(this.currentFile.fileId);
        if (pageResult.success) {
          this.pages = pageResult.pages.map((p) => ({
            ...p,
            originalPageNum: p.pageNum
          }));
        } else {
          throw new Error(pageResult.message || "获取页面信息失败");
        }
      } else {
        throw new Error(result.message || "上传失败");
      }
    },
    setActiveTool(tool) {
      this.activeTool = tool;
    },
    handlePageClick(page, index) {
      if (this.activeTool === "select") {
        page.selected = !page.selected;
      } else if (this.activeTool === "rotate") {
        this.rotatePage(page, 90);
      }
    },
    rotatePage(page, angle) {
      page.rotation = (page.rotation + angle) % 360;
    },
    toggleSelectAll() {
      const allSelected = this.allSelected;
      this.pages.forEach((p) => {
        p.selected = !allSelected;
      });
    },
    onTouchStart(e, index) {
      if (this.activeTool !== "reorder")
        return;
      this.touchStartY = e.touches[0].clientY;
      this.touchStartIndex = index;
      this.dragIndex = index;
    },
    onTouchMove(e, index) {
      if (this.activeTool !== "reorder")
        return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - this.touchStartY;
      if (Math.abs(diff) > 80) {
        const moveDirection = diff > 0 ? 1 : -1;
        const newIndex = this.touchStartIndex + moveDirection;
        if (newIndex >= 0 && newIndex < this.pages.length) {
          const temp = this.pages[this.touchStartIndex];
          this.pages.splice(this.touchStartIndex, 1);
          this.pages.splice(newIndex, 0, temp);
          this.touchStartIndex = newIndex;
          this.dragIndex = newIndex;
          this.touchStartY = currentY;
        }
      }
    },
    onTouchEnd() {
      this.dragIndex = -1;
    },
    resetAll() {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要重置所有修改吗？",
        success: (res) => {
          if (res.confirm) {
            this.pages.sort((a, b) => a.originalPageNum - b.originalPageNum);
            this.pages.forEach((p) => {
              p.selected = true;
              p.rotation = 0;
            });
            common_vendor.index.showToast({
              title: "已重置",
              icon: "success"
            });
          }
        }
      });
    },
    async startProcess() {
      if (!this.canProcess) {
        common_vendor.index.showToast({
          title: "没有需要处理的内容",
          icon: "none"
        });
        return;
      }
      this.isProcessing = true;
      try {
        const operations = [];
        const selectedPageNums = this.pages.filter((p) => p.selected).map((p) => p.pageNum);
        const allSelected = selectedPageNums.length === this.pages.length;
        if (!allSelected && selectedPageNums.length > 0) {
          operations.push({
            type: "select",
            pages: selectedPageNums
          });
        }
        const pagesWithRotation = this.pages.filter((p) => p.rotation !== 0);
        for (const page of pagesWithRotation) {
          operations.push({
            type: "rotate",
            pageNum: page.pageNum,
            angle: page.rotation
          });
        }
        const currentOrder = this.pages.map((p) => p.pageNum);
        const originalOrder = this.pages.slice().sort((a, b) => a.originalPageNum - b.originalPageNum).map((p) => p.pageNum);
        const orderChanged = currentOrder.some((p, i) => p !== originalOrder[i]);
        if (orderChanged) {
          operations.push({
            type: "reorder",
            newOrder: currentOrder
          });
        }
        const result = await utils_api.api.processPdf(this.currentFile.fileId, operations);
        if (result.success) {
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({
            title: "处理成功",
            icon: "success"
          });
          setTimeout(async () => {
            try {
              await utils_api.api.downloadFile(result.downloadUrl, result.filename);
            } catch (e) {
              common_vendor.index.showToast({
                title: "下载失败，请重试",
                icon: "none"
              });
            }
          }, 1500);
        } else {
          throw new Error(result.message || "处理失败");
        }
      } catch (error) {
        common_vendor.index.showToast({
          title: error.message || "处理失败",
          icon: "none"
        });
      } finally {
        this.isProcessing = false;
      }
    },
    async cleanupFile() {
      if (this.currentFile) {
        try {
          await utils_api.api.cleanup([this.currentFile.fileId]);
        } catch (e) {
          console.log("清理文件失败");
        }
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: !$data.currentFile
  }, !$data.currentFile ? {
    b: common_vendor.o((...args) => $options.chooseFile && $options.chooseFile(...args))
  } : {
    c: common_vendor.t($data.currentFile.filename),
    d: common_vendor.t($data.pages.length),
    e: common_vendor.o((...args) => $options.rechooseFile && $options.rechooseFile(...args))
  }, {
    f: $data.currentFile
  }, $data.currentFile ? {
    g: $data.activeTool === "select" ? 1 : "",
    h: common_vendor.o(($event) => $options.setActiveTool("select")),
    i: $data.activeTool === "rotate" ? 1 : "",
    j: common_vendor.o(($event) => $options.setActiveTool("rotate")),
    k: $data.activeTool === "reorder" ? 1 : "",
    l: common_vendor.o(($event) => $options.setActiveTool("reorder"))
  } : {}, {
    m: $data.currentFile && $data.pages.length > 0
  }, $data.currentFile && $data.pages.length > 0 ? common_vendor.e({
    n: $data.activeTool === "select"
  }, $data.activeTool === "select" ? {
    o: common_vendor.t($options.allSelected ? "取消全选" : "全选"),
    p: common_vendor.o((...args) => $options.toggleSelectAll && $options.toggleSelectAll(...args))
  } : {}, {
    q: common_vendor.f($data.pages, (page, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(page.pageNum),
        b: "rotate(" + page.rotation + "deg)"
      }, $data.activeTool === "reorder" ? {
        c: common_vendor.t(index + 1)
      } : $data.activeTool === "select" ? common_vendor.e({
        d: page.selected
      }, page.selected ? {} : {}, {
        e: page.selected ? 1 : ""
      }) : $data.activeTool === "rotate" ? {
        f: common_vendor.o(($event) => $options.rotatePage(page, 90), page.pageNum)
      } : {
        g: common_vendor.t(page.pageNum)
      }, {
        h: page.rotation !== 0
      }, page.rotation !== 0 ? {
        i: common_vendor.t(page.rotation)
      } : {}, {
        j: page.pageNum,
        k: page.selected ? 1 : "",
        l: $data.dragIndex === index ? 1 : "",
        m: common_vendor.o(($event) => $options.handlePageClick(page, index), page.pageNum),
        n: common_vendor.o(($event) => $options.onTouchStart($event, index), page.pageNum),
        o: common_vendor.o(($event) => $options.onTouchMove($event, index), page.pageNum),
        p: common_vendor.o((...args) => $options.onTouchEnd && $options.onTouchEnd(...args), page.pageNum)
      });
    }),
    r: $data.activeTool === "reorder",
    s: $data.activeTool === "select",
    t: $data.activeTool === "rotate",
    v: $data.activeTool === "reorder" ? 1 : ""
  }) : {}, {
    w: !$data.currentFile
  }, !$data.currentFile ? {} : {}, {
    x: $data.currentFile
  }, $data.currentFile ? common_vendor.e({
    y: common_vendor.o((...args) => $options.resetAll && $options.resetAll(...args)),
    z: !$data.isProcessing
  }, !$data.isProcessing ? {} : {}, {
    A: !$options.canProcess || $data.isProcessing,
    B: common_vendor.o((...args) => $options.startProcess && $options.startProcess(...args)),
    C: !$options.canProcess ? 1 : ""
  }) : {}, {
    D: $data.isProcessing
  }, $data.isProcessing ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-dfd768e4"], ["__file", "D:/my/tare2/pdf2/frontend/src/pages/process/process.vue"]]);
wx.createPage(MiniProgramPage);
