const path = require("path");

module.exports = {
    entry: "./website/index.ts",
    mode: "development",
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: "ts-loader",
                include: [path.resolve(__dirname, "website/")],
            },
        ],
    },
    resolve: {
        extensions: [".ts"],
    },
    devtool: "source-map",
    output: {
        path: path.resolve(__dirname, "website/dist/"),
        filename: "index.js",
    },
    cache: {
        type: "filesystem",
    },
};
