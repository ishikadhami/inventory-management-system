const express = require("express");
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  getLowStockProducts,
  getCategorySummary,
} = require("../controllers/productController");

const router = express.Router();

// Reports: in routes ko /:id se pehle rakho
router.get("/reports/low-stock", getLowStockProducts);
router.get("/reports/category-summary", getCategorySummary);

// Product operations
router.get("/", getProducts);
router.post("/", createProduct);
router.get("/:id", getProductById);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.patch("/:id/stock", adjustStock);

module.exports = router;