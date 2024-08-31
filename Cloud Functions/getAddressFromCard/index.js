const functions = require('@google-cloud/functions-framework');
const crypto = require("crypto");
const Firestore = require("@google-cloud/firestore");

const privateKey = ``;

const db = new Firestore({
  projectId: "",
  keyFilename: "credential.json",
});

const Accounts = db.collection("WormholeCards");

functions.http('helloHttp', async (req, res) => {
   try {
    const decrypted = decryptText(req.body.data);
    const query = await Accounts.where("cardHash", "==", decrypted.toString()).get();
    if (query.empty) {
      res.send(`Bad Request`);
    } else {
      const publicKey = query.docs[0].data().publicKey;
      res.send(publicKey);
    }
  } catch (e) {
    res.send(`Bad Request`);
  }
});

// utils

function decryptText(encryptedText) {
  return crypto.privateDecrypt(
    {
      key: privateKey,
    },
    Buffer.from(encryptedText, "base64")
  );
}