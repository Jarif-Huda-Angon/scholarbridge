// api/generate.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as admin from 'firebase-admin';

// 1. Initialize Firebase Admin securely (this allows Vercel to securely read/write to your DB)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // This regex handles formatting issues with private keys in Vercel
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

export default async function handler(req, res) {
    // Only accept secure POST requests from your React app
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { prompt, systemPrompt, uid } = req.body;

    // If no Firebase User ID is sent, block the request
    if (!uid) return res.status(401).json({ error: 'Unauthorized: No User ID provided.' });

    try {
        // 2. Look up the user's profile in your Firestore database
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        let tier = 'free';
        let draftsUsed = 0;

        if (userDoc.exists) {
            tier = userDoc.data().tier || 'free';
            draftsUsed = userDoc.data().drafts_used_this_week || 0;
        } else {
            // If the user just signed up and isn't in the DB yet, create their basic profile
            await userRef.set({ tier: 'free', drafts_used_this_week: 0 });
        }

        // 3. ENFORCE THE FREEMIUM LOCK
        // If they are free and hit 10 drafts, cut them off and trigger the paywall
        if (tier === 'free' && draftsUsed >= 10) {
            return res.status(403).json({ error: 'LIMIT_REACHED' });
        }

        // 4. THE ROUTER: Select the model based on their tier
        // Free users get the ultra-fast 2.5 Flash. Pro users get the heavy 1.5 Pro.
        const modelName = tier === 'pro' ? 'gemini-1.5-pro' : 'gemini-2.5-flash';

        // 5. Ping the Google AI Model securely (API Key is hidden in Vercel!)
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_SECRET_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] }
        });

        const textResponse = result.response.text();

        // 6. Update the database quota tracking for Free users
        if (tier === 'free') {
            await userRef.update({
                drafts_used_this_week: admin.firestore.FieldValue.increment(1)
            });
        }

        // 7. Send the final, highly-tuned AI draft back to the user's screen
        return res.status(200).json({ text: textResponse });

    } catch (error) {
        console.error("Backend Error:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}