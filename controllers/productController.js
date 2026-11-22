const mongoose = require("mongoose");
const Product = require("../models/Product");

// GET /api/products
async function getProducts(req, res, next) {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { supplier: { $regex: search, $options: "i" } },
      ];
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const sortOrder = order.toLowerCase() === "asc" ? 1 : -1;
    const allowedSortFields = ["name", "price", "quantity", "createdAt"];
    const sortField = allowedSortFields.includes(sort) ? sort : "createdAt";

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize),
      Product.countDocuments(filter),
    ]);

    res.json({
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / pageSize),
      products,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/products/:id
async function getProductById(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
}

// POST /api/products
async function createProduct(req, res, next) {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
}

// PUT /api/products/:id
async function updateProduct(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
}

// DELETE /api/products/:id
async function deleteProduct(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted", product });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/products/:id/stock
async function adjustStock(req, res, next) {
  try {
    const { operation, quantity } = req.body;
    const amount = Number(quantity);

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    if (!["restock", "sale"].includes(operation) || !Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({
        message: "Send operation as 'restock' or 'sale' and a positive whole-number quantity",
      });
    }

    const change = operation === "restock" ? amount : -amount;
    const conditions = { _id: req.params.id };

    if (operation === "sale") {
      conditions.quantity = { $gte: amount };
    }

    const product = await Product.findOneAndUpdate(
      conditions,
      { $inc: { quantity: change } },
      { new: true, runValidators: true }
    );

    if (!product) {
      const exists = await Product.exists({ _id: req.params.id });
      if (!exists) {
        return res.status(404).json({ message: "Product not found" });
      }
      return res.status(400).json({ message: "Not enough stock for this sale" });
    }

    res.json({ message: "Stock updated", product });
  } catch (error) {
    next(error);
  }
}

// GET /api/products/reports/low-stock
async function getLowStockProducts(req, res, next) {
  try {
    const products = await Product.find({
      $expr: { $lte: ["$quantity", "$reorderLevel"] },
    }).sort({ quantity: 1 });

    res.json({ count: products.length, products });
  } catch (error) {
    next(error);
  }
}

// GET /api/products/reports/category-summary
async function getCategorySummary(req, res, next) {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          totalStockValue: { $sum: { $multiply: ["$price", "$quantity"] } },
          averagePrice: { $avg: "$price" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ categories: summary.length, summary });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  getLowStockProducts,
  getCategorySummary,
};