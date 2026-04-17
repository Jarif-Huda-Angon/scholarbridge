// api/generate.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import admin from 'firebase-admin';

// Initialize Firebase Admin securely
if (!admin.apps || admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { prompt, systemPrompt, uid } = req.body;
    if (!uid) return res.status(401).json({ error: 'Unauthorized: No User ID provided.' });

    try {
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        let tier = 'free';
        let draftsUsed = 0;

        if (userDoc.exists) {
            const data = userDoc.data();
            tier = data.tier || 'free';
            draftsUsed = data.drafts_used_this_week || 0;
        } else {
            await userRef.set({ tier: 'free', drafts_used_this_week: 0, email: "New Commander" });
        }

        if (tier === 'free' && draftsUsed >= 10) {
            return res.status(403).json({ error: 'LIMIT_REACHED' });
        }

        // 🚀 The ONLY stable model we need
        const modelName = tier === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_SECRET_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });

        // 🛡️ Robust 503 Auto-Retry Engine
        let textResponse = "";
        const delays = [1000, 2000, 4000, 8000]; // Wait 1s, 2s, 4s, 8s between retries

        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] }
                });
                textResponse = result.response.text();
                break; // Success! Break out of the retry loop.
            } catch (error) {
                if (attempt === 4) throw error; // If the 5th attempt fails, crash safely.

                // Only retry if it's a server overload (503). Otherwise, throw immediately.
                if (error.message && (error.message.includes('503') || error.message.includes('500'))) {
                    console.log(`Server overloaded. Retrying attempt ${attempt + 1}...`);
                    await new Promise(resolve => setTimeout(resolve, delays[attempt]));
                } else {
                    throw error;
                }
            }
        }

        // Deduct quota after a successful generation
        if (tier === 'free') {
            await userRef.update({
                drafts_used_this_week: admin.firestore.FieldValue.increment(1)
            });
        }

        return res.status(200).json({ text: textResponse });

    } catch (error) {
        console.error("Critical Backend Error:", error);
        return res.status(500).json({ error: 'AI_REBOOT_FAILED', message: error.message });
    }
}