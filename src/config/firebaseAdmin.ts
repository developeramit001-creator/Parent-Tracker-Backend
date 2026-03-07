import admin from "firebase-admin";

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is missing");
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

serviceAccount.private_key =
    serviceAccount.private_key.replace(/\\n/g, "\n");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

export default admin;
