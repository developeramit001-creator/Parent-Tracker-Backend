"use strict";
// import admin from "firebase-admin";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// const serviceAccount = JSON.parse(
//     process.env.FIREBASE_SERVICE_ACCOUNT as string
// );
// serviceAccount.private_key =
//     serviceAccount.private_key.replace(/\\n/g, "\n");
// if (!admin.apps.length) {
//     admin.initializeApp({
//         credential: admin.credential.cert(serviceAccount),
//     });
// }
// export default admin;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const path_1 = __importDefault(require("path"));
const serviceAccountPath = path_1.default.join(process.cwd(), "firebase-admin.json");
if (!firebase_admin_1.default.apps.length) {
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert(serviceAccountPath),
    });
}
exports.default = firebase_admin_1.default;
