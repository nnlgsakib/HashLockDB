"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var multer_1 = require("multer");
var level_1 = require("level");
var crypto_1 = require("crypto");
var fs_1 = require("fs");
var cors_1 = require("cors");
var path_1 = require("path");
var app = (0, express_1.default)();
app.use((0, cors_1.default)());
var db = new level_1.Level("./data"); // Change './data' to your desired LevelDB storage path
// Create the 'images' and 'videos' directories if they don't exist
var imagesDirectory = path_1.default.join(__dirname, 'images');
var videosDirectory = path_1.default.join(__dirname, 'videos');
if (!fs_1.default.existsSync(imagesDirectory)) {
    fs_1.default.mkdirSync(imagesDirectory);
}
if (!fs_1.default.existsSync(videosDirectory)) {
    fs_1.default.mkdirSync(videosDirectory);
}
// Set up multer for handling file uploads
var upload = (0, multer_1.default)({ dest: 'uploads/' });
// Function to generate Ethereum-style hash
function generateEthereumStyleHash(data) {
    var hash = crypto_1.default.createHash('sha256').update(data).digest('hex');
    return 'nlg' + hash.slice(0, 40);
}
// Endpoint to store images
app.post('/upload/image', upload.single('image'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, imagePath, mimetype, originalname, hash, destinationPath, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                if (!req.file) {
                    return [2 /*return*/, res.status(400).json({ message: 'No file uploaded' })];
                }
                _a = req.file, imagePath = _a.path, mimetype = _a.mimetype, originalname = _a.originalname;
                hash = generateEthereumStyleHash(imagePath);
                destinationPath = path_1.default.join(imagesDirectory, hash);
                fs_1.default.renameSync(imagePath, destinationPath);
                // Store the image metadata (mimetype, original filename, etc.) in LevelDB
                return [4 /*yield*/, db.put(hash, JSON.stringify({ mimetype: mimetype, originalname: originalname }))];
            case 1:
                // Store the image metadata (mimetype, original filename, etc.) in LevelDB
                _b.sent();
                return [2 /*return*/, res.status(200).json({ hash: hash })];
            case 2:
                error_1 = _b.sent();
                console.error('Error uploading image:', error_1);
                res.status(500).json({ message: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Endpoint to store videos
app.post('/upload/video', upload.single('video'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, videoPath, mimetype, originalname, hash, destinationPath, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                if (!req.file) {
                    return [2 /*return*/, res.status(400).json({ message: 'No file uploaded' })];
                }
                _a = req.file, videoPath = _a.path, mimetype = _a.mimetype, originalname = _a.originalname;
                hash = generateEthereumStyleHash(videoPath);
                destinationPath = path_1.default.join(videosDirectory, hash);
                fs_1.default.renameSync(videoPath, destinationPath);
                // Store the video metadata (mimetype, original filename, etc.) in LevelDB
                return [4 /*yield*/, db.put(hash, JSON.stringify({ mimetype: mimetype, originalname: originalname }))];
            case 1:
                // Store the video metadata (mimetype, original filename, etc.) in LevelDB
                _b.sent();
                return [2 /*return*/, res.status(200).json({ hash: hash })];
            case 2:
                error_2 = _b.sent();
                console.error('Error uploading video:', error_2);
                res.status(500).json({ message: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Gateway endpoint to access images and videos
app.get('/gateway/:hash', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var hash, metadataStr, metadata, contentPath, contentBuffer, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                hash = req.params.hash;
                return [4 /*yield*/, db.get(hash)];
            case 1:
                metadataStr = _a.sent();
                metadata = JSON.parse(metadataStr);
                contentPath = void 0;
                if (fs_1.default.existsSync(path_1.default.join(imagesDirectory, hash))) {
                    // Image exists
                    contentPath = path_1.default.join(imagesDirectory, hash);
                }
                else if (fs_1.default.existsSync(path_1.default.join(videosDirectory, hash))) {
                    // Video exists
                    contentPath = path_1.default.join(videosDirectory, hash);
                }
                else {
                    // Content not found
                    throw new Error('Content not found');
                }
                contentBuffer = fs_1.default.readFileSync(contentPath);
                // Send the content data in the response with appropriate content type
                res.set('Content-Type', metadata.mimetype);
                res.send(contentBuffer);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('Error retrieving content:', error_3);
                res.status(404).json({ message: 'Content not found' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
var PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
    console.log("Server is running on port ".concat(PORT));
});
