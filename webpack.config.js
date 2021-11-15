const path = require("path");

module.exports = {
    entry: "./web1/index.ts",
    node: false,
    mode: "development",
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: "ts-loader",
                include: [path.resolve(__dirname, "web1/")],
            },
        ],
    },
    resolve: {
        extensions: [".ts"],
        fallback: {
            "querystring": false
        },
    },
    devtool: "source-map",
    output: {
        path: path.resolve(__dirname, "web1/dist/"),
        filename: "index.js",
    },
    cache: {
        type: "filesystem",
    },
};
