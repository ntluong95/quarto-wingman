//@ts-check

"use strict";

const path = require("path");

/** @type {import('webpack').Configuration} */
const extensionConfig = {
  target: "node",
  mode: "production", // 'production' for packaging

  entry: "./src/extension.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
  },

  // Avoid bundling modules we can't package (vscode, native, optional, etc.)
  externals: {
    vscode: "commonjs vscode",
    positron: "commonjs positron",
    bufferutil: "commonjs bufferutil",
    "utf-8-validate": "commonjs utf-8-validate",
  },

  resolve: {
    extensions: [".ts", ".js"],

    // Allow imports from sibling apps/packages (monorepo-aware)
    modules: [
      path.resolve(__dirname, "src"),
      path.resolve(__dirname, "../../"), // access apps/vscode, packages/*
      "node_modules",
    ],
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
        },
      },
    ],
  },

  devtool: "hidden-source-map",

  infrastructureLogging: {
    level: "log",
  },
};

module.exports = [extensionConfig];
