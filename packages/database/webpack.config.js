const path = require("path");
const nodeExternals = require("webpack-node-externals");

const defaults = {
  mode: "production",
  entry: "./src/index.ts",
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".js"]
  }
};

module.exports = [
  {
    ...defaults,
    target: "node",
    output: {
      filename: "api.js",
      path: path.resolve(__dirname, "..", "..", ".tmp")
    },
    externals: [nodeExternals()]
  }
];
